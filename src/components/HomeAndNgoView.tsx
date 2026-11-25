import { useState } from 'react';
import { ArrowRight, Calendar, MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { CmsItem, Language, PihuEvent, Project, SiteSettings } from '../types';
import { copy, ruralPillars } from '../i18n';
import { AppSection } from './Navbar';
import { apiFetch } from '../api';

interface HomeAndNgoViewProps {
  mode: 'home' | 'initiatives';
  lang: Language;
  settings: SiteSettings;
  projects: Project[];
  events: PihuEvent[];
  cmsItems: CmsItem[];
  onNavigate: (section: AppSection) => void;
  onEventRegistered: () => void;
}

export function HomeAndNgoView({
  mode,
  lang,
  settings,
  projects,
  events,
  cmsItems,
  onNavigate,
  onEventRegistered,
}: HomeAndNgoViewProps) {
  const t = copy[lang];
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<'all' | 'proposed' | 'ongoing' | 'completed'>('all');
  const [regEvent, setRegEvent] = useState<PihuEvent | null>(null);
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', village: '' });
  const [regStatus, setRegStatus] = useState<string>('');
  const [regError, setRegError] = useState<string>('');
  const [submittingReg, setSubmittingReg] = useState(false);

  const filteredProjects = projects.filter((p) => {
    if (selectedProjectFilter === 'all') return true;
    return p.status === selectedProjectFilter;
  });

  const announcements = cmsItems.filter((c) => c.item_type === 'announcement' || c.item_type === 'story');
  const faqs = cmsItems.filter((c) => c.item_type === 'faq');

  const handleRegisterEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEvent) return;
    setSubmittingReg(true);
    setRegError('');
    setRegStatus('');
    try {
      const res = await apiFetch(`/api/events/${regEvent.id}/register`, {
        method: 'POST',
        body: JSON.stringify(regForm),
      });
      setRegStatus(`Registration confirmed. Reference: ${res.reference_no}`);
      setRegForm({ name: '', phone: '', email: '', village: '' });
      onEventRegistered();
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setSubmittingReg(false);
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* HERO SECTION (Shown prominently on Home) */}
      {mode === 'home' && (
        <section className="max-w-[1280px] mx-auto px-6 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between py-2">
              <div>
                <p className="text-xs font-medium tracking-wider uppercase text-[#9A3412] mb-4">
                  {t.heroKicker}
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-[#1C1917] leading-[1.12] mb-6">
                  {t.heroTitle}
                </h1>
                <p className="text-base sm:text-lg text-[#44403C] leading-relaxed max-w-2xl mb-8">
                  {t.heroSubtitle}
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <button
                    type="button"
                    onClick={() => onNavigate('marketplace')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#14532D] hover:bg-[#114224] text-white text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{t.heroCtaPrimary}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('apply')}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-[#D6CEBE] bg-white hover:bg-[#F2EFE9] text-[#1C1917] text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {t.heroCtaSecondary}
                  </button>
                </div>
              </div>

              {/* Part N Legal & Stage Transparency Notice */}
              <div className="border border-[#E5E0D8] bg-[#F2EFE9]/70 p-4 rounded-md text-xs text-[#44403C] leading-relaxed">
                <span className="font-semibold text-[#1C1917]">
                  {lang === 'hi' ? 'संगठनात्मक स्थिति: ' : 'Organisational Status: '}
                </span>
                {t.legalBanner}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[340px] border border-[#E5E0D8] bg-[#EBE6DF] overflow-hidden rounded-md flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <img
                    src="/src/assets/images/hero_rural_women_shg_1795605256954.jpg"
                    alt="Rural women Self-Help Group sorting golden grains and woven bamboo baskets in Hazaribagh"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-4 py-3 bg-white border-t border-[#E5E0D8] text-xs text-[#57534E] flex items-center justify-between gap-4">
                  <span>
                    {lang === 'hi'
                      ? 'हजारीबाग पायलट · महिला एसएचजी और ग्राम उद्यम'
                      : 'Hazaribagh Pilot · Women SHG & Village Enterprise'}
                  </span>
                  <span className="font-mono tabular-nums text-[#1C1917]">2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Operational Strip below Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#E5E0D8] border border-[#E5E0D8] mt-8 rounded-md overflow-hidden">
            <div className="bg-white p-5">
              <p className="text-xs text-[#57534E] mb-1">{t.statLocationLabel}</p>
              <p className="font-serif text-lg font-semibold text-[#1C1917]">{t.statLocationVal}</p>
            </div>
            <div className="bg-white p-5">
              <p className="text-xs text-[#57534E] mb-1">{t.statPillarsLabel}</p>
              <p className="font-serif text-lg font-semibold text-[#1C1917]">{t.statPillarsVal}</p>
            </div>
            <div className="bg-white p-5">
              <p className="text-xs text-[#57534E] mb-1">{t.statCommerceLabel}</p>
              <p className="font-serif text-lg font-semibold text-[#1C1917]">{t.statCommerceVal}</p>
            </div>
            <div className="bg-white p-5">
              <p className="text-xs text-[#57534E] mb-1">{t.statContactLabel}</p>
              <p className="font-mono tabular-nums text-base font-semibold text-[#14532D]">{settings.contact_phone}</p>
            </div>
          </div>
        </section>
      )}

      {/* 13 INTEGRATED RURAL DEVELOPMENT PILLARS */}
      <section className="max-w-[1280px] mx-auto px-6 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E0D8] pb-5 mb-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium mb-1">
              {lang === 'hi' ? 'पीहू-विशिष्ट मॉडल' : 'PIHU Rural Development Architecture'}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1C1917]">{t.pillarsTitle}</h2>
          </div>
          <p className="text-sm text-[#57534E] max-w-md">{t.pillarsSub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {ruralPillars.map((pillar) => (
            <div key={pillar.id} className="border-b border-[#E5E0D8] pb-5">
              <div className="flex items-baseline gap-3 mb-1.5">
                <span className="font-mono tabular-nums text-xs text-[#9A3412]">
                  {String(pillar.id).padStart(2, '0')}.
                </span>
                <h3 className="text-base font-semibold text-[#1C1917]">
                  {lang === 'hi' ? pillar.hi : pillar.en}
                </h3>
              </div>
              <p className="text-sm text-[#57534E] leading-relaxed pl-7">
                {lang === 'hi' ? pillar.descHi : pillar.descEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PROPOSED NGO PROJECTS & ACTIVITIES */}
      <section className="max-w-[1280px] mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E0D8] pb-5 mb-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#57534E] mb-1">
              {lang === 'hi' ? 'प्रखंड एवं ग्राम स्तर' : 'Village, Block & District Pilots'}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1C1917]">{t.projectsTitle}</h2>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-md border border-[#E5E0D8]">
            {(['all', 'proposed', 'ongoing', 'completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedProjectFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedProjectFilter === status
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <article key={proj.id} className="bg-white border border-[#E5E0D8] rounded-md overflow-hidden flex flex-col">
              <div className="aspect-[16/10] bg-[#EBE6DF] overflow-hidden">
                <img
                  src={proj.image_url}
                  alt={lang === 'hi' ? proj.title_hi : proj.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-[#57534E] mb-2 flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[#9A3412] uppercase">{proj.status}</span>
                    <span aria-hidden="true">·</span>
                    <span>{proj.category}</span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-[#1C1917] mb-2">
                    {lang === 'hi' ? proj.title_hi : proj.title}
                  </h3>
                  <p className="text-sm text-[#44403C] leading-relaxed mb-4">
                    {lang === 'hi' ? proj.description_hi : proj.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-[#F2EFE9] text-xs text-[#57534E] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
                    <span>{proj.village}, {proj.block}, {proj.district}</span>
                  </div>
                  <div className="font-mono tabular-nums text-[11px]">
                    Target Schedule: {proj.start_date} {proj.end_date ? `→ ${proj.end_date}` : ''}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* UPCOMING EVENTS & ANNOUNCEMENTS */}
      <section className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917] mb-5">{t.eventsTitle}</h2>
            <div className="space-y-4">
              {events.map((ev) => (
                <div key={ev.id} className="bg-white border border-[#E5E0D8] p-5 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs text-[#57534E] flex items-center gap-2">
                      <span className="uppercase font-medium text-[#9A3412]">{ev.is_proposed ? 'Proposed Event' : ev.status}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ev.event_date} · {ev.event_time}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#1C1917]">
                      {lang === 'hi' ? ev.title_hi : ev.title}
                    </h3>
                    <p className="text-sm text-[#57534E]">{lang === 'hi' ? ev.description_hi : ev.description}</p>
                    <p className="text-xs text-[#57534E] flex items-center gap-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#14532D]" />
                      <span>{ev.location}, {ev.district}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ev.registrations_count} registered</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegEvent(ev);
                      setRegStatus('');
                      setRegError('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-[#14532D] border border-[#14532D] hover:bg-[#14532D] hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === 'hi' ? 'पंजीकरण करें' : 'Register'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* NEWS, STORIES & ABOUT SUMMARY */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
              {lang === 'hi' ? 'समाचार, कहानियां एवं सामान्य प्रश्न' : 'Updates, Field Stories & FAQs'}
            </h2>
            <div className="space-y-4">
              {announcements.map((item) => (
                <div key={item.id} className="border-b border-[#E5E0D8] pb-4">
                  <p className="text-xs text-[#9A3412] mb-1">{item.meta_label}</p>
                  <h3 className="text-base font-semibold text-[#1C1917] mb-1">
                    {lang === 'hi' ? item.title_hi : item.title}
                  </h3>
                  <p className="text-sm text-[#57534E] leading-relaxed">
                    {lang === 'hi' ? item.body_hi : item.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-[#F2EFE9]/70 border border-[#E5E0D8] p-5 rounded-md space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#1C1917]">
                {lang === 'hi' ? 'महत्वपूर्ण प्रश्न (FAQ)' : 'Governance & Platform FAQs'}
              </h3>
              {faqs.map((f) => (
                <div key={f.id} className="text-sm space-y-1">
                  <p className="font-semibold text-[#1C1917]">{lang === 'hi' ? f.title_hi : f.title}</p>
                  <p className="text-[#57534E] leading-relaxed">{lang === 'hi' ? f.body_hi : f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INSTITUTIONAL PROFILE, LEGAL TRANSPARENCY & CONTACT */}
      <section className="max-w-[1280px] mx-auto px-6">
        <div className="bg-white border border-[#E5E0D8] rounded-md p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-3">
            <p className="text-xs uppercase tracking-wider text-[#57534E]">
              {lang === 'hi' ? 'हमारे बारे में एवं विधिक स्थिति' : 'About PIHU & Legal Disclosure'}
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
              {settings.org_name}
            </h2>
            <p className="text-sm text-[#44403C] leading-relaxed">
              {lang === 'hi'
                ? 'पीहू (पैन इंडिया हेल्पिंग यूनिट) झारखंड के हजारीबाग जिले से प्रस्तावित एक एकीकृत ग्रामीण विकास पहल है। यह ग्रामीण समुदायों, महिला स्वयं सहायता समूहों, किसानों और उपभोक्ताओं को एक पारदर्शी डिजिटल मंच पर जोड़ने की परिकल्पना करता है।'
                : 'PIHU is a proposed integrated rural development ecosystem initiating from Hazaribagh, Jharkhand, built to coordinate women self-help groups, Village Mother Groups, rural manufacturing units, indigenous seed banks, and direct e-commerce fulfilment.'}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#F2EFE9] text-xs">
              <div>
                <dt className="text-[#57534E]">Current Legal Status</dt>
                <dd className="font-medium text-[#1C1917] mt-0.5">{settings.legal_status}</dd>
              </div>
              <div>
                <dt className="text-[#57534E]">Registration / 80G Status</dt>
                <dd className="font-medium text-[#1C1917] mt-0.5">
                  {settings.registration_number || 'Pending Legal Incorporation (No 80G Claimed)'}
                </dd>
              </div>
              <div>
                <dt className="text-[#57534E]">Trustees & Governing Body</dt>
                <dd className="font-medium text-[#1C1917] mt-0.5">To be published after legal constitution</dd>
              </div>
              <div>
                <dt className="text-[#57534E]">Donation Collection</dt>
                <dd className="font-medium text-[#9A3412] mt-0.5">
                  {settings.donations_enabled ? 'Active (Configured)' : 'Disabled pending legal & bank readiness'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#E5E0D8] pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <h3 className="font-serif text-lg font-semibold text-[#1C1917]">
                {lang === 'hi' ? 'संपर्क सूत्र' : 'Coordination Desk'}
              </h3>
              <p className="text-sm text-[#44403C] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#14532D] shrink-0" />
                <span>{settings.pilot_location}</span>
              </p>
              <p className="text-sm font-mono tabular-nums text-[#44403C] flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#14532D] shrink-0" />
                <span>{settings.contact_phone}</span>
              </p>
              <p className="text-sm text-[#44403C] flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#14532D] shrink-0" />
                <span>{settings.contact_email}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('apply')}
              className="w-full py-2.5 px-4 bg-[#F2EFE9] hover:bg-[#EBE6DF] border border-[#D6CEBE] text-xs font-semibold text-[#1C1917] rounded-md transition-colors cursor-pointer"
            >
              {lang === 'hi' ? 'संपर्क या भागीदारी फॉर्म भरें' : 'Open Contact & Partnership Inquiry Form'}
            </button>
          </div>
        </div>
      </section>

      {/* EVENT REGISTRATION MODAL */}
      {regEvent && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border border-[#E5E0D8] rounded-md max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E0D8] pb-3">
              <div>
                <p className="text-xs text-[#9A3412] uppercase">Event Registration</p>
                <h3 className="font-serif text-lg font-semibold text-[#1C1917]">{regEvent.title}</h3>
                <p className="text-xs text-[#57534E] mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-mono">{regEvent.event_date} · {regEvent.location}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRegEvent(null)}
                className="text-xs text-[#57534E] hover:text-[#1C1917] px-2 py-1"
              >
                Close
              </button>
            </div>

            {regStatus ? (
              <div className="p-4 bg-[#14532D]/10 border border-[#14532D]/25 rounded-md text-sm text-[#14532D] flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Recorded Successfully</p>
                  <p className="mt-1 font-mono text-xs">{regStatus}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterEvent} className="space-y-3">
                {regError && <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">{regError}</p>}
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Village / Block</label>
                  <input
                    type="text"
                    value={regForm.village}
                    onChange={(e) => setRegForm({ ...regForm, village: e.target.value })}
                    placeholder="e.g. Daru, Ichak"
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="w-full py-2.5 bg-[#14532D] hover:bg-[#114224] text-white text-sm font-semibold rounded-md transition-colors cursor-pointer"
                >
                  {submittingReg ? 'Submitting...' : 'Confirm Event Registration'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
