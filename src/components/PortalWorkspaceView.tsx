import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Store, Package, ShoppingCart, FileText,
  Settings, Sprout, LogOut, Download, Check, X, Truck, Plus, Printer
} from 'lucide-react';
import { AuthUser, Category, DynamicForm, MemberRecord, SiteSettings } from '../types';
import { apiFetch, downloadAuthenticatedCsv, setStoredToken } from '../api';
import { QrCodeSvg } from './QrCodeSvg';

interface PortalWorkspaceViewProps {
  user: AuthUser | null;
  settings: SiteSettings;
  categories: Category[];
  forms: DynamicForm[];
  memberCard: MemberRecord | null;
  onAuthChange: (user: AuthUser | null) => void;
  onRefreshGlobal: () => void;
}

export function PortalWorkspaceView({
  user,
  settings,
  categories,
  forms,
  memberCard,
  onAuthChange,
  onRefreshGlobal,
}: PortalWorkspaceViewProps) {
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer', block: 'Ichak', village: '' });
  const [otpCode, setOtpCode] = useState('');
  const [sandboxOtpNotice, setSandboxOtpNotice] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Admin / Seller / Customer data
  const [adminTab, setAdminTab] = useState<'overview' | 'members' | 'sellers' | 'orders' | 'forms' | 'rural' | 'settings'>('overview');
  const [sellerTab, setSellerTab] = useState<'dashboard' | 'products' | 'orders' | 'payouts'>('dashboard');
  const [overview, setOverview] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [agriRows, setAgriRows] = useState<any[]>([]);
  const [sellerDash, setSellerDash] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState('');

  // Seller add product form
  const [newProd, setNewProd] = useState({
    name: '',
    name_hi: '',
    category_id: categories[0]?.id || 1,
    price: '250',
    discount_price: '220',
    stock_qty: '40',
    unit_label: '500 g',
    is_food_product: true,
    fssai_license: '',
    ingredients: '',
    description: '',
  });
  const [withdrawAmt, setWithdrawAmt] = useState('200');

  // Admin Form Builder
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormCat, setNewFormCat] = useState('Custom');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'select' | 'date' | 'checkbox'>('text');
  const [builderFields, setBuilderFields] = useState<{ id: string; label: string; type: string; required: boolean; options?: string[] }[]>([]);

  // Admin Settings edit state
  const [editSettings, setEditSettings] = useState(settings);
  useEffect(() => setEditSettings(settings), [settings]);

  const isAdmin = user && ['super_admin', 'ngo_admin', 'district_coordinator', 'finance_admin', 'seller_admin'].includes(user.role);
  const isSeller = user?.role === 'seller';

  const loadWorkspaceData = async () => {
    if (!user) return;
    try {
      const ordList = await apiFetch('/api/orders');
      setOrders(ordList);

      if (isAdmin) {
        const [ov, mem, vol, sel, prod, sub, pay, agri] = await Promise.all([
          apiFetch('/api/admin/overview'),
          apiFetch('/api/members'),
          apiFetch('/api/volunteers'),
          apiFetch('/api/sellers'),
          apiFetch('/api/products?all=1'),
          apiFetch('/api/submissions'),
          apiFetch('/api/payouts'),
          apiFetch('/api/agri-bank'),
        ]);
        setOverview(ov);
        setMembers(mem);
        setVolunteers(vol);
        setSellers(sel);
        setAllProducts(prod);
        setSubmissions(sub);
        setPayouts(pay);
        setAgriRows(agri);
      } else if (isSeller) {
        const sd = await apiFetch('/api/seller/dashboard');
        setSellerDash(sd);
      }
    } catch {
      // handled per view
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [user?.id, user?.role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      setStoredToken(res.token);
      onAuthChange(res.user);
      onRefreshGlobal();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(regForm),
      });
      setStoredToken(res.token);
      onAuthChange(res.user);
      onRefreshGlobal();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSendOtp = async () => {
    setAuthError('');
    setSandboxOtpNotice('');
    try {
      const res = await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      setSandboxOtpNotice(`Sandbox OTP: ${res.sandboxOtp}`);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier, otp: otpCode }),
      });
      setStoredToken(res.token);
      onAuthChange(res.user);
      onRefreshGlobal();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    onAuthChange(null);
    onRefreshGlobal();
  };

  const notifyAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  // -------------------- UNAUTHENTICATED VIEW --------------------
  if (!user) {
    return (
      <div className="max-w-[1040px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium">
              Unified Ecosystem Access
            </p>
            <h1 className="font-serif text-3xl font-semibold text-[#1C1917]">
              PIHU Role-Based Portal
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Sign in with your Member, Customer, SHG Seller, or Administrator credentials—or register a new account with email/mobile OTP verification.
            </p>

            <div className="bg-[#F2EFE9]/80 border border-[#E5E0D8] rounded-md p-4 space-y-2.5">
              <p className="text-xs font-semibold text-[#1C1917]">Quick Test Accounts (Pilot Sandbox)</p>
              <div className="space-y-2">
                {[
                  { label: 'Super Admin Panel', email: 'admin@pihu.org', pass: 'PihuAdmin@2026' },
                  { label: 'SHG Seller Panel (Daru)', email: 'seller@pihu.org', pass: 'PihuSeller@2026' },
                  { label: 'Approved Member & Buyer', email: 'member@pihu.org', pass: 'PihuMember@2026' },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setIdentifier(demo.email);
                      setPassword(demo.pass);
                    }}
                    className="w-full text-left px-3 py-2 bg-white border border-[#D6CEBE] hover:border-[#14532D] rounded text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-medium text-[#1C1917]">{demo.label}</span>
                    <span className="font-mono text-[11px] text-[#57534E]">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-md p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-md w-fit">
              {[
                { id: 'login', label: 'Password Login' },
                { id: 'otp', label: 'OTP Login' },
                { id: 'register', label: 'Create Account' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setAuthMode(m.id as any);
                    setAuthError('');
                  }}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded cursor-pointer ${
                    authMode === m.id ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-md">{authError}</div>
            )}

            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Email or Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@pihu.org or +91..."
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-2.5 bg-[#14532D] hover:bg-[#114224] text-white text-sm font-semibold rounded-md cursor-pointer"
                >
                  {authBusy ? 'Signing In...' : 'Sign In to Workspace'}
                </button>
              </form>
            )}

            {authMode === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Registered Email or Mobile</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="member@pihu.org"
                      className="flex-1 px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="px-4 py-2 bg-[#F2EFE9] border border-[#D6CEBE] text-xs font-semibold rounded-md cursor-pointer"
                    >
                      Send OTP
                    </button>
                  </div>
                </div>
                {sandboxOtpNotice && (
                  <p className="text-xs font-mono bg-[#14532D]/10 text-[#14532D] p-2.5 rounded border border-[#14532D]/20">
                    {sandboxOtpNotice}
                  </p>
                )}
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-2.5 bg-[#14532D] text-white text-sm font-semibold rounded-md cursor-pointer"
                >
                  Verify OTP & Login
                </button>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number *"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address *"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password *"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                  <select
                    value={regForm.role}
                    onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                    className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md bg-white"
                  >
                    <option value="customer">Customer / Buyer</option>
                    <option value="member">NGO Member Applicant</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="seller">Rural Seller / SHG</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Block & Village (e.g. Ichak)"
                    value={regForm.village}
                    onChange={(e) => setRegForm({ ...regForm, village: e.target.value })}
                    className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-2.5 bg-[#14532D] text-white text-sm font-semibold rounded-md cursor-pointer"
                >
                  Create PIHU Account
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------- SUPER ADMIN WEB PANEL --------------------
  if (isAdmin) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0 space-y-4">
            <div className="bg-white border border-[#E5E0D8] rounded-md p-4 space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-[#9A3412] font-semibold">Super Admin Panel</p>
              <p className="text-sm font-semibold text-[#1C1917]">{user.name}</p>
              <p className="text-xs text-[#57534E] font-mono">{user.role}</p>
            </div>

            <nav className="bg-white border border-[#E5E0D8] rounded-md p-2 space-y-1">
              {[
                { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
                { id: 'members', label: 'Members & Volunteers', icon: Users },
                { id: 'sellers', label: 'Sellers & Products', icon: Store },
                { id: 'orders', label: 'Orders & Shiprocket', icon: ShoppingCart },
                { id: 'forms', label: 'Forms & Submissions', icon: FileText },
                { id: 'rural', label: 'Beej & Raw Bank', icon: Sprout },
                { id: 'settings', label: 'Legal, Finance & RBAC', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAdminTab(item.id as any)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${
                      adminTab === item.id
                        ? 'bg-[#14532D] text-white'
                        : 'text-[#44403C] hover:bg-[#F2EFE9]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#D6CEBE] bg-white hover:bg-[#F2EFE9] text-xs font-medium rounded-md cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </aside>

          {/* Main Admin Viewport */}
          <div className="flex-1 min-w-0 space-y-6">
            {actionMsg && (
              <div className="p-3 bg-[#14532D]/10 border border-[#14532D]/25 text-xs font-medium text-[#14532D] rounded-md">
                {actionMsg}
              </div>
            )}

            {/* OVERVIEW */}
            {adminTab === 'overview' && overview && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
                  <div>
                    <h1 className="font-serif text-2xl font-semibold text-[#1C1917]">Centralised Command Dashboard</h1>
                    <p className="text-xs text-[#57534E]">Hazaribagh Pilot · Real-Time SQLite Ledger</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadAuthenticatedCsv('orders')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D6CEBE] rounded text-xs font-medium cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Orders CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAuthenticatedCsv('members')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D6CEBE] rounded text-xs font-medium cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Members CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Registered Users', val: overview.counts.total_users },
                    { label: 'NGO Members (Approved)', val: `${overview.counts.total_members} (${overview.counts.approved_members})` },
                    { label: 'Volunteers', val: overview.counts.total_volunteers },
                    { label: 'Form Submissions', val: overview.counts.total_submissions },
                    { label: 'Registered Sellers', val: overview.counts.total_sellers },
                    { label: 'Marketplace Products', val: overview.counts.total_products },
                    { label: 'Total Orders', val: overview.counts.total_orders },
                    { label: 'VMGs (Proposed)', val: overview.counts.total_vmgs },
                    { label: 'Marketplace GMV', val: `₹${Number(overview.counts.gmv_total).toFixed(2)}` },
                    { label: 'Platform Commission', val: `₹${Number(overview.counts.commission_total).toFixed(2)}` },
                    { label: 'Pending Orders', val: overview.counts.pending_orders },
                    { label: 'Donations Collected', val: `₹${Number(overview.counts.donations_total).toFixed(2)}` },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white border border-[#E5E0D8] p-4 rounded-md">
                      <p className="text-xs text-[#57534E]">{kpi.label}</p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#1C1917] mt-1">{kpi.val}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-md p-5">
                  <h2 className="font-serif text-lg font-semibold text-[#1C1917] mb-3">Recent Security & Approval Audit Log</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                          <th className="py-2 pr-4">Timestamp</th>
                          <th className="py-2 pr-4">Actor</th>
                          <th className="py-2 pr-4">Action</th>
                          <th className="py-2 pr-4">Target</th>
                          <th className="py-2">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.recentAudit.map((log: any) => (
                          <tr key={log.id} className="border-b border-[#F2EFE9]">
                            <td className="py-2 pr-4 font-mono text-[11px] text-[#57534E]">{log.created_at}</td>
                            <td className="py-2 pr-4 font-medium">{log.actor_name}</td>
                            <td className="py-2 pr-4 font-mono text-[#14532D]">{log.action}</td>
                            <td className="py-2 pr-4 font-mono">{log.entity_ref}</td>
                            <td className="py-2 text-[#44403C]">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MEMBERS & VOLUNTEERS */}
            {adminTab === 'members' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-xl font-semibold text-[#1C1917]">
                      Membership Applications & Official ID Issuance
                    </h2>
                    <button
                      type="button"
                      onClick={() => downloadAuthenticatedCsv('members')}
                      className="text-xs px-3 py-1.5 border border-[#D6CEBE] rounded cursor-pointer"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                          <th className="py-2.5 pr-4">App Ref</th>
                          <th className="py-2.5 pr-4">Applicant</th>
                          <th className="py-2.5 pr-4">Location</th>
                          <th className="py-2.5 pr-4">Member ID</th>
                          <th className="py-2.5 pr-4">Status</th>
                          <th className="py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id} className="border-b border-[#F2EFE9]">
                            <td className="py-2.5 pr-4 font-mono">{m.application_ref}</td>
                            <td className="py-2.5 pr-4">
                              <p className="font-semibold text-[#1C1917]">{m.full_name}</p>
                              <p className="text-[#57534E] font-mono">{m.phone}</p>
                            </td>
                            <td className="py-2.5 pr-4">{m.village}, {m.block}</td>
                            <td className="py-2.5 pr-4 font-mono font-semibold text-[#14532D]">
                              {m.member_id || 'Not Issued'}
                            </td>
                            <td className="py-2.5 pr-4 uppercase font-medium">{m.status}</td>
                            <td className="py-2.5 text-right space-x-2">
                              {m.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const r = await apiFetch(`/api/members/${m.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ status: 'approved' }),
                                    });
                                    notifyAction(`Approved & Issued ID: ${r.member_id}`);
                                    loadWorkspaceData();
                                  }}
                                  className="px-2.5 py-1 bg-[#14532D] text-white rounded text-[11px] cursor-pointer"
                                >
                                  Approve & Issue ID
                                </button>
                              )}
                              {m.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await apiFetch(`/api/members/${m.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ status: 'rejected' }),
                                    });
                                    loadWorkspaceData();
                                  }}
                                  className="px-2.5 py-1 border border-red-300 text-red-700 rounded text-[11px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                  <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Volunteer Directory</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                          <th className="py-2 pr-4">Ref</th>
                          <th className="py-2 pr-4">Volunteer</th>
                          <th className="py-2 pr-4">Skills</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volunteers.map((v) => (
                          <tr key={v.id} className="border-b border-[#F2EFE9]">
                            <td className="py-2 pr-4 font-mono">{v.application_ref}</td>
                            <td className="py-2 pr-4">
                              <p className="font-semibold">{v.full_name}</p>
                              <p className="text-[#57534E]">{v.village}, {v.block}</p>
                            </td>
                            <td className="py-2 pr-4">{v.skills}</td>
                            <td className="py-2 pr-4 uppercase font-medium">{v.status}</td>
                            <td className="py-2 text-right">
                              {v.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await apiFetch(`/api/volunteers/${v.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ status: 'approved' }),
                                    });
                                    loadWorkspaceData();
                                  }}
                                  className="px-2.5 py-1 bg-[#14532D] text-white rounded text-[11px] cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SELLERS & PRODUCTS */}
            {adminTab === 'sellers' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                  <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Seller Onboarding & Commission Control</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                          <th className="py-2 pr-4">Business / SHG</th>
                          <th className="py-2 pr-4">Type & Block</th>
                          <th className="py-2 pr-4">Commission %</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellers.map((s) => (
                          <tr key={s.id} className="border-b border-[#F2EFE9]">
                            <td className="py-2.5 pr-4">
                              <p className="font-semibold text-[#1C1917]">{s.business_name}</p>
                              <p className="text-[#57534E]">{s.owner_name} · {s.phone}</p>
                            </td>
                            <td className="py-2.5 pr-4">{s.seller_type} ({s.block})</td>
                            <td className="py-2.5 pr-4 font-mono">{s.commission_pct}%</td>
                            <td className="py-2.5 pr-4 uppercase font-medium">{s.status}</td>
                            <td className="py-2.5 text-right space-x-2">
                              {s.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await apiFetch(`/api/sellers/${s.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ status: 'approved' }),
                                    });
                                    loadWorkspaceData();
                                  }}
                                  className="px-2.5 py-1 bg-[#14532D] text-white rounded text-[11px] cursor-pointer"
                                >
                                  Approve Seller
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                  <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Product Compliance & Approval Queue</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                          <th className="py-2 pr-4">Product</th>
                          <th className="py-2 pr-4">Seller</th>
                          <th className="py-2 pr-4">Price</th>
                          <th className="py-2 pr-4">Stock</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProducts.map((p) => (
                          <tr key={p.id} className="border-b border-[#F2EFE9]">
                            <td className="py-2.5 pr-4">
                              <p className="font-semibold">{p.name}</p>
                              <p className="font-mono text-[11px] text-[#57534E]">Batch: {p.batch_code}</p>
                            </td>
                            <td className="py-2.5 pr-4">{p.seller_name}</td>
                            <td className="py-2.5 pr-4 font-mono">₹{p.discount_price}</td>
                            <td className="py-2.5 pr-4 font-mono">{p.stock_qty}</td>
                            <td className="py-2.5 pr-4 uppercase font-medium">{p.approval_status}</td>
                            <td className="py-2.5 text-right space-x-1.5">
                              {p.approval_status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await apiFetch(`/api/products/${p.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ approval_status: 'approved' }),
                                    });
                                    onRefreshGlobal();
                                    loadWorkspaceData();
                                  }}
                                  className="px-2.5 py-1 bg-[#14532D] text-white rounded text-[11px] cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Seller Withdrawal Payout Approvals */}
                <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-3">
                  <h2 className="font-serif text-lg font-semibold text-[#1C1917]">Seller Payout Requests</h2>
                  {payouts.length === 0 ? (
                    <p className="text-xs text-[#57534E]">No payout requests recorded yet.</p>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                          <th className="py-2 pr-4">Seller</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2 pr-4">Bank</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((pay) => (
                          <tr key={pay.id} className="border-b border-[#F2EFE9]">
                            <td className="py-2 pr-4 font-medium">{pay.business_name}</td>
                            <td className="py-2 pr-4 font-mono">₹{pay.amount}</td>
                            <td className="py-2 pr-4 font-mono">{pay.bank_account}</td>
                            <td className="py-2 pr-4 uppercase">{pay.status}</td>
                            <td className="py-2 text-right">
                              {pay.status === 'requested' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await apiFetch(`/api/payouts/${pay.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ status: 'settled' }),
                                    });
                                    loadWorkspaceData();
                                  }}
                                  className="px-2.5 py-1 bg-[#14532D] text-white rounded text-[11px] cursor-pointer"
                                >
                                  Mark Settled
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ORDERS & SHIPROCKET */}
            {adminTab === 'orders' && (
              <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Order & Shiprocket Dispatch Console</h2>
                  <button
                    type="button"
                    onClick={() => downloadAuthenticatedCsv('orders')}
                    className="text-xs px-3 py-1.5 border border-[#D6CEBE] rounded cursor-pointer"
                  >
                    Export Orders CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                        <th className="py-2.5 pr-4">Order #</th>
                        <th className="py-2.5 pr-4">Customer</th>
                        <th className="py-2.5 pr-4">Total</th>
                        <th className="py-2.5 pr-4">Order Status</th>
                        <th className="py-2.5 pr-4">Shiprocket AWB</th>
                        <th className="py-2.5 text-right">Logistics Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b border-[#F2EFE9]">
                          <td className="py-2.5 pr-4 font-mono font-semibold">{o.order_number}</td>
                          <td className="py-2.5 pr-4">
                            <p>{o.customer_name}</p>
                            <p className="text-[#57534E]">{o.district} - {o.pincode}</p>
                          </td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">₹{Number(o.total_amount).toFixed(2)}</td>
                          <td className="py-2.5 pr-4 font-medium">{o.order_status}</td>
                          <td className="py-2.5 pr-4 font-mono text-[11px]">
                            {o.awb_number || 'Pending Sync'}
                            {o.courier_name && <span className="block text-[#57534E]">{o.courier_name}</span>}
                          </td>
                          <td className="py-2.5 text-right space-x-1.5">
                            {!o.awb_number && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const r = await apiFetch(`/api/orders/${o.id}/status`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ order_status: 'Processing', sync_shiprocket: true }),
                                  });
                                  notifyAction(`Shiprocket AWB Assigned: ${r.awb_number}`);
                                  loadWorkspaceData();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#14532D] text-white rounded text-[11px] cursor-pointer"
                              >
                                <Truck className="w-3 h-3" /> Sync Shiprocket AWB
                              </button>
                            )}
                            {o.order_status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const next = o.order_status === 'Shipped' ? 'Delivered' : 'Shipped';
                                  await apiFetch(`/api/orders/${o.id}/status`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ order_status: next }),
                                  });
                                  loadWorkspaceData();
                                }}
                                className="px-2.5 py-1 border border-[#D6CEBE] rounded text-[11px] cursor-pointer"
                              >
                                Mark {o.order_status === 'Shipped' ? 'Delivered' : 'Shipped'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DYNAMIC FORM BUILDER & SUBMISSIONS */}
            {adminTab === 'forms' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                  <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Dynamic Form Builder</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="New Form Title"
                      value={newFormTitle}
                      onChange={(e) => setNewFormTitle(e.target.value)}
                      className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                    />
                    <input
                      type="text"
                      placeholder="Category (e.g. Survey)"
                      value={newFormCat}
                      onChange={(e) => setNewFormCat(e.target.value)}
                      className="px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Field label"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
                      />
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="px-2 py-2 text-xs border border-[#D6CEBE] rounded-md bg-white"
                      >
                        <option value="text">Text</option>
                        <option value="date">Date</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFieldLabel.trim()) return;
                          setBuilderFields([
                            ...builderFields,
                            { id: `f_${Date.now()}`, label: newFieldLabel.trim(), type: newFieldType, required: true },
                          ]);
                          setNewFieldLabel('');
                        }}
                        className="px-3 py-2 bg-[#F2EFE9] border border-[#D6CEBE] rounded-md text-xs font-medium cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {builderFields.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FBF9F5] border border-[#E5E0D8] rounded text-xs">
                      <span>Fields queued: {builderFields.map((f) => `${f.label} (${f.type})`).join(', ')}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch('/api/forms', {
                            method: 'POST',
                            body: JSON.stringify({
                              title: newFormTitle,
                              category: newFormCat,
                              fields: builderFields,
                            }),
                          });
                          setNewFormTitle('');
                          setBuilderFields([]);
                          notifyAction('Custom form published to Apply & Forms page.');
                          onRefreshGlobal();
                        }}
                        className="px-4 py-1.5 bg-[#14532D] text-white font-semibold rounded cursor-pointer"
                      >
                        Publish Form
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-[#57534E]">
                    Active Forms: {forms.map((f) => f.title).join(' · ')}
                  </div>
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Form Submissions</h2>
                    <button
                      type="button"
                      onClick={() => downloadAuthenticatedCsv('submissions')}
                      className="text-xs px-3 py-1.5 border border-[#D6CEBE] rounded cursor-pointer"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                          <th className="py-2 pr-4">Reference #</th>
                          <th className="py-2 pr-4">Form</th>
                          <th className="py-2 pr-4">Applicant</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((s) => (
                          <tr key={s.id} className="border-b border-[#F2EFE9]">
                            <td className="py-2 pr-4 font-mono">{s.reference_no}</td>
                            <td className="py-2 pr-4">{s.form_title}</td>
                            <td className="py-2 pr-4">
                              <p className="font-semibold">{s.applicant_name}</p>
                              <p className="text-[#57534E]">{s.applicant_phone} · {s.village}</p>
                            </td>
                            <td className="py-2 pr-4 uppercase font-medium">{s.status}</td>
                            <td className="py-2 text-right space-x-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/submissions/${s.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: 'approved' }),
                                  });
                                  loadWorkspaceData();
                                }}
                                className="p-1.5 text-[#14532D] border border-[#D6CEBE] rounded cursor-pointer"
                                title="Approve"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/submissions/${s.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: 'rejected' }),
                                  });
                                  loadWorkspaceData();
                                }}
                                className="p-1.5 text-red-700 border border-[#D6CEBE] rounded cursor-pointer"
                                title="Reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* BEEJ BHANDARAN & RAW MATERIAL BANK STOCK ADJUSTMENT */}
            {adminTab === 'rural' && (
              <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold text-[#1C1917]">
                    Beej Bhandaran & Raw Material Stock Control
                  </h2>
                  <button
                    type="button"
                    onClick={() => downloadAuthenticatedCsv('agri')}
                    className="text-xs px-3 py-1.5 border border-[#D6CEBE] rounded cursor-pointer"
                  >
                    Export Stock CSV
                  </button>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] text-[#57534E]">
                      <th className="py-2 pr-4">Item</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Current Stock</th>
                      <th className="py-2 text-right">Stock Entry / Exit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agriRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#F2EFE9]">
                        <td className="py-2.5 pr-4 font-medium">{row.item_name}</td>
                        <td className="py-2.5 pr-4">{row.village}, {row.block}</td>
                        <td className="py-2.5 pr-4 font-mono font-semibold">{row.stock_qty} {row.unit}</td>
                        <td className="py-2.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/agri-bank/${row.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ delta_qty: 25 }),
                              });
                              loadWorkspaceData();
                            }}
                            className="px-2.5 py-1 bg-[#14532D] text-white rounded text-[11px] cursor-pointer"
                          >
                            +25 {row.unit}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/agri-bank/${row.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ delta_qty: -10 }),
                              });
                              loadWorkspaceData();
                            }}
                            className="px-2.5 py-1 border border-[#D6CEBE] rounded text-[11px] cursor-pointer"
                          >
                            -10 {row.unit}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* LEGAL READINESS, FINANCIAL RULES & RBAC */}
            {adminTab === 'settings' && (
              <div className="bg-white border border-[#E5E0D8] rounded-md p-6 space-y-5">
                <h2 className="font-serif text-xl font-semibold text-[#1C1917]">
                  Legal Identity, Donation Lock & Financial Rules
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-medium text-[#44403C] mb-1">Legal Status Disclosure</label>
                    <input
                      type="text"
                      value={editSettings.legal_status}
                      onChange={(e) => setEditSettings({ ...editSettings, legal_status: e.target.value })}
                      className="w-full px-3 py-2 border border-[#D6CEBE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#44403C] mb-1">NGO / Section 8 Registration No.</label>
                    <input
                      type="text"
                      placeholder="Leave blank until registered"
                      value={editSettings.registration_number}
                      onChange={(e) => setEditSettings({ ...editSettings, registration_number: e.target.value })}
                      className="w-full px-3 py-2 font-mono border border-[#D6CEBE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#44403C] mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      value={editSettings.tax_rate_pct}
                      onChange={(e) => setEditSettings({ ...editSettings, tax_rate_pct: Number(e.target.value) })}
                      className="w-full px-3 py-2 font-mono border border-[#D6CEBE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#44403C] mb-1">Flat Shipping Fee (INR)</label>
                    <input
                      type="number"
                      value={editSettings.shipping_flat_fee}
                      onChange={(e) => setEditSettings({ ...editSettings, shipping_flat_fee: Number(e.target.value) })}
                      className="w-full px-3 py-2 font-mono border border-[#D6CEBE] rounded-md"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#F2EFE9] text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSettings.donations_enabled === 1}
                      onChange={(e) => setEditSettings({ ...editSettings, donations_enabled: e.target.checked ? 1 : 0 })}
                      className="accent-[#14532D]"
                    />
                    <span>Enable Online Donation Collection (Enable only after legal registration & banking setup)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSettings.tax_exemption_enabled === 1}
                      onChange={(e) => setEditSettings({ ...editSettings, tax_exemption_enabled: e.target.checked ? 1 : 0 })}
                      className="accent-[#14532D]"
                    />
                    <span>Enable 80G Tax Exemption Claims (Enable only with valid 80G approval)</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch('/api/admin/settings', {
                      method: 'PATCH',
                      body: JSON.stringify(editSettings),
                    });
                    notifyAction('Platform settings saved.');
                    onRefreshGlobal();
                  }}
                  className="px-5 py-2.5 bg-[#14532D] text-white text-xs font-semibold rounded-md cursor-pointer"
                >
                  Save Platform Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------- SELLER MANAGEMENT PANEL --------------------
  if (isSeller) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium">Seller Management Panel</p>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1C1917]">
              {sellerDash?.seller?.business_name || user.name}
            </h1>
            <p className="text-xs text-[#57534E]">
              Commission Rate: <span className="font-mono">{sellerDash?.seller?.commission_pct ?? 10}%</span> · Status: {sellerDash?.seller?.status || 'active'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D6CEBE] bg-white rounded-md text-xs font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        <div className="flex gap-1.5 p-1 bg-[#F2EFE9] border border-[#E5E0D8] rounded-md w-fit">
          {[
            { id: 'dashboard', label: 'Earnings & Overview' },
            { id: 'products', label: 'Products & Inventory' },
            { id: 'orders', label: 'Orders & Shipments' },
            { id: 'payouts', label: 'Withdrawals' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSellerTab(t.id as any)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded cursor-pointer ${
                sellerTab === t.id ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#57534E]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {actionMsg && (
          <div className="p-3 bg-[#14532D]/10 border border-[#14532D]/25 text-xs text-[#14532D] rounded-md">{actionMsg}</div>
        )}

        {sellerTab === 'dashboard' && sellerDash && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Products', val: sellerDash.products.length },
              { label: 'Total Orders', val: sellerDash.summary.total_orders },
              { label: 'Gross Sales', val: `₹${Number(sellerDash.summary.gross_sales).toFixed(2)}` },
              { label: 'Platform Commission', val: `₹${Number(sellerDash.summary.total_commission).toFixed(2)}` },
              { label: 'Net Earnings', val: `₹${Number(sellerDash.summary.net_earnings).toFixed(2)}` },
              { label: 'Available Balance', val: `₹${Number(sellerDash.summary.available_balance).toFixed(2)}` },
              { label: 'Pending Payouts', val: `₹${Number(sellerDash.summary.pending_payout).toFixed(2)}` },
              { label: 'Settled Total', val: `₹${Number(sellerDash.summary.settled_total).toFixed(2)}` },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-[#E5E0D8] p-4 rounded-md">
                <p className="text-xs text-[#57534E]">{k.label}</p>
                <p className="font-mono tabular-nums text-xl font-semibold text-[#1C1917] mt-1">{k.val}</p>
              </div>
            ))}
          </div>
        )}

        {sellerTab === 'products' && sellerDash && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await apiFetch('/api/products', {
                  method: 'POST',
                  body: JSON.stringify(newProd),
                });
                notifyAction(`Product submitted (Batch ${r.batch_code}) for Admin approval.`);
                setNewProd({ ...newProd, name: '', name_hi: '', description: '' });
                loadWorkspaceData();
              }}
              className="lg:col-span-5 bg-white border border-[#E5E0D8] rounded-md p-5 space-y-3"
            >
              <h2 className="font-serif text-lg font-semibold text-[#1C1917]">Add New Product</h2>
              <input
                type="text"
                required
                placeholder="Product Name *"
                value={newProd.name}
                onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
              />
              <select
                value={newProd.category_id}
                onChange={(e) => setNewProd({ ...newProd, category_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  required
                  placeholder="MRP"
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                  className="px-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
                />
                <input
                  type="number"
                  required
                  placeholder="Sale Price"
                  value={newProd.discount_price}
                  onChange={(e) => setNewProd({ ...newProd, discount_price: e.target.value })}
                  className="px-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
                />
                <input
                  type="number"
                  required
                  placeholder="Stock"
                  value={newProd.stock_qty}
                  onChange={(e) => setNewProd({ ...newProd, stock_qty: e.target.value })}
                  className="px-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
                />
              </div>
              <input
                type="text"
                placeholder="FSSAI / Licence Declaration (if food)"
                value={newProd.fssai_license}
                onChange={(e) => setNewProd({ ...newProd, fssai_license: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
              />
              <textarea
                rows={2}
                placeholder="Product Description & Ingredients"
                value={newProd.description}
                onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D6CEBE] rounded-md"
              />
              <button type="submit" className="w-full py-2.5 bg-[#14532D] text-white text-xs font-semibold rounded-md cursor-pointer">
                Submit for Admin Approval
              </button>
            </form>

            <div className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-md p-5">
              <h2 className="font-serif text-lg font-semibold text-[#1C1917] mb-3">Your Catalog</h2>
              <div className="space-y-3">
                {sellerDash.products.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-[#F2EFE9] pb-3 text-xs">
                    <div>
                      <p className="font-semibold text-[#1C1917]">{p.name}</p>
                      <p className="font-mono text-[#57534E]">
                        ₹{p.discount_price} · Stock: {p.stock_qty} · Batch: {p.batch_code}
                      </p>
                    </div>
                    <span className="uppercase font-medium text-[#9A3412]">{p.approval_status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sellerTab === 'orders' && (
          <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-3">
            <h2 className="font-serif text-lg font-semibold text-[#1C1917]">Incoming Orders</h2>
            {orders.map((o) => (
              <div key={o.id} className="border-b border-[#F2EFE9] pb-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-mono font-semibold text-[#1C1917]">{o.order_number}</p>
                  <p className="text-[#57534E]">{o.customer_name} · {o.district} ({o.pincode})</p>
                  <p className="font-mono text-[#14532D]">AWB: {o.awb_number || 'Pending Sync'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{o.order_status}</span>
                  {!o.awb_number && (
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/orders/${o.id}/status`, {
                          method: 'PATCH',
                          body: JSON.stringify({ order_status: 'Processing', sync_shiprocket: true }),
                        });
                        loadWorkspaceData();
                      }}
                      className="px-3 py-1.5 bg-[#14532D] text-white rounded cursor-pointer"
                    >
                      Generate Shiprocket AWB
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sellerTab === 'payouts' && sellerDash && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch('/api/seller/withdraw', {
                  method: 'POST',
                  body: JSON.stringify({ amount: Number(withdrawAmt) }),
                });
                notifyAction('Withdrawal request submitted for Finance Admin approval.');
                loadWorkspaceData();
              }}
              className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-3"
            >
              <h2 className="font-serif text-lg font-semibold text-[#1C1917]">Request Settlement Withdrawal</h2>
              <p className="text-xs text-[#57534E]">
                Available Balance: <span className="font-mono font-semibold text-[#14532D]">₹{Number(sellerDash.summary.available_balance).toFixed(2)}</span>
              </p>
              <input
                type="number"
                min={50}
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-[#D6CEBE] rounded-md"
              />
              <button type="submit" className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-md cursor-pointer">
                Request Payout
              </button>
            </form>

            <div className="bg-white border border-[#E5E0D8] rounded-md p-5 space-y-3">
              <h2 className="font-serif text-lg font-semibold text-[#1C1917]">Settlement History</h2>
              {sellerDash.payouts.length === 0 ? (
                <p className="text-xs text-[#57534E]">No withdrawals requested yet.</p>
              ) : (
                sellerDash.payouts.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs border-b border-[#F2EFE9] pb-2">
                    <span className="font-mono">₹{p.amount} · {p.bank_account}</span>
                    <span className="uppercase font-medium">{p.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------- CUSTOMER / MEMBER PORTAL --------------------
  return (
    <div className="max-w-[1140px] mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9A3412] font-medium">Customer & Member Account</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1C1917]">{user.name}</h1>
          <p className="text-xs text-[#57534E]">{user.email} · {user.phone} · {user.village}, {user.district}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#D6CEBE] bg-white rounded-md text-xs font-medium cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-[#E5E0D8] rounded-md p-6 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#1C1917]">PIHU Digital Membership Card</h2>
          {memberCard ? (
            <div className="border border-[#D6CEBE] bg-[#FBF9F5] p-5 rounded-md space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src="/assets/aistudio/FB_IMG_1781536788497_1176a863.jpg"
                    alt="PIHU official logo"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 object-contain rounded border border-[#E5E0D8] bg-white shrink-0"
                  />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#14532D] font-semibold">PIHU Member</p>
                    <p className="font-serif text-lg font-semibold text-[#1C1917]">{memberCard.full_name}</p>
                    <p className="font-mono text-xs text-[#9A3412] mt-1">
                      {memberCard.member_id || `Pending (${memberCard.application_ref})`}
                    </p>
                  </div>
                </div>
                {memberCard.member_id && <QrCodeSvg value={`PIHU-MEMBER:${memberCard.member_id}`} size={72} />}
              </div>
              <p className="text-xs text-[#57534E]">
                {memberCard.role_type} · {memberCard.village}, {memberCard.block}, {memberCard.district}
              </p>
              {memberCard.member_id && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D6CEBE] rounded text-xs cursor-pointer no-print"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Member ID
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#57534E]">
              No membership card linked yet. Apply via the Apply & Forms section to receive a reference number.
            </p>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-md p-6 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#1C1917]">Order History & Tracking</h2>
          {orders.length === 0 ? (
            <p className="text-xs text-[#57534E]">No marketplace orders placed yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="border border-[#E5E0D8] p-4 rounded-md text-xs space-y-1.5">
                  <div className="flex justify-between font-semibold text-[#1C1917]">
                    <span className="font-mono">{o.order_number}</span>
                    <span className="font-mono tabular-nums">₹{Number(o.total_amount).toFixed(2)}</span>
                  </div>
                  <p className="text-[#57534E]">
                    Status: <strong className="text-[#14532D]">{o.order_status}</strong> · Shipment: {o.shipment_status}
                  </p>
                  {o.awb_number && (
                    <p className="font-mono text-[11px] text-[#44403C]">
                      Tracking AWB: {o.awb_number} ({o.courier_name})
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
