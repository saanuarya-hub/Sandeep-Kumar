import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'pihu.db');
try {
  fs.accessSync(path.dirname(dbPath), fs.constants.W_OK);
} catch {
  dbPath = '/tmp/pihu.db';
}
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      org_name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      legal_status TEXT NOT NULL,
      registration_number TEXT DEFAULT '',
      pan_number TEXT DEFAULT '',
      section_80g_number TEXT DEFAULT '',
      donations_enabled INTEGER NOT NULL DEFAULT 0,
      tax_exemption_enabled INTEGER NOT NULL DEFAULT 0,
      default_commission_pct REAL NOT NULL DEFAULT 10,
      tax_rate_pct REAL NOT NULL DEFAULT 5,
      shipping_flat_fee REAL NOT NULL DEFAULT 45,
      free_shipping_threshold REAL NOT NULL DEFAULT 799,
      contact_phone TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      pilot_location TEXT NOT NULL,
      payment_gateway_mode TEXT NOT NULL DEFAULT 'sandbox',
      shiprocket_mode TEXT NOT NULL DEFAULT 'sandbox',
      shiprocket_pickup_location TEXT NOT NULL,
      seo_title TEXT NOT NULL,
      seo_description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      district TEXT DEFAULT 'Hazaribagh',
      block TEXT DEFAULT 'Sadar',
      village TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      otp_code TEXT DEFAULT '',
      otp_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      description_hi TEXT NOT NULL,
      objectives TEXT NOT NULL,
      district TEXT NOT NULL,
      block TEXT NOT NULL,
      village TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'proposed',
      is_proposed INTEGER NOT NULL DEFAULT 1,
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT '',
      image_url TEXT NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      description TEXT NOT NULL,
      description_hi TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      location TEXT NOT NULL,
      district TEXT NOT NULL,
      block TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming',
      is_proposed INTEGER NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL,
      registrations_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      fields_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      form_title TEXT NOT NULL,
      reference_no TEXT UNIQUE NOT NULL,
      applicant_name TEXT NOT NULL,
      applicant_phone TEXT NOT NULL,
      applicant_email TEXT DEFAULT '',
      district TEXT DEFAULT 'Hazaribagh',
      block TEXT DEFAULT '',
      village TEXT DEFAULT '',
      data_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      application_ref TEXT UNIQUE NOT NULL,
      member_id TEXT UNIQUE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      district TEXT NOT NULL,
      block TEXT NOT NULL,
      village TEXT NOT NULL,
      role_type TEXT NOT NULL DEFAULT 'Community Member',
      status TEXT NOT NULL DEFAULT 'pending',
      photo_url TEXT DEFAULT '',
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT DEFAULT '',
      renewal_due TEXT DEFAULT '',
      history_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS volunteers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_ref TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      skills TEXT NOT NULL,
      interests TEXT NOT NULL,
      district TEXT NOT NULL,
      block TEXT NOT NULL,
      village TEXT NOT NULL,
      assigned_project TEXT DEFAULT 'General Rural Outreach',
      status TEXT NOT NULL DEFAULT 'pending',
      hours_logged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      donor_name TEXT NOT NULL,
      donor_email TEXT DEFAULT '',
      donor_phone TEXT NOT NULL,
      amount REAL NOT NULL,
      purpose TEXT NOT NULL,
      payment_ref TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      tax_exempt_claimed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_hi TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sellers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      business_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      seller_type TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      district TEXT NOT NULL,
      block TEXT NOT NULL,
      village TEXT NOT NULL,
      address TEXT NOT NULL,
      gst_number TEXT DEFAULT '',
      fssai_number TEXT DEFAULT '',
      bank_account_masked TEXT DEFAULT 'XXXX-4821',
      ifsc_code TEXT DEFAULT 'SBIN0000091',
      commission_pct REAL NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'pending',
      shop_description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      name_hi TEXT NOT NULL,
      brand TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      discount_price REAL NOT NULL,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      unit_label TEXT NOT NULL DEFAULT '500 g',
      weight_grams INTEGER NOT NULL DEFAULT 500,
      variants_json TEXT NOT NULL DEFAULT '["Standard Pack"]',
      is_food_product INTEGER NOT NULL DEFAULT 0,
      fssai_license TEXT DEFAULT '',
      ingredients TEXT DEFAULT '',
      mfg_date TEXT DEFAULT '',
      expiry_date TEXT DEFAULT '',
      batch_code TEXT DEFAULT '',
      image_url TEXT NOT NULL,
      approval_status TEXT NOT NULL DEFAULT 'pending',
      is_active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 4.7,
      reviews_count INTEGER NOT NULL DEFAULT 12,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_code TEXT UNIQUE NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      village_origin TEXT NOT NULL,
      production_date TEXT NOT NULL,
      best_before_date TEXT DEFAULT '',
      specifications TEXT NOT NULL,
      license_details TEXT DEFAULT 'Not applicable / Pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      shipping_address TEXT NOT NULL,
      district TEXT NOT NULL,
      pincode TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_total REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL,
      shipping_fee REAL NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_txn_id TEXT DEFAULT '',
      order_status TEXT NOT NULL DEFAULT 'Confirmed',
      awb_number TEXT DEFAULT '',
      courier_name TEXT DEFAULT '',
      shipment_status TEXT DEFAULT 'Pending Sync',
      pickup_scheduled_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      variant_label TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      commission_pct REAL NOT NULL,
      platform_commission REAL NOT NULL,
      seller_earning REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seller_payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      bank_account TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested',
      reference_utr TEXT DEFAULT '',
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT DEFAULT '',
      FOREIGN KEY (seller_id) REFERENCES sellers(id)
    );

    CREATE TABLE IF NOT EXISTS vmgs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vmg_code TEXT UNIQUE NOT NULL,
      group_name TEXT NOT NULL,
      village TEXT NOT NULL,
      panchayat TEXT NOT NULL,
      block TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT 'Hazaribagh',
      member_count INTEGER NOT NULL DEFAULT 10,
      president_name TEXT NOT NULL,
      secretary_name TEXT NOT NULL,
      treasurer_name TEXT NOT NULL,
      production_coordinator TEXT DEFAULT '',
      marketing_coordinator TEXT DEFAULT '',
      logistics_coordinator TEXT DEFAULT '',
      focus_activity TEXT NOT NULL,
      next_meeting_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'proposed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vmg_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vmg_id INTEGER NOT NULL,
      meeting_date TEXT NOT NULL,
      attendance_count INTEGER NOT NULL,
      agenda TEXT NOT NULL,
      resolutions TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vmg_id) REFERENCES vmgs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ovop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      village TEXT NOT NULL,
      block TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT 'Hazaribagh',
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      shg_producer TEXT NOT NULL,
      local_resource TEXT NOT NULL,
      monthly_capacity TEXT NOT NULL,
      unit_cost REAL NOT NULL,
      packaging_spec TEXT NOT NULL,
      feasibility_notes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'proposed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agri_bank (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_type TEXT NOT NULL,
      item_name TEXT NOT NULL,
      variety_or_grade TEXT NOT NULL,
      village TEXT NOT NULL,
      block TEXT NOT NULL,
      storage_unit TEXT NOT NULL,
      stock_qty REAL NOT NULL,
      unit TEXT NOT NULL,
      capacity_qty REAL NOT NULL,
      low_stock_threshold REAL NOT NULL DEFAULT 50,
      supplier_or_farmer TEXT NOT NULL,
      notes TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rural_logistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_code TEXT UNIQUE NOT NULL,
      collection_point TEXT NOT NULL,
      villages_covered TEXT NOT NULL,
      block TEXT NOT NULL,
      transport_mode TEXT NOT NULL,
      schedule_days TEXT NOT NULL,
      coordinator_name TEXT NOT NULL,
      cost_per_trip REAL NOT NULL DEFAULT 250,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cms_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      body TEXT NOT NULL,
      body_hi TEXT NOT NULL,
      meta_label TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_role TEXT NOT NULL DEFAULT 'all',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'system',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_ref TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const settingsExists = db.prepare('SELECT id FROM site_settings WHERE id = 1').get();
  if (!settingsExists) {
    seedInitialData();
  }
}

