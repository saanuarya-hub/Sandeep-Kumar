import { X } from 'lucide-react';

interface BlueprintDocsModalProps {
  open: boolean;
  onClose: () => void;
}

export function BlueprintDocsModal({ open, onClose }: BlueprintDocsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white border border-[#E5E0D8] rounded-md max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium">Deliverable #23 & Architecture Blueprint</p>
            <h2 className="font-serif text-xl font-semibold text-[#1C1917]">
              PIHU System Architecture, Database Schema, Timeline & Cost Estimate
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 border border-[#E5E0D8] rounded text-[#57534E] hover:text-[#1C1917] cursor-pointer"
            aria-label="Close technical documentation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#44403C] leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-serif text-base font-semibold text-[#1C1917]">1. Unified Technical Architecture</h3>
            <p>
              All interfaces (Public Bilingual NGO Website, Customer Mobile App, Seller Mobile App, Super Admin Web Panel, and Seller Web Panel) connect over HTTPS REST APIs (<code className="font-mono">/api/*</code>) to one central Express/Node.js backend and relational SQLite/PostgreSQL database. Donations and e-commerce ledgers are strictly isolated across separate tables and accounting controls.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-base font-semibold text-[#1C1917]">2. Relational Database Structure (22 Core Tables)</h3>
            <p className="font-mono text-[11px] bg-[#FBF9F5] border border-[#E5E0D8] p-3 rounded">
              site_settings · users · projects · events · forms · form_submissions · members · volunteers · donations · categories · sellers · products · batches · orders · order_items · seller_payouts · vmgs · vmg_meetings · ovop_items · agri_bank · rural_logistics · cms_items · notifications · audit_logs
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-base font-semibold text-[#1C1917]">3. 7-Phase Development Timeline (20–24 Weeks Full Mobile + Web Rollout)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Phase 1 (Weeks 1–2): UI/UX, DB Schema, Legal Safeguard Architecture',
                'Phase 2 (Weeks 3–6): Bilingual Website, CMS, Forms, Members & Volunteers',
                'Phase 3 (Weeks 7–10): Customer Android & iOS Apps (Flutter/React Native)',
                'Phase 4 (Weeks 11–14): Seller Apps, Multi-Vendor Catalog & Cart',
                'Phase 5 (Weeks 15–17): Payment Gateway, Commissions & Shiprocket API',
                'Phase 6 (Weeks 18–20): VMG, OVOP, Beej Bhandaran & Batch QR Traceability',
                'Phase 7 (Weeks 21–24): Security Audit, UAT, Play Store/App Store & Cloud Launch',
              ].map((p) => (
                <div key={p} className="p-2.5 bg-[#FBF9F5] border border-[#E5E0D8] rounded">
                  {p}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif text-base font-semibold text-[#1C1917]">4. Estimated Implementation & Third-Party Service Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-[#E5E0D8]">
                <thead>
                  <tr className="bg-[#F2EFE9] border-b border-[#E5E0D8]">
                    <th className="py-2 px-3">Component / Service</th>
                    <th className="py-2 px-3">Scope / Provider</th>
                    <th className="py-2 px-3 text-right">Indicative Cost (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#F2EFE9]">
                    <td className="py-2 px-3">Web Ecosystem + Backend API + Admin & Seller Panels</td>
                    <td className="py-2 px-3">Full-Stack React + Node/Express + Relational DB</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">₹2,40,000 – ₹3,50,000</td>
                  </tr>
                  <tr className="border-b border-[#F2EFE9]">
                    <td className="py-2 px-3">Customer & Seller Mobile Apps (Android + iOS)</td>
                    <td className="py-2 px-3">Cross-platform Flutter / React Native builds</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">₹2,80,000 – ₹4,20,000</td>
                  </tr>
                  <tr className="border-b border-[#F2EFE9]">
                    <td className="py-2 px-3">Cloud Hosting, Managed DB, SSL & S3 Storage</td>
                    <td className="py-2 px-3">AWS / GCP / DigitalOcean + Automated Backups</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">₹3,500 – ₹8,000 / mo</td>
                  </tr>
                  <tr className="border-b border-[#F2EFE9]">
                    <td className="py-2 px-3">Payment Gateway & Shiprocket Logistics</td>
                    <td className="py-2 px-3">Razorpay/Cashfree (~2% TDR) + Shiprocket Wallet</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">Pay-per-transaction</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">SMS OTP, Domain & App Store Developer Accounts</td>
                    <td className="py-2 px-3">DLT SMS + Google Play ($25 once) + Apple ($99/yr)</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">~₹12,000 / yr</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
