import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db, initDatabase, hashPassword, verifyPassword } from './server/db.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '4mb' }));

const TOKEN_SECRET = process.env.SESSION_SECRET || 'pihu-dev-session-secret-hazaribagh-2026';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  district: string;
  block: string;
  village: string;
}

interface AuthedRequest extends Request {
  user?: AuthUser;
}

function signToken(payload: AuthUser): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 86400000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      role: parsed.role,
      district: parsed.district,
      block: parsed.block,
      village: parsed.village,
    };
  } catch {
    return null;
  }
}

function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const user = verifyToken(auth.slice(7));
    if (user) req.user = user;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

function requireRoles(roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }
    next();
  };
}

function logAudit(actorName: string, actorRole: string, action: string, entityType: string, entityRef: string, details: string) {
  db.prepare(`
    INSERT INTO audit_logs (actor_name, actor_role, action, entity_type, entity_ref, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(actorName, actorRole, action, entityType, entityRef, details);
}

app.use(attachUser);

// -------------------- PUBLIC BOOTSTRAP & CATALOG --------------------
app.get('/api/bootstrap', (req: AuthedRequest, res: Response) => {
  const settings = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  const categories = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  const projects = db.prepare('SELECT * FROM projects WHERE visible = 1 ORDER BY id DESC').all();
  const events = db.prepare('SELECT * FROM events ORDER BY event_date ASC').all();
  const cmsItems = db.prepare('SELECT * FROM cms_items ORDER BY id DESC').all();
  const forms = db.prepare('SELECT * FROM forms WHERE is_active = 1 ORDER BY id ASC').all();

  let memberCard = null;
  let sellerProfile = null;
  if (req.user) {
    memberCard = db.prepare('SELECT * FROM members WHERE user_id = ? OR email = ?').get(req.user.id, req.user.email) || null;
    sellerProfile = db.prepare('SELECT * FROM sellers WHERE user_id = ? OR email = ?').get(req.user.id, req.user.email) || null;
  }

  res.json({
    settings,
    categories,
    projects,
    events,
    cmsItems,
    forms: forms.map((f: any) => ({ ...f, fields: JSON.parse(f.fields_json) })),
    user: req.user || null,
    memberCard,
    sellerProfile,
  });
});

// -------------------- AUTHENTICATION & OTP --------------------
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, password, role, district, block, village } = req.body;
  if (!name || !email || !phone || !password) {
    res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    return;
  }
  const allowedSelfRoles = ['customer', 'member', 'volunteer', 'seller'];
  const assignedRole = allowedSelfRoles.includes(role) ? role : 'customer';

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const info = db.prepare(`
    INSERT INTO users (name, email, phone, password_hash, role, district, block, village, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    name.trim(),
    email.trim().toLowerCase(),
    phone.trim(),
    hashPassword(password),
    assignedRole,
    district || 'Hazaribagh',
    block || 'Sadar',
    village || ''
  );

  const user: AuthUser = {
    id: Number(info.lastInsertRowid),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    role: assignedRole,
    district: district || 'Hazaribagh',
    block: block || 'Sadar',
    village: village || '',
  };

  logAudit(user.name, user.role, 'USER_REGISTERED', 'user', String(user.id), `Registered as ${user.role}`);
  res.json({ token: signToken(user), user });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    res.status(400).json({ error: 'Email/phone and password are required.' });
    return;
  }
  const row: any = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier.trim().toLowerCase(), identifier.trim());
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials. Please check email/phone and password.' });
    return;
  }
  if (row.status !== 'active') {
    res.status(403).json({ error: 'Account is currently inactive.' });
    return;
  }
  const user: AuthUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    district: row.district,
    block: row.block,
    village: row.village,
  };
  res.json({ token: signToken(user), user });
});

app.post('/api/auth/send-otp', (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({ error: 'Mobile number or email is required.' });
    return;
  }
  const row: any = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier.trim().toLowerCase(), identifier.trim());
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  if (row) {
    db.prepare('UPDATE users SET otp_code = ? WHERE id = ?').run(otp, row.id);
    db.prepare('INSERT INTO notifications (user_role, title, message, category) VALUES (?, ?, ?, ?)').run(
      row.role,
      'OTP Verification Code',
      `Sandbox OTP for ${identifier}: ${otp}`,
      'security'
    );
    res.json({ sent: true, sandboxOtp: otp, message: 'Sandbox OTP generated (SMS gateway not configured).' });
  } else {
    res.status(404).json({ error: 'No account found for that email or phone. Please register first.' });
  }
});

app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) {
    res.status(400).json({ error: 'Identifier and OTP code are required.' });
    return;
  }
  const row: any = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier.trim().toLowerCase(), identifier.trim());
  if (!row || row.otp_code !== String(otp).trim()) {
    res.status(401).json({ error: 'Invalid or expired OTP code.' });
    return;
  }
  db.prepare('UPDATE users SET otp_code = ?, otp_verified = 1 WHERE id = ?').run('', row.id);
  const user: AuthUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    district: row.district,
    block: row.block,
    village: row.village,
  };
  res.json({ token: signToken(user), user });
});

// -------------------- MARKETPLACE PRODUCTS & BATCH TRACEABILITY --------------------
app.get('/api/products', (req: AuthedRequest, res: Response) => {
  const includeAll = req.query.all === '1' && req.user && ['super_admin', 'ngo_admin', 'seller_admin', 'seller'].includes(req.user.role);
  let sql = `
    SELECT p.*, c.name as category_name, c.name_hi as category_name_hi, c.slug as category_slug,
           s.business_name as seller_name, s.village as seller_village, s.block as seller_block, s.district as seller_district
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN sellers s ON p.seller_id = s.id
  `;
  if (!includeAll) {
    sql += ` WHERE p.approval_status = 'approved' AND p.is_active = 1 AND s.status = 'approved' `;
  }
  sql += ` ORDER BY p.featured DESC, p.id DESC`;
  const rows = db.prepare(sql).all().map((r: any) => ({
    ...r,
    variants: JSON.parse(r.variants_json || '["Standard Pack"]'),
  }));
  res.json(rows);
});

