import { useState, useEffect } from 'react';
import { QrCode, Search, AlertTriangle, Users, Sprout, Truck, Layers } from 'lucide-react';
import { Language } from '../types';
import { copy } from '../i18n';
import { apiFetch } from '../api';
import { QrCodeSvg } from './QrCodeSvg';

interface RuralHubViewProps {
  lang: Language;
  initialBatchCode?: string;
}

type HubTab = 'vmg' | 'ovop' | 'agri' | 'logistics' | 'traceability';

export function RuralHubView({ lang, initialBatchCode }: RuralHubViewProps) {
  const t = copy[lang];
  const [tab, setTab] = useState<HubTab>(initialBatchCode ? 'traceability' : 'vmg');
  const [vmgs, setVmgs] = useState<any[]>([]);
  const [ovop, setOvop] = useState<any[]>([]);
  const [agri, setAgri] = useState<any[]>([]);
  const [logistics, setLogistics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [batchInput, setBatchInput] = useState(initialBatchCode || 'PIHU-B26-OIL01');
  const [batchRecord, setBatchRecord] = useState<any>(null);
  const [batchError, setBatchError] = useState('');

  useEffect(() => {
    if (initialBatchCode) {
      setTab('traceability');
      setBatchInput(initialBatchCode);
      lookupBatch(initialBatchCode);
    }
  }, [initialBatchCode]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/vmgs'),
      apiFetch('/api/ovop'),
      apiFetch('/api/agri-bank'),
      apiFetch('/api/logistics'),
    ])
      .then(([v, o, a, l]) => {
        setVmgs(v);
        setOvop(o);
        setAgri(a);
        setLogistics(l);
      })
      .finally(() => setLoading(false));

    lookupBatch(initialBatchCode || 'PIHU-B26-OIL01');
  }, []);

  const lookupBatch = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setBatchError('');
    try {
      const data = await apiFetch(`/api/batches/${encodeURIComponent(clean)}`);
      setBatchRecord(data);
    } catch (err: any) {
      setBatchRecord(null);
      setBatchError(err.message);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      <div className="border-b border-[#E5E0D8] pb-6">
        <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium mb-1">
          {lang === 'hi' ? 'पीहू ग्रामीण पारिस्थितिकी तंत्र' : 'PIHU Rural Development Ecosystem · Hazaribagh Pilot'}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917]">{t.ruralHubTitle}</h1>
        <p className="text-sm text-[#57534E] mt-2 max-w-2xl">{t.ruralHubSub}</p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F2EFE9] border border-[#E5E0D8] rounded-md w-fit">
        {[
          { id: 'vmg', label: 'Village Mother Groups (VMG)', icon: Users },
          { id: 'ovop', label: 'One Village One Product (OVOP)', icon: Layers },
          { id: 'agri', label: 'Beej Bhandaran & Raw Bank', icon: Sprout },
          { id: 'logistics', label: 'Rural Logistics', icon: Truck },
          { id: 'traceability', label: 'Batch QR Traceability', icon: QrCode },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as HubTab)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#14532D]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white border border-[#E5E0D8] rounded-md p-8 text-sm text-[#57534E]">
          Loading rural operations data...
        </div>
      ) : (
        <>
          {/* TAB 1: VILLAGE MOTHER GROUPS */}
          {tab === 'vmg' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F2EFE9]/80 border border-[#E5E0D8] rounded-md text-xs text-[#44403C]">
                <span className="font-semibold text-[#1C1917]">Compliance Note: </span>
                All Village Mother Group (VMG) structures and coordinator roles shown below are proposed PIHU community arrangements and are not represented as government-recognised bodies.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {vmgs.map((vmg) => (
                  <div key={vmg.id} className="bg-white border border-[#E5E0D8] rounded-md p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-[#F2EFE9] pb-3">
                      <div>
                        <p className="font-mono text-xs text-[#9A3412]">{vmg.vmg_code} · {vmg.status.toUpperCase()}</p>
                        <h2 className="font-serif text-xl font-semibold text-[#1C1917] mt-0.5">{vmg.group_name}</h2>
                        <p className="text-xs text-[#57534E] mt-0.5">
                          Village {vmg.village} · {vmg.panchayat} · {vmg.block} Block, {vmg.district}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono tabular-nums text-lg font-semibold text-[#14532D]">{vmg.member_count}</span>
                        <p className="text-[11px] text-[#57534E]">Women Members</p>
                      </div>
                    </div>

                    <p className="text-sm text-[#44403C]">
                      <span className="font-medium text-[#1C1917]">Focus Activity:</span> {vmg.focus_activity}
                    </p>

                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#FBF9F5] border border-[#E5E0D8] p-3.5 rounded">
                      <div>
                        <dt className="text-[#57534E]">President</dt>
                        <dd className="font-medium text-[#1C1917]">{vmg.president_name}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Secretary</dt>
                        <dd className="font-medium text-[#1C1917]">{vmg.secretary_name}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Treasurer</dt>
                        <dd className="font-medium text-[#1C1917]">{vmg.treasurer_name}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Production Coord.</dt>
                        <dd className="font-medium text-[#1C1917]">{vmg.production_coordinator || 'Assigned'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Marketing Coord.</dt>
                        <dd className="font-medium text-[#1C1917]">{vmg.marketing_coordinator || 'Assigned'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Logistics Coord.</dt>
                        <dd className="font-medium text-[#1C1917]">{vmg.logistics_coordinator || 'Assigned'}</dd>
                      </div>
                    </dl>

                    <div className="text-xs text-[#57534E] space-y-2">
                      <p className="font-mono">Next Scheduled Meeting: {vmg.next_meeting_date}</p>
                      {vmg.meetings && vmg.meetings.length > 0 && (
                        <div className="border-t border-[#F2EFE9] pt-2">
                          <p className="font-semibold text-[#1C1917]">
                            Latest Minutes ({vmg.meetings[0].meeting_date} · Attendance {vmg.meetings[0].attendance_count})
                          </p>
                          <p className="mt-0.5">{vmg.meetings[0].resolutions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ONE VILLAGE ONE PRODUCT (OVOP) */}
          {tab === 'ovop' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ovop.map((item) => (
                <div key={item.id} className="bg-white border border-[#E5E0D8] rounded-md p-6 space-y-3">
                  <div className="text-xs text-[#57534E] flex items-center gap-2">
                    <span className="uppercase font-medium text-[#9A3412]">{item.status}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.village}, {item.block} Block</span>
                  </div>
                  <h2 className="font-serif text-xl font-semibold text-[#1C1917]">{item.product_name}</h2>
                  <p className="text-xs text-[#57534E]">Producer Cluster: {item.shg_producer} · Category: {item.category}</p>
                  <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F2EFE9] text-xs">
                    <div>
                      <dt className="text-[#57534E]">Local Resource</dt>
                      <dd className="text-[#1C1917] mt-0.5">{item.local_resource}</dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">Monthly Capacity</dt>
                      <dd className="font-mono text-[#1C1917] mt-0.5">{item.monthly_capacity}</dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">Estimated Unit Cost</dt>
                      <dd className="font-mono tabular-nums text-[#1C1917] mt-0.5">₹{Number(item.unit_cost).toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">Packaging Standard</dt>
                      <dd className="text-[#1C1917] mt-0.5">{item.packaging_spec}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-[#44403C] bg-[#FBF9F5] p-3 border border-[#E5E0D8] rounded">
                    Feasibility Assessment: {item.feasibility_notes}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: AGRICULTURE, SEED BANK (BEEJ BHANDARAN) & RAW MATERIAL BANK */}
          {tab === 'agri' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 border border-[#E5E0D8] rounded-md overflow-hidden bg-[#EBE6DF]">
                  <img
                    src="/src/assets/images/village_seed_bank_1795605258318.jpg"
                    alt="Beej Bhandaran community seed bank jars and earthen storage pots"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover min-h-[240px]"
                  />
                </div>
                <div className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-md p-6 flex flex-col justify-center space-y-3">
                  <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium">
                    Agriculture & Beej Bhandaran Pilot
                  </p>
                  <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
                    Community Seed Bank & Village Raw-Material Reserves
                  </h2>
                  <p className="text-sm text-[#44403C] leading-relaxed">
                    PIHU’s proposed raw-material banking model connects smallholder farmers in Ichak and Barkagaon directly with SHG oil presses and flour mills while preserving indigenous millet and paddy seeds inside community Beej Bhandaran rooms.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E5E0D8] rounded-md overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] bg-[#FBF9F5] text-[#57534E]">
                      <th className="py-3 px-4 font-semibold">Bank Type</th>
                      <th className="py-3 px-4 font-semibold">Commodity / Seed</th>
                      <th className="py-3 px-4 font-semibold">Location & Storage</th>
                      <th className="py-3 px-4 font-semibold text-right">Available Stock</th>
                      <th className="py-3 px-4 font-semibold text-right">Capacity</th>
                      <th className="py-3 px-4 font-semibold">Supplier / Farmer Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agri.map((row) => {
                      const isLow = row.stock_qty <= row.low_stock_threshold;
                      return (
                        <tr key={row.id} className="border-b border-[#F2EFE9] hover:bg-[#FBF9F5]">
                          <td className="py-3 px-4 font-medium text-[#14532D] uppercase">
                            {row.record_type.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#1C1917]">{row.item_name}</p>
                            <p className="text-[#57534E]">{row.variety_or_grade}</p>
                          </td>
                          <td className="py-3 px-4 text-[#44403C]">
                            {row.storage_unit} ({row.village}, {row.block})
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            <span className={isLow ? 'text-red-700 font-semibold' : 'text-[#1C1917] font-semibold'}>
                              {row.stock_qty} {row.unit}
                            </span>
                            {isLow && (
                              <span className="flex items-center justify-end gap-1 text-[11px] text-red-700 mt-0.5">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#57534E]">
                            {row.capacity_qty} {row.unit}
                          </td>
                          <td className="py-3 px-4 text-[#44403C]">
                            <p>{row.supplier_or_farmer}</p>
                            <p className="text-[11px] text-[#78716C]">{row.notes}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RURAL LOGISTICS & COLLECTION POINTS */}
          {tab === 'logistics' && (
            <div className="bg-white border border-[#E5E0D8] rounded-md overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E0D8] bg-[#FBF9F5] text-[#57534E]">
                    <th className="py-3 px-4 font-semibold">Route Code</th>
                    <th className="py-3 px-4 font-semibold">Collection Point</th>
                    <th className="py-3 px-4 font-semibold">Villages Covered</th>
                    <th className="py-3 px-4 font-semibold">Transport Mode</th>
                    <th className="py-3 px-4 font-semibold">Schedule</th>
                    <th className="py-3 px-4 font-semibold text-right">Est. Cost / Trip</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logistics.map((r) => (
                    <tr key={r.id} className="border-b border-[#F2EFE9]">
                      <td className="py-3 px-4 font-mono font-semibold text-[#1C1917]">{r.route_code}</td>
                      <td className="py-3 px-4 font-medium text-[#1C1917]">{r.collection_point}</td>
                      <td className="py-3 px-4 text-[#44403C]">{r.villages_covered} ({r.block})</td>
                      <td className="py-3 px-4 text-[#44403C]">{r.transport_mode}</td>
                      <td className="py-3 px-4 text-[#44403C]">{r.schedule_days}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">₹{Number(r.cost_per_trip).toFixed(0)}</td>
                      <td className="py-3 px-4 uppercase text-[#9A3412] font-medium">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: PRODUCT QUALITY & BATCH QR TRACEABILITY */}
          {tab === 'traceability' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 bg-white border border-[#E5E0D8] rounded-md p-6 space-y-4">
                <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Batch QR Traceability Lookup</h2>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Enter a PIHU batch number from product packaging to view verified origin, producer identity, and production dates.
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={batchInput}
                      onChange={(e) => setBatchInput(e.target.value)}
                      placeholder="e.g. PIHU-B26-OIL01"
                      className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => lookupBatch(batchInput)}
                    className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-md cursor-pointer"
                  >
                    Verify
                  </button>
                </div>

                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] uppercase tracking-wider text-[#57534E]">Sample Pilot Batches</p>
                  <div className="flex flex-wrap gap-2">
                    {['PIHU-B26-OIL01', 'PIHU-B26-CRF02', 'PIHU-B26-SPC03', 'PIHU-B26-FLR04'].map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setBatchInput(code);
                          lookupBatch(code);
                        }}
                        className="px-2.5 py-1 text-xs font-mono border border-[#D6CEBE] rounded hover:border-[#14532D] cursor-pointer"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-md p-6">
                {batchError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-md">{batchError}</p>
                )}

                {batchRecord && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E5E0D8] pb-4">
                      <div>
                        <p className="font-mono text-xs text-[#14532D] font-semibold">
                          VERIFIED BATCH RECORD · {batchRecord.batch_code}
                        </p>
                        <h3 className="font-serif text-2xl font-semibold text-[#1C1917] mt-1">
                          {batchRecord.product_name}
                        </h3>
                        <p className="text-xs text-[#57534E] mt-1">Producer: {batchRecord.seller_name}</p>
                      </div>
                      <QrCodeSvg
                        value={`https://pihu-rural.in/trace/${batchRecord.batch_code}`}
                        size={96}
                        label={`Batch QR ${batchRecord.batch_code}`}
                      />
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <dt className="text-[#57534E]">Village Origin</dt>
                        <dd className="font-medium text-[#1C1917] mt-0.5">{batchRecord.village_origin}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Production Date</dt>
                        <dd className="font-mono text-[#1C1917] mt-0.5">{batchRecord.production_date}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Best Before / Expiry</dt>
                        <dd className="font-mono text-[#1C1917] mt-0.5">{batchRecord.best_before_date || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#57534E]">Applicable Licence Record</dt>
                        <dd className="text-[#1C1917] mt-0.5">{batchRecord.license_details}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-[#57534E]">Batch Specifications</dt>
                        <dd className="text-[#1C1917] mt-0.5">{batchRecord.specifications}</dd>
                      </div>
                    </dl>

                    <div className="p-3.5 bg-[#F2EFE9]/80 border border-[#E5E0D8] rounded-md text-xs text-[#44403C]">
                      <span className="font-semibold text-[#1C1917]">Traceability Disclosure: </span>
                      This QR record displays verified seller and production batch declarations recorded in the PIHU database. It is not a laboratory test certificate, purity guarantee, or government seal.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
