import { useEffect, useState } from 'react';
import { Globe, QrCode, ShoppingBag, BookOpen } from 'lucide-react';
import {
  AuthUser,
  CartItem,
  Category,
  CmsItem,
  DynamicForm,
  Language,
  MemberRecord,
  PihuEvent,
  Product,
  Project,
  SiteSettings,
} from './types';
import { apiFetch, getStoredToken, setStoredToken } from './api';
import { Navbar, AppSection } from './components/Navbar';
import { HomeAndNgoView } from './components/HomeAndNgoView';
import { MarketplaceView } from './components/MarketplaceView';
import { RuralHubView } from './components/RuralHubView';
import { FormsAndApplyView } from './components/FormsAndApplyView';
import { PortalWorkspaceView } from './components/PortalWorkspaceView';
import { BlueprintDocsModal } from './components/BlueprintDocsModal';

export default function App() {
  const [section, setSection] = useState<AppSection>('home');
  const [lang, setLang] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<PihuEvent[]>([]);
  const [cmsItems, setCmsItems] = useState<CmsItem[]>([]);
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberCard, setMemberCard] = useState<MemberRecord | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [traceBatchCode, setTraceBatchCode] = useState<string | undefined>(undefined);
  const [docsOpen, setDocsOpen] = useState(false);

  const loadApp = async () => {
    try {
      const [boot, prods] = await Promise.all([apiFetch('/api/bootstrap'), apiFetch('/api/products')]);
      setSettings(boot.settings);
      setCategories(boot.categories);
      setProjects(boot.projects);
      setEvents(boot.events);
      setCmsItems(boot.cmsItems);
      setForms(boot.forms);
      setProducts(prods);
      setUser(boot.user);
      setMemberCard(boot.memberCard);
      if (!boot.user && getStoredToken()) {
        setStoredToken(null);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to connect to PIHU backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const batchParam = params.get('batch');
    if (batchParam) {
      setTraceBatchCode(batchParam);
      setSection('rural-hub');
    }
    loadApp();
  }, []);

  const handleAddToCart = (product: Product, variant?: string) => {
    const v = variant || product.unit_label;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id && i.variant === v);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, variant: v, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (productId: number, variant: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId && item.variant === variant
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId: number, variant: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.variant === variant)));
  };

  const handleToggleWishlist = (productId: number) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const handleOpenTraceability = (code: string) => {
    setTraceBatchCode(code);
    setSection('rural-hub');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (next: AppSection) => {
    setSection(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-serif text-2xl font-semibold text-[#1C1917]">PIHU – Pan India Helping Unit</p>
          <p className="text-xs text-[#57534E]">Loading Hazaribagh rural development & marketplace workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E5E0D8] rounded-md p-6 max-w-md text-center space-y-3">
          <h1 className="font-serif text-xl font-semibold text-[#1C1917]">Service Unavailable</h1>
          <p className="text-sm text-[#57534E]">{error || 'Unable to load platform configuration.'}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadApp();
            }}
            className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-md cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917]">
      <Navbar activeSection={section} onNavigate={handleNavigate} lang={lang} user={user} />

      {/* Quiet Operational Utility Strip below Top Bar */}
      <div className="border-b border-[#E5E0D8] bg-[#F2EFE9]/60 no-print">
        <div className="max-w-[1280px] mx-auto px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#44403C]">
          <div className="flex items-center gap-3 flex-wrap">
            <span>{settings.pilot_location}</span>
            <span aria-hidden="true">·</span>
            <span>{settings.legal_status}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="inline-flex items-center gap-1.5 font-medium text-[#1C1917] hover:text-[#14532D] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-[#14532D]" />
              <span>{lang === 'en' ? 'हिन्दी में देखें' : 'View in English'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenTraceability('PIHU-B26-OIL01')}
              className="inline-flex items-center gap-1.5 text-[#44403C] hover:text-[#14532D] cursor-pointer whitespace-nowrap shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Batch QR</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('marketplace')}
              className="inline-flex items-center gap-1.5 font-medium text-[#1C1917] hover:text-[#14532D] cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">Bag ({cartCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {(section === 'home' || section === 'initiatives') && (
          <HomeAndNgoView
            mode={section}
            lang={lang}
            settings={settings}
            projects={projects}
            events={events}
            cmsItems={cmsItems}
            onNavigate={handleNavigate}
            onEventRegistered={loadApp}
          />
        )}

        {section === 'marketplace' && (
          <MarketplaceView
            lang={lang}
            settings={settings}
            categories={categories}
            products={products}
            cart={cart}
            wishlist={wishlist}
            user={user}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={() => setCart([])}
            onToggleWishlist={handleToggleWishlist}
            onOrderComplete={loadApp}
            onOpenTraceability={handleOpenTraceability}
          />
        )}

        {section === 'rural-hub' && (
          <RuralHubView lang={lang} initialBatchCode={traceBatchCode} />
        )}

        {section === 'apply' && (
          <FormsAndApplyView
            lang={lang}
            settings={settings}
            forms={forms}
            onSubmitted={loadApp}
          />
        )}

        {section === 'portal' && (
          <PortalWorkspaceView
            user={user}
            settings={settings}
            categories={categories}
            forms={forms}
            memberCard={memberCard}
            onAuthChange={setUser}
            onRefreshGlobal={loadApp}
          />
        )}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-[#E5E0D8] bg-white py-10 no-print">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-[#57534E]">
          <div className="flex items-start gap-3.5">
            <img
              src="/assets/aistudio/FB_IMG_1781536788497_1176a863.jpg"
              alt="PIHU – Pan India Helping Unit logo"
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-contain rounded border border-[#E5E0D8] bg-white shrink-0"
            />
            <div className="space-y-1">
              <p className="font-serif text-base font-semibold text-[#1C1917]">{settings.org_name}</p>
              <p>{settings.tagline}</p>
              <p>
                {settings.pilot_location} · {settings.contact_phone} · {settings.contact_email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('apply')}
              className="hover:text-[#1C1917] cursor-pointer"
            >
              Privacy & Terms Disclosure
            </button>
            <button
              type="button"
              onClick={() => setDocsOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium text-[#14532D] hover:underline cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Architecture, Schema & Cost Docs</span>
            </button>
            <span>© 2026 PIHU Initiative</span>
          </div>
        </div>
      </footer>

      <BlueprintDocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
    </div>
  );
}
