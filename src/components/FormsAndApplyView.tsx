import { useState } from 'react';
import { CheckCircle2, Printer, ShieldAlert, Search, FileText } from 'lucide-react';
import { DynamicForm, Language, MemberRecord, SiteSettings } from '../types';
import { copy } from '../i18n';
import { apiFetch } from '../api';
import { QrCodeSvg } from './QrCodeSvg';

interface FormsAndApplyViewProps {
  lang: Language;
  settings: SiteSettings;
  forms: DynamicForm[];
  onSubmitted: () => void;
}

export function FormsAndApplyView({ lang, settings, forms, onSubmitted }: FormsAndApplyViewProps) {
  const t = copy[lang];
  const [selectedSlug, setSelectedSlug] = useState<string>(forms[0]?.slug || 'ngo-membership');
  const [baseFields, setBaseFields] = useState({
    applicant_name: '',
    applicant_phone: '',
    applicant_email: '',
    district: 'Hazaribagh',
    block: 'Ichak',
    village: '',
  });
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState('');

  // Member ID verification lookup
  const [lookupInput, setLookupInput] = useState('PIHU-HZB-2026-0001');
  const [memberResult, setMemberResult] = useState<MemberRecord | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Donation form state (only active if settings.donations_enabled === 1)
  const [donationForm, setDonationForm] = useState({
    donor_name: '',
    donor_phone: '',
    donor_email: '',
    amount: '500',
    purpose: 'Rural Women Entrepreneurship Pilot',
  });
  const [donationReceipt, setDonationReceipt] = useState<any>(null);
  const [donationError, setDonationError] = useState('');

  const activeForm = forms.find((f) => f.slug === selectedSlug) || forms[0];

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitResult(null);
    try {
      const res = await apiFetch(`/api/forms/${activeForm.slug}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          ...baseFields,
          data: dynamicValues,
        }),
      });
      setSubmitResult(res);
      setBaseFields({
        applicant_name: '',
        applicant_phone: '',
        applicant_email: '',
        district: 'Hazaribagh',
        block: 'Ichak',
        village: '',
      });
      setDynamicValues({});
      onSubmitted();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMemberLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setMemberResult(null);
    try {
      const res = await apiFetch(`/api/members/lookup?ref=${encodeURIComponent(lookupInput.trim())}`);
      setMemberResult(res);
    } catch (err: any) {
      setLookupError(err.message);
    }
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDonationError('');
    setDonationReceipt(null);
    try {
      const res = await apiFetch('/api/donations', {
        method: 'POST',
        body: JSON.stringify(donationForm),
      });
      setDonationReceipt({ ...res, ...donationForm });
    } catch (err: any) {
      setDonationError(err.message);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-12">
      <div className="border-b border-[#E5E0D8] pb-6">
        <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium mb-1">
          {lang === 'hi' ? 'ऑनलाइन आवेदन एवं सदस्यता प्रणाली' : 'Dynamic Forms, Membership & Contribution Safeguards'}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917]">{t.formsTitle}</h1>
        <p className="text-sm text-[#57534E] mt-2 max-w-2xl">{t.formsSub}</p>
      </div>

      {/* SECTION 1: DYNAMIC FORMS & SUBMISSION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-3">
            Available Forms ({forms.length})
          </p>
          {forms.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setSelectedSlug(f.slug);
                setSubmitResult(null);
                setSubmitError('');
              }}
              className={`w-full text-left p-3.5 border rounded-md transition-colors cursor-pointer ${
                activeForm?.slug === f.slug
                  ? 'bg-white border-[#14532D] text-[#1C1917]'
                  : 'bg-[#FBF9F5] border-[#E5E0D8] text-[#44403C] hover:bg-white'
              }`}
            >
              <p className="text-[11px] uppercase tracking-wider text-[#9A3412]">{f.category}</p>
              <p className="text-sm font-semibold mt-0.5">{lang === 'hi' ? f.title_hi : f.title}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 bg-white border border-[#E5E0D8] rounded-md p-6 sm:p-8">
          {activeForm && (
            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="border-b border-[#F2EFE9] pb-4">
                <p className="text-xs text-[#9A3412] uppercase font-medium">{activeForm.category}</p>
                <h2 className="font-serif text-2xl font-semibold text-[#1C1917] mt-1">
                  {lang === 'hi' ? activeForm.title_hi : activeForm.title}
                </h2>
                <p className="text-sm text-[#57534E] mt-1">{activeForm.description}</p>
              </div>

              {submitResult && (
                <div className="p-4 bg-[#14532D]/10 border border-[#14532D]/25 rounded-md text-sm text-[#14532D] flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Application Submitted Successfully</p>
                    <p className="font-mono text-xs mt-1">
                      Reference Number: <strong>{submitResult.reference_no}</strong>
                    </p>
                    <p className="text-xs text-[#1C1917] mt-1">{submitResult.message}</p>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-md">{submitError}</div>
              )}

              {/* Standard Identity & Location Fields (No mandatory Aadhaar per Part N/44!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={baseFields.applicant_name}
                    onChange={(e) => setBaseFields({ ...baseFields, applicant_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={baseFields.applicant_phone}
                    onChange={(e) => setBaseFields({ ...baseFields, applicant_phone: e.target.value })}
                    placeholder="+91"
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={baseFields.applicant_email}
                    onChange={(e) => setBaseFields({ ...baseFields, applicant_email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">District</label>
                  <input
                    type="text"
                    value={baseFields.district}
                    onChange={(e) => setBaseFields({ ...baseFields, district: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Block</label>
                  <input
                    type="text"
                    value={baseFields.block}
                    onChange={(e) => setBaseFields({ ...baseFields, block: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Village / Panchayat</label>
                  <input
                    type="text"
                    value={baseFields.village}
                    onChange={(e) => setBaseFields({ ...baseFields, village: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
              </div>

              {/* Dynamic Fields configured by Form Builder */}
              <div className="space-y-4 pt-3 border-t border-[#F2EFE9]">
                {activeForm.fields.map((field) => (
                  <div key={field.id}>
                    {field.type === 'checkbox' ? (
                      <label className="flex items-start gap-2.5 text-xs text-[#44403C] cursor-pointer">
                        <input
                          type="checkbox"
                          required={field.required}
                          checked={Boolean(dynamicValues[field.id])}
                          onChange={(e) => setDynamicValues({ ...dynamicValues, [field.id]: e.target.checked })}
                          className="mt-0.5 accent-[#14532D]"
                        />
                        <span>{field.label} {field.required ? '*' : ''}</span>
                      </label>
                    ) : field.type === 'select' ? (
                      <>
                        <label className="block text-xs font-medium text-[#44403C] mb-1">
                          {field.label} {field.required ? '*' : ''}
                        </label>
                        <select
                          required={field.required}
                          value={dynamicValues[field.id] || ''}
                          onChange={(e) => setDynamicValues({ ...dynamicValues, [field.id]: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md bg-white"
                        >
                          <option value="">Select an option</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </>
                    ) : field.type === 'radio' ? (
                      <>
                        <p className="text-xs font-medium text-[#44403C] mb-1.5">
                          {field.label} {field.required ? '*' : ''}
                        </p>
                        <div className="flex flex-wrap gap-4">
                          {(field.options || []).map((opt) => (
                            <label key={opt} className="inline-flex items-center gap-2 text-xs text-[#44403C] cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                required={field.required}
                                checked={dynamicValues[field.id] === opt}
                                onChange={() => setDynamicValues({ ...dynamicValues, [field.id]: opt })}
                                className="accent-[#14532D]"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-[#44403C] mb-1">
                          {field.label} {field.required ? '*' : ''}
                        </label>
                        <input
                          type={field.type === 'date' ? 'date' : 'text'}
                          required={field.required}
                          value={dynamicValues[field.id] || ''}
                          onChange={(e) => setDynamicValues({ ...dynamicValues, [field.id]: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-[11px] text-[#57534E]">
                  Privacy Policy: Only essential contact & block details are collected. Aadhaar is never mandatory.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#14532D] hover:bg-[#114224] text-white text-sm font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* SECTION 2: MEMBER ID LOOKUP & DIGITAL ID CARD + DONATIONS GUARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-[#E5E0D8]">
        {/* Member ID Lookup & Printable Digital Card */}
        <div className="lg:col-span-6 bg-white border border-[#E5E0D8] rounded-md p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium">PIHU Member ID System</p>
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917] mt-1">
              Verify Application & Digital ID Card
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              Enter your Application Reference (`PIHU-APP-2026-1002`) or approved Member ID (`PIHU-HZB-2026-0001`). Official IDs are issued only after admin approval.
            </p>
          </div>

          <form onSubmit={handleMemberLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1C1917] text-white text-xs font-semibold rounded-md cursor-pointer"
            >
              Check Status
            </button>
          </form>

          {lookupError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-md">{lookupError}</p>
          )}

          {memberResult && (
            <div className="border border-[#D6CEBE] bg-[#FBF9F5] rounded-md p-5 space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-[#E5E0D8] pb-3">
                <div className="flex items-start gap-3">
                  <img
                    src="/assets/aistudio/FB_IMG_1781536788497_1176a863.jpg"
                    alt="PIHU official logo"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 object-contain rounded border border-[#E5E0D8] bg-white shrink-0"
                  />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#14532D] font-semibold">
                      PIHU – PAN INDIA HELPING UNIT
                    </p>
                    <h3 className="font-serif text-lg font-semibold text-[#1C1917] mt-0.5">
                      {memberResult.full_name}
                    </h3>
                    <p className="text-xs text-[#57534E]">
                      {memberResult.role_type} · {memberResult.village}, {memberResult.block}, {memberResult.district}
                    </p>
                  </div>
                </div>
                {memberResult.member_id ? (
                  <QrCodeSvg value={`PIHU-MEMBER:${memberResult.member_id}`} size={76} />
                ) : (
                  <FileText className="w-8 h-8 text-[#9A3412]" />
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[#57534E]">Application Ref</dt>
                  <dd className="font-mono text-[#1C1917]">{memberResult.application_ref}</dd>
                </div>
                <div>
                  <dt className="text-[#57534E]">Status</dt>
                  <dd className="uppercase font-semibold text-[#14532D]">{memberResult.status}</dd>
                </div>
                <div>
                  <dt className="text-[#57534E]">Official Member ID</dt>
                  <dd className="font-mono font-semibold text-[#1C1917]">
                    {memberResult.member_id || 'Pending Admin Approval'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#57534E]">Valid Until</dt>
                  <dd className="font-mono text-[#1C1917]">{memberResult.renewal_due || '—'}</dd>
                </div>
              </dl>

              {memberResult.member_id && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#D6CEBE] rounded-md text-xs font-medium cursor-pointer no-print"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save Digital Member ID</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Donation & Contribution Safeguard Panel */}
        <div className="lg:col-span-6 bg-white border border-[#E5E0D8] rounded-md p-6 space-y-4">
          <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium">
            Module 7 · Donation & Contribution Governance
          </p>
          <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
            Contributions & Legal Readiness Safeguard
          </h2>

          {settings.donations_enabled !== 1 ? (
            <div className="p-5 bg-[#F2EFE9] border border-[#D6CEBE] rounded-md space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#9A3412] shrink-0 mt-0.5" />
                <div className="text-sm text-[#1C1917] space-y-1.5">
                  <p className="font-semibold">Online Donation Collection Is Currently Disabled</p>
                  <p className="text-xs text-[#44403C] leading-relaxed">
                    Per PIHU’s governance policy (Part N), public donation acceptance and 80G tax-exemption claims remain locked while legal incorporation, dedicated NGO bank accounts, and regulatory approvals are pending.
                  </p>
                  <p className="text-xs text-[#57534E] leading-relaxed">
                    Authorized Super Administrators can activate contribution workflows from the Admin Settings panel once formal registration documents are uploaded.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDonationSubmit} className="space-y-3">
              {donationError && <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">{donationError}</p>}
              {donationReceipt && (
                <div className="p-4 bg-[#14532D]/10 border border-[#14532D]/25 rounded-md text-xs space-y-1">
                  <p className="font-semibold text-[#14532D]">Contribution Recorded · Receipt {donationReceipt.receipt_no}</p>
                  <p>Ref: {donationReceipt.payment_ref} · Amount: ₹{donationReceipt.amount}</p>
                  <p className="text-[#57534E]">
                    {donationReceipt.tax_exempt_claimed
                      ? `80G Ref: ${settings.section_80g_number}`
                      : 'Non-80G Receipt (No tax exemption claimed)'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Donor Name *"
                  value={donationForm.donor_name}
                  onChange={(e) => setDonationForm({ ...donationForm, donor_name: e.target.value })}
                  className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                />
                <input
                  type="tel"
                  required
                  placeholder="Mobile Number *"
                  value={donationForm.donor_phone}
                  onChange={(e) => setDonationForm({ ...donationForm, donor_phone: e.target.value })}
                  className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={10}
                  required
                  placeholder="Amount (INR) *"
                  value={donationForm.amount}
                  onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                  className="px-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
                />
                <input
                  type="text"
                  placeholder="Purpose"
                  value={donationForm.purpose}
                  onChange={(e) => setDonationForm({ ...donationForm, purpose: e.target.value })}
                  className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#14532D] text-white text-sm font-semibold rounded-md cursor-pointer"
              >
                Complete Contribution (Sandbox)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
