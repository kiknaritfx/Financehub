import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, TrendingUp, TrendingDown, List, Building2,
  FileText, Users, Menu, X, Eye, EyeOff, Upload, Plus, Search,
  MoreVertical, AlertCircle, Image as ImageIcon, History,
  Check, Settings, LogOut, ChevronDown, Calendar, Wallet, FileEdit,
  Download, Printer, Trash2, Smile, ImagePlus, UploadCloud, Edit2, Power,
  ChevronRight, ArrowUp, ArrowDown, Banknote, Landmark,
  CreditCard, CornerDownRight, FolderTree, Tags, BarChart2,
  Phone, Shield, Lightbulb, CheckSquare, Lock, User, CalendarDays,
  Loader2
} from 'lucide-react';
import { businessAPI, transactionAPI, userAPI, reportAPI } from './api.js';

// ─── INVITE API ───
const inviteAPI = {
  sendInvite: (id) => fetch(`/api/users/${id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),
  verifyToken: (token) => fetch(`/api/invite/${token}`).then(r => r.json()),
  setPassword: (token, password) => fetch('/api/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) }).then(r => r.json()),
};

// ─── MOCK FALLBACK (ใช้ตอน dev ก่อนที่ DB จะพร้อม) ───
const MOCK_BUSINESSES = [
  { id: 1, name: 'กาแฟ A', type: 'Cafe', income: 150000, expense: 80000, profit: 70000, growth: 12.5, petty_cash: 15000, petty_cash_max: 20000, status: 'Active', logo_type: 'emoji', icon: '☕' },
  { id: 2, name: 'อาหาร B', type: 'Restaurant', income: 320000, expense: 210000, profit: 110000, growth: -5.2, petty_cash: 5000, petty_cash_max: 30000, status: 'Active', logo_type: 'emoji', icon: '🍱' },
  { id: 3, name: 'เบเกอรี่ C', type: 'Bakery', income: 95000, expense: 45000, profit: 50000, growth: 8.4, petty_cash: 8000, petty_cash_max: 10000, status: 'Active', logo_type: 'emoji', icon: '🥐' },
];
const MOCK_TRANSACTIONS = [
  { id: 1, txn_id: 'TRX-001', created_at: '2026-02-20T09:30:00', type: 'Income', category: 'หน้าร้าน', amount: 4500, created_by_name: 'สมชาย', is_edited: false, business_name: 'กาแฟ A' },
  { id: 2, txn_id: 'TRX-002', created_at: '2026-02-20T10:15:00', type: 'Expense', category: 'วัตถุดิบ', amount: 1200, created_by_name: 'สมหญิง', is_edited: true, business_name: 'อาหาร B' },
  { id: 3, txn_id: 'TRX-003', created_at: '2026-02-19T14:00:00', type: 'Expense', category: 'ค่าไฟ', amount: 3500, created_by_name: 'แอดมิน', is_edited: false, business_name: 'เบเกอรี่ C' },
];

const STANDARD_CATEGORIES = {
  income: ['รายได้จากการขาย (Sales)', 'รายได้จากการบริการ (Services)', 'รายได้ดอกเบี้ย (Interest)', 'รายได้อื่นๆ (Other Income)'],
  expense: ['ต้นทุนขาย/วัตถุดิบ (COGS)', 'เงินเดือนและสวัสดิการพนักงาน', 'ค่าเช่าสถานที่', 'ค่าสาธารณูปโภค (น้ำ/ไฟ/เน็ต)', 'ค่าวัสดุสิ้นเปลือง', 'ค่าโฆษณาและส่งเสริมการขาย', 'ค่าซ่อมบำรุง']
};
const EMOJIS = ['☕', '🍜', '🥐', '🍕', '🍔', '🍰', '🍱', '🍛', '🏪', '🏬', '🛒', '📦', '💼', '🏢', '🏭', '🏦', '💇', '💅', '🏥', '🔧', '🎨', '📚'];
const FEATURE_LIST = [
  { id: 'Dashboard', label: 'ดู Dashboard' },
  { id: 'Income', label: 'บันทึกรายรับ' },
  { id: 'Expense', label: 'บันทึกรายจ่าย' },
  { id: 'Transactions', label: 'ดูรายการธุรกรรม' },
  { id: 'Edit', label: 'แก้ไขรายการ' },
  { id: 'Delete', label: 'ลบรายการ' },
  { id: 'Reports', label: 'ออกรายงาน' },
  { id: 'Businesses', label: 'จัดการธุรกิจ' },
  { id: 'Users', label: 'จัดการสิทธิ์ผู้ใช้' },
];

// ─── SHARED COMPONENTS ───
const Badge = ({ children, type = 'default', className = '', onClick }) => {
  const colors = { income: 'bg-emerald-100 text-emerald-700', expense: 'bg-rose-100 text-rose-700', primary: 'bg-blue-100 text-blue-700', warning: 'bg-amber-100 text-amber-700', audit: 'bg-purple-100 text-purple-700', manager: 'bg-purple-100 text-purple-700', staff: 'bg-blue-100 text-blue-700', owner: 'bg-amber-100 text-amber-800', default: 'bg-slate-100 text-slate-700' };
  return <span onClick={onClick} className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[type]} ${className} ${onClick ? 'cursor-pointer' : ''}`}>{children}</span>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-500"><X size={20} /></button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Drawer = ({ isOpen, onClose, title, children, description }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-xl h-full shadow-2xl relative z-10 flex flex-col">
        <div className="flex justify-between items-start p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/50">{children}</div>
      </div>
    </div>
  );
};