app.post('/api/products', requireRoles(['super_admin', 'ngo_admin', 'seller']), (req: AuthedRequest, res: Response) => {
  const {
    name, name_hi, category_id, brand, description, price, discount_price, stock_qty,
    unit_label, weight_grams, is_food_product, fssai_license, ingredients, mfg_date, expiry_date,
    batch_code, image_url, seller_id
  } = req.body;

  if (!name || !category_id || !price) {
    res.status(400).json({ error: 'Product name, category, and price are required.' });
    return;
  }

  let targetSellerId = seller_id;
  if (req.user?.role === 'seller') {
    const seller: any = db.prepare('SELECT * FROM sellers WHERE user_id = ? OR email = ?').get(req.user.id, req.user.email);
    if (!seller) {
      res.status(400).json({ error: 'Complete seller onboarding before adding products.' });
      return;
    }
    targetSellerId = seller.id;
  }

  const approvalStatus = req.user?.role === 'super_admin' ? 'approved' : 'pending';
  const generatedBatch = batch_code || `PIHU-B26-${Math.floor(1000 + Math.random() * 9000)}`;
  const fallbackImg = '/src/assets/images/product_spices_turmeric_1795605257749.jpg';

  const info = db.prepare(`
    INSERT INTO products (
      seller_id, category_id, name, name_hi, brand, description, price, discount_price, stock_qty,
      unit_label, weight_grams, variants_json, is_food_product, fssai_license, ingredients,
      mfg_date, expiry_date, batch_code, image_url, approval_status, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    targetSellerId || 1,
    Number(category_id),
    name,
    name_hi || name,
    brand || 'PIHU Village Producer',
    description || 'Produced by rural micro-enterprise.',
    Number(price),
    Number(discount_price || price),
    Number(stock_qty || 20),
    unit_label || '500 g',
    Number(weight_grams || 500),
    JSON.stringify([unit_label || 'Standard Pack']),
    is_food_product ? 1 : 0,
    fssai_license || '',
    ingredients || '',
    mfg_date || new Date().toISOString().slice(0, 10),
    expiry_date || '',
    generatedBatch,
    image_url || fallbackImg,
    approvalStatus
  );

  const sellerRow: any = db.prepare('SELECT business_name, village, block FROM sellers WHERE id = ?').get(targetSellerId || 1);
  db.prepare(`
    INSERT OR IGNORE INTO batches (batch_code, product_id, product_name, seller_name, village_origin, production_date, best_before_date, specifications, license_details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    generatedBatch,
    info.lastInsertRowid,
    name,
    sellerRow?.business_name || 'PIHU Seller',
    `${sellerRow?.village || 'Hazaribagh'}, ${sellerRow?.block || ''}`,
    mfg_date || new Date().toISOString().slice(0, 10),
    expiry_date || 'N/A',
    `Unit: ${unit_label || 'Standard'} | Weight: ${weight_grams || 500}g`,
    fssai_license || 'Seller declaration recorded'
  );

  logAudit(req.user!.name, req.user!.role, 'PRODUCT_CREATED', 'product', String(info.lastInsertRowid), `Batch ${generatedBatch} (${approvalStatus})`);
  res.json({ id: info.lastInsertRowid, batch_code: generatedBatch, approval_status: approvalStatus });
});

app.patch('/api/products/:id', requireRoles(['super_admin', 'ngo_admin', 'seller']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { approval_status, is_active, stock_qty, price, discount_price, featured } = req.body;
  const prod: any = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!prod) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  if (approval_status && !['super_admin', 'ngo_admin'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Only admins can approve or reject products.' });
    return;
  }
  db.prepare(`
    UPDATE products SET
      approval_status = COALESCE(?, approval_status),
      is_active = COALESCE(?, is_active),
      stock_qty = COALESCE(?, stock_qty),
      price = COALESCE(?, price),
      discount_price = COALESCE(?, discount_price),
      featured = COALESCE(?, featured)
    WHERE id = ?
  `).run(
    approval_status ?? null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    stock_qty !== undefined ? Number(stock_qty) : null,
    price !== undefined ? Number(price) : null,
    discount_price !== undefined ? Number(discount_price) : null,
    featured !== undefined ? (featured ? 1 : 0) : null,
    id
  );
  logAudit(req.user!.name, req.user!.role, 'PRODUCT_UPDATED', 'product', String(id), JSON.stringify(req.body));
  res.json({ updated: true });
});

app.get('/api/batches/:code', (req: Request, res: Response) => {
  const batch = db.prepare('SELECT * FROM batches WHERE batch_code = ?').get(req.params.code);
  if (!batch) {
    res.status(404).json({ error: 'Batch traceability record not found.' });
    return;
  }
  res.json(batch);
});

// -------------------- ORDERS, CHECKOUT & SHIPROCKET --------------------
app.get('/api/shiprocket/check-serviceability', (req: Request, res: Response) => {
  const pincode = String(req.query.pincode || '825301').trim();
  if (!/^\d{6}$/.test(pincode)) {
    res.status(400).json({ error: 'Enter a valid 6-digit Indian PIN code.' });
    return;
  }
  const isJharkhand = pincode.startsWith('82') || pincode.startsWith('83');
  res.json({
    pincode,
    serviceable: true,
    estimated_days: isJharkhand ? '2-3 days' : '4-6 days',
    couriers: [
      { name: 'Delhivery Surface (Shiprocket Sandbox)', rate: isJharkhand ? 45 : 65, cod_available: true },
      { name: 'India Post Rural Parcel', rate: 38, cod_available: false },
    ],
  });
});

app.post('/api/orders', (req: AuthedRequest, res: Response) => {
  const { customer_name, customer_phone, customer_email, shipping_address, district, pincode, payment_method, items } = req.body;
  if (!customer_name || !customer_phone || !shipping_address || !pincode || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Complete delivery details and at least one cart item are required.' });
    return;
  }

  const settings: any = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();

  try {
    const createOrderTx = db.transaction(() => {
      let subtotal = 0;
      const preparedItems: any[] = [];

      for (const item of items) {
        const prod: any = db.prepare(`
          SELECT p.*, s.commission_pct FROM products p
          JOIN sellers s ON p.seller_id = s.id
          WHERE p.id = ? AND p.approval_status = 'approved' AND p.is_active = 1
        `).get(item.product_id);

        if (!prod) {
          throw new Error(`Product ID ${item.product_id} is unavailable.`);
        }
        const qty = Math.max(1, Number(item.quantity || 1));
        if (prod.stock_qty < qty) {
          throw new Error(`Insufficient stock for ${prod.name}. Available: ${prod.stock_qty}`);
        }
        const unitPrice = Number(prod.discount_price || prod.price);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        const commPct = Number(prod.commission_pct || settings.default_commission_pct || 10);
        const platformCommission = Math.round(lineTotal * (commPct / 100) * 100) / 100;
        const sellerEarning = Math.round((lineTotal - platformCommission) * 100) / 100;

        preparedItems.push({
          product_id: prod.id,
          seller_id: prod.seller_id,
          product_name: prod.name,
          variant_label: item.variant_label || prod.unit_label,
          quantity: qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          commission_pct: commPct,
          platform_commission: platformCommission,
          seller_earning: sellerEarning,
        });

        db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?').run(qty, prod.id);
      }

      const taxAmount = Math.round(subtotal * (Number(settings.tax_rate_pct) / 100) * 100) / 100;
      const shippingFee = subtotal >= Number(settings.free_shipping_threshold) ? 0 : Number(settings.shipping_flat_fee);
      const totalAmount = Math.round((subtotal + taxAmount + shippingFee) * 100) / 100;
      const orderNumber = `PIHU-ORD-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const isOnline = payment_method !== 'COD';
      const txnId = isOnline ? `PAY-SBX-${crypto.randomBytes(4).toString('hex').toUpperCase()}` : '';
      const paymentStatus = isOnline ? 'verified' : 'cod_due';

      const ordRes = db.prepare(`
        INSERT INTO orders (
          order_number, customer_id, customer_name, customer_phone, customer_email,
          shipping_address, district, pincode, subtotal, discount_total, tax_amount,
          shipping_fee, total_amount, payment_method, payment_status, payment_txn_id,
          order_status, shipment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'Confirmed', 'Ready for Shiprocket Sync')
      `).run(
        orderNumber,
        req.user?.id || null,
        customer_name,
        customer_phone,
        customer_email || '',
        shipping_address,
        district || 'Hazaribagh',
        pincode,
        subtotal,
        taxAmount,
        shippingFee,
        totalAmount,
        isOnline ? 'ONLINE_SANDBOX' : 'COD',
        paymentStatus,
        txnId
      );

      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, seller_id, product_name, variant_label,
          quantity, unit_price, line_total, commission_pct, platform_commission, seller_earning
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const pi of preparedItems) {
        insertItem.run(
          ordRes.lastInsertRowid, pi.product_id, pi.seller_id, pi.product_name, pi.variant_label,
          pi.quantity, pi.unit_price, pi.line_total, pi.commission_pct, pi.platform_commission, pi.seller_earning
        );
      }

      db.prepare('INSERT INTO notifications (user_role, title, message, category) VALUES (?, ?, ?, ?)').run(
        'seller',
        `New Order ${orderNumber}`,
        `Order placed by ${customer_name} (${district || 'Hazaribagh'}) for ₹${totalAmount.toFixed(2)}.`,
        'order'
      );

      return { id: ordRes.lastInsertRowid, order_number: orderNumber, total_amount: totalAmount, payment_txn_id: txnId, payment_status: paymentStatus };
    });

    const created = createOrderTx();
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Order creation failed' });
  }
});

app.get('/api/orders', requireAuth, (req: AuthedRequest, res: Response) => {
  let orders: any[] = [];
  if (['super_admin', 'ngo_admin', 'finance_admin'].includes(req.user!.role)) {
    orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  } else if (req.user!.role === 'seller') {
    const seller: any = db.prepare('SELECT id FROM sellers WHERE user_id = ? OR email = ?').get(req.user!.id, req.user!.email);
    if (seller) {
      orders = db.prepare(`
        SELECT DISTINCT o.* FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE oi.seller_id = ?
        ORDER BY o.id DESC
      `).all(seller.id);
    }
  } else {
    orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? OR customer_email = ? ORDER BY id DESC').all(req.user!.id, req.user!.email);
  }

  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  res.json(orders.map((o) => ({ ...o, items: getItems.all(o.id) })));
});

app.patch('/api/orders/:id/status', requireRoles(['super_admin', 'ngo_admin', 'seller']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { order_status, sync_shiprocket, courier_name } = req.body;
  const order: any = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  let awb = order.awb_number;
  let courier = courier_name || order.courier_name;
  let shipStatus = order.shipment_status;
  let pickupAt = order.pickup_scheduled_at;

  if (sync_shiprocket && !awb) {
    awb = `SR-HZB-${Math.floor(10000000 + Math.random() * 89999999)}`;
    courier = courier || 'Delhivery Surface (Shiprocket Sandbox)';
    shipStatus = 'AWB Assigned · Pickup Requested';
    pickupAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  } else if (order_status === 'Shipped') {
    shipStatus = 'In Transit';
  } else if (order_status === 'Out for Delivery') {
    shipStatus = 'Out for Delivery';
  } else if (order_status === 'Delivered') {
    shipStatus = 'Delivered';
  } else if (order_status === 'Cancelled') {
    shipStatus = 'Cancelled';
  }

  db.prepare(`
    UPDATE orders SET
      order_status = COALESCE(?, order_status),
      awb_number = ?,
      courier_name = ?,
      shipment_status = ?,
      pickup_scheduled_at = ?
    WHERE id = ?
  `).run(order_status || null, awb, courier, shipStatus, pickupAt, id);

  logAudit(req.user!.name, req.user!.role, 'ORDER_STATUS_UPDATED', 'order', order.order_number, `Status: ${order_status || order.order_status}, AWB: ${awb || 'None'}`);
  res.json({ updated: true, awb_number: awb, courier_name: courier, shipment_status: shipStatus });
});

// -------------------- DYNAMIC FORMS & SUBMISSIONS --------------------
app.get('/api/forms', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM forms ORDER BY id ASC').all();
  res.json(rows.map((f: any) => ({ ...f, fields: JSON.parse(f.fields_json) })));
});

app.post('/api/forms', requireRoles(['super_admin', 'ngo_admin']), (req: AuthedRequest, res: Response) => {
  const { title, title_hi, description, category, fields } = req.body;
  if (!title || !Array.isArray(fields) || fields.length === 0) {
    res.status(400).json({ error: 'Form title and at least one field are required.' });
    return;
  }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.floor(100 + Math.random() * 900);
  const info = db.prepare(`
    INSERT INTO forms (slug, title, title_hi, description, category, is_active, fields_json)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(slug, title, title_hi || title, description || '', category || 'Custom', JSON.stringify(fields));
  logAudit(req.user!.name, req.user!.role, 'FORM_CREATED', 'form', slug, title);
  res.json({ id: info.lastInsertRowid, slug });
});

app.patch('/api/forms/:id', requireRoles(['super_admin', 'ngo_admin']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { is_active, fields } = req.body;
  db.prepare(`
    UPDATE forms SET
      is_active = COALESCE(?, is_active),
      fields_json = COALESCE(?, fields_json)
    WHERE id = ?
  `).run(is_active !== undefined ? (is_active ? 1 : 0) : null, fields ? JSON.stringify(fields) : null, id);
  res.json({ updated: true });
});

app.post('/api/forms/:slug/submit', (req: Request, res: Response) => {
  const form: any = db.prepare('SELECT * FROM forms WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!form) {
    res.status(404).json({ error: 'Active form not found.' });
    return;
  }
  const { applicant_name, applicant_phone, applicant_email, district, block, village, data } = req.body;
  if (!applicant_name || !applicant_phone) {
    res.status(400).json({ error: 'Applicant name and phone number are required.' });
    return;
  }
  const referenceNo = `PIHU-APP-2026-${Math.floor(1000 + Math.random() * 8999)}`;

  db.prepare(`
    INSERT INTO form_submissions (form_id, form_title, reference_no, applicant_name, applicant_phone, applicant_email, district, block, village, data_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(form.id, form.title, referenceNo, applicant_name, applicant_phone, applicant_email || '', district || 'Hazaribagh', block || '', village || '', JSON.stringify(data || {}));

  // Route specialized forms to corresponding workflows
  if (form.slug === 'ngo-membership') {
    db.prepare(`
      INSERT INTO members (application_ref, member_id, full_name, phone, email, district, block, village, role_type, status, history_json)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      referenceNo, applicant_name, applicant_phone, applicant_email || '',
      district || 'Hazaribagh', block || 'Sadar', village || 'Unspecified',
      data?.membership_tier || 'Community Member',
      JSON.stringify([{ date: new Date().toISOString().slice(0, 10), action: 'Membership application submitted; awaiting approval' }])
    );
  } else if (form.slug === 'volunteer-registration') {
    db.prepare(`
      INSERT INTO volunteers (application_ref, full_name, phone, email, skills, interests, district, block, village, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      referenceNo, applicant_name, applicant_phone, applicant_email || '',
      data?.skills || 'Field Outreach', data?.availability || 'Flexible',
      district || 'Hazaribagh', block || 'Sadar', village || 'Unspecified'
    );
  } else if (form.slug === 'vmg-formation') {
    const vmgCode = `VMG-HZB-${Math.floor(100 + Math.random() * 899)}`;
    db.prepare(`
      INSERT INTO vmgs (vmg_code, group_name, village, panchayat, block, district, member_count, president_name, secretary_name, treasurer_name, focus_activity, next_meeting_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')
    `).run(
      vmgCode,
      data?.group_name || `${village || 'Village'} Matri Samuh (Proposed)`,
      village || 'Pending Mapping',
      data?.panchayat || 'Pending',
      block || 'Sadar',
      district || 'Hazaribagh',
      Number(data?.member_count || 10),
      applicant_name,
      'Pending Appointment',
      'Pending Appointment',
      data?.focus || 'Rural Enterprise',
      new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    );
  }

  db.prepare('INSERT INTO notifications (user_role, title, message, category) VALUES (?, ?, ?, ?)').run(
    'super_admin',
    `New ${form.title}`,
    `Ref ${referenceNo} submitted by ${applicant_name} (${district || 'Hazaribagh'}).`,
    'application'
  );

  res.json({ reference_no: referenceNo, status: 'pending', message: 'Application received. Official IDs are issued only after administrative approval.' });
});

app.get('/api/submissions', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM form_submissions ORDER BY id DESC').all();
  res.json(rows.map((r: any) => ({ ...r, data: JSON.parse(r.data_json || '{}') })));
});

app.patch('/api/submissions/:id', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { status, admin_notes } = req.body;
  db.prepare('UPDATE form_submissions SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes) WHERE id = ?').run(status || null, admin_notes || null, id);
  logAudit(req.user!.name, req.user!.role, 'SUBMISSION_REVIEWED', 'submission', String(id), `Status -> ${status}`);
  res.json({ updated: true });
});

// -------------------- MEMBERS & VOLUNTEERS --------------------
app.get('/api/members', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM members ORDER BY id DESC').all();
  res.json(rows.map((r: any) => ({ ...r, history: JSON.parse(r.history_json || '[]') })));
});

app.get('/api/members/lookup', (req: Request, res: Response) => {
  const q = String(req.query.ref || '').trim();
  if (!q) {
    res.status(400).json({ error: 'Application reference or Member ID required.' });
    return;
  }
  const row: any = db.prepare('SELECT application_ref, member_id, full_name, district, block, village, role_type, status, approved_at, renewal_due FROM members WHERE application_ref = ? OR member_id = ?').get(q, q);
  if (!row) {
    res.status(404).json({ error: 'No matching membership record found.' });
    return;
  }
  res.json(row);
});

app.patch('/api/members/:id', requireRoles(['super_admin', 'ngo_admin']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const member: any = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) {
    res.status(404).json({ error: 'Member not found.' });
    return;
  }

  let memberId = member.member_id;
  let approvedAt = member.approved_at;
  let renewalDue = member.renewal_due;
  const history = JSON.parse(member.history_json || '[]');
  const today = new Date().toISOString().slice(0, 10);

  if (status === 'approved' && !memberId) {
    memberId = `PIHU-HZB-${new Date().getFullYear()}-${String(member.id).padStart(4, '0')}`;
    approvedAt = today;
    renewalDue = `${new Date().getFullYear() + 1}${today.slice(4)}`;
    history.push({ date: today, action: `Approved by ${req.user!.name}; Official Member ID ${memberId} issued` });
  } else {
    history.push({ date: today, action: `Status updated to ${status} by ${req.user!.name}` });
  }

  db.prepare('UPDATE members SET status = ?, member_id = ?, approved_at = ?, renewal_due = ?, history_json = ? WHERE id = ?')
    .run(status, memberId, approvedAt, renewalDue, JSON.stringify(history), id);

  logAudit(req.user!.name, req.user!.role, 'MEMBER_STATUS_CHANGED', 'member', memberId || member.application_ref, `Status: ${status}`);
  res.json({ updated: true, member_id: memberId });
});

app.get('/api/volunteers', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM volunteers ORDER BY id DESC').all());
});

app.patch('/api/volunteers/:id', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { status, assigned_project, hours_logged } = req.body;
  db.prepare(`
    UPDATE volunteers SET
      status = COALESCE(?, status),
      assigned_project = COALESCE(?, assigned_project),
      hours_logged = COALESCE(?, hours_logged)
    WHERE id = ?
  `).run(status || null, assigned_project || null, hours_logged !== undefined ? Number(hours_logged) : null, id);
  logAudit(req.user!.name, req.user!.role, 'VOLUNTEER_UPDATED', 'volunteer', String(id), `Status: ${status}`);
  res.json({ updated: true });
});

// -------------------- DONATIONS (STRICTLY GUARDED BY LEGAL READINESS) --------------------
app.get('/api/donations', requireRoles(['super_admin', 'finance_admin', 'ngo_admin']), (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM donations ORDER BY id DESC').all());
});

app.post('/api/donations', (req: Request, res: Response) => {
  const settings: any = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  if (!settings || settings.donations_enabled !== 1) {
    res.status(403).json({
      error: 'Donation collection is currently disabled until PIHU completes formal NGO/Section 8 registration and dedicated banking setup.'
    });
    return;
  }
  const { donor_name, donor_email, donor_phone, amount, purpose } = req.body;
  if (!donor_name || !donor_phone || !amount || Number(amount) < 10) {
    res.status(400).json({ error: 'Valid donor details and amount (minimum ₹10) are required.' });
    return;
  }
  const receiptNo = `PIHU-DON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const payRef = `DON-SBX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  db.prepare(`
    INSERT INTO donations (receipt_no, donor_name, donor_email, donor_phone, amount, purpose, payment_ref, status, tax_exempt_claimed)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)
  `).run(receiptNo, donor_name, donor_email || '', donor_phone, Number(amount), purpose || 'General Rural Welfare', payRef, settings.tax_exemption_enabled ? 1 : 0);

  res.json({ receipt_no: receiptNo, payment_ref: payRef, tax_exempt_claimed: settings.tax_exemption_enabled === 1 });
});

// -------------------- SELLERS & PAYOUTS --------------------
app.get('/api/sellers', requireRoles(['super_admin', 'ngo_admin', 'seller_admin']), (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM sellers ORDER BY id DESC').all());
});

app.post('/api/sellers/apply', (req: AuthedRequest, res: Response) => {
  const { business_name, owner_name, seller_type, phone, email, district, block, village, address, gst_number, fssai_number, shop_description } = req.body;
  if (!business_name || !owner_name || !phone || !email || !address) {
    res.status(400).json({ error: 'Business name, owner name, contact details, and address are required.' });
    return;
  }
  const info = db.prepare(`
    INSERT INTO sellers (user_id, business_name, owner_name, seller_type, phone, email, district, block, village, address, gst_number, fssai_number, status, shop_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    req.user?.id || null,
    business_name, owner_name, seller_type || 'SHG', phone, email,
    district || 'Hazaribagh', block || 'Sadar', village || '', address,
    gst_number || '', fssai_number || '', shop_description || ''
  );
  logAudit(owner_name, 'seller_applicant', 'SELLER_APPLIED', 'seller', String(info.lastInsertRowid), business_name);
  res.json({ id: info.lastInsertRowid, status: 'pending' });
});

app.patch('/api/sellers/:id', requireRoles(['super_admin', 'seller_admin']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { status, commission_pct } = req.body;
  db.prepare(`
    UPDATE sellers SET
      status = COALESCE(?, status),
      commission_pct = COALESCE(?, commission_pct)
    WHERE id = ?
  `).run(status || null, commission_pct !== undefined ? Number(commission_pct) : null, id);
  logAudit(req.user!.name, req.user!.role, 'SELLER_UPDATED', 'seller', String(id), JSON.stringify(req.body));
  res.json({ updated: true });
});

app.get('/api/seller/dashboard', requireRoles(['seller', 'super_admin']), (req: AuthedRequest, res: Response) => {
  let seller: any;
  if (req.user!.role === 'seller') {
    seller = db.prepare('SELECT * FROM sellers WHERE user_id = ? OR email = ?').get(req.user!.id, req.user!.email);
  } else {
    const sid = Number(req.query.seller_id || 1);
    seller = db.prepare('SELECT * FROM sellers WHERE id = ?').get(sid);
  }
  if (!seller) {
    res.status(404).json({ error: 'Seller profile not found.' });
    return;
  }

  const products = db.prepare('SELECT * FROM products WHERE seller_id = ? ORDER BY id DESC').all();
  const earningsRow: any = db.prepare(`
    SELECT COALESCE(SUM(line_total), 0) as gross_sales,
           COALESCE(SUM(platform_commission), 0) as total_commission,
           COALESCE(SUM(seller_earning), 0) as net_earnings,
           COUNT(DISTINCT order_id) as total_orders
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.seller_id = ? AND o.order_status != 'Cancelled'
  `).get(seller.id);

  const paidOutRow: any = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN status = 'settled' THEN amount ELSE 0 END), 0) as settled_total,
           COALESCE(SUM(CASE WHEN status = 'requested' THEN amount ELSE 0 END), 0) as pending_payout
    FROM seller_payouts WHERE seller_id = ?
  `).get(seller.id);

  const payouts = db.prepare('SELECT * FROM seller_payouts WHERE seller_id = ? ORDER BY id DESC').all(seller.id);
  const availableBalance = Math.max(0, Math.round((earningsRow.net_earnings - paidOutRow.settled_total - paidOutRow.pending_payout) * 100) / 100);

  res.json({
    seller,
    products,
    summary: {
      gross_sales: earningsRow.gross_sales,
      total_commission: earningsRow.total_commission,
      net_earnings: earningsRow.net_earnings,
      total_orders: earningsRow.total_orders,
      settled_total: paidOutRow.settled_total,
      pending_payout: paidOutRow.pending_payout,
      available_balance: availableBalance,
    },
    payouts,
  });
});

app.post('/api/seller/withdraw', requireRoles(['seller', 'super_admin']), (req: AuthedRequest, res: Response) => {
  const { amount, seller_id } = req.body;
  const seller: any = req.user!.role === 'seller'
    ? db.prepare('SELECT * FROM sellers WHERE user_id = ? OR email = ?').get(req.user!.id, req.user!.email)
    : db.prepare('SELECT * FROM sellers WHERE id = ?').get(Number(seller_id || 1));

  if (!seller || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: 'Valid withdrawal amount required.' });
    return;
  }

  db.prepare(`
    INSERT INTO seller_payouts (seller_id, amount, bank_account, status)
    VALUES (?, ?, ?, 'requested')
  `).run(seller.id, Number(amount), `${seller.bank_account_masked} (${seller.ifsc_code})`);

  logAudit(req.user!.name, req.user!.role, 'WITHDRAWAL_REQUESTED', 'payout', String(seller.id), `₹${amount}`);
  res.json({ requested: true });
});

app.get('/api/payouts', requireRoles(['super_admin', 'finance_admin', 'seller_admin']), (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT sp.*, s.business_name, s.owner_name FROM seller_payouts sp
    JOIN sellers s ON sp.seller_id = s.id
    ORDER BY sp.id DESC
  `).all();
  res.json(rows);
});

app.patch('/api/payouts/:id', requireRoles(['super_admin', 'finance_admin']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { status, reference_utr } = req.body;
  db.prepare(`
    UPDATE seller_payouts SET status = ?, reference_utr = ?, processed_at = datetime('now') WHERE id = ?
  `).run(status || 'settled', reference_utr || `UTR-SBX-${Date.now().toString().slice(-6)}`, id);
  logAudit(req.user!.name, req.user!.role, 'PAYOUT_PROCESSED', 'payout', String(id), `Status: ${status}`);
  res.json({ updated: true });
});

// -------------------- RURAL DEVELOPMENT MODULES (VMG, OVOP, AGRI BANK, LOGISTICS) --------------------
app.get('/api/vmgs', (_req: Request, res: Response) => {
  const vmgs = db.prepare('SELECT * FROM vmgs ORDER BY id DESC').all();
  const meetings = db.prepare('SELECT * FROM vmg_meetings ORDER BY meeting_date DESC').all();
  res.json(vmgs.map((v: any) => ({ ...v, meetings: meetings.filter((m: any) => m.vmg_id === v.id) })));
});

app.post('/api/vmgs', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator', 'vmg_coordinator']), (req: AuthedRequest, res: Response) => {
  const { group_name, village, panchayat, block, district, member_count, president_name, secretary_name, treasurer_name, production_coordinator, marketing_coordinator, logistics_coordinator, focus_activity, next_meeting_date } = req.body;
  if (!group_name || !village || !block || !president_name) {
    res.status(400).json({ error: 'Group name, village, block, and president name are required.' });
    return;
  }
  const code = `VMG-HZB-${Math.floor(100 + Math.random() * 899)}`;
  const info = db.prepare(`
    INSERT INTO vmgs (vmg_code, group_name, village, panchayat, block, district, member_count, president_name, secretary_name, treasurer_name, production_coordinator, marketing_coordinator, logistics_coordinator, focus_activity, next_meeting_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')
  `).run(code, group_name, village, panchayat || '', block, district || 'Hazaribagh', Number(member_count || 10), president_name, secretary_name || 'TBD', treasurer_name || 'TBD', production_coordinator || '', marketing_coordinator || '', logistics_coordinator || '', focus_activity || 'SHG Production', next_meeting_date || new Date().toISOString().slice(0, 10));
  logAudit(req.user!.name, req.user!.role, 'VMG_CREATED', 'vmg', code, group_name);
  res.json({ id: info.lastInsertRowid, vmg_code: code });
});

app.post('/api/vmgs/:id/meetings', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator', 'vmg_coordinator']), (req: AuthedRequest, res: Response) => {
  const vmgId = Number(req.params.id);
  const { meeting_date, attendance_count, agenda, resolutions } = req.body;
  if (!meeting_date || !agenda) {
    res.status(400).json({ error: 'Meeting date and agenda are required.' });
    return;
  }
  db.prepare('INSERT INTO vmg_meetings (vmg_id, meeting_date, attendance_count, agenda, resolutions) VALUES (?, ?, ?, ?, ?)').run(
    vmgId, meeting_date, Number(attendance_count || 10), agenda, resolutions || ''
  );
  res.json({ recorded: true });
});

