import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, TrendingUp, TrendingDown, List, Building2,
  FileText, Users, Menu, X, Eye, EyeOff, Upload, Plus, Search,
  FileEdit, FilePlus, Send, Receipt, ClipboardList, Stamp,
  MoreVertical, AlertCircle, Image as ImageIcon, History,
  Check, Settings, LogOut, ChevronDown, Calendar, Wallet,
  Download, Printer, Trash2, Smile, ImagePlus, UploadCloud, Edit2, Power,
  ChevronRight, ArrowUp, ArrowDown, Banknote, Landmark,
  CreditCard, CornerDownRight, FolderTree, Tags, BarChart2,
  Phone, Shield, Lightbulb, CheckSquare, Lock, User, CalendarDays,
  Loader2
} from 'lucide-react';
import { businessAPI, transactionAPI, userAPI, reportAPI, auditAPI, imageAPI, documentAPI } from './api.js';

// ─── INVITE API ───
const inviteAPI = {
  sendInvite: (id) => fetch(`/api/users/${id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d; }),
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

// ── Timezone helper: คืน datetime string แบบ +07:00 (ไทย) ──
const nowTH = () => {
  const now = new Date();
  const offset = 7 * 60;
  const local = new Date(now.getTime() + (offset - now.getTimezoneOffset()) * 60000);
  return local.toISOString().replace('Z', '');
};
const todayTH = () => nowTH().split('T')[0];

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
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">{children}</div>
      </div>
    </div>
  );
};

const Spinner = () => <Loader2 size={20} className="animate-spin text-blue-500" />;

// BizIcon: แสดง icon ธุรกิจ รองรับทั้ง emoji และ base64 image
const BizIcon = ({ biz, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-6 h-6 text-base' : size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-xl';
  if (biz?.logo_type === 'image' && biz?.icon && biz.icon.startsWith('data:')) {
    return <img src={biz.icon} alt={biz.name} className={`${sz} rounded-lg object-cover shrink-0`} />;
  }
  return <span className={`${sz} flex items-center justify-center shrink-0`}>{biz?.icon || '🏪'}</span>;
};



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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อผู้ใช้ (Username)</label>
            <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-slate-50" placeholder="กรอก Username" />
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
  const [pettyCashModal, setPettyCashModal] = useState(null); // biz object
  const [pcMax, setPcMax] = useState('');
  const [pcCurrent, setPcCurrent] = useState('');
  const [pcSaving, setPcSaving] = useState(false);
  const fmt = (n) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(n) || 0);

  const openPettyCash = (biz, e) => {
    e.stopPropagation();
    setPcMax(String(biz.petty_cash_max || 0));
    setPcCurrent(String(biz.petty_cash || 0));
    setPettyCashModal(biz);
  };

  const savePettyCash = async () => {
    const max = Number(pcMax);
    const current = Number(pcCurrent);
    if (isNaN(max) || max < 0) return alert('วงเงินสูงสุดต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    if (isNaN(current) || current < 0) return alert('ยอดคงเหลือต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    if (current > max) return alert('ยอดคงเหลือต้องไม่เกินวงเงินสูงสุด');
    setPcSaving(true);
    try {
      await businessAPI.update(pettyCashModal.id, {
        ...pettyCashModal,
        petty_cash_max: max,
        petty_cash: current,
      });
      setBizData(prev => prev.map(b => b.id === pettyCashModal.id
        ? { ...b, petty_cash_max: max, petty_cash: current } : b));
      setPettyCashModal(null);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setPcSaving(false); }
  };

  const getDateRange = (p) => {
    const now = new Date(new Date().getTime() + 7*60*60*1000);
    if (p === 'วันนี้') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
      return { start: s, end: s };
    }
    if (p === 'สัปดาห์นี้') {
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: mon.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    // เดือนนี้
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };

  const loadData = async (p) => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(p);
      // โหลดทุกธุรกิจที่ Active
      const allBiz = await businessAPI.getAll();
      const activeBiz = (Array.isArray(allBiz) ? allBiz : []).filter(b => b.status === 'Active');

      // โหลดข้อมูล P&L ตามช่วงวันที่ สำหรับแต่ละธุรกิจ
      const results = await Promise.all(activeBiz.map(async (biz) => {
        try {
          const pl = await reportAPI.getPL({ business_id: biz.id, start, end });
          return {
            ...biz,
            income: Number(pl.income) || 0,
            expense: Number(pl.expense) || 0,
            profit: Number(pl.profit) || 0,
          };
        } catch {
          return { ...biz, income: 0, expense: 0, profit: 0 };
        }
      }));

      // แสดงเฉพาะร้านที่มีข้อมูลในช่วงนั้น
      const withData = results.filter(b => b.income > 0 || b.expense > 0);
      setBizData(withData.length > 0 ? withData : results);
    } catch {
      setBizData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(period); }, [period]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  return (
    <div className="space-y-6">

      {/* ── Petty Cash Edit Modal ── */}
      {pettyCashModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPettyCashModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Wallet size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">แก้ไขเงินสดย่อย</h3>
                <p className="text-slate-500 text-sm">{pettyCashModal.name}</p>
              </div>
              <button onClick={() => setPettyCashModal(null)} className="ml-auto p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* วงเงินสูงสุด */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  💰 วงเงินสูงสุด
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-amber-600">฿</span>
                  <input type="number" min="0" value={pcMax} onChange={e => setPcMax(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-400 outline-none text-lg font-bold bg-amber-50" />
                </div>
                <p className="text-xs text-slate-400 mt-1">วงเงินสดย่อยสูงสุดที่สามารถเก็บได้</p>
              </div>

              {/* ยอดคงเหลือ */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  💵 ยอดคงเหลือปัจจุบัน
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-600">฿</span>
                  <input type="number" min="0" value={pcCurrent} onChange={e => setPcCurrent(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-400 outline-none text-lg font-bold bg-emerald-50" />
                </div>
                <p className="text-xs text-slate-400 mt-1">จำนวนเงินสดย่อยที่มีอยู่ตอนนี้</p>
              </div>

              {/* Preview bar */}
              {Number(pcMax) > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>ยอดคงเหลือ</span>
                    <span className="font-bold">{Math.min(100, Math.round((Number(pcCurrent) / Number(pcMax)) * 100))}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className={`h-full rounded-full transition-all ${(Number(pcCurrent) / Number(pcMax)) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (Number(pcCurrent) / Number(pcMax)) * 100)}%` }} />
                  </div>
                </div>
              )}

              {Number(pcCurrent) > Number(pcMax) && Number(pcMax) > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 font-medium">
                  ⚠️ ยอดคงเหลือเกินวงเงินสูงสุด
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setPettyCashModal(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={savePettyCash} disabled={pcSaving}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {pcSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
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
              <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                <span className="font-bold text-slate-800">เงินสดย่อย</span>
                <div className="flex items-center gap-2">
                  <span>{fmt(biz.petty_cash)} / {fmt(biz.petty_cash_max)}</span>
                  <button onClick={(e) => openPettyCash(biz, e)}
                    className="w-6 h-6 flex items-center justify-center bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-lg transition-colors" title="แก้ไขเงินสดย่อย">
                    <Edit2 size={11} />
                  </button>
                </div>
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
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden"><BizIcon biz={selectedBiz} size="lg" /></div>
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
  const [date, setDate] = useState(todayTH());
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
            {businesses.filter(b=>b.status==='Active').map(biz => (
              <div key={biz.id} onClick={() => setSelectedBizId(biz.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedBizId == biz.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BizIcon biz={biz} size="sm" />
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
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-base" />
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
                  <input type="number" min="0" value={val} onChange={e => setter(e.target.value)} className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-base" placeholder="0" />
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
const ExpenseEntry = ({ businesses, user, onSuccess }) => {
  const [selectedBizId, setSelectedBizId] = useState('');
  const [datetime, setDatetime] = useState(nowTH().slice(0, 16));
  const [category, setCategory] = useState('ต้นทุนขาย/วัตถุดิบ (COGS)');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pettyCash, setPettyCash] = useState(true);
  const [images, setImages] = useState([]); // { name, data, type, preview }
  const [loading, setLoading] = useState(false);

  const selectedBiz = businesses.find(b => String(b.id) === String(selectedBizId));
  const fmt = (n) => new Intl.NumberFormat('th-TH').format(n || 0);

  const handleImagePick = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (images.length >= 5) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        setImages(prev => [...prev, {
          name: file.name,
          data: base64,
          type: file.type,
          preview: base64
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBizId) return alert('กรุณาเลือกสาขาก่อน');
    if (!amount || Number(amount) <= 0) return alert('กรุณากรอกจำนวนเงิน');
    setLoading(true);
    try {
      await transactionAPI.create({
        business_id: selectedBizId, type: 'Expense', category,
        amount: Number(amount), date: datetime, petty_cash: pettyCash, note,
        images: images.map(img => ({ name: img.name, data: img.data, type: img.type })),
        created_by_name: user?.name || 'Admin'
      });
      onSuccess('บันทึกรายจ่ายสำเร็จ ✅');
      setAmount(''); setNote(''); setSelectedBizId('');
      setImages([]);
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* เลือกสาขา */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">เลือกสาขา</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {businesses.filter(b => b.status === 'Active').map(biz => (
              <div key={biz.id} onClick={() => setSelectedBizId(biz.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedBizId == biz.id ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><BizIcon biz={biz} size="sm" /><span className="font-bold text-slate-700">{biz.name}</span></div>
                  {selectedBizId == biz.id && <Check size={18} className="text-rose-600" />}
                </div>
              </div>
            ))}
          </div>

          {/* Petty Cash Status */}
          {selectedBiz && (
            <div className="mt-4 bg-slate-900 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                <Wallet size={14} /> สถานะเงินสดย่อย {selectedBiz.name}
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-3xl font-black ${(selectedBiz.petty_cash / selectedBiz.petty_cash_max) < 0.3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ฿ {fmt(selectedBiz.petty_cash)}
                </span>
                <span className="text-slate-400 text-sm mb-1">/ {fmt(selectedBiz.petty_cash_max)}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${(selectedBiz.petty_cash / selectedBiz.petty_cash_max) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (selectedBiz.petty_cash / selectedBiz.petty_cash_max) * 100)}%` }} />
              </div>
              {(selectedBiz.petty_cash / selectedBiz.petty_cash_max) < 0.3 && (
                <p className="text-amber-400 text-xs font-bold">⚠️ ยอดเงินสดย่อยต่ำกว่า 30% กรุณาเบิกเพิ่ม</p>
              )}
            </div>
          )}
        </div>

        {/* รายละเอียด */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
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
              <input type="number" required min="0" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-rose-600 text-xl font-black" placeholder="0.00" />
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <input type="checkbox" id="pettycash" checked={pettyCash} onChange={e => setPettyCash(e.target.checked)} className="mt-1 w-5 h-5 text-amber-600 rounded cursor-pointer" />
            <div>
              <label htmlFor="pettycash" className="font-bold text-amber-900 cursor-pointer block">จ่ายด้วยเงินสดย่อย (Petty Cash)</label>
              <p className="text-sm text-amber-700 mt-0.5">ยอดนี้จะถูกหักออกจากวงเงินสดย่อยของสาขา</p>
            </div>
          </div>

          {/* แนบรูปภาพหลักฐาน */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              📎 แนบรูปภาพหลักฐาน <span className="text-slate-400 font-normal">(ใบเสร็จ / ใบกำกับภาษี) สูงสุด 5 รูป</span>
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img src={img.preview} alt={img.name} className="w-full h-full object-cover rounded-xl border border-slate-200" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all flex items-center justify-center">
                      <button type="button" onClick={() => removeImage(idx)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">{idx + 1}</div>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all">
                    <Plus size={20} className="text-slate-400" />
                    <span className="text-xs text-slate-400 mt-1">เพิ่มรูป</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
                  </label>
                )}
              </div>
            )}

            {images.length === 0 && (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all">
                <UploadCloud size={28} className="text-slate-400 mb-1" />
                <span className="text-sm font-medium text-slate-500">คลิกเพื่ออัพโหลดรูปภาพ</span>
                <span className="text-xs text-slate-400">JPG, PNG, HEIC ขนาดสูงสุด 5MB ต่อรูป</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุ</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none" rows="2"
              placeholder="เช่น ชื่อวัตถุดิบด่วน เนื่องจากของขาด..." />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" disabled={loading} className="px-8 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 shadow-lg flex items-center gap-2">
              {loading ? <><Spinner /> กำลังบันทึก...</> : <>บันทึกรายจ่าย {images.length > 0 && `(${images.length} รูป)`}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ─── TRANSACTIONS ───
const Transactions = ({ businesses, user }) => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBiz, setFilterBiz] = useState('');
  const [filterType, setFilterType] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);
  // Image viewer
  const [imageModal, setImageModal] = useState(null); // transaction object
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  // Audit log per transaction
  const [auditModal, setAuditModal] = useState(null); // transaction object
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('th-TH').format(Number(n) || 0);
  const activeBiz = businesses.filter(b => b.status === 'Active');

  const load = useCallback(() => {
    setLoading(true);
    transactionAPI.getAll()
      .then(data => setTxns(Array.isArray(data) ? data : []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openImages = async (tx) => {
    setImageModal(tx);
    setActiveImgIdx(0);
    setImagesLoading(true);
    try {
      const data = await imageAPI.getAll(tx.id);
      setImages(Array.isArray(data) ? data : []);
    } catch { setImages([]); }
    finally { setImagesLoading(false); }
  };

  const openAudit = async (tx) => {
    setAuditModal(tx);
    setAuditLoading(true);
    try {
      const data = await auditAPI.getByTransaction(tx.id);
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch { setAuditLogs([]); }
    finally { setAuditLoading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await transactionAPI.delete(id);
      setTxns(prev => prev.filter(t => t.id !== id));
      setDeleteModal(null);
    } catch (err) { alert('ลบไม่สำเร็จ: ' + err.message); }
  };

  const openEdit = (tx) => {
    setEditModal(tx);
    setEditCategory(tx.category || '');
    setEditAmount(String(tx.amount || ''));
    setEditNote(tx.note || '');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await transactionAPI.update(editModal.id, {
        category: editCategory, amount: Number(editAmount), note: editNote,
        user_name: user?.name || 'Admin'
      });
      setTxns(prev => prev.map(t => t.id === editModal.id
        ? { ...t, category: editCategory, amount: Number(editAmount), note: editNote, is_edited: true } : t));
      setEditModal(null);
    } catch (err) { alert('แก้ไขไม่สำเร็จ: ' + err.message); }
    finally { setSaving(false); }
  };

  const downloadImage = (img) => {
    const a = document.createElement('a');
    a.href = img.file_data;
    a.download = img.file_name || 'receipt.jpg';
    a.click();
  };

  const filtered = txns.filter(t => {
    const s = search.toLowerCase();
    return (!s || (t.category || '').toLowerCase().includes(s) || (t.created_by_name || '').includes(s) || (t.txn_id || '').toLowerCase().includes(s))
      && (!filterBiz || String(t.business_id) === filterBiz)
      && (!filterType || t.type === filterType);
  });

  const auditIcon = (a) => a === 'EDIT' ? '✏️' : a === 'DELETE' ? '🗑' : '➕';
  const auditColor = (a) => a === 'EDIT' ? 'bg-blue-100 text-blue-700' : a === 'DELETE' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">รายการธุรกรรม (Transactions)</h2>
          <p className="text-slate-500 text-sm mt-1">ประวัติการรับ-จ่ายทั้งหมด</p>
        </div>
        <button onClick={load} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2">
          <Download size={16} /> Refresh
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="ค้นหาหมวดหมู่, ผู้บันทึก, เลขที่..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base bg-slate-50" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
            <option value="">ทุกสาขา</option>
            {activeBiz.map(b => <option key={b.id} value={b.id}>ร้าน{b.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
            <option value="">ทุกประเภท</option>
            <option value="Income">รายรับ</option>
            <option value="Expense">รายจ่าย</option>
          </select>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">ไม่พบข้อมูล</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(tx => (
                <div key={tx.id} className="p-4 hover:bg-blue-50/30 transition-colors">
                  {/* Row 1: วันที่ + จำนวนเงิน */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{(tx.created_at || tx.date || '').split('T')[0]}</div>
                      <div className="text-slate-400 text-xs">{(tx.created_at || tx.date || '').split('T')[1]?.slice(0,5)} · {tx.business_name || '—'}</div>
                    </div>
                    <div className={`text-base font-black ${tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'Income' ? '+' : '-'}฿{fmt(tx.amount)}
                    </div>
                  </div>
                  {/* Row 2: Badge + category + edited */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge type={tx.type === 'Income' ? 'income' : 'expense'}>{tx.type === 'Income' ? 'รายรับ' : 'รายจ่าย'}</Badge>
                    <span className="text-sm text-slate-700">{tx.category}</span>
                    {tx.is_edited && <Badge type="audit">✏️ Edited</Badge>}
                    {tx.created_by_name && <span className="text-xs text-slate-400">โดย {tx.created_by_name}</span>}
                  </div>
                  {/* Row 3: action buttons */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => openImages(tx)}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${tx.image_count > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <ImageIcon size={13} />
                      {tx.image_count > 0 ? `${tx.image_count} รูป` : 'รูป'}
                    </button>
                    <button onClick={() => openAudit(tx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-bold border border-purple-100">
                      <History size={13} /> ประวัติ
                    </button>
                    <button onClick={() => openEdit(tx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-100">
                      <Edit2 size={13} /> แก้ไข
                    </button>
                    <button onClick={() => setDeleteModal(tx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-100">
                      <Trash2 size={13} /> ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 border-t border-slate-200 text-sm text-slate-500 bg-slate-50">
            แสดง {filtered.length} จาก {txns.length} รายการ
          </div>
        </div>
      )}

      {/* ─── IMAGE VIEWER MODAL ─── */}
      <Modal isOpen={!!imageModal} onClose={() => setImageModal(null)} title={`หลักฐาน: ${imageModal?.txn_id || ''}`}>
        <div className="space-y-4">
          {imagesLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : images.length === 0 ? (
            <div className="text-center py-10">
              <ImageIcon size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">ยังไม่มีรูปภาพหลักฐาน</p>
              <p className="text-slate-400 text-sm mt-1">บันทึกรายจ่ายพร้อมแนบรูปได้ที่เมนู "จ่ายเงิน"</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
                <img src={images[activeImgIdx]?.file_data} alt={images[activeImgIdx]?.file_name}
                  className="max-w-full max-h-full object-contain" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImgIdx(p => Math.max(0, p - 1))}
                      disabled={activeImgIdx === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 disabled:opacity-30">
                      ‹
                    </button>
                    <button onClick={() => setActiveImgIdx(p => Math.min(images.length - 1, p + 1))}
                      disabled={activeImgIdx === images.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 disabled:opacity-30">
                      ›
                    </button>
                    <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {activeImgIdx + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button key={img.id} onClick={() => setActiveImgIdx(idx)}
                      className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImgIdx === idx ? 'border-blue-500' : 'border-slate-200 hover:border-blue-300'}`}>
                      <img src={img.file_data} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  <span className="font-medium">อัพโหลดโดย:</span> {images[activeImgIdx]?.uploaded_by_name || '—'}
                  <span className="ml-3 text-slate-400">{images[activeImgIdx]?.created_at ? new Date(images[activeImgIdx].created_at).toLocaleString('th-TH') : ''}</span>
                </div>
                <button onClick={() => downloadImage(images[activeImgIdx])}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                  <Download size={16} /> ดาวน์โหลดรูปนี้
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ─── AUDIT LOG MODAL ─── */}
      <Modal isOpen={!!auditModal} onClose={() => setAuditModal(null)} title={`ประวัติการแก้ไข: ${auditModal?.txn_id || ''}`}>
        <div className="space-y-1 py-1 max-h-[55vh] overflow-y-auto">
          {auditLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : auditLogs.length === 0 ? (
            <p className="text-center text-slate-400 py-8">ยังไม่มีประวัติ</p>
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
              {auditLogs.map((log, idx) => (
                <div key={log.id} className="flex gap-4 pb-5 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg z-10 border-2 border-white ${auditColor(log.action)}`}>
                    {auditIcon(log.action)}
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-bold text-slate-800">{log.user_name || 'Admin'}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${auditColor(log.action)}`}>
                          {log.action === 'EDIT' ? 'แก้ไข' : log.action === 'DELETE' ? 'ลบ' : 'สร้าง'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{new Date(log.created_at).toLocaleString('th-TH')}</span>
                    </div>

                    {log.action === 'CREATE' && (
                      <p className="text-sm text-slate-600">{log.new_value || 'บันทึกรายการครั้งแรก'}</p>
                    )}

                    {log.action === 'EDIT' && log.field_changed && (
                      <div className="text-sm space-y-1">
                        <p className="text-slate-500">เปลี่ยน <strong className="text-slate-700">{log.field_changed}</strong></p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-lg font-mono text-xs line-through">{log.old_value}</span>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-mono text-xs font-bold">{log.new_value}</span>
                        </div>
                      </div>
                    )}

                    {log.action === 'DELETE' && (
                      <p className="text-sm text-rose-600">{log.old_value || 'ลบรายการออกจากระบบ'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="แก้ไขรายการ">
        <form onSubmit={handleEdit} className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">หมวดหมู่</label>
            <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">จำนวนเงิน (฿)</label>
            <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="0"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">หมายเหตุ</label>
            <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="(ถ้ามี)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} บันทึก
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
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
const DEFAULT_INCOME_CATS = [
  'ยอดขายสินค้า (Sales)', 'รายได้จากการบริการ (Services)',
  'รายได้ค่าเช่า (Rental Income)', 'ดอกเบี้ยรับ (Interest Income)',
  'รายได้อื่นๆ (Other Income)',
];
const DEFAULT_EXPENSE_CATS = [
  'ต้นทุนขาย/วัตถุดิบ (COGS)', 'เงินเดือนและค่าจ้าง (Salary)',
  'ค่าเช่าสถานที่ (Rent)', 'ค่าสาธารณูปโภค (Utilities)',
  'ค่าวัสดุสิ้นเปลือง (Supplies)', 'ค่าโฆษณาและการตลาด (Marketing)',
  'ค่าซ่อมบำรุง (Maintenance)', 'ค่าขนส่ง (Transportation)',
  'ค่าประกันภัย (Insurance)', 'ค่าเสื่อมราคา (Depreciation)',
];

const BusinessManagement = ({ businesses, setBusinesses, onSuccess }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [pettyCashMax, setPettyCashMax] = useState('20000');
  const [logoMode, setLogoMode] = useState('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🏪');
  const [logoImage, setLogoImage] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [taxName, setTaxName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxAddress, setTaxAddress] = useState('');
  const [departments, setDepartments] = useState([]);
  const [deptInput, setDeptInput] = useState('');
  const [incomeCategories, setIncomeCategories] = useState([...DEFAULT_INCOME_CATS]);
  const [expenseCategories, setExpenseCategories] = useState([...DEFAULT_EXPENSE_CATS]);

  const resetForm = () => {
    setName(''); setType(''); setPettyCashMax('20000');
    setLogoMode('emoji'); setSelectedEmoji('🏪'); setLogoImage(null); setLogoPreview(null);
    setTaxName(''); setTaxId(''); setTaxAddress('');
    setDepartments([]); setDeptInput('');
    setIncomeCategories([...DEFAULT_INCOME_CATS]);
    setExpenseCategories([...DEFAULT_EXPENSE_CATS]);
  };

  const openAdd = () => { setEditingId(null); resetForm(); setIsDrawerOpen(true); };

  const openEdit = (biz) => {
    setEditingId(biz.id);
    setName(biz.name || '');
    setType(biz.type || '');
    setPettyCashMax(String(biz.petty_cash_max || 20000));
    setLogoMode(biz.logo_type === 'image' ? 'image' : 'emoji');
    setSelectedEmoji(biz.logo_type !== 'image' ? (biz.icon || '🏪') : '🏪');
    setLogoImage(biz.logo_type === 'image' ? biz.icon : null);
    setLogoPreview(biz.logo_type === 'image' ? biz.icon : null);
    setTaxName(biz.tax_name || '');
    setTaxId(biz.tax_id || '');
    setTaxAddress(biz.tax_address || '');
    setDepartments(Array.isArray(biz.departments) ? biz.departments : []);
    setIncomeCategories(Array.isArray(biz.income_categories) && biz.income_categories.length > 0 ? biz.income_categories : [...DEFAULT_INCOME_CATS]);
    setExpenseCategories(Array.isArray(biz.expense_categories) && biz.expense_categories.length > 0 ? biz.expense_categories : [...DEFAULT_EXPENSE_CATS]);
    setIsDrawerOpen(true);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('ขนาดไฟล์ต้องไม่เกิน 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoImage(ev.target.result); setLogoPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const addDept = () => {
    const d = deptInput.trim();
    if (!d) return;
    if (departments.includes(d)) { alert('มีแผนกนี้อยู่แล้ว'); return; }
    setDepartments(prev => [...prev, d]);
    setDeptInput('');
  };

  const toggleCat = (list, setList, cat) => {
    setList(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('กรุณากรอกชื่อธุรกิจ');
    if (!type.trim()) return alert('กรุณากรอกประเภทธุรกิจ');
    if (Number(pettyCashMax) < 0) return alert('วงเงินสดย่อยต้องมากกว่าหรือเท่ากับ 0');
    setLoading(true);
    const data = {
      name: name.trim(), type: type.trim(),
      petty_cash_max: Number(pettyCashMax),
      logo_type: logoMode,
      icon: logoMode === 'image' ? (logoImage || '🏪') : selectedEmoji,
      tax_name: taxName.trim(), tax_id: taxId.trim(), tax_address: taxAddress.trim(),
      departments, income_categories: incomeCategories, expense_categories: expenseCategories,
    };
    try {
      if (editingId) {
        const updated = await businessAPI.update(editingId, data);
        setBusinesses(prev => prev.map(b => b.id === editingId ? { ...b, ...updated } : b));
        onSuccess('อัปเดตธุรกิจสำเร็จ ✅');
      } else {
        const created = await businessAPI.create(data);
        setBusinesses(prev => [...prev, created]);
        onSuccess('เพิ่มธุรกิจสำเร็จ ✅');
      }
      setIsDrawerOpen(false);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (biz) => {
    setDeleting(true);
    try {
      await businessAPI.delete(biz.id);
      setBusinesses(prev => prev.filter(b => b.id !== biz.id));
      setDeleteModal(null);
      onSuccess('ลบธุรกิจสำเร็จ ✅');
    } catch (err) { alert('ลบไม่สำเร็จ: ' + err.message); }
    finally { setDeleting(false); }
  };

  const toggleStatus = async (biz) => {
    const newStatus = biz.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await businessAPI.update(biz.id, { status: newStatus });
      setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, status: newStatus } : b));
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };

  const fmt = (n) => new Intl.NumberFormat('th-TH').format(n || 0);

  return (
    <div className="space-y-6">

      {/* Delete Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => !deleting && setDeleteModal(null)} title="ยืนยันการลบธุรกิจ">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-rose-50 border-2 border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl overflow-hidden">
            {deleteModal?.logo_type === 'image' && deleteModal?.icon
              ? <img src={deleteModal.icon} className="w-full h-full object-cover rounded-full" alt="" />
              : (deleteModal?.icon || '🏪')}
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-1">ลบ "{deleteModal?.name}"?</h4>
          <p className="text-slate-500 text-sm mb-2">ข้อมูลธุรกิจและรายการธุรกรรมทั้งหมดจะถูกลบถาวร</p>
          <p className="text-rose-600 text-xs font-bold bg-rose-50 px-4 py-2 rounded-xl mb-6">⚠️ ไม่สามารถกู้คืนข้อมูลได้</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setDeleteModal(null)} disabled={deleting}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">ยกเลิก</button>
            <button onClick={() => handleDelete(deleteModal)} disabled={deleting}
              className="px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} ยืนยันลบ
            </button>
          </div>
        </div>
      </Modal>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการธุรกิจ (Business)</h2>
          <p className="text-slate-500 text-sm mt-1">ตั้งค่าและจัดการสาขาทั้งหมด</p>
        </div>
        <button onClick={openAdd}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all">
          <Plus size={18} /> เพิ่มธุรกิจใหม่
        </button>
      </div>

      {/* Business Cards */}
      {businesses.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">ยังไม่มีธุรกิจ</h3>
          <p className="text-slate-400 text-sm mb-6">เริ่มต้นโดยการเพิ่มธุรกิจแรกของคุณ</p>
          <button onClick={openAdd} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
            + เพิ่มธุรกิจใหม่
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map(biz => (
            <div key={biz.id} className={`bg-white rounded-2xl border transition-all ${biz.status === 'Active' ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-200 opacity-60'}`}>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-100 overflow-hidden shrink-0">
                      {biz.logo_type === 'image' && biz.icon
                        ? <img src={biz.icon} className="w-full h-full object-cover" alt={biz.name} />
                        : (biz.icon || '🏪')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{biz.name}</h3>
                      <span className="text-xs text-slate-500">{biz.type}</span>
                    </div>
                  </div>
                  <Badge type={biz.status === 'Active' ? 'income' : 'default'}>
                    {biz.status === 'Active' ? 'เปิด' : 'ปิด'}
                  </Badge>
                </div>

                {/* Petty cash bar */}
                <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">เงินสดย่อย</span>
                    <span className="font-bold text-slate-700">
                      ฿{fmt(biz.petty_cash)} <span className="text-slate-400 font-normal">/ ฿{fmt(biz.petty_cash_max)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${((biz.petty_cash||0)/(biz.petty_cash_max||1)) < 0.3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, ((biz.petty_cash||0)/(biz.petty_cash_max||1))*100)}%` }} />
                  </div>
                </div>

                {/* Departments */}
                {Array.isArray(biz.departments) && biz.departments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {biz.departments.slice(0, 3).map(d => (
                      <span key={d} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100 font-medium">{d}</span>
                    ))}
                    {biz.departments.length > 3 && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-400 text-xs rounded-full">+{biz.departments.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="flex gap-2 px-5 pb-5 border-t border-slate-100 pt-4">
                <button onClick={() => openEdit(biz)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all">
                  <Edit2 size={15} /> ตั้งค่า
                </button>
                <button onClick={() => toggleStatus(biz)} title={biz.status === 'Active' ? 'ปิดชั่วคราว' : 'เปิดใช้งาน'}
                  className={`py-2.5 px-3 text-sm font-bold rounded-xl border flex items-center transition-all ${biz.status === 'Active' ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                  <Power size={15} />
                </button>
                <button onClick={() => setDeleteModal(biz)} title="ลบธุรกิจ"
                  className="py-2.5 px-3 bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-700 text-sm font-bold rounded-xl flex items-center transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── DRAWER ─── */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingId ? `ตั้งค่า: ${name}` : 'เพิ่มธุรกิจใหม่'}
        description={editingId ? 'แก้ไขข้อมูลและการตั้งค่าธุรกิจ' : 'กรอกข้อมูลเพื่อสร้างธุรกิจใหม่'}
      >
        <form onSubmit={handleSave} className="flex flex-col h-full">

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

            {/* ── 1: ข้อมูลพื้นฐาน (FR2) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <h3 className="font-bold text-slate-800">ข้อมูลพื้นฐาน</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อธุรกิจ / สาขา <span className="text-rose-500">*</span></label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                    placeholder="เช่น กาแฟ สาขา A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ประเภทธุรกิจ <span className="text-rose-500">*</span></label>
                    <input type="text" required value={type} onChange={e => setType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                      placeholder="เช่น Cafe" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">วงเงินสดย่อยสูงสุด <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">฿</span>
                      <input type="number" required min="0" value={pettyCashMax} onChange={e => setPettyCashMax(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                        placeholder="20000" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 2: โลโก้ (FR3) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <h3 className="font-bold text-slate-800">โลโก้ธุรกิจ</h3>
              </div>
              <div className="flex bg-slate-100 rounded-xl p-1 mb-5 w-fit">
                <button type="button" onClick={() => setLogoMode('emoji')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${logoMode === 'emoji' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  😊 Emoji
                </button>
                <button type="button" onClick={() => setLogoMode('image')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${logoMode === 'image' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  🖼 อัพโหลดโลโก้
                </button>
              </div>

              {logoMode === 'emoji' ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-4xl shadow-sm">
                      {selectedEmoji}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Emoji ที่เลือก</p>
                      <p className="text-xs text-slate-400 mt-0.5">คลิก Emoji ด้านล่างเพื่อเปลี่ยน</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-8 gap-2">
                    {EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => setSelectedEmoji(e)}
                        className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl border-2 transition-all ${selectedEmoji === e ? 'border-blue-500 bg-blue-50 scale-110 shadow-sm' : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={logoPreview} alt="Logo preview" className="w-32 h-32 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" />
                      <div className="space-y-2">
                        <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold cursor-pointer hover:bg-blue-100 transition-all">
                          <UploadCloud size={16} /> เปลี่ยนรูปภาพ
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                        <button type="button" onClick={() => { setLogoImage(null); setLogoPreview(null); }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold hover:bg-rose-100 w-full transition-all">
                          <Trash2 size={16} /> ลบรูปภาพ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                      <UploadCloud size={32} className="text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">คลิกหรือลากไฟล์มาวางที่นี่</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, SVG ขนาดไม่เกิน 5MB</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              )}
            </section>

            {/* ── 3: ข้อมูลภาษี (FR4) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <h3 className="font-bold text-slate-800">ข้อมูลบริษัทและภาษี</h3>
                <span className="text-xs text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-full">ไม่บังคับ</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อนิติบุคคล / ชื่อจดทะเบียน</label>
                  <input type="text" value={taxName} onChange={e => setTaxName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-all"
                    placeholder="เช่น บริษัท กาแฟดี จำกัด" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลขประจำตัวผู้เสียภาษี</label>
                  <input type="text" value={taxId} onChange={e => setTaxId(e.target.value.slice(0, 13))} maxLength={13}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-mono tracking-widest transition-all"
                    placeholder="0000000000000" />
                  <p className="text-xs text-slate-400 mt-1 text-right">{taxId.length}/13 หลัก</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ที่อยู่จดทะเบียน</label>
                  <textarea value={taxAddress} onChange={e => setTaxAddress(e.target.value)} rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base resize-none transition-all"
                    placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
                </div>
              </div>
            </section>

            {/* ── 4: แผนก (FR5) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <h3 className="font-bold text-slate-800">แผนก (Department)</h3>
              </div>
              <div className="flex gap-2 mb-3">
                <input type="text" value={deptInput} onChange={e => setDeptInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDept(); } }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                  placeholder="ชื่อแผนก เช่น ครัว, บาร์, เซอร์วิส..." />
                <button type="button" onClick={addDept}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-1.5 transition-all shrink-0">
                  <Plus size={16} /> เพิ่ม
                </button>
              </div>
              {departments.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[52px]">
                  {departments.map(d => (
                    <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl shadow-sm">
                      {d}
                      <button type="button" onClick={() => setDepartments(prev => prev.filter(x => x !== d))}
                        className="w-4 h-4 rounded-full bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center transition-all text-xs leading-none">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
                  ยังไม่มีแผนก — พิมพ์ชื่อแล้วกด "เพิ่ม" หรือกด Enter
                </div>
              )}
            </section>

            {/* ── 5: หมวดหมู่บัญชี (FR6) ── */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">5</span>
                <h3 className="font-bold text-slate-800">หมวดหมู่บัญชี</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 ml-8">หมวดที่ติ๊ก ✅ จะปรากฏให้พนักงานเลือกตอนบันทึกรายรับ-รายจ่าย</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    <p className="text-sm font-bold text-emerald-800">หมวดรายรับ</p>
                  </div>
                  <div className="space-y-1">
                    {DEFAULT_INCOME_CATS.map(cat => (
                      <label key={cat} className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-100 cursor-pointer transition-all">
                        <input type="checkbox" checked={incomeCategories.includes(cat)}
                          onChange={() => toggleCat(incomeCategories, setIncomeCategories, cat)}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 cursor-pointer" />
                        <span className="text-sm text-slate-700">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                    <p className="text-sm font-bold text-rose-800">หมวดรายจ่าย</p>
                  </div>
                  <div className="space-y-1">
                    {DEFAULT_EXPENSE_CATS.map(cat => (
                      <label key={cat} className="flex items-center gap-3 p-2 rounded-xl hover:bg-rose-100 cursor-pointer transition-all">
                        <input type="checkbox" checked={expenseCategories.includes(cat)}
                          onChange={() => toggleCat(expenseCategories, setExpenseCategories, cat)}
                          className="w-4 h-4 rounded text-rose-600 border-slate-300 cursor-pointer" />
                        <span className="text-sm text-slate-700">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Sticky Footer (FR7) */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100">
              {loading ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึกข้อมูล</>}
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
  const [startDate, setStartDate] = useState(todayTH().slice(0,7) + '-01');
  const [endDate, setEndDate] = useState(todayTH());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fmt = (n) => new Intl.NumberFormat('th-TH').format(Number(n) || 0);
  const activeBiz = businesses.filter(b => b.status === 'Active');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = { start: startDate, end: endDate };
      if (selectedBiz !== 'all') params.business_id = selectedBiz;
      const result = await reportAPI.getPL(params);
      setData(result);
    } catch (err) {
      setError('โหลดรายงานไม่สำเร็จ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedBiz, startDate, endDate]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">รายงานงบกำไรขาดทุน (P&L)</h2>
          <p className="text-slate-500 text-sm mt-1">Profit & Loss Statement</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Printer size={16} /> Print</button>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">เลือกธุรกิจ:</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedBiz('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedBiz === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>รวมทุกร้าน</button>
            {activeBiz.map(biz => (
              <button key={biz.id} onClick={() => setSelectedBiz(String(biz.id))} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${selectedBiz === String(biz.id) ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                <BizIcon biz={biz} size="sm" />ร้าน{biz.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
          <span className="text-slate-500 font-bold">ถึง</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-base" />
        </div>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2"><AlertCircle size={18} />{error}</div>}

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : data && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <p className="text-sm text-emerald-700 font-bold mb-1">รายรับรวม</p>
              <p className="text-2xl font-black text-emerald-600">฿{fmt(data.income)}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center">
              <p className="text-sm text-rose-700 font-bold mb-1">รายจ่ายรวม</p>
              <p className="text-2xl font-black text-rose-600">฿{fmt(data.expense)}</p>
            </div>
            <div className={`border rounded-2xl p-5 text-center ${Number(data.profit) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className={`text-sm font-bold mb-1 ${Number(data.profit) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>กำไรสุทธิ</p>
              <p className={`text-2xl font-black ${Number(data.profit) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>฿{fmt(data.profit)}</p>
            </div>
          </div>

          {/* Income breakdown */}
          {data.income_items?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                <h3 className="font-bold text-emerald-800">รายรับแยกตามหมวดหมู่</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.income_items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <span className="text-sm text-slate-700">{item.category || '(ไม่ระบุ)'}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-600">฿{fmt(item.total)}</span>
                      <span className="text-xs text-slate-400 w-8 text-right">{data.income > 0 ? Math.round(item.total / data.income * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense breakdown */}
          {data.expense_items?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-rose-50 border-b border-rose-100">
                <h3 className="font-bold text-rose-800">รายจ่ายแยกตามหมวดหมู่</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.expense_items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <span className="text-sm text-slate-700">{item.category || '(ไม่ระบุ)'}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-rose-600">฿{fmt(item.total)}</span>
                      <span className="text-xs text-slate-400 w-8 text-right">{data.expense > 0 ? Math.round(item.total / data.expense * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.income === 0 && data.expense === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p>ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
            </div>
          )}
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
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('พนักงาน');
  const [selectedBizs, setSelectedBizs] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [accessLevel, setAccessLevel] = useState('Own Data');
  const [saving, setSaving] = useState(false);
  // Change-password modal
  const [cpModal, setCpModal] = useState(null);
  const [cpCur, setCpCur] = useState(''); const [cpNew, setCpNew] = useState(''); const [cpConfirm, setCpConfirm] = useState('');
  const [cpSaving, setCpSaving] = useState(false);

  useEffect(() => {
    userAPI.getAll()
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const ALL_FEATURES = FEATURE_LIST.map(f => f.id);

  const openAdd = () => {
    setEditingId(null); setName(''); setUsername(''); setPassword(''); setPhone(''); setRole('พนักงาน');
    setSelectedBizs([]); setSelectedFeatures(ALL_FEATURES); setAccessLevel('Own Data');
    setIsDrawerOpen(true);
  };
  const openEdit = (u) => {
    setEditingId(u.id); setName(u.name||''); setUsername(u.username||''); setPassword('');
    setPhone(u.phone||''); setRole(u.role||'พนักงาน');
    setSelectedBizs(u.business_ids||[]); setSelectedFeatures(u.features||[]); setAccessLevel(u.access_level||'Own Data');
    setIsDrawerOpen(true);
  };
  const handleDelete = async (id, n) => {
    if (!confirm(`ลบผู้ใช้ "${n}" หรือไม่?`)) return;
    await userAPI.delete(id).catch(() => {});
    setUsers(prev => prev.filter(u => u.id !== id));
  };
  const toggleBiz = (id) => setSelectedBizs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleFeat = (id) => setSelectedFeatures(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) return alert('กรุณากรอก Username');
    if (!editingId && !password) return alert('กรุณากรอก Password สำหรับผู้ใช้ใหม่');
    setSaving(true);
    const data = {
      name: name||username, username, phone, role,
      business_ids: selectedBizs, features: selectedFeatures, access_level: accessLevel,
      ...(password ? { password } : {})
    };
    try {
      if (editingId) {
        const updated = await userAPI.update(editingId, data);
        setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...updated } : u));
        setIsDrawerOpen(false);
        onSuccess('อัปเดตผู้ใช้สำเร็จ ✅');
      } else {
        const created = await userAPI.create(data);
        setUsers(prev => [...prev, created]);
        setIsDrawerOpen(false);
        onSuccess('เพิ่มผู้ใช้สำเร็จ ✅');
      }
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleChangePw = async () => {
    if (cpNew !== cpConfirm) return alert('รหัสผ่านใหม่ไม่ตรงกัน');
    if (cpNew.length < 4) return alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัว');
    setCpSaving(true);
    try {
      const res = await fetch(`/api/users/${cpModal.id}/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: cpCur, new_password: cpNew })
      });
      const data = await res.json();
      if (res.ok) { setCpModal(null); setCpCur(''); setCpNew(''); setCpConfirm(''); onSuccess('เปลี่ยนรหัสผ่านสำเร็จ ✅'); }
      else alert('เกิดข้อผิดพลาด: ' + data.error);
    } catch (err) { alert(err.message); }
    finally { setCpSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Change Password Modal ── */}
      {cpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">เปลี่ยนรหัสผ่าน</h3>
                <p className="text-slate-500 text-sm mt-0.5">{cpModal.name} · @{cpModal.username}</p>
              </div>
              <button onClick={() => setCpModal(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">รหัสผ่านปัจจุบัน</label>
                <input type="password" value={cpCur} onChange={e => setCpCur(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="รหัสผ่านเดิม" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">รหัสผ่านใหม่</label>
                <input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="อย่างน้อย 4 ตัวอักษร" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="พิมพ์ซ้ำอีกครั้ง" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCpModal(null)} className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleChangePw} disabled={cpSaving}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {cpSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} บันทึก
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
                  <p className="text-sm font-mono text-slate-500 mt-0.5">@{user.username}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    ✅ พร้อมใช้งาน
                  </span>
                </div>
                <Badge type={user.role === 'เจ้าของธุรกิจ' ? 'owner' : user.role === 'ผู้จัดการ' ? 'manager' : 'staff'}>{user.role}</Badge>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(user)}
                  className="flex-1 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-100">
                  <Settings size={16} /> จัดการสิทธิ์
                </button>
                <button onClick={() => { setCpModal(user); setCpCur(''); setCpNew(''); setCpConfirm(''); }}
                  className="flex-1 py-2.5 bg-amber-50 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 flex items-center justify-center gap-2 border border-amber-200">
                  🔑 เปลี่ยนรหัส
                </button>
                <button onClick={() => handleDelete(user.id, user.name)}
                  className="px-4 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Drawer: เพิ่ม/แก้ไขผู้ใช้ ── */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}
        title={editingId ? `แก้ไข: ${name||username}` : 'เพิ่มพนักงานใหม่'}
        description={editingId ? 'แก้ไขข้อมูล สิทธิ์ และ Password' : 'กรอก Username + Password เพื่อสร้าง Account'}>
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

            {/* ── Section 1: Account ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="font-bold text-slate-800">ข้อมูล Account</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อ-นามสกุล</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="เช่น สมชาย ใจดี (ไม่บังคับ)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username <span className="text-rose-500">*</span></label>
                    <input type="text" required value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      placeholder="เช่น somchai01" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Password {editingId
                        ? <span className="text-slate-400 font-normal text-xs">(เว้นว่าง = ไม่เปลี่ยน)</span>
                        : <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        placeholder={editingId ? "เว้นว่าง = ไม่เปลี่ยน" : "ตั้งรหัสผ่าน"} />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">เบอร์โทร</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="08X-XXX-XXXX" />
                </div>
              </div>
            </section>

            {/* ── Section 2: บทบาท ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="font-bold text-slate-800">บทบาทและระดับการเข้าถึง</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['เจ้าของธุรกิจ','ผู้จัดการ','พนักงาน'].map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${role===r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['Own Data','👤 เห็นข้อมูลตัวเอง'],['All Data','👥 เห็นข้อมูลทั้งหมด']].map(([lvl, label]) => (
                  <button key={lvl} type="button" onClick={() => setAccessLevel(lvl)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${accessLevel===lvl ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 3: สาขา ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <h3 className="font-bold text-slate-800">สาขาที่เข้าถึงได้</h3>
              </div>
              <div className="space-y-2">
                {businesses.filter(b => b.status === 'Active').map(biz => (
                  <label key={biz.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedBizs.includes(biz.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selectedBizs.includes(biz.id)} onChange={() => toggleBiz(biz.id)} className="w-5 h-5 text-blue-600 rounded" />
                    <BizIcon biz={biz} size="sm" />
                    <span className="text-sm font-bold text-slate-700">{biz.name}</span>
                  </label>
                ))}
                {businesses.filter(b => b.status === 'Active').length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีสาขาที่เปิดใช้งาน</p>
                )}
              </div>
            </section>

            {/* ── Section 4: สิทธิ์เมนู ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <h3 className="font-bold text-slate-800">เมนูที่เข้าถึงได้</h3>
                <button type="button" onClick={() => setSelectedFeatures(selectedFeatures.length === ALL_FEATURES.length ? [] : ALL_FEATURES)}
                  className="ml-auto text-xs text-blue-600 font-bold hover:underline">
                  {selectedFeatures.length === ALL_FEATURES.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_LIST.map(f => (
                  <label key={f.id} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${selectedFeatures.includes(f.id) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selectedFeatures.includes(f.id)} onChange={() => toggleFeat(f.id)} className="w-4 h-4 text-emerald-600 rounded" />
                    <span className="text-sm">{f.icon} {f.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* ── Sticky footer ── */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึก</>}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};


// ═══════════════════════════════════════════════════════
// ─── DOCUMENTS MODULE ──────────────────────────────────
// ═══════════════════════════════════════════════════════

const DOC_TYPES = [
  { id: 'QO', label: 'ใบเสนอราคา', labelEn: 'Quotation', color: 'blue', icon: '📋' },
  { id: 'IV', label: 'ใบแจ้งหนี้/ใบวางบิล', labelEn: 'Invoice', color: 'amber', icon: '📄' },
  { id: 'RC', label: 'ใบเสร็จรับเงิน', labelEn: 'Receipt', color: 'emerald', icon: '🧾' },
];

const DOC_STATUS = {
  draft:     { label: 'ร่าง',       color: 'bg-slate-100 text-slate-600' },
  sent:      { label: 'ส่งแล้ว',    color: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'ชำระแล้ว',   color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก',     color: 'bg-rose-100 text-rose-700' },
};

const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const formatDocDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ── PDF Generator (html→print) ──
const generatePDF = (doc, biz, settings) => {
  const typeInfo = DOC_TYPES.find(t => t.id === doc.doc_type) || DOC_TYPES[0];
  const items = Array.isArray(doc.items) ? doc.items : JSON.parse(doc.items || '[]');
  const sig = settings?.signature_image || doc.signature_image;
  const issuerAddress = biz?.tax_address || '135/9 หมู่ที่ 10 ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จ.เชียงใหม่ 50200';
  const issuerTaxId = biz?.tax_id || biz?.business_tax_id || '';
  const issuerName = biz?.tax_name || biz?.name || '';

  const html = `<!DOCTYPE html><html lang="th">
<head>
<meta charset="UTF-8"/><title>${doc.doc_number} - ${typeInfo.label}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Sarabun',sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:24px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;}
  .doc-title{font-size:26px;font-weight:700;color:#1e293b;}
  .doc-sub{font-size:13px;color:#64748b;margin-top:2px;}
  .logo-box{width:64px;height:64px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;}.logo-box img{width:100%;height:100%;object-fit:contain;border-radius:12px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;}
  .info-box h4{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
  .info-row{display:flex;gap:8px;margin-bottom:4px;font-size:12px;}
  .info-label{color:#64748b;min-width:80px;flex-shrink:0;}
  .info-val{font-weight:600;color:#1e293b;}
  table.items{width:100%;border-collapse:collapse;margin-bottom:16px;}
  table.items thead tr{background:#1e293b;color:#fff;}
  table.items thead th{padding:9px 12px;font-size:12px;font-weight:600;}
  table.items tbody tr:nth-child(even){background:#f8fafc;}
  table.items tbody td{padding:8px 12px;font-size:12px;border-bottom:1px solid #e2e8f0;vertical-align:top;}
  .totals-wrap{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;}
  .remarks-side{flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:12px;min-height:60px;}
  .totals{display:flex;justify-content:flex-end;flex-shrink:0;}
  .totals-box{min-width:260px;}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #f1f5f9;}
  .total-final{display:flex;justify-content:space-between;padding:10px 14px;background:#f1f5f9;color:#1e293b;border-radius:8px;font-size:15px;font-weight:700;margin-top:6px;border:2px solid #e2e8f0;}
  .footer{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;}
  .sig-box{text-align:center;}
  .sig-line{border-bottom:1px dashed #94a3b8;margin:32px 12px 6px;}
  .sig-img{max-height:60px;max-width:140px;margin:0 auto 4px;display:block;}
  .sig-name{font-size:12px;font-weight:600;color:#475569;}
  .sig-label{font-size:11px;color:#94a3b8;margin-top:2px;}
  .remarks{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;}
  @media print{body{padding:0!important;}@page{margin:15mm;size:A4 portrait;}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="doc-title">${typeInfo.label}</div>
    <div class="doc-sub">${typeInfo.labelEn} (ต้นฉบับ / original)</div>
  </div>
  <div class="logo-box">${biz?.icon && biz.icon.startsWith('data:') ? `<img src="${biz.icon}" alt="logo"/>` : (biz?.icon || '🏪')}</div>
</div>

<div class="info-grid">
  <div class="info-box">
    <h4>ลูกค้า / Customer</h4>
    <div class="info-row"><span class="info-label">ชื่อ</span><span class="info-val">${doc.customer_name || '-'}</span></div>
    <div class="info-row"><span class="info-label">ที่อยู่</span><span class="info-val">${doc.customer_address || '-'}</span></div>
    <div class="info-row"><span class="info-label">เลขภาษี</span><span class="info-val">${doc.customer_tax_id || '-'}</span></div>
    <div class="info-row"><span class="info-label">โทร</span><span class="info-val">${doc.customer_phone || '-'}</span></div>
    <div class="info-row"><span class="info-label">อีเมล</span><span class="info-val">${doc.customer_email || '-'}</span></div>
  </div>
  <div class="info-box">
    <h4>รายละเอียดเอกสาร</h4>
    <div class="info-row"><span class="info-label">เลขที่</span><span class="info-val">${doc.doc_number}</span></div>
    <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${formatDocDate(doc.issue_date)}</span></div>
    ${doc.valid_date ? `<div class="info-row"><span class="info-label">ใช้ได้ถึง</span><span class="info-val">${formatDocDate(doc.valid_date)}</span></div>` : ''}
    ${doc.ref_doc ? `<div class="info-row"><span class="info-label">อ้างอิง</span><span class="info-val">${doc.ref_doc}</span></div>` : ''}
    <div class="info-row"><span class="info-label">ผู้ออก</span><span class="info-val">${issuerName}</span></div>
    <div class="info-row"><span class="info-label">เลขภาษีผู้ออก</span><span class="info-val">${issuerTaxId}</span></div>
  </div>
</div>

<table class="items">
  <thead>
    <tr>
      <th style="width:40px;text-align:center">รหัส</th>
      <th style="text-align:left">รายการ</th>
      <th style="width:70px;text-align:center">จำนวน</th>
      <th style="width:60px;text-align:center">หน่วย</th>
      <th style="width:100px;text-align:right">ราคา/หน่วย</th>
      <th style="width:110px;text-align:right">มูลค่า</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${item.description || ''}</td>
      <td style="text-align:center">${item.qty || 1}</td>
      <td style="text-align:center">${item.unit || 'หน่วย'}</td>
      <td style="text-align:right">${fmt(item.unit_price)}</td>
      <td style="text-align:right;font-weight:600">${fmt((item.qty || 1) * (item.unit_price || 0))}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="totals-wrap">
  <div class="remarks-side">
    ${doc.remarks ? `<strong>หมายเหตุ:</strong> ${doc.remarks}` : '<span style="color:#94a3b8">-</span>'}
  </div>
  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>รวมเป็นเงิน</span><span>฿${fmt(doc.subtotal)}</span></div>
      ${Number(doc.discount) > 0 ? `<div class="total-row"><span>ส่วนลด</span><span>-฿${fmt(doc.discount)}</span></div>` : ''}
      ${Number(doc.vat) > 0 ? `<div class="total-row"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>+฿${fmt(doc.vat)}</span></div>` : ''}
      ${Number(doc.wht_amount) > 0 ? `<div class="total-row"><span>หัก ณ ที่จ่าย ${doc.wht_rate}%</span><span>-฿${fmt(doc.wht_amount)}</span></div>` : ''}
      <div class="total-final"><span>จำนวนเงินรวมทั้งสิ้น</span><span>฿${fmt(doc.total)}</span></div>
    </div>
  </div>
</div>

<div class="footer">
  <div class="sig-box">
    ${sig ? `<img class="sig-img" src="${sig}" alt="signature"/>` : '<div class="sig-line"></div>'}
    <div class="sig-name">อนุมัติโดย / Approved by</div>
    <div class="sig-label">วันที่ / Date ................................</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${doc.doc_type === 'RC' ? 'ผู้รับเงิน / Received by' : 'ผู้รับใบแจ้งหนี้ / Accepted by'}</div>
    <div class="sig-label">วันที่ / Date ................................</div>
  </div>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
};

// ── DocumentForm Component ──
const DocumentForm = ({ businesses, user, onClose, onSaved, editDoc, prefillDoc }) => {
  const src = editDoc || prefillDoc || {};
  const [bizId, setBizId] = useState(src.business_id || (businesses[0]?.id || ''));
  const [docType, setDocType] = useState(src.doc_type || 'QO');
  const [docNumber, setDocNumber] = useState(editDoc?.doc_number || '');
  const [customerName, setCustomerName] = useState(src.customer_name || '');
  const [customerAddr, setCustomerAddr] = useState(src.customer_address || '');
  const [customerTax, setCustomerTax] = useState(src.customer_tax_id || '');
  const [customerEmail, setCustomerEmail] = useState(src.customer_email || '');
  const [customerPhone, setCustomerPhone] = useState(src.customer_phone || '');
  const [issueDate, setIssueDate] = useState(editDoc?.issue_date || todayTH());
  const [validDate, setValidDate] = useState(editDoc?.valid_date || '');
  const [refDoc, setRefDoc] = useState(src.ref_doc || '');
  const [items, setItems] = useState(() => {
    const rawItems = editDoc?.items || prefillDoc?.items;
    if (rawItems) return Array.isArray(rawItems) ? rawItems : JSON.parse(rawItems);
    return [{ description: '', qty: 1, unit: 'หน่วย', unit_price: 0 }];
  });
  const [discount, setDiscount] = useState(editDoc?.discount || 0);
  const [useVat, setUseVat] = useState(false);
  const [whtRate, setWhtRate] = useState(0); // 0, 1, 1.5, 3, 5, 10, 15
  const [remarks, setRemarks] = useState(editDoc?.remarks || '');
  const [saving, setSaving] = useState(false);
  const [loadingNum, setLoadingNum] = useState(!editDoc);

  const typeInfo = DOC_TYPES.find(t => t.id === docType);
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit_price) || 0), 0);
  const afterDiscount = subtotal - (Number(discount) || 0);
  const vatAmt = useVat ? afterDiscount * 0.07 : 0;
  const whtAmt = Number(whtRate) > 0 ? afterDiscount * (Number(whtRate) / 100) : 0;
  const total = afterDiscount + vatAmt - whtAmt;

  useEffect(() => {
    if (!editDoc && bizId && docType) {
      setLoadingNum(true);
      documentAPI.nextNumber(bizId, docType)
        .then(r => { setDocNumber(r.doc_number); setLoadingNum(false); })
        .catch(() => setLoadingNum(false));
    }
  }, [bizId, docType]);

  const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, unit: 'หน่วย', unit_price: 0 }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSave = async () => {
    if (!customerName.trim()) return alert('กรุณากรอกชื่อลูกค้า');
    if (items.length === 0) return alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
    setSaving(true);
    const data = {
      business_id: bizId, doc_type: docType, customer_name: customerName,
      customer_address: customerAddr, customer_tax_id: customerTax,
      customer_email: customerEmail, customer_phone: customerPhone,
      issue_date: issueDate, valid_date: validDate || null, ref_doc: refDoc || null,
      items, subtotal, discount: Number(discount) || 0, total,
      remarks, created_by: user?.id || null,
    };
    try {
      let saved;
      if (editDoc) saved = await documentAPI.update(editDoc.id, { ...data, status: editDoc.status });
      else saved = await documentAPI.create(data);
      onSaved(saved, !editDoc);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* ─ Section 1: ประเภท + สาขา ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <h3 className="font-bold text-slate-800">ประเภทเอกสารและสาขา</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {DOC_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => !editDoc && !prefillDoc && setDocType(t.id)} disabled={!!editDoc || !!prefillDoc}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${docType === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'} ${(editDoc || prefillDoc) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">สาขา <span className="text-rose-500">*</span></label>
              <select value={bizId} onChange={e => setBizId(Number(e.target.value))} disabled={!!editDoc}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
                {businesses.filter(b => b.status === 'Active').map(b => (
                  <option key={b.id} value={b.id}>{b.icon && !b.icon.startsWith("data:") ? b.icon + " " : ""}{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลขที่เอกสาร</label>
              <input type="text" value={loadingNum ? 'กำลังสร้างเลข...' : docNumber} readOnly
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono text-sm outline-none" />
            </div>
          </div>
        </section>

        {/* ─ Section 2: ข้อมูลลูกค้า ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <h3 className="font-bold text-slate-800">ข้อมูลลูกค้า</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อ/บริษัท <span className="text-rose-500">*</span></label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น บริษัท ABC จำกัด" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ที่อยู่</label>
              <textarea value={customerAddr} onChange={e => setCustomerAddr(e.target.value)} rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="ที่อยู่ลูกค้า" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลขภาษี</label>
                <input type="text" value={customerTax} onChange={e => setCustomerTax(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="13 หลัก" maxLength={13} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">โทร</label>
                <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="08X-XXX-XXXX" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">อีเมล</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="email@example.com" />
            </div>
          </div>
        </section>

        {/* ─ Section 3: วันที่ ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <h3 className="font-bold text-slate-800">วันที่และอ้างอิง</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">วันที่ออกเอกสาร</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ใช้ได้ถึง</label>
                <input type="date" value={validDate} onChange={e => setValidDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">เอกสารอ้างอิง</label>
              <input type="text" value={refDoc} onChange={e => setRefDoc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="เช่น QO-2568... (ถ้ามี)" />
            </div>
          </div>
        </section>

        {/* ─ Section 4: รายการสินค้า/บริการ ─ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <h3 className="font-bold text-slate-800">รายการสินค้า/บริการ</h3>
            </div>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100">
              <Plus size={13} /> เพิ่มรายการ
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">รายการที่ {i + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600 p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <textarea value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                    rows={2} placeholder="คำอธิบายสินค้า/บริการ"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 font-medium">จำนวน</label>
                      <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">หน่วย</label>
                      <input type="text" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="หน่วย" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">ราคา/หน่วย (บาท)</label>
                    <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-slate-400">ยอดรายการ</span>
                    <span className="text-sm font-bold text-blue-700">฿{fmt((item.qty || 0) * (item.unit_price || 0))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>รวมเป็นเงิน</span><span className="font-bold">฿{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>ส่วนลด</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">฿</span>
                <input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right" />
              </div>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>หลังหักส่วนลด</span><span>฿{fmt(afterDiscount)}</span>
              </div>
            )}
            {/* VAT */}
            <div className="flex items-center justify-between text-sm text-slate-600 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={useVat} onChange={e => setUseVat(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="font-medium">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
              </label>
              <span className={useVat ? 'font-bold text-blue-600' : 'text-slate-300'}>+฿{fmt(vatAmt)}</span>
            </div>
            {/* WHT */}
            <div className="flex items-center justify-between text-sm text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="font-medium">หัก ณ ที่จ่าย</span>
              </label>
              <div className="flex items-center gap-2">
                <select value={whtRate} onChange={e => setWhtRate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                  <option value={0}>ไม่หัก</option>
                  <option value={1}>1%</option>
                  <option value={1.5}>1.5%</option>
                  <option value={2}>2%</option>
                  <option value={3}>3%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                </select>
                <span className={Number(whtRate) > 0 ? 'font-bold text-rose-600 w-24 text-right' : 'text-slate-300 w-24 text-right'}>-฿{fmt(whtAmt)}</span>
              </div>
            </div>
            <div className="flex justify-between text-base font-black text-slate-800 pt-2 border-t-2 border-slate-200">
              <span>จำนวนเงินรวมทั้งสิ้น</span><span className="text-blue-700">฿{fmt(total)}</span>
            </div>
          </div>
        </section>

        {/* ─ Section 5: หมายเหตุ ─ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
            <h3 className="font-bold text-slate-800">หมายเหตุ</h3>
          </div>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="หมายเหตุ/เงื่อนไขการชำระเงิน (ถ้ามี)" />
        </section>
      </div>

      {/* ─ Sticky footer ─ */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">
          ยกเลิก
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึก</>}
        </button>
      </div>
    </div>
  );
};

// ── DocumentSettings Component ──
const DocumentSettings = ({ businesses, onClose }) => {
  const [bizId, setBizId] = useState(businesses[0]?.id || '');
  const [settings, setSettings] = useState({});
  const [sigPreview, setSigPreview] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bizId) return;
    documentAPI.getSettings(bizId).then(rows => {
      const map = {};
      DOC_TYPES.forEach(t => {
        const row = rows.find(r => r.doc_type === t.id);
        map[t.id] = { prefix: row?.prefix || t.id, running_number: row?.running_number || 1 };
        if (row?.signature_image) setSigPreview(p => ({ ...p, [t.id]: row.signature_image }));
      });
      setSettings(map);
    }).catch(() => {});
  }, [bizId]);

  const handleSigUpload = (docType, e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setSigPreview(p => ({ ...p, [docType]: b64 }));
      setSettings(p => ({ ...p, [docType]: { ...p[docType], signature_image: b64 } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const t of DOC_TYPES) {
        const s = settings[t.id];
        if (!s) continue;
        await documentAPI.saveSettings({
          business_id: bizId, doc_type: t.id,
          prefix: s.prefix, running_number: Number(s.running_number) || 1,
          signature_image: s.signature_image || sigPreview[t.id] || null,
        });
      }
      onClose(true);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลือกสาขา</label>
          <select value={bizId} onChange={e => setBizId(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none">
            {businesses.filter(b => b.status === 'Active').map(b => (
              <option key={b.id} value={b.id}>{b.icon && !b.icon.startsWith("data:") ? b.icon + " " : ""}{b.name}</option>
            ))}
          </select>
        </div>

        {DOC_TYPES.map(t => (
          <div key={t.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">{t.icon} {t.label}</h4>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ตัวย่อเอกสาร (Prefix)</label>
                <input type="text" value={settings[t.id]?.prefix || t.id}
                  onChange={e => setSettings(p => ({ ...p, [t.id]: { ...p[t.id], prefix: e.target.value.toUpperCase() } }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                  placeholder={t.id} maxLength={10} />
                <p className="text-xs text-slate-400 mt-1">ตัวอย่าง: {settings[t.id]?.prefix || t.id}-256803{String(settings[t.id]?.running_number || 1).padStart(5,'0')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">เลขรันเริ่มต้น</label>
                <input type="number" min="1" value={settings[t.id]?.running_number || 1}
                  onChange={e => setSettings(p => ({ ...p, [t.id]: { ...p[t.id], running_number: e.target.value } }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            {/* Signature */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">ลายเซ็นอิเล็กทรอนิกส์</label>
              <div className="flex items-center gap-3">
                {sigPreview[t.id] ? (
                  <div className="relative">
                    <img src={sigPreview[t.id]} alt="sig" className="h-16 max-w-[160px] object-contain bg-white border border-slate-200 rounded-xl p-2" />
                    <button onClick={() => { setSigPreview(p => ({ ...p, [t.id]: null })); setSettings(p => ({ ...p, [t.id]: { ...p[t.id], signature_image: null } })); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                  </div>
                ) : (
                  <div className="w-32 h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs">ยังไม่มีลายเซ็น</div>
                )}
                <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Upload size={14} /> อัปโหลด
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleSigUpload(t.id, e)} />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">รองรับ PNG, JPG ขนาดไม่เกิน 2MB (พื้นหลังโปร่งใส PNG ดีที่สุด)</p>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
        <button onClick={() => onClose(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> บันทึก...</> : <><Check size={16} /> บันทึกการตั้งค่า</>}
        </button>
      </div>
    </div>
  );
};

// ── Documents (Main Page) ──
const Documents = ({ businesses, user, onSuccess }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBiz, setFilterBiz] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [prefillDoc, setPrefillDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [printLoading, setPrintLoading] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterBiz) params.business_id = filterBiz;
    if (filterType) params.doc_type = filterType;
    if (filterStatus) params.status = filterStatus;
    documentAPI.getAll(params)
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterBiz, filterType, filterStatus]);

  const handlePrint = async (doc) => {
    setPrintLoading(doc.id);
    try {
      const full = await documentAPI.getOne(doc.id);
      const biz = businesses.find(b => b.id === full.business_id);
      const settings = await documentAPI.getSettings(full.business_id);
      const sigSettings = settings.find(s => s.doc_type === full.doc_type);
      generatePDF(full, biz, sigSettings);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setPrintLoading(null); }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`ลบเอกสาร ${doc.doc_number} หรือไม่?`)) return;
    await documentAPI.delete(doc.id).catch(() => {});
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    onSuccess('ลบเอกสารสำเร็จ');
  };

  const handleConvert = (doc, toType) => {
    setPrefillDoc({
      business_id: doc.business_id,
      doc_type: toType,
      customer_name: doc.customer_name,
      customer_address: doc.customer_address,
      customer_tax_id: doc.customer_tax_id,
      customer_email: doc.customer_email,
      customer_phone: doc.customer_phone,
      ref_doc: doc.doc_number,
      items: doc.items,
      remarks: doc.remarks,
    });
    setEditDoc(null);
    setIsFormOpen(true);
  };

  const handleStatusChange = async (doc, status) => {
    await documentAPI.updateStatus(doc.id, status).catch(() => {});
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status } : d));
  };

  const filtered = docs.filter(d =>
    !search || d.doc_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header — desktop: row, mobile: stack */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">เอกสารทางธุรกิจ</h2>
          <p className="text-slate-500 text-sm mt-1">ใบเสนอราคา · ใบแจ้งหนี้ · ใบเสร็จ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold">
            <Settings size={16} /> ตั้งค่า
          </button>
          <button onClick={() => { setEditDoc(null); setPrefillDoc(null); setIsFormOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold shadow-md">
            <Plus size={16} /> สร้างเอกสาร
          </button>
        </div>
      </div>

      {/* แท็บประเภทเอกสาร */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button onClick={() => setFilterType('')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${filterType === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
          📁 ทั้งหมด
        </button>
        {DOC_TYPES.map(t => (
          <button key={t.id} onClick={() => setFilterType(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${filterType === t.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
            <option value="">ทุกสาขา</option>
            {businesses.filter(b => b.status === 'Active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
            <option value="">ทุกสถานะ</option>
            {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Document list */}
      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีเอกสาร กด "สร้างเอกสาร" เพื่อเริ่มต้น</p>
          </div>
        ) : (<>
          {/* ── DESKTOP TABLE (hidden on mobile) ── */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">เลขที่เอกสาร</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ลูกค้า</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">วันที่</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">สถานะ</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">ยอดรวม</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(doc => {
                  const typeInfo = DOC_TYPES.find(t => t.id === doc.doc_type);
                  const statusInfo = DOC_STATUS[doc.status] || DOC_STATUS.draft;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{typeInfo?.icon}</span>
                          <span className="font-mono font-bold text-slate-800">{doc.doc_number}</span>
                        </div>
                        <div className="text-xs text-slate-400 ml-7">{doc.business_name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{doc.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{doc.issue_date?.slice(0,10)}</td>
                      <td className="px-4 py-3">
                        <select value={doc.status} onChange={e => handleStatusChange(doc, e.target.value)}
                          className={`px-2 py-1 rounded-lg border text-xs font-bold outline-none ${statusInfo.color}`}>
                          {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800">฿{fmt(doc.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button onClick={() => setPreviewDoc(doc)} title="Preview"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100">
                            <Eye size={12} /> ดู
                          </button>
                          {doc.doc_type === 'QO' && (
                            <button onClick={() => handleConvert(doc, 'IV')} title="สร้างใบแจ้งหนี้"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 hover:bg-amber-100">
                              📄 IV
                            </button>
                          )}
                          {doc.doc_type === 'IV' && (
                            <button onClick={() => handleConvert(doc, 'RC')} title="สร้างใบเสร็จ"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 hover:bg-emerald-100">
                              🧾 RC
                            </button>
                          )}
                          <button onClick={() => handlePrint(doc)} disabled={printLoading === doc.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
                            {printLoading === doc.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} PDF
                          </button>
                          <button onClick={() => { setEditDoc(doc); setPrefillDoc(null); setIsFormOpen(true); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100">
                            <Edit2 size={11} /> แก้ไข
                          </button>
                          <button onClick={() => handleDelete(doc)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 hover:bg-rose-100">
                            <Trash2 size={11} /> ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE CARDS (hidden on desktop) ── */}
          <div className="sm:hidden space-y-3">
            {filtered.map(doc => {
              const typeInfo = DOC_TYPES.find(t => t.id === doc.doc_type);
              const statusInfo = DOC_STATUS[doc.status] || DOC_STATUS.draft;
              return (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{typeInfo?.icon}</div>
                      <div>
                        <div className="font-black text-slate-800 font-mono text-sm">{doc.doc_number}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{doc.business_name} · {doc.issue_date?.slice(0,10)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-800">฿{fmt(doc.total)}</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                    <span className="text-slate-400 text-xs">ลูกค้า</span>
                    <span className="font-semibold">{doc.customer_name || '—'}</span>
                  </div>
                  {doc.doc_type === 'QO' && (
                    <div className="mb-2">
                      <button onClick={() => handleConvert(doc, 'IV')}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 hover:bg-amber-100">
                        📄 สร้างใบแจ้งหนี้จากใบเสนอราคานี้
                      </button>
                    </div>
                  )}
                  {doc.doc_type === 'IV' && (
                    <div className="mb-2">
                      <button onClick={() => handleConvert(doc, 'RC')}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-100">
                        🧾 สร้างใบเสร็จรับเงินจากใบแจ้งหนี้นี้
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
                    <button onClick={() => setPreviewDoc(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100">
                      <Eye size={12} /> Preview
                    </button>
                    <select value={doc.status} onChange={e => handleStatusChange(doc, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none flex-shrink-0">
                      {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button onClick={() => handlePrint(doc)} disabled={printLoading === doc.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
                      {printLoading === doc.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
                    </button>
                    <button onClick={() => { setEditDoc(doc); setPrefillDoc(null); setIsFormOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100">
                      <Edit2 size={12} /> แก้ไข
                    </button>
                    <button onClick={() => handleDelete(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 hover:bg-rose-100">
                      <Trash2 size={12} /> ลบ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>)
      )}

      {/* ── Preview Modal ── */}
      {previewDoc && (() => {
        const typeInfo = DOC_TYPES.find(t => t.id === previewDoc.doc_type);
        const statusInfo = DOC_STATUS[previewDoc.status] || DOC_STATUS.draft;
        const items = (() => { try { return Array.isArray(previewDoc.items) ? previewDoc.items : JSON.parse(previewDoc.items || '[]'); } catch { return []; } })();
        const biz = businesses.find(b => b.id === previewDoc.business_id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">{typeInfo?.icon}</div>
                  <div>
                    <div className="font-black text-slate-800 font-mono">{previewDoc.doc_number}</div>
                    <div className="text-xs text-slate-500">{typeInfo?.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                  <button onClick={() => setPreviewDoc(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </div>
              </div>
              {/* Body */}
              <div className="p-5 space-y-4">
                {/* ข้อมูลเอกสาร */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">ลูกค้า</div>
                    <div className="font-semibold text-slate-800 text-sm">{previewDoc.customer_name || '—'}</div>
                    {previewDoc.customer_address && <div className="text-xs text-slate-500 mt-1">{previewDoc.customer_address}</div>}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">รายละเอียด</div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>วันที่: <span className="font-semibold">{previewDoc.issue_date?.slice(0,10)}</span></div>
                      {previewDoc.valid_date && <div>ใช้ได้ถึง: <span className="font-semibold">{previewDoc.valid_date?.slice(0,10)}</span></div>}
                      {previewDoc.ref_doc && <div>อ้างอิง: <span className="font-semibold">{previewDoc.ref_doc}</span></div>}
                      <div>สาขา: <span className="font-semibold">{biz?.name || previewDoc.business_name}</span></div>
                    </div>
                  </div>
                </div>
                {/* รายการ */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">รายการสินค้า/บริการ</div>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between items-start bg-slate-50 rounded-xl px-3 py-2.5">
                        <div className="flex-1 pr-3">
                          <div className="text-sm font-medium text-slate-800">{item.description || '—'}</div>
                          <div className="text-xs text-slate-500">{item.qty} {item.unit} × ฿{fmt(item.unit_price)}</div>
                        </div>
                        <div className="text-sm font-bold text-slate-800 flex-shrink-0">฿{fmt((item.qty||1)*(item.unit_price||0))}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* ยอดรวม */}
                <div className="bg-slate-800 text-white rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-300">รวมเป็นเงิน</span><span>฿{fmt(previewDoc.subtotal)}</span></div>
                  {Number(previewDoc.discount) > 0 && <div className="flex justify-between text-sm"><span className="text-slate-300">ส่วนลด</span><span>-฿{fmt(previewDoc.discount)}</span></div>}
                  <div className="flex justify-between font-black text-base pt-1 border-t border-slate-600">
                    <span>ยอดรวมทั้งสิ้น</span><span>฿{fmt(previewDoc.total)}</span>
                  </div>
                </div>
                {previewDoc.remarks && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-slate-700">
                    <span className="font-semibold text-amber-700">หมายเหตุ: </span>{previewDoc.remarks}
                  </div>
                )}
              </div>
              {/* Footer actions */}
              <div className="p-4 border-t border-slate-200 flex gap-2">
                <button onClick={() => { setPreviewDoc(null); setEditDoc(previewDoc); setPrefillDoc(null); setIsFormOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-100">
                  <Edit2 size={14} /> แก้ไข
                </button>
                <button onClick={() => { handlePrint(previewDoc); setPreviewDoc(null); }} disabled={printLoading === previewDoc.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                  <Download size={14} /> ดาวน์โหลด PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Document Form Drawer */}
      <Drawer isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setPrefillDoc(null); }}
        title={editDoc ? `แก้ไข ${editDoc.doc_number}` : prefillDoc ? `สร้าง${DOC_TYPES.find(t=>t.id===prefillDoc.doc_type)?.label || 'เอกสาร'}` : 'สร้างเอกสารใหม่'}
        description={editDoc ? 'แก้ไขรายละเอียดเอกสาร' : 'กรอกข้อมูลเพื่อสร้างเอกสาร'}>
        {isFormOpen && (
          <DocumentForm businesses={businesses} user={user} editDoc={editDoc} prefillDoc={prefillDoc}
            onClose={() => { setIsFormOpen(false); setPrefillDoc(null); }}
            onSaved={(saved, isNew) => {
              if (isNew) setDocs(prev => [saved, ...prev]);
              else setDocs(prev => prev.map(d => d.id === saved.id ? { ...d, ...saved } : d));
              setIsFormOpen(false);
              setPrefillDoc(null);
              onSuccess(isNew ? `สร้าง ${saved.doc_number} สำเร็จ ✅` : 'อัปเดตเอกสารสำเร็จ ✅');
            }} />
        )}
      </Drawer>

      {/* Settings Drawer */}
      <Drawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        title="ตั้งค่าเอกสาร" description="ตั้งค่าตัวย่อ เลขรัน และลายเซ็น">
        {isSettingsOpen && (
          <DocumentSettings businesses={businesses}
            onClose={(saved) => { setIsSettingsOpen(false); if (saved) onSuccess('บันทึกการตั้งค่าสำเร็จ ✅'); }} />
        )}
      </Drawer>
    </div>
  );
};

// ─── MAIN APP ───
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fh_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [toast, setToast] = useState(null);

  const handleLogin = (userData) => {
    localStorage.setItem('fh_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('fh_user');
    setUser(null);
  };

  // Load businesses on login
  useEffect(() => {
    if (!user) return;
    businessAPI.getAll()
      .then(data => { if (Array.isArray(data)) setBusinesses(data); })
      .catch(() => {});
  }, [user]);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  if (!user) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) return <SetPasswordPage token={token} />;
    return <LoginPage onLogin={handleLogin} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'income', label: 'รับเงิน', icon: TrendingUp, color: 'text-emerald-400' },
    { id: 'expense', label: 'จ่ายเงิน', icon: TrendingDown, color: 'text-rose-400' },
    { id: 'transactions', label: 'รายการธุรกรรม', icon: List },
    { id: 'documents', label: 'เอกสาร', icon: FilePlus, color: 'text-blue-400' },
    { id: 'reports', label: 'รายงาน P&L', icon: FileText },
    { id: 'businesses', label: 'จัดการธุรกิจ', icon: Building2 },
    { id: 'users', label: 'จัดการสิทธิ์', icon: Users },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard setCurrentView={setCurrentView} />;
      case 'income': return <IncomeEntry businesses={businesses} onSuccess={showToast} />;
      case 'expense': return <ExpenseEntry businesses={businesses} user={user} onSuccess={showToast} />;
      case 'transactions': return <Transactions businesses={businesses} user={user} />;
      case 'reports': return <Reports businesses={businesses} />;
      case 'businesses': return <BusinessManagement businesses={businesses} setBusinesses={setBusinesses} onSuccess={showToast} />;
      case 'users': return <UserManagement businesses={businesses} onSuccess={showToast} />;
      case 'documents': return <Documents businesses={businesses} user={user} onSuccess={showToast} />;
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
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-bold">
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
