import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AuthUser, Language } from '../types';
import { copy } from '../i18n';

export type AppSection = 'home' | 'initiatives' | 'marketplace' | 'rural-hub' | 'apply' | 'portal';

interface NavbarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  lang: Language;
  user: AuthUser | null;
}

export function Navbar({ activeSection, onNavigate, lang, user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = copy[lang];

  const navItems: { id: AppSection; label: string }[] = [
    { id: 'home', label: t.navHome },
    { id: 'initiatives', label: t.navInitiatives },
    { id: 'marketplace', label: t.navMarketplace },
    { id: 'rural-hub', label: t.navRuralHub },
    { id: 'apply', label: t.navApply },
  ];

  const handleGo = (id: AppSection) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-[#E5E0D8] no-print">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleGo('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#14532D] cursor-pointer"
        >
          <img
            src="/assets/aistudio/FB_IMG_1781536788497_1176a863.jpg"
            alt="PIHU official logo"
            referrerPolicy="no-referrer"
            className="w-9 h-9 object-contain rounded border border-[#E5E0D8] bg-white shrink-0"
          />
          <span className="font-serif text-xl font-bold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0">
            PIHU
          </span>
        </button>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleGo(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#14532D] border-b-2 border-[#14532D]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleGo('portal')}
            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114224] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? `${user.name.split(' ')[0]} · ${user.role.replace('_', ' ')}` : t.navPortal}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#1C1917] border border-[#E5E0D8] rounded-md"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E0D8] bg-[#FBF9F5] px-6 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleGo(item.id)}
              className={`block w-full text-left py-2.5 text-sm font-medium ${
                activeSection === item.id ? 'text-[#14532D] font-semibold' : 'text-[#44403C]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleGo('portal')}
            className="w-full mt-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#14532D] rounded-md text-center"
          >
            {user ? `${user.name} (${user.role})` : t.navPortal}
          </button>
        </div>
      )}
    </header>
  );
}