app.get('/api/ovop', (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM ovop_items ORDER BY id DESC').all());
});

app.post('/api/ovop', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (req: AuthedRequest, res: Response) => {
  const { village, block, product_name, category, shg_producer, local_resource, monthly_capacity, unit_cost, packaging_spec, feasibility_notes } = req.body;
  if (!village || !product_name) {
    res.status(400).json({ error: 'Village and product name are required.' });
    return;
  }
  const info = db.prepare(`
    INSERT INTO ovop_items (village, block, product_name, category, shg_producer, local_resource, monthly_capacity, unit_cost, packaging_spec, feasibility_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')
  `).run(village, block || 'Ichak', product_name, category || 'Local Village Products', shg_producer || 'Village SHG', local_resource || 'Local Harvest', monthly_capacity || '100 Units/mo', Number(unit_cost || 150), packaging_spec || 'Standard Eco Packaging', feasibility_notes || 'Pilot feasibility underway');
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/agri-bank', (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM agri_bank ORDER BY id DESC').all());
});

app.post('/api/agri-bank', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (req: AuthedRequest, res: Response) => {
  const { record_type, item_name, variety_or_grade, village, block, storage_unit, stock_qty, unit, capacity_qty, low_stock_threshold, supplier_or_farmer, notes } = req.body;
  if (!item_name || !village) {
    res.status(400).json({ error: 'Item name and village are required.' });
    return;
  }
  const info = db.prepare(`
    INSERT INTO agri_bank (record_type, item_name, variety_or_grade, village, block, storage_unit, stock_qty, unit, capacity_qty, low_stock_threshold, supplier_or_farmer, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(record_type || 'seed_bank', item_name, variety_or_grade || 'Indigenous', village, block || 'Ichak', storage_unit || 'Village Beej Bhandaran', Number(stock_qty || 0), unit || 'kg', Number(capacity_qty || 500), Number(low_stock_threshold || 50), supplier_or_farmer || 'Local Farmers', notes || '');
  res.json({ id: info.lastInsertRowid });
});

app.patch('/api/agri-bank/:id', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { delta_qty, notes } = req.body;
  const row: any = db.prepare('SELECT * FROM agri_bank WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  const nextQty = Math.max(0, Number(row.stock_qty) + Number(delta_qty || 0));
  db.prepare(`UPDATE agri_bank SET stock_qty = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`).run(nextQty, notes || null, id);
  logAudit(req.user!.name, req.user!.role, 'AGRI_STOCK_ADJUSTED', 'agri_bank', row.item_name, `Delta: ${delta_qty}, New Stock: ${nextQty} ${row.unit}`);
  res.json({ stock_qty: nextQty });
});

app.get('/api/logistics', (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM rural_logistics ORDER BY id DESC').all());
});

app.post('/api/logistics', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (req: AuthedRequest, res: Response) => {
  const { collection_point, villages_covered, block, transport_mode, schedule_days, coordinator_name, cost_per_trip } = req.body;
  const code = `RTE-HZB-${Math.floor(10 + Math.random() * 89)}`;
  const info = db.prepare(`
    INSERT INTO rural_logistics (route_code, collection_point, villages_covered, block, transport_mode, schedule_days, coordinator_name, cost_per_trip, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')
  `).run(code, collection_point, villages_covered, block || 'Ichak', transport_mode || 'E-Rickshaw Feeder', schedule_days || 'Tue, Fri', coordinator_name || 'Assigned Coordinator', Number(cost_per_trip || 250));
  res.json({ id: info.lastInsertRowid, route_code: code });
});

// -------------------- ADMIN OVERVIEW, PROJECTS, EVENTS, CMS, EXPORTS --------------------
app.get('/api/admin/overview', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator', 'finance_admin', 'seller_admin']), (req: Request, res: Response) => {
  const blockFilter = String(req.query.block || '').trim();
  const counts = {
    total_users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
    total_members: (db.prepare('SELECT COUNT(*) as c FROM members').get() as any).c,
    approved_members: (db.prepare("SELECT COUNT(*) as c FROM members WHERE status = 'approved'").get() as any).c,
    total_volunteers: (db.prepare('SELECT COUNT(*) as c FROM volunteers').get() as any).c,
    total_submissions: (db.prepare('SELECT COUNT(*) as c FROM form_submissions').get() as any).c,
    total_sellers: (db.prepare('SELECT COUNT(*) as c FROM sellers').get() as any).c,
    total_products: (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c,
    total_orders: (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c,
    pending_orders: (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status IN ('Confirmed','Processing')").get() as any).c,
    completed_orders: (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'Delivered'").get() as any).c,
    total_vmgs: (db.prepare('SELECT COUNT(*) as c FROM vmgs').get() as any).c,
    gmv_total: (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE order_status != 'Cancelled'").get() as any).s,
    commission_total: (db.prepare('SELECT COALESCE(SUM(platform_commission), 0) as s FROM order_items').get() as any).s,
    donations_total: (db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM donations').get() as any).s,
  };

  const recentAudit = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 12').all();
  const notifications = db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 12').all();
  const users = db.prepare('SELECT id, name, email, phone, role, district, block, village, status, created_at FROM users ORDER BY id DESC').all();

  res.json({ counts, recentAudit, notifications, users, blockFilter });
});

app.patch('/api/admin/settings', requireRoles(['super_admin']), (req: AuthedRequest, res: Response) => {
  const b = req.body;
  db.prepare(`
    UPDATE site_settings SET
      legal_status = COALESCE(?, legal_status),
      registration_number = COALESCE(?, registration_number),
      pan_number = COALESCE(?, pan_number),
      section_80g_number = COALESCE(?, section_80g_number),
      donations_enabled = COALESCE(?, donations_enabled),
      tax_exemption_enabled = COALESCE(?, tax_exemption_enabled),
      default_commission_pct = COALESCE(?, default_commission_pct),
      tax_rate_pct = COALESCE(?, tax_rate_pct),
      shipping_flat_fee = COALESCE(?, shipping_flat_fee),
      free_shipping_threshold = COALESCE(?, free_shipping_threshold),
      payment_gateway_mode = COALESCE(?, payment_gateway_mode),
      shiprocket_mode = COALESCE(?, shiprocket_mode),
      shiprocket_pickup_location = COALESCE(?, shiprocket_pickup_location),
      seo_title = COALESCE(?, seo_title),
      seo_description = COALESCE(?, seo_description)
    WHERE id = 1
  `).run(
    b.legal_status ?? null,
    b.registration_number ?? null,
    b.pan_number ?? null,
    b.section_80g_number ?? null,
    b.donations_enabled !== undefined ? (b.donations_enabled ? 1 : 0) : null,
    b.tax_exemption_enabled !== undefined ? (b.tax_exemption_enabled ? 1 : 0) : null,
    b.default_commission_pct !== undefined ? Number(b.default_commission_pct) : null,
    b.tax_rate_pct !== undefined ? Number(b.tax_rate_pct) : null,
    b.shipping_flat_fee !== undefined ? Number(b.shipping_flat_fee) : null,
    b.free_shipping_threshold !== undefined ? Number(b.free_shipping_threshold) : null,
    b.payment_gateway_mode ?? null,
    b.shiprocket_mode ?? null,
    b.shiprocket_pickup_location ?? null,
    b.seo_title ?? null,
    b.seo_description ?? null
  );
  logAudit(req.user!.name, req.user!.role, 'SETTINGS_UPDATED', 'site_settings', '1', 'Updated platform governance & financial settings');
  res.json({ updated: true, settings: db.prepare('SELECT * FROM site_settings WHERE id = 1').get() });
});

app.patch('/api/users/:id/role', requireRoles(['super_admin']), (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { role, status } = req.body;
  db.prepare('UPDATE users SET role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?').run(role || null, status || null, id);
  logAudit(req.user!.name, req.user!.role, 'USER_ROLE_CHANGED', 'user', String(id), `Role: ${role}, Status: ${status}`);
  res.json({ updated: true });
});

app.post('/api/projects', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator']), (req: AuthedRequest, res: Response) => {
  const { title, title_hi, category, description, description_hi, objectives, district, block, village, status, start_date, end_date, image_url } = req.body;
  const info = db.prepare(`
    INSERT INTO projects (title, title_hi, category, description, description_hi, objectives, district, block, village, status, is_proposed, start_date, end_date, image_url, visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    title, title_hi || title, category || 'Rural Development', description, description_hi || description,
    objectives || '', district || 'Hazaribagh', block || 'Sadar', village || 'Pilot Cluster',
    status || 'proposed', status === 'completed' ? 0 : 1, start_date || new Date().toISOString().slice(0, 10),
    end_date || '', image_url || '/src/assets/images/hero_rural_women_shg_1795605256954.jpg'
  );
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/events', requireRoles(['super_admin', 'ngo_admin']), (req: AuthedRequest, res: Response) => {
  const { title, title_hi, description, description_hi, event_date, event_time, location, district, block } = req.body;
  const info = db.prepare(`
    INSERT INTO events (title, title_hi, description, description_hi, event_date, event_time, location, district, block, status, is_proposed, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', 1, '/src/assets/images/hero_rural_women_shg_1795605256954.jpg')
  `).run(title, title_hi || title, description, description_hi || description, event_date, event_time || '10:00 AM', location, district || 'Hazaribagh', block || 'Sadar');
  res.json({ id: info.lastInsertRowid });
});

app.post('/api/events/:id/register', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, phone, email, village } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: 'Name and phone are required for event registration.' });
    return;
  }
  const ev: any = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!ev) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }
  db.prepare('UPDATE events SET registrations_count = registrations_count + 1 WHERE id = ?').run(id);
  const ref = `PIHU-EVT-${Math.floor(1000 + Math.random() * 8999)}`;
  const form: any = db.prepare("SELECT id FROM forms WHERE slug = 'general-inquiry'").get();
  if (form) {
    db.prepare(`
      INSERT INTO form_submissions (form_id, form_title, reference_no, applicant_name, applicant_phone, applicant_email, district, village, data_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
    `).run(form.id, `Event: ${ev.title}`, ref, name, phone, email || '', ev.district, village || '', JSON.stringify({ event_id: id, event_title: ev.title }));
  }
  res.json({ registered: true, reference_no: ref });
});

