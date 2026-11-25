import { useState, useMemo } from 'react';
import { Search, ShoppingBag, Heart, QrCode, Truck, CheckCircle2, Printer, Plus, Minus, Trash2 } from 'lucide-react';
import { AuthUser, CartItem, Category, Language, Product, SiteSettings } from '../types';
import { copy } from '../i18n';
import { apiFetch } from '../api';
import { QrCodeSvg } from './QrCodeSvg';

interface MarketplaceViewProps {
  lang: Language;
  settings: SiteSettings;
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  wishlist: number[];
  user: AuthUser | null;
  onAddToCart: (product: Product, variant?: string) => void;
  onUpdateCartQty: (productId: number, variant: string, delta: number) => void;
  onRemoveFromCart: (productId: number, variant: string) => void;
  onClearCart: () => void;
  onToggleWishlist: (productId: number) => void;
  onOrderComplete: () => void;
  onOpenTraceability: (batchCode: string) => void;
}

export function MarketplaceView({
  lang,
  settings,
  categories,
  products,
  cart,
  wishlist,
  user,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  onToggleWishlist,
  onOrderComplete,
  onOpenTraceability,
}: MarketplaceViewProps) {
  const t = copy[lang];
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout state
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'receipt'>('cart');
  const [address, setAddress] = useState({
    customer_name: user?.name || '',
    customer_phone: user?.phone || '',
    customer_email: user?.email || '',
    shipping_address: '',
    district: user?.district || 'Hazaribagh',
    pincode: '825301',
    payment_method: 'ONLINE_SANDBOX' as 'ONLINE_SANDBOX' | 'COD',
  });
  const [pincodeResult, setPincodeResult] = useState<any>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState<any>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category_slug !== selectedCategory) return false;
        if (inStockOnly && p.stock_qty <= 0) return false;
        if (q) {
          const hay = `${p.name} ${p.name_hi} ${p.category_name} ${p.seller_name} ${p.seller_village}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.discount_price - b.discount_price;
        if (sortBy === 'price_desc') return b.discount_price - a.discount_price;
        return b.featured - a.featured || b.id - a.id;
      });
  }, [products, selectedCategory, inStockOnly, search, sortBy]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.discount_price * item.quantity, 0),
    [cart]
  );
  const taxAmount = Math.round(subtotal * (settings.tax_rate_pct / 100) * 100) / 100;
  const shippingFee = subtotal === 0 || subtotal >= settings.free_shipping_threshold ? 0 : settings.shipping_flat_fee;
  const totalPayable = Math.round((subtotal + taxAmount + shippingFee) * 100) / 100;

  const checkServiceability = async () => {
    setCheckoutError('');
    try {
      const res = await apiFetch(`/api/shiprocket/check-serviceability?pincode=${encodeURIComponent(address.pincode)}`);
      setPincodeResult(res);
    } catch (err: any) {
      setCheckoutError(err.message);
      setPincodeResult(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);
    setCheckoutError('');
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...address,
          items: cart.map((c) => ({
            product_id: c.product.id,
            variant_label: c.variant,
            quantity: c.quantity,
          })),
        }),
      });
      setOrderReceipt({
        ...res,
        items: [...cart],
        subtotal,
        taxAmount,
        shippingFee,
        customer: { ...address },
        createdAt: new Date().toLocaleString(),
      });
      onClearCart();
      onOrderComplete();
      setCheckoutStep('receipt');
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      {/* Header & Cart Trigger */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E0D8] pb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium mb-1">
            {lang === 'hi' ? 'मल्टी-वेंडर ग्रामीण ई-कॉमर्स' : 'Multi-Vendor Rural Commerce · Separate From Donations'}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917]">{t.marketplaceTitle}</h1>
          <p className="text-sm text-[#57534E] mt-2 max-w-2xl">{t.marketplaceSub}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCheckoutStep('cart');
            setCartOpen(true);
          }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t.cartTitle}</span>
          <span className="font-mono tabular-nums text-xs bg-white/15 px-2 py-0.5 rounded">
            {cart.reduce((s, c) => s + c.quantity, 0)}
          </span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'hi' ? 'उत्पाद, गांव या एसएचजी खोजें...' : 'Search products, village, or SHG seller...'}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#D6CEBE] rounded-md focus:outline-2 focus:outline-[#14532D]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-[#44403C] cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="accent-[#14532D]"
              />
              <span>In stock only</span>
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort products"
              className="px-3 py-2 text-xs bg-white border border-[#D6CEBE] rounded-md text-[#1C1917]"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            {(search || selectedCategory !== 'all' || inStockOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setInStockOnly(false);
                }}
                className="text-xs text-[#9A3412] underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Category Segmented Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#14532D] text-white border-[#14532D]'
                : 'bg-white text-[#44403C] border-[#E5E0D8] hover:border-[#14532D]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#44403C] border-[#E5E0D8] hover:border-[#14532D]'
              }`}
            >
              {lang === 'hi' ? cat.name_hi : cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Uniform Product Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E0D8] rounded-md p-12 text-center space-y-2">
          <p className="font-serif text-lg text-[#1C1917]">No matching products in this category yet.</p>
          <p className="text-sm text-[#57534E]">Try clearing filters or viewing all approved SHG & OVOP products.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filtered.map((product) => {
            const isWished = wishlist.includes(product.id);
            return (
              <article
                key={product.id}
                className="bg-white border border-[#E5E0D8] rounded-md overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div
                  className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden relative cursor-pointer"
                  onClick={() => {
                    setActiveProduct(product);
                    setSelectedVariant(product.variants[0] || product.unit_label);
                  }}
                >
                  <img
                    src={product.image_url}
                    alt={lang === 'hi' ? product.name_hi : product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(product.id);
                    }}
                    aria-label="Toggle wishlist"
                    className="absolute top-3 right-3 p-2 bg-white/90 border border-[#E5E0D8] rounded-md text-[#44403C] hover:text-[#9A3412] cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isWished ? 'fill-[#9A3412] text-[#9A3412]' : ''}`} />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs text-[#57534E] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span>{lang === 'hi' ? product.category_name_hi : product.category_name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{product.seller_village}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProduct(product);
                        setSelectedVariant(product.variants[0] || product.unit_label);
                      }}
                      className="text-left font-serif text-lg font-semibold text-[#1C1917] hover:text-[#14532D] cursor-pointer"
                    >
                      {lang === 'hi' ? product.name_hi : product.name}
                    </button>
                    <p className="text-xs text-[#57534E] mt-1">
                      By {product.seller_name} · {product.unit_label}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#F2EFE9] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono tabular-nums text-lg font-semibold text-[#1C1917]">
                        ₹{product.discount_price.toFixed(0)}
                      </span>
                      {product.price > product.discount_price && (
                        <span className="font-mono tabular-nums text-xs text-[#78716C] line-through ml-2">
                          ₹{product.price.toFixed(0)}
                        </span>
                      )}
                      <p className="text-[11px] text-[#57534E] font-mono tabular-nums">
                        {product.stock_qty > 0 ? `In stock (${product.stock_qty})` : 'Out of stock'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {product.batch_code && (
                        <button
                          type="button"
                          onClick={() => onOpenTraceability(product.batch_code)}
                          title="Inspect Batch Traceability"
                          className="p-2 border border-[#D6CEBE] rounded-md text-[#44403C] hover:border-[#14532D] hover:text-[#14532D] cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={product.stock_qty <= 0}
                        onClick={() => {
                          onAddToCart(product, product.variants[0] || product.unit_label);
                          setCartOpen(true);
                          setCheckoutStep('cart');
                        }}
                        className="px-4 py-2 bg-[#14532D] hover:bg-[#114224] disabled:bg-stone-300 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Add to Bag
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* PRODUCT DETAIL MODAL (PDP with FSSAI declarations & QR batch record) */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white border border-[#E5E0D8] rounded-md max-w-4xl w-full overflow-hidden my-8">
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-5 bg-[#F2EFE9]">
                <img
                  src={activeProduct.image_url}
                  alt={activeProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover min-h-[280px]"
                />
              </div>

              <div className="md:col-span-7 p-6 sm:p-8 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#9A3412]">
                      {activeProduct.category_name} · {activeProduct.brand}
                    </p>
                    <h2 className="font-serif text-2xl font-semibold text-[#1C1917] mt-1">
                      {lang === 'hi' ? activeProduct.name_hi : activeProduct.name}
                    </h2>
                    <p className="text-xs text-[#57534E] mt-1">
                      Producer: {activeProduct.seller_name} ({activeProduct.seller_village}, {activeProduct.seller_block})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveProduct(null)}
                    className="text-xs px-2.5 py-1 border border-[#E5E0D8] rounded text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <p className="text-sm text-[#44403C] leading-relaxed">{activeProduct.description}</p>

                <div className="flex items-baseline gap-3">
                  <span className="font-mono tabular-nums text-2xl font-bold text-[#1C1917]">
                    ₹{activeProduct.discount_price.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#57534E]">MRP ₹{activeProduct.price.toFixed(2)} (Incl. configured rules)</span>
                </div>

                {/* Variants */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[#44403C]">Pack Size / Variant</p>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.variants.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-1.5 text-xs border rounded-md cursor-pointer ${
                          selectedVariant === v
                            ? 'border-[#14532D] bg-[#14532D]/10 text-[#14532D] font-semibold'
                            : 'border-[#D6CEBE] text-[#44403C]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Food Compliance & Specifications */}
                <dl className="grid grid-cols-2 gap-3 p-4 bg-[#FBF9F5] border border-[#E5E0D8] rounded-md text-xs">
                  <div>
                    <dt className="text-[#57534E]">Batch Code</dt>
                    <dd className="font-mono font-semibold text-[#1C1917]">{activeProduct.batch_code || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#57534E]">Net Weight / Unit</dt>
                    <dd className="font-mono text-[#1C1917]">{activeProduct.unit_label} ({activeProduct.weight_grams} g)</dd>
                  </div>
                  {activeProduct.is_food_product === 1 && (
                    <>
                      <div>
                        <dt className="text-[#57534E]">FSSAI / Licence Declaration</dt>
                        <dd className="text-[#1C1917]">{activeProduct.fssai_license || 'Pending verification'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Mfg / Best Before</dt>
                        <dd className="font-mono text-[#1C1917]">{activeProduct.mfg_date} → {activeProduct.expiry_date}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[#57534E]">Ingredients</dt>
                        <dd className="text-[#1C1917]">{activeProduct.ingredients}</dd>
                      </div>
                    </>
                  )}
                </dl>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={activeProduct.stock_qty <= 0}
                    onClick={() => {
                      onAddToCart(activeProduct, selectedVariant || activeProduct.unit_label);
                      setActiveProduct(null);
                      setCheckoutStep('cart');
                      setCartOpen(true);
                    }}
                    className="flex-1 py-2.5 px-5 bg-[#14532D] hover:bg-[#114224] text-white text-sm font-semibold rounded-md cursor-pointer"
                  >
                    Add to Bag
                  </button>
                  {activeProduct.batch_code && (
                    <button
                      type="button"
                      onClick={() => {
                        const code = activeProduct.batch_code;
                        setActiveProduct(null);
                        onOpenTraceability(code);
                      }}
                      className="px-4 py-2.5 border border-[#D6CEBE] hover:border-[#14532D] text-xs font-medium text-[#1C1917] rounded-md inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-[#14532D]" />
                      <span>Verify Batch QR</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER CART & CHECKOUT DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex justify-end" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-lg h-full flex flex-col border-l border-[#E5E0D8]">
            <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-[#1C1917]">
                {checkoutStep === 'cart' && 'Shopping Bag'}
                {checkoutStep === 'shipping' && 'Delivery & Payment'}
                {checkoutStep === 'receipt' && 'Order Confirmation & Invoice'}
              </h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="text-xs px-2.5 py-1 border border-[#E5E0D8] rounded text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <p className="text-sm text-[#57534E]">Your bag is empty.</p>
                      <p className="text-xs text-[#78716C]">Browse village-crafted oils, spices, millets, and handicrafts.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={`${item.product.id}-${item.variant}`} className="flex gap-4 border-b border-[#F2EFE9] pb-4">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 object-cover rounded border border-[#E5E0D8] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1C1917] truncate">{item.product.name}</p>
                            <p className="text-xs text-[#57534E]">{item.variant} · {item.product.seller_name}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="inline-flex items-center border border-[#D6CEBE] rounded">
                                <button
                                  type="button"
                                  onClick={() => onUpdateCartQty(item.product.id, item.variant, -1)}
                                  className="p-1.5 text-[#44403C] hover:bg-[#F2EFE9] cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2.5 text-xs font-mono tabular-nums">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateCartQty(item.product.id, item.variant, 1)}
                                  className="p-1.5 text-[#44403C] hover:bg-[#F2EFE9] cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono tabular-nums text-sm font-semibold">
                                  ₹{(item.product.discount_price * item.quantity).toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemoveFromCart(item.product.id, item.variant)}
                                  aria-label="Remove item"
                                  className="text-[#78716C] hover:text-red-700 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="bg-[#FBF9F5] border border-[#E5E0D8] p-4 rounded-md space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#57534E]">Subtotal</span>
                          <span className="font-mono tabular-nums">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#57534E]">Configured GST / Tax ({settings.tax_rate_pct}%)</span>
                          <span className="font-mono tabular-nums">₹{taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#57534E]">
                            Delivery (Free over ₹{settings.free_shipping_threshold})
                          </span>
                          <span className="font-mono tabular-nums">
                            {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E5E0D8] text-sm font-semibold text-[#1C1917]">
                          <span>Final Payable</span>
                          <span className="font-mono tabular-nums">₹{totalPayable.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {checkoutStep === 'shipping' && (
                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                  {checkoutError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-md">{checkoutError}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={address.customer_name}
                        onChange={(e) => setAddress({ ...address, customer_name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={address.customer_phone}
                        onChange={(e) => setAddress({ ...address, customer_phone: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#44403C] mb-1">Full Delivery Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={address.shipping_address}
                      onChange={(e) => setAddress({ ...address, shipping_address: e.target.value })}
                      placeholder="House/Village, Panchayat, Landmark"
                      className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">District</label>
                      <input
                        type="text"
                        value={address.district}
                        onChange={(e) => setAddress({ ...address, district: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">PIN Code *</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={address.pincode}
                          onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                          className="w-full px-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
                        />
                        <button
                          type="button"
                          onClick={checkServiceability}
                          className="px-2.5 py-2 text-xs bg-[#F2EFE9] border border-[#D6CEBE] rounded-md cursor-pointer shrink-0"
                        >
                          Check
                        </button>
                      </div>
                    </div>
                  </div>

                  {pincodeResult && (
                    <div className="p-3 bg-[#14532D]/5 border border-[#14532D]/20 rounded-md text-xs text-[#14532D] flex items-start gap-2">
                      <Truck className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">
                          Shiprocket Serviceable ({pincodeResult.pincode}) · Est. {pincodeResult.estimated_days}
                        </p>
                        <p className="text-[#44403C] mt-0.5">
                          Courier: {pincodeResult.couriers[0]?.name}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#44403C]">Payment Option</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAddress({ ...address, payment_method: 'ONLINE_SANDBOX' })}
                        className={`p-3 border rounded-md text-left text-xs cursor-pointer ${
                          address.payment_method === 'ONLINE_SANDBOX'
                            ? 'border-[#14532D] bg-[#14532D]/5 font-semibold'
                            : 'border-[#D6CEBE]'
                        }`}
                      >
                        Online Gateway (Sandbox)
                        <span className="block text-[11px] font-normal text-[#57534E] mt-0.5">UPI / Cards / NetBanking</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddress({ ...address, payment_method: 'COD' })}
                        className={`p-3 border rounded-md text-left text-xs cursor-pointer ${
                          address.payment_method === 'COD'
                            ? 'border-[#14532D] bg-[#14532D]/5 font-semibold'
                            : 'border-[#D6CEBE]'
                        }`}
                      >
                        Cash on Delivery
                        <span className="block text-[11px] font-normal text-[#57534E] mt-0.5">Pay upon delivery</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      Security Note: PIHU never stores card numbers or CVV. E-commerce funds are reconciled separately from NGO donations.
                    </p>
                  </div>
                </form>
              )}

              {checkoutStep === 'receipt' && orderReceipt && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#14532D]/10 border border-[#14532D]/25 rounded-md flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#14532D] shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-[#14532D]">Order Confirmed</p>
                      <p className="font-mono text-xs text-[#1C1917] mt-0.5">{orderReceipt.order_number}</p>
                    </div>
                  </div>

                  <div className="border border-[#E5E0D8] rounded-md p-4 text-xs space-y-2">
                    <div className="flex justify-between font-semibold text-[#1C1917] border-b border-[#F2EFE9] pb-2">
                      <span>PIHU Tax Invoice (Commercial Order)</span>
                      <span className="font-mono">{orderReceipt.order_number}</span>
                    </div>
                    <p><span className="text-[#57534E]">Buyer:</span> {orderReceipt.customer.customer_name} ({orderReceipt.customer.customer_phone})</p>
                    <p><span className="text-[#57534E]">Ship To:</span> {orderReceipt.customer.shipping_address}, {orderReceipt.customer.district} - {orderReceipt.customer.pincode}</p>
                    <p><span className="text-[#57534E]">Payment:</span> {orderReceipt.payment_status} {orderReceipt.payment_txn_id ? `(${orderReceipt.payment_txn_id})` : ''}</p>
                    <div className="pt-2 border-t border-[#F2EFE9] flex justify-between font-semibold text-sm">
                      <span>Total Paid / Due</span>
                      <span className="font-mono tabular-nums">₹{Number(orderReceipt.total_amount).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <QrCodeSvg value={orderReceipt.order_number} size={72} />
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-[#D6CEBE] rounded-md text-xs font-medium cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Invoice</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {checkoutStep !== 'receipt' && cart.length > 0 && (
              <div className="px-6 py-4 border-t border-[#E5E0D8] bg-[#FBF9F5] flex items-center justify-between gap-4">
                {checkoutStep === 'shipping' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      className="px-4 py-2.5 border border-[#D6CEBE] rounded-md text-xs font-medium cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      form="checkout-form"
                      disabled={placingOrder}
                      className="flex-1 py-2.5 bg-[#14532D] hover:bg-[#114224] text-white text-sm font-semibold rounded-md cursor-pointer"
                    >
                      {placingOrder ? 'Processing...' : `Confirm Order · ₹${totalPayable.toFixed(2)}`}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('shipping')}
                    className="w-full py-2.5 bg-[#14532D] hover:bg-[#114224] text-white text-sm font-semibold rounded-md cursor-pointer"
                  >
                    Proceed to Checkout · ₹{totalPayable.toFixed(2)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