const Spinner = () => <Loader2 size={20} className="animate-spin text-blue-500" />;

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-bold text-sm ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
      {type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
      {message}
    </div>
  );
};

// ─── LOGIN PAGE ───
// ─── SET PASSWORD PAGE (พนักงานตั้งรหัสผ่านจากลิงค์) ───
const SetPasswordPage = ({ token }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    inviteAPI.verifyToken(token)
      .then(data => { if (data.valid) setUserInfo(data); else setError(data.error || 'ลิงค์ไม่ถูกต้อง'); })
      .catch(() => setError('ไม่สามารถตรวจสอบลิงค์ได้'))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('รหัสผ่านไม่ตรงกัน');
    if (password.length < 6) return setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    setLoading(true); setError('');
    try {
      const res = await inviteAPI.setPassword(token, password);
      if (res.success) setSuccess(true);
      else setError(res.error || 'เกิดข้อผิดพลาด');
    } catch { setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); }
    finally { setLoading(false); }
  };

  if (verifying) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <Loader2 size={40} className="text-white animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">ตั้งรหัสผ่าน</h1>
          <p className="text-slate-500 text-sm mt-1">FinanceHub</p>
        </div>

        {error && !userInfo && (
          <div className="text-center">
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-6 flex items-center gap-2 justify-center">
              <AlertCircle size={18} />{error}
            </div>
            <a href="/" className="text-blue-600 font-bold text-sm hover:underline">กลับหน้าเข้าสู่ระบบ</a>
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">ตั้งรหัสผ่านสำเร็จ!</h3>
            <p className="text-slate-500 text-sm mb-6">คุณสามารถเข้าสู่ระบบได้แล้ว</p>
            <a href="/" className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-center hover:bg-blue-700">
              เข้าสู่ระบบ →
            </a>
          </div>
        ) : userInfo && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">ยินดีต้อนรับ</p>
              <p className="font-black text-slate-800">{userInfo.name}</p>
              <p className="text-sm text-slate-500">{userInfo.email}</p>
            </div>
            {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">รหัสผ่าน</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none pr-12" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-slate-400">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">ยืนยันรหัสผ่าน</label>
              <input type={show ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="พิมพ์รหัสผ่านอีกครั้ง" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Lock size={20} />}
              {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่าน'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('admin@financehub.com');
  const [password, setPassword] = useState('admin1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLogin(data.user);
      } else {
        // Fallback สำหรับ demo
        if (email === 'admin@financehub.com' && password === 'admin1234') {
          onLogin({ name: 'Admin FinanceHub', role: 'เจ้าของธุรกิจ', email });
        } else {
          setError(data.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
      }
    } catch {
      // ถ้า API ไม่ตอบ ใช้ fallback
      if (email === 'admin@financehub.com' && password === 'admin1234') {
        onLogin({ name: 'Admin FinanceHub', role: 'เจ้าของธุรกิจ', email });
      } else {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl"></div>
        <div className="text-center mb-10">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Wallet size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">FinanceHub</h1>
          <p className="text-slate-500 mt-2 text-sm">จัดการการเงินหลายสาขาอย่างมืออาชีพ</p>
        </div>
        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-slate-50 pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-sm text-blue-700">
            <strong>Demo Login:</strong> admin@financehub.com / admin1234
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
            {loading ? <><Spinner /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── DASHBOARD ───
const Dashboard = ({ setCurrentView }) => {
  const [bizData, setBizData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('เดือนนี้');
  const [selectedBiz, setSelectedBiz] = useState(null);
  const fmt = (n) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n || 0);

  useEffect(() => {
    businessAPI.getAll()
      .then(data => setBizData(Array.isArray(data) ? data : MOCK_BUSINESSES))
      .catch(() => setBizData(MOCK_BUSINESSES))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ภาพรวมธุรกิจ (Dashboard)</h2>
          <p className="text-slate-500 text-sm mt-1">สรุปข้อมูลการเงินทุกสาขา</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
          {['วันนี้', 'สัปดาห์นี้', 'เดือนนี้'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${period === p ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bizData.map((biz) => (
          <div key={biz.id} className="bg-white rounded-[24px] shadow-sm border border-slate-100 hover:shadow-lg transition-all p-5 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100 shrink-0 text-3xl">
                {biz.logo_type === 'image' && biz.icon ? <img src={biz.icon} className="w-full h-full object-cover" alt={biz.name} /> : (biz.icon || '🏪')}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xl">{biz.name}</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full mt-1 inline-block">{biz.type}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
                <p className="text-[11px] text-slate-500 mb-1">รายรับ</p>
                <p className="font-bold text-emerald-600">{fmt(biz.income)}</p>
              </div>
              <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
                <p className="text-[11px] text-slate-500 mb-1">รายจ่าย</p>
                <p className="font-bold text-rose-600">{fmt(biz.expense)}</p>
              </div>
            </div>
            <div className="mb-4 flex justify-between items-end">
              <div>
                <p className="text-[11px] text-slate-500 mb-1">กำไรสุทธิ</p>
                <p className="text-2xl font-black text-blue-600">{fmt(biz.profit)}</p>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${(biz.growth || 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {(biz.growth || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(biz.growth || 0)}%
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span className="font-bold text-slate-800">เงินสดย่อย</span>
                <span>{fmt(biz.petty_cash)} / {fmt(biz.petty_cash_max)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                <div className={`h-full rounded-full ${(biz.petty_cash / biz.petty_cash_max) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (biz.petty_cash / biz.petty_cash_max) * 100)}%` }}></div>
              </div>
              <button onClick={() => setSelectedBiz(biz)} className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-4 py-3 rounded-xl transition-all">
                ดูรายละเอียด <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <h3 className="text-slate-300 text-sm font-medium mb-6">ภาพรวมทุกสาขา (Total Summary)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-slate-400 mb-2">รายรับรวม</p>
            <p className="text-3xl font-bold text-emerald-400">{fmt(bizData.reduce((s, b) => s + (b.income || 0), 0))}</p>
          </div>
          <div className="sm:border-l sm:border-slate-700 sm:pl-8">
            <p className="text-sm text-slate-400 mb-2">รายจ่ายรวม</p>
            <p className="text-3xl font-bold text-rose-400">{fmt(bizData.reduce((s, b) => s + (b.expense || 0), 0))}</p>
          </div>
          <div className="sm:border-l sm:border-slate-700 sm:pl-8">
            <p className="text-sm text-slate-400 mb-2">กำไรสุทธิรวม</p>
            <p className="text-3xl font-bold text-blue-400">{fmt(bizData.reduce((s, b) => s + (b.profit || 0), 0))}</p>
          </div>
        </div>
      </div>

      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 p-6 relative shrink-0">
              <button onClick={() => setSelectedBiz(null)} className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"><X size={24} /></button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-3xl">{selectedBiz.icon || '🏪'}</div>
                <div>
                  <h2 className="text-2xl font-bold text-white">ร้าน{selectedBiz.name}</h2>
                  <p className="text-blue-100 text-sm">{selectedBiz.type}</p>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-emerald-700 text-xs mb-1">รายรับ</p>
                  <p className="font-bold text-emerald-600 text-sm">{fmt(selectedBiz.income)}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
                  <p className="text-rose-700 text-xs mb-1">รายจ่าย</p>
                  <p className="font-bold text-rose-600 text-sm">{fmt(selectedBiz.expense)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-blue-700 text-xs mb-1">กำไร</p>
                  <p className="font-bold text-blue-600 text-sm">{fmt(selectedBiz.profit)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setCurrentView('income'); setSelectedBiz(null); }} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl p-4 flex flex-col items-center gap-2">
                  <span className="text-2xl">💰</span><span className="text-emerald-800 font-medium text-sm">บันทึกรายรับ</span>
                </button>
                <button onClick={() => { setCurrentView('expense'); setSelectedBiz(null); }} className="bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl p-4 flex flex-col items-center gap-2">
                  <span className="text-2xl">💸</span><span className="text-rose-800 font-medium text-sm">บันทึกรายจ่าย</span>
                </button>
                <button onClick={() => { setCurrentView('transactions'); setSelectedBiz(null); }} className="bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl p-4 flex flex-col items-center gap-2">
                  <span className="text-2xl">📋</span><span className="text-blue-800 font-medium text-sm">ดูรายการ</span>
                </button>
                <button onClick={() => { setCurrentView('reports'); setSelectedBiz(null); }} className="bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl p-4 flex flex-col items-center gap-2">
                  <span className="text-2xl">📊</span><span className="text-purple-800 font-medium text-sm">รายงาน</span>
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => setSelectedBiz(null)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3.5 rounded-xl">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── INCOME ENTRY ───
const IncomeEntry = ({ businesses, onSuccess }) => {
  const [selectedBizId, setSelectedBizId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('รายได้จากการขาย (Sales)');
  const [cash, setCash] = useState('');
  const [transfer, setTransfer] = useState('');
  const [card, setCard] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const total = (Number(cash) || 0) + (Number(transfer) || 0) + (Number(card) || 0);
  const fmt = (n) => new Intl.NumberFormat('th-TH').format(n);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBizId) return alert('กรุณาเลือกสาขาก่อน');
    if (total === 0) return alert('กรุณากรอกจำนวนเงิน');
    setLoading(true);
    try {
      await transactionAPI.create({
        business_id: selectedBizId, type: 'Income', category, amount: total,
        date, payment_cash: cash || 0, payment_transfer: transfer || 0,
        payment_card: card || 0, note
      });
      onSuccess('บันทึกรายรับสำเร็จ ✅');
      setCash(''); setTransfer(''); setCard(''); setNote('');
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">บันทึกรายรับ (Income)</h2>
        <p className="text-slate-500 text-sm mt-1">บันทึกรายรับให้กับธุรกิจของคุณ</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">1. เลือกร้านค้า</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {businesses.map(biz => (
              <div key={biz.id} onClick={() => setSelectedBizId(biz.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedBizId == biz.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{biz.icon}</span>
                    <span className="font-bold text-slate-700">{biz.name}</span>
                  </div>
                  {selectedBizId == biz.id && <Check size={18} className="text-emerald-600" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <h3 className="font-semibold text-slate-800">2. รายละเอียดรายรับ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">วันที่</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                {STANDARD_CATEGORIES.income.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500" /> แยกตามช่องทาง</h4>
            {[['เงินสด', cash, setCash], ['เงินโอน', transfer, setTransfer], ['บัตรเครดิต', card, setCard]].map(([label, val, setter]) => (
              <div key={label} className="flex items-center gap-4">
                <label className="w-24 text-sm font-medium text-slate-600">{label}</label>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                  <input type="number" min="0" value={val} onChange={e => setter(e.target.value)} className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800">ยอดรวม</span>
              <span className="text-2xl font-black text-emerald-600">฿ {fmt(total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="submit" disabled={loading || total === 0} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg flex items-center gap-2">
              {loading ? <><Spinner /> กำลังบันทึก...</> : 'บันทึกรายรับ'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ─── EXPENSE ENTRY ───
const ExpenseEntry = ({ businesses, onSuccess }) => {
  const [selectedBizId, setSelectedBizId] = useState('');
  const [datetime, setDatetime] = useState(new Date().toISOString().slice(0, 16));
  const [category, setCategory] = useState('ต้นทุนขาย/วัตถุดิบ (COGS)');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pettyCash, setPettyCash] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBizId) return alert('กรุณาเลือกสาขาก่อน');
    if (!amount || Number(amount) <= 0) return alert('กรุณากรอกจำนวนเงิน');
    setLoading(true);
    try {
      await transactionAPI.create({
        business_id: selectedBizId, type: 'Expense', category,
        amount: Number(amount), date: datetime, petty_cash: pettyCash, note
      });
      onSuccess('บันทึกรายจ่ายสำเร็จ ✅');
      setAmount(''); setNote('');
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">บันทึกรายจ่าย (Expense)</h2>
        <p className="text-slate-500 text-sm mt-1">บันทึกรายจ่ายและเบิกเงินสดย่อย</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">เลือกสาขา</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {businesses.map(biz => (
              <div key={biz.id} onClick={() => setSelectedBizId(biz.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedBizId == biz.id ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-xl">{biz.icon}</span><span className="font-bold text-slate-700">{biz.name}</span></div>
                  {selectedBizId == biz.id && <Check size={18} className="text-rose-600" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">วันที่/เวลา</label>
            <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่รายจ่าย</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none appearance-none">
              {STANDARD_CATEGORIES.expense.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">จำนวนเงิน</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
            <input type="number" required min="0" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-rose-600 text-xl font-black" placeholder="0.00" />
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
          <input type="checkbox" id="pettycash" checked={pettyCash} onChange={e => setPettyCash(e.target.checked)} className="mt-1 w-5 h-5 text-amber-600 rounded cursor-pointer" />
          <div>
            <label htmlFor="pettycash" className="font-bold text-amber-900 cursor-pointer block">จ่ายด้วยเงินสดย่อย (Petty Cash)</label>
            <p className="text-sm text-amber-700 mt-0.5">ยอดนี้จะถูกหักจากวงเงินสดย่อยของสาขา</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none" rows="2" placeholder="หมายเหตุเพิ่มเติม" />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 shadow-lg flex items-center gap-2">
            {loading ? <><Spinner /> กำลังบันทึก...</> : 'บันทึกรายจ่าย'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── TRANSACTIONS ───
const Transactions = ({ businesses }) => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBiz, setFilterBiz] = useState('');
  const [filterType, setFilterType] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const fmt = (n) => new Intl.NumberFormat('th-TH').format(n);

  const load = useCallback(() => {
    setLoading(true);
    transactionAPI.getAll()
      .then(data => setTxns(Array.isArray(data) ? data : MOCK_TRANSACTIONS))
      .catch(() => setTxns(MOCK_TRANSACTIONS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await transactionAPI.delete(id);
      setTxns(prev => prev.filter(t => t.id !== id));
      setDeleteModal(null);
    } catch (err) {
      alert('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  const filtered = txns.filter(t => {
    const s = search.toLowerCase();
    return (!s || (t.category || '').includes(s) || (t.created_by_name || '').includes(s) || (t.txn_id || '').toLowerCase().includes(s))
      && (!filterBiz || String(t.business_id) === filterBiz || t.business_name === filterBiz)
      && (!filterType || t.type === filterType);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">รายการธุรกรรม (Transactions)</h2>
          <p className="text-slate-500 text-sm mt-1">ประวัติการรับ-จ่ายทั้งหมด</p>
        </div>
        <button onClick={load} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md">
          <Download size={16} /> Refresh
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4">
        <div className="relative lg:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="ค้นหาหมวดหมู่, ผู้บันทึก..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50" />
        </div>
        <div className="flex gap-3 flex-1">
          <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50">
            <option value="">ทุกสาขา</option>
            {businesses.map(b => <option key={b.id} value={b.id}>ร้าน{b.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50">
            <option value="">ทุกประเภท</option>
            <option value="Income">รายรับ</option>
            <option value="Expense">รายจ่าย</option>
          </select>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-600">
                  <th className="p-4">วันที่</th>
                  <th className="p-4">สาขา</th>
                  <th className="p-4">ประเภท / หมวดหมู่</th>
                  <th className="p-4 text-right">จำนวนเงิน</th>
                  <th className="p-4">ผู้บันทึก</th>
                  <th className="p-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
                ) : filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 text-sm text-slate-700 whitespace-nowrap">
                      <div className="font-bold">{(tx.created_at || tx.date || '').split('T')[0]}</div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700">{tx.business_name || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge type={tx.type === 'Income' ? 'income' : 'expense'}>{tx.type === 'Income' ? 'รายรับ' : 'รายจ่าย'}</Badge>
                        <span className="text-sm text-slate-700">{tx.category}</span>
                      </div>
                    </td>
                    <td className={`p-4 text-right text-base font-black ${tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount)}
                    </td>
                    <td className="p-4 text-sm text-slate-600">{tx.created_by_name || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setDeleteModal(tx)} className="px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1">
                          <Trash2 size={14} /> ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 text-sm text-slate-500 bg-slate-50">
            แสดง {filtered.length} จาก {txns.length} รายการ
          </div>
        </div>
      )}

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="ยืนยันการลบข้อมูล">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">คุณแน่ใจหรือไม่?</h4>
          <p className="text-slate-600 text-sm mb-6">รายการ <strong>{deleteModal?.category}</strong> จะถูกลบถาวร</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setDeleteModal(null)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button onClick={() => handleDelete(deleteModal.id)} className="px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700">ยืนยันลบ</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── BUSINESS MANAGEMENT ───
const BusinessManagement = ({ businesses, setBusinesses, onSuccess }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [pettyCashMax, setPettyCashMax] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏪');
  const [loading, setLoading] = useState(false);

  const openAdd = () => { setEditingId(null); setName(''); setType(''); setPettyCashMax(''); setSelectedEmoji('🏪'); setIsDrawerOpen(true); };
  const openEdit = (biz) => { setEditingId(biz.id); setName(biz.name); setType(biz.type); setPettyCashMax(biz.petty_cash_max || ''); setSelectedEmoji(biz.icon || '🏪'); setIsDrawerOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = { name, type, petty_cash_max: Number(pettyCashMax), icon: selectedEmoji, logo_type: 'emoji' };
    try {
      if (editingId) {
        await businessAPI.update(editingId, data);
        setBusinesses(prev => prev.map(b => b.id === editingId ? { ...b, ...data } : b));
        onSuccess('อัปเดตธุรกิจสำเร็จ ✅');
      } else {
        const created = await businessAPI.create(data);
        setBusinesses(prev => [...prev, created]);
        onSuccess('เพิ่มธุรกิจสำเร็จ ✅');
      }
      setIsDrawerOpen(false);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (biz) => {
    const newStatus = biz.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await businessAPI.update(biz.id, { status: newStatus });
      setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, status: newStatus } : b));
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการธุรกิจ (Business)</h2>
          <p className="text-slate-500 text-sm mt-1">ตั้งค่าและจัดการสาขาทั้งหมด</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold flex items-center gap-2 shadow-lg">
          <Plus size={18} /> เพิ่มธุรกิจใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map(biz => (
          <div key={biz.id} className={`bg-white rounded-2xl p-6 border transition-all ${biz.status === 'Active' ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-200 opacity-60'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl border border-blue-100">{biz.icon || '🏪'}</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{biz.name}</h3>
                  <span className="text-sm text-slate-500">{biz.type}</span>
                </div>
              </div>
              <Badge type={biz.status === 'Active' ? 'income' : 'default'}>{biz.status === 'Active' ? 'เปิด' : 'ปิด'}</Badge>
            </div>
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button onClick={() => openEdit(biz)} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2">
                <Edit2 size={16} /> ตั้งค่า
              </button>
              <button onClick={() => toggleStatus(biz)} className={`py-2 px-4 text-sm font-bold rounded-xl border flex items-center ${biz.status === 'Active' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                <Power size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={editingId ? 'ตั้งค่าธุรกิจ' : 'เพิ่มธุรกิจใหม่'}>
        <form onSubmit={handleSave} className="p-6 space-y-6 pb-24">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อธุรกิจ *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="เช่น กาแฟ D" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภทธุรกิจ *</label>
              <input type="text" required value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="เช่น Cafe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">วงเงินสดย่อย (฿)</label>
              <input type="number" value={pettyCashMax} onChange={e => setPettyCashMax(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="20000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">เลือกไอคอน</label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setSelectedEmoji(e)} className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:scale-110 ${selectedEmoji === e ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-slate-100'}`}>{e}</button>
              ))}
            </div>
          </div>
          <div className="fixed bottom-0 right-0 w-full max-w-xl bg-white border-t border-slate-200 p-4 flex gap-3 z-20">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Spinner /> บันทึก...</> : 'บันทึก'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

// ─── REPORTS ───
const Reports = ({ businesses }) => {
  const [selectedBiz, setSelectedBiz] = useState('all');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState('category');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fmt = (n) => new Intl.NumberFormat('th-TH').format(n || 0);

  const load = async () => {
    setLoading(true);
    const params = { start: startDate, end: endDate };
    if (selectedBiz !== 'all') params.business_id = selectedBiz;
    reportAPI.getPL(params)
      .then(setData)
      .catch(() => setData({ income: 155000, expense: 99000, profit: 56000, income_items: [], expense_items: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedBiz, startDate, endDate]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">รายงานงบกำไรขาดทุน (P&L)</h2>
          <p className="text-slate-500 text-sm mt-1">Profit & Loss Statement</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Printer size={16} /> Print</button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">เลือกธุรกิจ:</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedBiz('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedBiz === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
              รวมทุกร้าน
            </button>
            {businesses.map(biz => (
              <button key={biz.id} onClick={() => setSelectedBiz(String(biz.id))} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${selectedBiz === String(biz.id) ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                <span>{biz.icon}</span>ร้าน{biz.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          <span className="text-slate-500 font-bold">ถึง</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : data && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex gap-2">
            {[['category', <Tags size={16} />, 'แยกตามหมวดหมู่'], ['department', <FolderTree size={16} />, 'แยกตามแผนก']].map(([v, icon, label]) => (
              <button key={v} onClick={() => setGroupBy(v)} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${groupBy === v ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:text-slate-800'}`}>{icon}{label}</button>
            ))}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-600">
                <th className="p-4">รายการ</th>
                <th className="p-4 text-right">จำนวนเงิน (฿)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-emerald-50 border-b border-emerald-100">
                <td className="p-4 font-bold text-emerald-800 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>รายรับทั้งหมด</td>
                <td className="p-4 text-right font-black text-emerald-600 text-lg">฿{fmt(data.income)}</td>
              </tr>
              <tr className="bg-rose-50 border-b border-rose-100">
                <td className="p-4 font-bold text-rose-800 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div>รายจ่ายรวม</td>
                <td className="p-4 text-right font-black text-rose-600 text-lg">฿{fmt(data.expense)}</td>
              </tr>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="p-5 font-black text-blue-800 flex items-center gap-2 text-base"><div className="w-4 h-4 rounded-full bg-blue-600"></div>กำไรสุทธิ</td>
                <td className={`p-5 text-right font-black text-xl ${(data.profit || 0) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  ฿{fmt(data.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── USER MANAGEMENT ───
const UserManagement = ({ businesses, onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); const [role, setRole] = useState('พนักงาน');
  const [selectedBizs, setSelectedBizs] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [accessLevel, setAccessLevel] = useState('Own Data');
  const [saving, setSaving] = useState(false);
  const [inviteModal, setInviteModal] = useState(null); // { name, email, link }
  const [invitingId, setInvitingId] = useState(null);

  useEffect(() => {
    userAPI.getAll()
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const ALL_FEATURES = FEATURE_LIST.map(f => f.id);

  const openAdd = () => {
    setEditingId(null); setName(''); setEmail(''); setPhone(''); setRole('พนักงาน');
    setSelectedBizs([]); 
    setSelectedFeatures(ALL_FEATURES); // default เลือกทั้งหมด
    setAccessLevel('Own Data'); 
    setIsDrawerOpen(true);
  };
  const openEdit = (u) => {
    setEditingId(u.id); setName(u.name); setEmail(u.email); setPhone(u.phone || ''); setRole(u.role || 'พนักงาน');
    setSelectedBizs(u.business_ids || []); setSelectedFeatures(u.features || []); setAccessLevel(u.access_level || 'Own Data');
    setIsDrawerOpen(true);
  };
  const handleDelete = async (id, n) => {
    if (!confirm(`ลบผู้ใช้ "${n}" หรือไม่?`)) return;
    await userAPI.delete(id).catch(() => {});
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleInvite = async (user) => {
    setInvitingId(user.id);
    try {
      const res = await inviteAPI.sendInvite(user.id);
      if (res.invite_link) {
        setInviteModal({ name: user.name, email: user.email, link: res.invite_link });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, invite_status: 'pending' } : u));
      } else {
        alert('เกิดข้อผิดพลาด: ' + (res.error || 'ไม่สามารถสร้างลิงค์ได้'));
      }
    } catch {
      alert('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    } finally {
      setInvitingId(null);
    }
  };
  const toggleBiz = (id) => setSelectedBizs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleFeat = (id) => setSelectedFeatures(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    const data = { name, email, phone, role, business_ids: selectedBizs, features: selectedFeatures, access_level: accessLevel };
    try {
      if (editingId) {
        await userAPI.update(editingId, data);
        setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...data } : u));
        setIsDrawerOpen(false);
        onSuccess('อัปเดตผู้ใช้สำเร็จ ✅');
      } else {
        const created = await userAPI.create(data);
        setUsers(prev => [...prev, created]);
        setIsDrawerOpen(false);
        onSuccess('เพิ่มผู้ใช้สำเร็จ ✅');
        // Auto-send invite link และแสดง modal
        const res = await inviteAPI.sendInvite(created.id).catch(() => null);
        if (res?.invite_link) {
          setInviteModal({ name: created.name, email: created.email, link: res.invite_link });
          setUsers(prev => prev.map(u => u.id === created.id ? { ...u, invite_status: 'pending' } : u));
        }
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-black text-slate-800">ลิงค์พร้อมแล้ว!</h3>
              <p className="text-slate-500 text-sm mt-1">ส่งลิงค์นี้ให้ <strong>{inviteModal.name}</strong> ตั้งรหัสผ่าน</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 mb-1">อีเมล</p>
              <p className="font-bold text-slate-700">{inviteModal.email}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-xs text-blue-600 font-bold mb-2">🔗 ลิงค์ตั้งรหัสผ่าน (หมดอายุใน 7 วัน)</p>
              <p className="text-xs text-blue-800 break-all font-mono">{inviteModal.link}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(inviteModal.link); onSuccess('คัดลอกลิงค์แล้ว ✅'); }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                📋 คัดลอกลิงค์
              </button>
              <button onClick={() => setInviteModal(null)} className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการสิทธิ์ผู้ใช้งาน</h2>
          <p className="text-slate-500 text-sm mt-1">User Management & Permissions</p>
        </div>
        <button onClick={openAdd} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold flex items-center gap-2 shadow-md">
          <Plus size={18} /> เพิ่มพนักงาน
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีผู้ใช้งาน กด "เพิ่มพนักงาน" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {users.map(user => (
            <div key={user.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-slate-800 text-lg">{user.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold mt-1.5 px-2 py-0.5 rounded-full ${
                    user.invite_status === 'active' ? 'bg-green-100 text-green-700' :
                    user.invite_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {user.invite_status === 'active' ? '✅ ตั้งรหัสผ่านแล้ว' :
                     user.invite_status === 'pending' ? '⏳ รอตั้งรหัสผ่าน' : '⭕ ยังไม่ได้ส่งลิงค์'}
                  </span>
                </div>
                <Badge type={user.role === 'เจ้าของธุรกิจ' ? 'owner' : user.role === 'ผู้จัดการ' ? 'manager' : 'staff'}>{user.role}</Badge>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(user)} className="flex-1 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-100">
                  <Settings size={16} /> จัดการสิทธิ์
                </button>
                <button
                  onClick={() => handleInvite(user)}
                  disabled={invitingId === user.id}
                  className="flex-1 py-2.5 bg-green-50 text-green-700 text-sm font-bold rounded-xl hover:bg-green-100 flex items-center justify-center gap-2 border border-green-200 disabled:opacity-50"
                >
                  {invitingId === user.id ? <Loader2 size={16} className="animate-spin" /> : '🔗'} ส่งลิงค์
                </button>
                <button onClick={() => handleDelete(user.id, user.name)} className="px-4 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={editingId ? 'ตั้งค่าสิทธิ์' : 'เพิ่มพนักงานใหม่'}>
        <form onSubmit={handleSave} className="p-6 space-y-6 pb-24">
          <div className="space-y-4">
            {[['ชื่อ-นามสกุล *', name, setName, 'text', 'กรอกชื่อ-นามสกุล'], ['อีเมล *', email, setEmail, 'email', 'example@email.com'], ['เบอร์โทร', phone, setPhone, 'tel', '08X-XXX-XXXX']].map(([label, val, setter, type, ph]) => (
              <div key={label}>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
                <input type={type} required={label.includes('*')} value={val} onChange={e => setter(e.target.value)} placeholder={ph} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">ตำแหน่ง</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option>เจ้าของธุรกิจ</option><option>ผู้จัดการ</option><option>พนักงาน</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">ธุรกิจที่เข้าถึงได้ <span className="text-slate-400 font-normal">(เฉพาะที่เปิดใช้งาน)</span></label>
            <div className="space-y-2">
              {businesses.filter(biz => biz.status === 'Active').map(biz => (
                <label key={biz.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedBizs.includes(biz.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={selectedBizs.includes(biz.id)} onChange={() => toggleBiz(biz.id)} className="w-5 h-5 text-blue-600 rounded" />
                  <span className="text-xl">{biz.icon}</span>
                  <span className="text-sm font-bold text-slate-700">ร้าน{biz.name}</span>
                </label>
              ))}
              {businesses.filter(biz => biz.status === 'Active').length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">ไม่มีธุรกิจที่เปิดใช้งาน</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-slate-700">สิทธิ์การใช้งาน</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedFeatures(ALL_FEATURES)} className="text-xs font-bold text-blue-600 hover:underline">เลือกทั้งหมด</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setSelectedFeatures([])} className="text-xs font-bold text-slate-500 hover:underline">ล้างทั้งหมด</button>
              </div>
            </div>
            <div className="space-y-2">
              {FEATURE_LIST.map(f => (
                <label key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${selectedFeatures.includes(f.id) ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={selectedFeatures.includes(f.id)} onChange={() => toggleFeat(f.id)} className="w-4 h-4 text-amber-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 right-0 w-full max-w-xl bg-white border-t p-4 flex gap-3 z-20">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Spinner />บันทึก...</> : 'บันทึก'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

// ─── MAIN APP ───
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [businesses, setBusinesses] = useState(MOCK_BUSINESSES);
  const [toast, setToast] = useState(null);

  // Load businesses on login
  useEffect(() => {
    if (!user) return;
    businessAPI.getAll()
      .then(data => { if (Array.isArray(data) && data.length > 0) setBusinesses(data); })
      .catch(() => {});
  }, [user]);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  if (!user) {
    // เช็คว่าเป็นหน้าตั้งรหัสผ่านหรือไม่
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) return <SetPasswordPage token={token} />;
    return <LoginPage onLogin={setUser} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'income', label: 'รับเงิน', icon: TrendingUp, color: 'text-emerald-400' },
    { id: 'expense', label: 'จ่ายเงิน', icon: TrendingDown, color: 'text-rose-400' },
    { id: 'transactions', label: 'รายการธุรกรรม', icon: List },
    { id: 'reports', label: 'รายงาน P&L', icon: FileText },
    { id: 'businesses', label: 'จัดการธุรกิจ', icon: Building2 },
    { id: 'users', label: 'จัดการสิทธิ์', icon: Users },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard setCurrentView={setCurrentView} />;
      case 'income': return <IncomeEntry businesses={businesses} onSuccess={showToast} />;
      case 'expense': return <ExpenseEntry businesses={businesses} onSuccess={showToast} />;
      case 'transactions': return <Transactions businesses={businesses} />;
      case 'reports': return <Reports businesses={businesses} />;
      case 'businesses': return <BusinessManagement businesses={businesses} setBusinesses={setBusinesses} onSuccess={showToast} />;
      case 'users': return <UserManagement businesses={businesses} onSuccess={showToast} />;
      default: return <Dashboard setCurrentView={setCurrentView} />;
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center gap-3 bg-slate-950/50">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white"><Wallet size={20} /></div>
        <span className="text-xl font-black text-white">FinanceHub</span>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3 px-3">เมนูหลัก</div>
        {menuItems.slice(0, 4).map(item => {
          const Icon = item.icon; const isActive = currentView === item.id;
          return (
            <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Icon size={18} className={isActive ? 'text-white' : (item.color || 'text-slate-400')} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          );
        })}
        <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3 px-3 mt-6">การจัดการ</div>
        {menuItems.slice(4).map(item => {
          const Icon = item.icon; const isActive = currentView === item.id;
          return (
            <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-bold">
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 fixed h-full z-10"><SidebarContent /></aside>
      {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-slate-900/60 z-40" onClick={() => setIsMobileMenuOpen(false)}></div>}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 z-50 transform transition-transform duration-300 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}><SidebarContent /></aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
              <span className="font-black text-slate-800">FinanceHub</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-blue-600">{menuItems.find(m => m.id === currentView)?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {renderView()}
        </div>
      </main>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