function seedInitialData() {
  db.prepare(`
    INSERT INTO site_settings (
      id, org_name, tagline, legal_status, registration_number, pan_number, section_80g_number,
      donations_enabled, tax_exemption_enabled, default_commission_pct, tax_rate_pct,
      shipping_flat_fee, free_shipping_threshold, contact_phone, contact_email, pilot_location,
      payment_gateway_mode, shiprocket_mode, shiprocket_pickup_location, seo_title, seo_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    1,
    'PIHU – Pan India Helping Unit',
    'Empowering Villages. Strengthening Women. Building Sustainable Rural Economies.',
    'Concept Development Stage (Not Yet Legally Registered)',
    '',
    '',
    '',
    0, // Disabled until legal & banking readiness confirmed
    0, // Disabled until 80G approval exists
    10,
    5,
    45,
    799,
    '+91 9308686273',
    'panindiahelpingunit@gmail.com',
    'Hazaribagh, Jharkhand, India',
    'sandbox',
    'sandbox',
    'Hazaribagh Pilot Collection Hub, Jharkhand 825301',
    'PIHU – Pan India Helping Unit | Hazaribagh Rural Development & SHG Marketplace',
    'Proposed integrated rural development platform connecting Village Mother Groups, OVOP micro-enterprises, Beej Bhandaran, and direct-to-consumer rural products.'
  );

  // Seed initial users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, phone, password_hash, role, district, block, village, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);
  insertUser.run('PIHU Super Admin', 'admin@pihu.org', '+91 9308686273', hashPassword('PihuAdmin@2026'), 'super_admin', 'Hazaribagh', 'Sadar', 'Hazaribagh Town');
  const sellerUser = insertUser.run('Savitri Devi (Didi SHG)', 'seller@pihu.org', '+91 9835112201', hashPassword('PihuSeller@2026'), 'seller', 'Hazaribagh', 'Ichak', 'Daru');
  const memberUser = insertUser.run('Rameshwar Prasad', 'member@pihu.org', '+91 9431122334', hashPassword('PihuMember@2026'), 'member', 'Hazaribagh', 'Barkagaon', 'Keredari');
  insertUser.run('Anjali Kumari (District Coord.)', 'coord@pihu.org', '+91 9934500112', hashPassword('PihuCoord@2026'), 'district_coordinator', 'Hazaribagh', 'Sadar', 'Hazaribagh');

  // Seed 12 PIHU categories
  const cats = [
    ['Food Processing Products', 'खाद्य प्रसंस्करण उत्पाद', 'food-processing', 'Village-processed pickles, papad, honey, and traditional foods.', 1],
    ['Edible Oils', 'खाद्य तेल', 'edible-oils', 'Kachi Ghani cold-pressed mustard and groundnut oils.', 1],
    ['Flour and Grain Products', 'आटा और अनाज उत्पाद', 'flour-grain', 'Stone-ground millet, wheat, and indigenous rice varieties.', 1],
    ['Spices and Masala', 'मसाले', 'spices-masala', 'Sun-dried forest turmeric, chilli, and hand-pounded spices.', 1],
    ['Agricultural Products', 'कृषि उत्पाद', 'agricultural-products', 'Farm-fresh pulses, lac, and seasonal harvest produce.', 0],
    ['Seeds and Farming Inputs', 'बीज और कृषि सामग्री', 'seeds-inputs', 'Indigenous seeds from Beej Bhandaran and organic compost.', 0],
    ['Handicrafts', 'हस्तशिल्प', 'handicrafts', 'Handwoven bamboo baskets, dokra brass, and sohrai art.', 1],
    ['Household Products', 'घरेलू उत्पाद', 'household-products', 'Natural cleaning supplies, cotton mats, and utility ware.', 0],
    ['Rural Manufacturing Products', 'ग्रामीण विनिर्माण उत्पाद', 'rural-manufacturing', 'Micro-enterprise manufactured eco-plates and packaging.', 0],
    ['SHG-Made Products', 'एसएचजी निर्मित उत्पाद', 'shg-made', 'Curated crafts and foods produced by women self-help groups.', 1],
    ['Local Village Products', 'स्थानीय ग्राम उत्पाद', 'local-village', 'OVOP village cluster specialties from Hazaribagh blocks.', 0],
    ['Other Approved Categories', 'अन्य स्वीकृत श्रेणियां', 'other-approved', 'Additional verified rural enterprise products.', 0],
  ];
  const insertCat = db.prepare(`INSERT INTO categories (name, name_hi, slug, description, featured) VALUES (?, ?, ?, ?, ?)`);
  for (const c of cats) insertCat.run(...c);

  // Seed Sellers
  const insertSeller = db.prepare(`
    INSERT INTO sellers (user_id, business_name, owner_name, seller_type, phone, email, district, block, village, address, gst_number, fssai_number, commission_pct, status, shop_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const s1 = insertSeller.run(
    sellerUser.lastInsertRowid,
    'Daru Mahila Krishi & Oil Producer Group',
    'Savitri Devi',
    'SHG',
    '+91 9835112201',
    'seller@pihu.org',
    'Hazaribagh',
    'Ichak',
    'Daru',
    'Ward 04, Near Panchayat Bhawan, Daru, Ichak, Hazaribagh 825402',
    '',
    '21126000000000 (Pending Renewal)',
    8,
    'approved',
    'Proposed SHG micro-processing unit producing cold-pressed Kachi Ghani mustard oil and stone-ground millet flour.'
  );
  const s2 = insertSeller.run(
    null,
    'Barkagaon Bamboo & Craft Collective',
    'Sunita Kumari',
    'VMG Producer Group',
    '+91 9771234509',
    'barkagaon.crafts@example.in',
    'Hazaribagh',
    'Barkagaon',
    'Badam',
    'Main Tola, Badam Panchayat, Barkagaon, Hazaribagh 825311',
    '',
    '',
    10,
    'approved',
    'Traditional bamboo basketry and dokra utility artisans organised under the proposed PIHU OVOP cluster.'
  );
  insertSeller.run(
    null,
    'Katkamsandi Vanopaj & Spice Unit',
    'Meena Devi',
    'Individual Entrepreneur',
    '+91 9608114422',
    'meena.spices@example.in',
    'Hazaribagh',
    'Katkamsandi',
    'Pelawal',
    'Pelawal Bazar, Katkamsandi, Hazaribagh 825302',
    '',
    '21126000000102 (Applied)',
    10,
    'pending',
    'Sun-dried turmeric, mahua dry goods, and hand-pounded village masalas.'
  );

  // Seed Products & Batches
  const insertProduct = db.prepare(`
    INSERT INTO products (
      seller_id, category_id, name, name_hi, brand, description, price, discount_price, stock_qty,
      unit_label, weight_grams, variants_json, is_food_product, fssai_license, ingredients,
      mfg_date, expiry_date, batch_code, image_url, approval_status, is_active, featured, rating, reviews_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);

  insertProduct.run(
    s1.lastInsertRowid, 2,
    'Kachi Ghani Cold-Pressed Mustard Oil', 'कच्ची घानी सरसों का तेल',
    'Daru SHG Collective',
    'Single-origin yellow & black mustard seeds cold-pressed in wooden kolhu units in Ichak, Hazaribagh. Unrefined and bottled in food-grade glass.',
    320, 285, 64, '500 ml Glass Bottle', 680,
    JSON.stringify(['500 ml Glass Bottle', '1 Litre Family Pack']),
    1, 'FSSAI Pending Verification (Pilot Batch)', '100% Locally Grown Mustard Seeds (Brassica juncea)',
    '2026-11-05', '2027-05-05', 'PIHU-B26-OIL01',
    '/src/assets/images/product_cold_pressed_oil_1795605257108.jpg',
    'approved', 1, 4.9, 28
  );

  insertProduct.run(
    s2.lastInsertRowid, 7,
    'Handwoven Jharkhand Bamboo Harvest Basket', 'हस्तनिर्मित झारखंड बांस की टोकरी',
    'Barkagaon OVOP Crafts',
    'Double-woven seasoned bamboo storage and bread basket crafted by rural women artisans in Badam village, Barkagaon block.',
    650, 540, 32, 'Medium (12 inch)', 450,
    JSON.stringify(['Medium (12 inch)', 'Large Harvest Set']),
    0, '', '', '', '', 'PIHU-B26-CRF02',
    '/src/assets/images/product_bamboo_handicraft_1795605256174.jpg',
    'approved', 1, 4.8, 19
  );

  insertProduct.run(
    s1.lastInsertRowid, 4,
    'Sun-Dried Forest Turmeric Powder (Haldi)', 'जंगली सूखी हल्दी पाउडर',
    'Hazaribagh Vanopaj SHG',
    'High-curcumin native turmeric roots grown without synthetic pesticides in Hazaribagh forest-fringe farms, boiled, sun-dried, and stone-milled.',
    210, 175, 110, '250 g Kraft Pouch', 270,
    JSON.stringify(['250 g Kraft Pouch', '500 g Value Pack']),
    1, 'FSSAI Application In-Progress', '100% Native Lakadong-grade Forest Turmeric Rhizomes',
    '2026-10-20', '2027-10-20', 'PIHU-B26-SPC03',
    '/src/assets/images/product_spices_turmeric_1795605257749.jpg',
    'approved', 1, 4.9, 34
  );

  insertProduct.run(
    s1.lastInsertRowid, 3,
    'Indigenous Ragi (Finger Millet) Stone-Milled Flour', 'देसी मड़ुआ (रागी) आटा',
    'Beej Bhandaran Harvest',
    'Sprouted and gently stone-milled finger millet sourced from smallholder farmers participating in the Hazaribagh Beej Bhandaran pilot.',
    160, 135, 85, '1 kg Eco-Pouch', 1020,
    JSON.stringify(['1 kg Eco-Pouch', '2 kg Pack']),
    1, 'FSSAI Application In-Progress', '100% Indigenous Finger Millet (Eleusine coracana)',
    '2026-11-10', '2027-03-10', 'PIHU-B26-FLR04',
    '/src/assets/images/village_seed_bank_1795605258318.jpg',
    'approved', 1, 4.7, 15
  );

  const insertBatch = db.prepare(`
    INSERT INTO batches (batch_code, product_id, product_name, seller_name, village_origin, production_date, best_before_date, specifications, license_details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBatch.run('PIHU-B26-OIL01', 1, 'Kachi Ghani Cold-Pressed Mustard Oil', 'Daru Mahila Krishi & Oil Producer Group', 'Daru, Ichak Block, Hazaribagh', '2026-11-05', '2027-05-05', 'Net Qty: 500 ml | Cold-Pressed Wooden Kolhu | Glass Bottle', 'Pilot Unit Record (FSSAI Registration Pending)');
  insertBatch.run('PIHU-B26-CRF02', 2, 'Handwoven Jharkhand Bamboo Harvest Basket', 'Barkagaon Bamboo & Craft Collective', 'Badam, Barkagaon Block, Hazaribagh', '2026-11-01', 'N/A (Handicraft)', 'Seasoned Local Bamboo | Diameter: 30 cm | Weight: 450 g', 'Artisan Producer Group Record');
  insertBatch.run('PIHU-B26-SPC03', 3, 'Sun-Dried Forest Turmeric Powder (Haldi)', 'Hazaribagh Vanopaj SHG', 'Daru, Ichak Block, Hazaribagh', '2026-10-20', '2027-10-20', 'Net Wt: 250 g | Moisture < 8% | Zip-Seal Kraft Pouch', 'Pilot Unit Record (FSSAI Application In-Progress)');
  insertBatch.run('PIHU-B26-FLR04', 4, 'Indigenous Ragi (Finger Millet) Stone-Milled Flour', 'Daru Mahila Krishi & Oil Producer Group', 'Keredari / Ichak Cluster, Hazaribagh', '2026-11-10', '2027-03-10', 'Net Wt: 1 kg | Whole Grain Stone Milled', 'Pilot Unit Record (FSSAI Application In-Progress)');

  // Seed Proposed NGO Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (title, title_hi, category, description, description_hi, objectives, district, block, village, status, is_proposed, start_date, end_date, image_url, visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1)
  `);
  insertProject.run(
    'Proposed Village Mother Group (VMG) Enterprise Network',
    'प्रस्तावित ग्राम मातृ समूह (VMG) उद्यम नेटवर्क',
    'Women & SHG Empowerment',
    'Proposed formation of village-level women collectives in Ichak and Barkagaon blocks to coordinate food processing, savings literacy, and collective market access.',
    'इचाक और बड़कागांव प्रखंडों में खाद्य प्रसंस्करण, वित्तीय साक्षरता और सामूहिक बाजार पहुंच के समन्वय हेतु ग्राम-स्तरीय महिला समूहों का प्रस्तावित गठन।',
    'Organise 15 Village Mother Groups across 3 blocks; train 150 women coordinators in bookkeeping and packaging.',
    'Hazaribagh', 'Ichak', 'Daru & Tilra Cluster', 'proposed', '2026-12-01', '2027-11-30',
    '/src/assets/images/hero_rural_women_shg_1795605256954.jpg'
  );
  insertProject.run(
    'Proposed Beej Bhandaran & Indigenous Seed Bank',
    'प्रस्तावित बीज भंडारण एवं देसी बीज बैंक',
    'Agriculture & Seed Bank',
    'Proposed community seed bank infrastructure to preserve drought-resilient paddy, ragi, and pulse landraces and supply raw material banks for village enterprises.',
    'सूखा-रोधी धान, मड़ुआ और दलहन के देसी बीजों के संरक्षण और ग्राम उद्यमों को कच्चा माल उपलब्ध कराने हेतु प्रस्तावित सामुदायिक बीज बैंक।',
    'Conserve 24 indigenous seed varieties; connect 80 smallholder farmers with zero-interest seed return cycles.',
    'Hazaribagh', 'Barkagaon', 'Badam Panchayat', 'proposed', '2026-12-15', '2027-12-15',
    '/src/assets/images/village_seed_bank_1795605258318.jpg'
  );
  insertProject.run(
    'Proposed One Village One Product (OVOP) Craft Hub',
    'प्रस्तावित एक ग्राम एक उत्पाद (OVOP) शिल्प केंद्र',
    'OVOP & Rural Manufacturing',
    'Proposed cluster-level bamboo craft and cold-pressed oil micro-manufacturing hub with batch QR traceability and direct e-commerce fulfilment.',
    'बैच क्यूआर ट्रेसबिलिटी और सीधे ई-कॉमर्स वितरण के साथ प्रस्तावित क्लस्टर-स्तरीय बांस शिल्प एवं कच्ची घानी तेल केंद्र।',
    'Standardise packaging and batch traceability for 4 village clusters in Hazaribagh.',
    'Hazaribagh', 'Katkamsandi', 'Pelawal & Keredari', 'proposed', '2027-01-10', '2027-12-31',
    '/src/assets/images/product_bamboo_handicraft_1795605256174.jpg'
  );

  // Seed Proposed Events
  const insertEvent = db.prepare(`
    INSERT INTO events (title, title_hi, description, description_hi, event_date, event_time, location, district, block, status, is_proposed, image_url, registrations_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  insertEvent.run(
    'Proposed Hazaribagh SHG & VMG Orientation Workshop',
    'प्रस्तावित हजारीबाग एसएचजी और वीएमजी उन्मुखीकरण कार्यशाला',
    'Proposed community consultation introducing Village Mother Group coordination roles, hygiene packaging standards, and digital catalog onboarding.',
    'ग्राम मातृ समूह समन्वय भूमिकाओं, स्वच्छ पैकेजिंग मानकों और डिजिटल कैटलॉग ऑनबोर्डिंग पर प्रस्तावित सामुदायिक संवाद।',
    '2026-12-14', '10:30 AM', 'Community Hall, Ichak Block', 'Hazaribagh', 'Ichak', 'upcoming',
    '/src/assets/images/hero_rural_women_shg_1795605256954.jpg', 18
  );
  insertEvent.run(
    'Proposed Kharif Seed Exchange & Beej Bhandaran Meet',
    'प्रस्तावित खरीफ बीज विनिमय एवं बीज भंडारण बैठक',
    'Proposed farmer dialogue on indigenous millet and pulse seed preservation ahead of the next sowing cycle.',
    'आगामी बुवाई चक्र से पूर्व देसी मड़ुआ और दलहन बीज संरक्षण पर प्रस्तावित किसान संवाद।',
    '2027-01-08', '11:00 AM', 'Panchayat Bhawan, Badam', 'Hazaribagh', 'Barkagaon', 'upcoming',
    '/src/assets/images/village_seed_bank_1795605258318.jpg', 11
  );

  // Seed Dynamic Forms (Module 4)
  const insertForm = db.prepare(`
    INSERT INTO forms (slug, title, title_hi, description, category, is_active, fields_json)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  const formsSeed = [
    ['ngo-membership', 'NGO Membership Registration Form', 'एनजीओ सदस्यता पंजीकरण फॉर्म', 'Apply to become an official PIHU Community Member. Member ID is issued only upon administrative approval.', 'Membership', [
      { id: 'occupation', label: 'Occupation / Primary Activity', type: 'text', required: true },
      { id: 'membership_tier', label: 'Membership Category', type: 'select', options: ['General Community Member', 'SHG / Producer Representative', 'Youth & Student Member', 'Institutional Advisor'], required: true },
      { id: 'consent', label: 'I understand PIHU is currently in concept-development stage and consent to data processing.', type: 'checkbox', required: true }
    ]],
    ['volunteer-registration', 'Volunteer Registration Form', 'स्वयंसेवक पंजीकरण फॉर्म', 'Register as a grassroots field volunteer, trainer, or logistics coordinator in Hazaribagh or expansion districts.', 'Volunteer', [
      { id: 'skills', label: 'Primary Skills (e.g. Teaching, Agronomy, Digital Literacy, Logistics)', type: 'text', required: true },
      { id: 'availability', label: 'Weekly Availability', type: 'radio', options: ['Weekends Only', 'Part-time (10-15 hrs/wk)', 'Full-time Field Pilot'], required: true },
      { id: 'preferred_date', label: 'Available Start Date', type: 'date', required: false }
    ]],
    ['vmg-formation', 'Village Mother Group (VMG) Formation Form', 'ग्राम मातृ समूह (VMG) गठन फॉर्म', 'Propose a new Village Mother Group with village/panchayat mapping and leadership coordinators.', 'VMG', [
      { id: 'group_name', label: 'Proposed VMG Name', type: 'text', required: true },
      { id: 'panchayat', label: 'Gram Panchayat Name', type: 'text', required: true },
      { id: 'member_count', label: 'Initial Participating Women Count', type: 'text', required: true },
      { id: 'focus', label: 'Primary Focus Area', type: 'select', options: ['Food Processing & Oil', 'Handicrafts & Bamboo', 'Seed Bank & Agri', 'Tailoring & Household Goods'], required: true }
    ]],
    ['shg-registration', 'SHG & Rural Entrepreneur Registration Form', 'एसएचजी एवं ग्रामीण उद्यमी पंजीकरण फॉर्म', 'Onboard an existing Self-Help Group or rural manufacturing micro-enterprise onto the PIHU ecosystem.', 'Entrepreneurship', [
      { id: 'enterprise_name', label: 'SHG / Micro-Enterprise Name', type: 'text', required: true },
      { id: 'product_category', label: 'Primary Product Category', type: 'select', options: ['Edible Oils', 'Spices & Masala', 'Flour & Grains', 'Handicrafts', 'Other Rural Goods'], required: true },
      { id: 'has_fssai', label: 'Food Safety / FSSAI Status (if food)', type: 'radio', options: ['Registered FSSAI', 'Applied / In Progress', 'Not a Food Product'], required: true }
    ]],
    ['beneficiary-application', 'Beneficiary & Scheme Facilitation Form', 'लाभार्थी एवं योजना सहायता फॉर्म', 'Apply for community welfare, education support, or government scheme awareness facilitation.', 'Welfare', [
      { id: 'support_type', label: 'Assistance Category Needed', type: 'select', options: ['Education & School Kit Support', 'Skill Training', 'Seed Bank Access', 'Government Scheme Guidance'], required: true },
      { id: 'household_notes', label: 'Brief Background & Need Description', type: 'text', required: true }
    ]],
    ['general-inquiry', 'General Contact & CSR Partnership Inquiry', 'सामान्य संपर्क एवं सीएसआर भागीदारी फॉर्म', 'Reach the PIHU coordination desk for institutional partnerships, project queries, or feedback.', 'Inquiry', [
      { id: 'organization', label: 'Organization / Institution (Optional)', type: 'text', required: false },
      { id: 'topic', label: 'Inquiry Topic', type: 'select', options: ['Institutional / CSR Partnership', 'Project Participation', 'Marketplace / Seller Query', 'General Feedback'], required: true },
      { id: 'message', label: 'Detailed Message', type: 'text', required: true }
    ]]
  ];

  for (const [slug, title, title_hi, desc, cat, fields] of formsSeed) {
    insertForm.run(slug, title, title_hi, desc, cat, JSON.stringify(fields));
  }

  // Seed Members & Volunteers
  db.prepare(`
    INSERT INTO members (user_id, application_ref, member_id, full_name, phone, email, district, block, village, role_type, status, approved_at, renewal_due, history_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    memberUser.lastInsertRowid,
    'PIHU-APP-2026-1001',
    'PIHU-HZB-2026-0001',
    'Rameshwar Prasad',
    '+91 9431122334',
    'member@pihu.org',
    'Hazaribagh',
    'Barkagaon',
    'Keredari',
    'Community Member',
    'approved',
    '2026-11-12',
    '2027-11-12',
    JSON.stringify([{ date: '2026-11-12', action: 'Approved by District Coordinator & Official Member ID issued' }])
  );
  db.prepare(`
    INSERT INTO members (user_id, application_ref, member_id, full_name, phone, email, district, block, village, role_type, status, history_json)
    VALUES (NULL, 'PIHU-APP-2026-1002', NULL, 'Kavita Devi', '+91 9123409876', 'kavita.shg@example.in', 'Hazaribagh', 'Ichak', 'Tilra', 'SHG Representative', 'pending', '[{"date":"2026-11-22","action":"Application submitted; awaiting review"}]')
  `).run();

  db.prepare(`
    INSERT INTO volunteers (application_ref, full_name, phone, email, skills, interests, district, block, village, assigned_project, status, hours_logged)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('PIHU-VOL-2026-201', 'Vivek Kumar Mahto', '+91 9931004455', 'vivek.hzb@example.in', 'Digital Literacy, Hindi-English Translation, Field Surveys', 'Beej Bhandaran & Youth Education', 'Hazaribagh', 'Sadar', 'Korra', 'Proposed Beej Bhandaran & Indigenous Seed Bank', 'approved', 24);
  db.prepare(`
    INSERT INTO volunteers (application_ref, full_name, phone, email, skills, interests, district, block, village, assigned_project, status, hours_logged)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('PIHU-VOL-2026-202', 'Priya Singh', '+91 9801223344', 'priya.s@example.in', 'Packaging Design, SHG Bookkeeping', 'Women Entrepreneurship', 'Hazaribagh', 'Barkagaon', 'Badam', 'Unassigned', 'pending', 0);

  // Seed Form Submissions
  db.prepare(`
    INSERT INTO form_submissions (form_id, form_title, reference_no, applicant_name, applicant_phone, applicant_email, district, block, village, data_json, status, admin_notes)
    VALUES (1, 'NGO Membership Registration Form', 'PIHU-APP-2026-1002', 'Kavita Devi', '+91 9123409876', 'kavita.shg@example.in', 'Hazaribagh', 'Ichak', 'Tilra', '{"occupation":"SHG Weaver","membership_tier":"SHG / Producer Representative","consent":true}', 'pending', 'Pending block verification')
  `).run();

  // Seed Sample Order + Order Items (so Super Admin & Seller panels have live financial data!)
  const ord = db.prepare(`
    INSERT INTO orders (
      order_number, customer_id, customer_name, customer_phone, customer_email, shipping_address,
      district, pincode, subtotal, discount_total, tax_amount, shipping_fee, total_amount,
      payment_method, payment_status, payment_txn_id, order_status, awb_number, courier_name, shipment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'PIHU-ORD-2026-0041',
    memberUser.lastInsertRowid,
    'Rameshwar Prasad',
    '+91 9431122334',
    'member@pihu.org',
    'Near Kali Mandir, Keredari Road, Barkagaon',
    'Hazaribagh',
    '825311',
    825, 0, 41.25, 0, 866.25,
    'ONLINE_SANDBOX', 'verified', 'PAY-SBX-994120', 'Shipped', 'SR-HZB-88412091', 'Delhivery Surface (Sandbox)', 'In Transit'
  );

  db.prepare(`
    INSERT INTO order_items (order_id, product_id, seller_id, product_name, variant_label, quantity, unit_price, line_total, commission_pct, platform_commission, seller_earning)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ord.lastInsertRowid, 1, s1.lastInsertRowid, 'Kachi Ghani Cold-Pressed Mustard Oil', '500 ml Glass Bottle', 1, 285, 285, 8, 22.8, 262.2);
  db.prepare(`
    INSERT INTO order_items (order_id, product_id, seller_id, product_name, variant_label, quantity, unit_price, line_total, commission_pct, platform_commission, seller_earning)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ord.lastInsertRowid, 2, s2.lastInsertRowid, 'Handwoven Jharkhand Bamboo Harvest Basket', 'Medium (12 inch)', 1, 540, 540, 10, 54, 486);

  // Seed VMGs & Meetings
  const vmg1 = db.prepare(`
    INSERT INTO vmgs (vmg_code, group_name, village, panchayat, block, district, member_count, president_name, secretary_name, treasurer_name, production_coordinator, marketing_coordinator, logistics_coordinator, focus_activity, next_meeting_date, status)
    VALUES (?, ?, ?, ?, ?, 'Hazaribagh', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'VMG-HZB-001', 'Jagriti Mahila Matri Samuh (Proposed)', 'Daru', 'Daru Panchayat', 'Ichak',
    14, 'Savitri Devi', 'Mamta Kumari', 'Phulo Devi', 'Geeta Devi', 'Anita Kumari', 'Rekha Devi',
    'Cold-pressed mustard oil, spice drying & grain grading', '2026-12-05', 'proposed'
  );
  db.prepare(`
    INSERT INTO vmgs (vmg_code, group_name, village, panchayat, block, district, member_count, president_name, secretary_name, treasurer_name, production_coordinator, marketing_coordinator, logistics_coordinator, focus_activity, next_meeting_date, status)
    VALUES (?, ?, ?, ?, ?, 'Hazaribagh', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'VMG-HZB-002', 'Pragati Gram Matri Samuh (Proposed)', 'Badam', 'Badam Panchayat', 'Barkagaon',
    12, 'Sunita Kumari', 'Poonam Devi', 'Sita Devi', 'Kiran Kumari', 'Usha Devi', 'Lakshmi Devi',
    'Bamboo craft weaving & OVOP eco-packaging', '2026-12-09', 'proposed'
  );
  db.prepare(`
    INSERT INTO vmg_meetings (vmg_id, meeting_date, attendance_count, agenda, resolutions)
    VALUES (?, '2026-11-18', 13, 'Review pilot mustard seed stock & food-grade glass bottle procurement', 'Agreed to label every bottle with batch number PIHU-B26-OIL01 and maintain daily press log.')
  `).run(vmg1.lastInsertRowid);

  // Seed OVOP
  db.prepare(`
    INSERT INTO ovop_items (village, block, product_name, category, shg_producer, local_resource, monthly_capacity, unit_cost, packaging_spec, feasibility_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Daru', 'Ichak', 'Cold-Pressed Kachi Ghani Mustard Oil', 'Edible Oils', 'Jagriti VMG / Daru SHG', 'Winter yellow & black mustard harvest from 45 local farms', '400 Litres / month', 195, '500 ml Amber/Clear Glass Bottle with tamper-evident seal', 'High urban & local demand; requires moisture testing before pressing.', 'proposed');
  db.prepare(`
    INSERT INTO ovop_items (village, block, product_name, category, shg_producer, local_resource, monthly_capacity, unit_cost, packaging_spec, feasibility_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Badam', 'Barkagaon', 'Seasoned Bamboo Utility Baskets & Trays', 'Handicrafts', 'Barkagaon Bamboo Collective', 'Sustainably harvested local bamboo clumps', '180 Units / month', 290, 'Corrugated kraft box with protective jute sleeve', 'Strong margin and zero spoilage risk during Shiprocket transit.', 'proposed');

  // Seed Agriculture, Seed Bank (Beej Bhandaran) & Raw Material Bank
  const insertAgri = db.prepare(`
    INSERT INTO agri_bank (record_type, item_name, variety_or_grade, village, block, storage_unit, stock_qty, unit, capacity_qty, low_stock_threshold, supplier_or_farmer, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAgri.run('seed_bank', 'Indigenous Finger Millet (Madua / Ragi)', 'Local Red Short-Duration', 'Badam', 'Barkagaon', 'Beej Bhandaran Room #1 (Earthen Kothi)', 340, 'kg', 500, 80, 'Birsa Kisan Collective (14 Farmers)', 'Germination check 88%; stored in neem-leaf treated clay bins.');
  insertAgri.run('seed_bank', 'Kala Jeera / Scented Desi Paddy', 'Traditional Rainfed Variety', 'Daru', 'Ichak', 'Beej Bhandaran Room #2', 420, 'kg', 800, 100, 'Ichak Seed Savers Network', 'Reserved for Kharif seed-loan distribution.');
  insertAgri.run('raw_material', 'Raw Mustard Seeds (Sarson)', 'Grade-A Sun-Dried Oilseed', 'Daru', 'Ichak', 'Daru Oil Unit Raw Bank', 620, 'kg', 1000, 150, '18 Smallholder Growers (Ichak)', 'Allocated for Batch PIHU-B26-OIL01 & upcoming December press.');
  insertAgri.run('raw_material', 'Seasoned Bamboo Culms (Split)', '2-Year Mature Treated', 'Badam', 'Barkagaon', 'Badam Craft Shed', 42, 'bundles', 200, 50, 'Local Bamboo Growers', 'LOW STOCK ALERT: Below 50-bundle buffer threshold.');

  // Seed Rural Logistics Routes
  db.prepare(`
    INSERT INTO rural_logistics (route_code, collection_point, villages_covered, block, transport_mode, schedule_days, coordinator_name, cost_per_trip, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('RTE-HZB-01', 'Ichak Block Collection Point', 'Daru, Tilra, Karyatpur', 'Ichak', 'E-Rickshaw Feeder -> Hazaribagh Hub', 'Tue, Thu, Sat', 'Rekha Devi', 220, 'planned');
  db.prepare(`
    INSERT INTO rural_logistics (route_code, collection_point, villages_covered, block, transport_mode, schedule_days, coordinator_name, cost_per_trip, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('RTE-HZB-02', 'Barkagaon Craft Pickup Point', 'Badam, Keredari, Sandi', 'Barkagaon', 'Shared Mini-Van Consolidation', 'Mon, Wed, Fri', 'Lakshmi Devi', 350, 'planned');

  // Seed CMS Content (News, Stories, FAQs)
  const insertCms = db.prepare(`INSERT INTO cms_items (item_type, title, title_hi, body, body_hi, meta_label, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  insertCms.run(
    'announcement',
    'Hazaribagh Pilot Blueprint & Portal Launch (Concept Stage)',
    'हजारीबाग पायलट ब्लूप्रिंट और पोर्टल शुभारंभ (प्रारंभिक चरण)',
    'PIHU is currently operating in the concept-development phase in Hazaribagh, Jharkhand. Communities, SHGs, and volunteers can submit interest applications while formal legal registration is completed.',
    'पीहू वर्तमान में हजारीबाग, झारखंड में अवधारणा-विकास चरण में है। औपचारिक पंजीकरण पूर्ण होने तक समुदाय, एसएचजी और स्वयंसेवक आवेदन जमा कर सकते हैं।',
    'Pilot Update · Nov 2026',
    ''
  );
  insertCms.run(
    'story',
    'How Daru Village Women Standardised Cold-Pressed Oil Packaging',
    'दारू गांव की महिलाओं ने कैसे कच्ची घानी तेल पैकेजिंग को मानकीकृत किया',
    'Working with proposed VMG coordinators, 14 women growers mapped local mustard harvests, introduced batch numbering, and created tamper-evident glass packaging ready for regional dispatch.',
    'प्रस्तावित वीएमजी समन्वयकों के साथ 14 महिला उत्पादकों ने स्थानीय सरसों फसल को जोड़ा और बैच नंबरिंग के साथ सुरक्षित कांच पैकेजिंग तैयार की।',
    'Case Study · Ichak Block',
    '/src/assets/images/hero_rural_women_shg_1795605256954.jpg'
  );
  insertCms.run(
    'faq',
    'Is PIHU already a registered NGO or Section 8 company?',
    'क्या पीहू पहले से एक पंजीकृत एनजीओ या सेक्शन 8 कंपनी है?',
    'No. PIHU – Pan India Helping Unit is currently at the concept-development stage. Legal registration, banking setup, and 80G approvals are pending, which is why online donation collection remains disabled.',
    'नहीं। पीहू – पैन इंडिया हेल्पिंग यूनिट वर्तमान में अवधारणा-विकास चरण में है। कानूनी पंजीकरण और बैंकिंग व्यवस्था लंबित है, इसलिए ऑनलाइन दान संग्रह अभी बंद रखा गया है।',
    'Legal & Governance',
    ''
  );
  insertCms.run(
    'faq',
    'What does the product QR code verify?',
    'उत्पाद का क्यूआर कोड क्या प्रमाणित करता है?',
    'Each QR code displays verified production records—batch code, producer/SHG name, village origin, production date, and applicable licence status. It is a traceability record, not a laboratory test or government seal.',
    'प्रत्येक क्यूआर कोड केवल सत्यापित उत्पादन विवरण (बैच कोड, उत्पादक, गांव, निर्माण तिथि और लाइसेंस स्थिति) दिखाता है। यह सरकारी प्रमाणन या लैब परीक्षण नहीं है।',
    'Quality & Traceability',
    ''
  );

  // Seed Notifications & Audit Log
  db.prepare(`INSERT INTO notifications (user_role, title, message, category) VALUES ('super_admin', 'Legal Readiness Safeguard Active', 'Donation collection & 80G claims are locked until registration details are entered in Settings.', 'compliance')`).run();
  db.prepare(`INSERT INTO notifications (user_role, title, message, category) VALUES ('seller', 'Order PIHU-ORD-2026-0041 Dispatched', 'Shipment AWB SR-HZB-88412091 is in transit via Delhivery Surface.', 'order')`).run();
  db.prepare(`INSERT INTO audit_logs (actor_name, actor_role, action, entity_type, entity_ref, details) VALUES ('PIHU Super Admin', 'super_admin', 'SEED_INITIALIZED', 'system', 'Hazaribagh-Pilot', 'Initial Hazaribagh pilot records created with legal compliance safeguards.')`).run();
}