app.post('/api/cms', requireRoles(['super_admin', 'ngo_admin']), (req: AuthedRequest, res: Response) => {
  const { item_type, title, title_hi, body, body_hi, meta_label } = req.body;
  const info = db.prepare('INSERT INTO cms_items (item_type, title, title_hi, body, body_hi, meta_label) VALUES (?, ?, ?, ?, ?, ?)').run(
    item_type || 'announcement', title, title_hi || title, body, body_hi || body, meta_label || 'Official Update'
  );
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/export/:type', requireRoles(['super_admin', 'ngo_admin', 'district_coordinator', 'finance_admin']), (req: Request, res: Response) => {
  const type = req.params.type;
  let rows: any[] = [];
  if (type === 'submissions') rows = db.prepare('SELECT id, form_title, reference_no, applicant_name, applicant_phone, applicant_email, district, block, village, status, created_at FROM form_submissions').all();
  else if (type === 'members') rows = db.prepare('SELECT id, application_ref, member_id, full_name, phone, district, block, village, role_type, status, approved_at FROM members').all();
  else if (type === 'orders') rows = db.prepare('SELECT id, order_number, customer_name, customer_phone, district, pincode, subtotal, tax_amount, shipping_fee, total_amount, payment_method, payment_status, order_status, awb_number, created_at FROM orders').all();
  else if (type === 'sellers') rows = db.prepare('SELECT id, business_name, owner_name, seller_type, phone, district, block, village, commission_pct, status FROM sellers').all();
  else if (type === 'agri') rows = db.prepare('SELECT id, record_type, item_name, variety_or_grade, village, block, storage_unit, stock_qty, unit, capacity_qty, supplier_or_farmer FROM agri_bank').all();
  else {
    res.status(400).json({ error: 'Unsupported export type' });
    return;
  }

  if (rows.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pihu-${type}.csv"`);
    res.send('No records\n');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pihu-${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvLines.join('\n'));
});

// -------------------- VITE MIDDLEWARE / STATIC SERVING --------------------
const port = Number(process.env.PORT || 3000);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PIHU Integrated Platform running on http://0.0.0.0:${port}`);
  });
}

startServer();
