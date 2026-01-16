
import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, 
  query, orderBy, serverTimestamp, writeBatch, getDoc, setDoc, limit
} from "firebase/firestore";
import { 
  LayoutGrid, Users, ShoppingCart, Package, Settings, Search, Menu, X, Plus, 
  Filter, MessageSquare, Send, Sparkles, DollarSign, TrendingUp, 
  Trash2, Store, LogOut, Facebook, 
  Instagram, ChevronDown, FileText, Truck, ClipboardList, Scan, Shield, Zap, 
  Database, Bell, Moon, Sun, Lock, Loader2, AlertCircle, Printer, History, CheckCircle, Upload,
  Wallet, PieChart as PieChartIcon, UserPlus, Phone, Building2, Layers, RefreshCw, Mail,
  ArrowUpRight, ArrowDownRight, MoreVertical, CreditCard, Tag
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCTrenpSXNMR78_5r3zXAmD5aXO7jFxxD4",
  authDomain: "satika-cc4c3.firebaseapp.com",
  projectId: "satika-cc4c3",
  storageBucket: "satika-cc4c3.firebasestorage.app",
  messagingSenderId: "370343505568",
  appId: "1:370343505568:web:551fa56872706a0a8463c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- TYPES ---
type Role = 'Owner' | 'Admin' | 'Worker';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  location: string;
  category: string;
}

interface CartItem extends Product { qty: number }

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalSpent: number;
  lastVisit: string;
}

interface Sale {
  id: string;
  date: string;
  customer: string;
  amount: number;
  items: CartItem[];
}

interface Vendor {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface PurchaseOrder {
  id: string;
  vendorName: string;
  status: 'Ordered' | 'Received';
  total: number;
  date: string;
  items: CartItem[];
}

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

// --- CONTEXTS ---
const AuthContext = createContext<{
  user: AppUser | null;
  loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}>(null!);

const ThemeContext = createContext<{
  isDarkMode: boolean;
  toggleTheme: () => void;
}>(null!);

// --- PROVIDERS ---
const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          setUser({ id: firebaseUser.uid, ...userSnap.data() } as AppUser);
        } else {
          const defaultData = { email: firebaseUser.email || '', name: 'User', role: 'Worker' as Role };
          await setDoc(doc(db, "users", firebaseUser.uid), defaultData);
          setUser({ id: firebaseUser.uid, ...defaultData });
        }
      } else setUser(null);
      setLoading(false);
    });
  }, []);

  const login = (e: string, p: string) => signInWithEmailAndPassword(auth, e, p).then(() => {});
  const logout = () => signOut(auth);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};

const ThemeProvider = ({ children }: { children?: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  return <ThemeContext.Provider value={{ isDarkMode, toggleTheme: () => setIsDarkMode(!isDarkMode) }}>{children}</ThemeContext.Provider>;
};

// --- GENERIC FIREBASE HOOK ---
function useCollection<T>(name: string, sortField: string = 'date', limitCount: number = 50) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    return onSnapshot(query(collection(db, name), orderBy(sortField, 'desc'), limit(limitCount)), (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
      setLoading(false);
    });
  }, [name, sortField, limitCount]);
  return { data, loading };
}

// --- MODULES ---

const DashboardView = ({ products, sales, expenses }: { products: Product[], sales: Sale[], expenses: Expense[] }) => {
  const totalRev = sales.reduce((s, i) => s + i.amount, 0);
  const totalExp = expenses.reduce((s, i) => s + i.amount, 0);
  const lowStock = products.filter(p => p.stock < 5).length;

  const chartData = useMemo(() => {
    const map = new Map();
    sales.slice(0, 30).forEach(s => {
      const d = new Date(s.date).toLocaleDateString(undefined, { weekday: 'short' });
      map.set(d, (map.get(d) || 0) + s.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).reverse();
  }, [sales]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><DollarSign className="w-24 h-24" /></div>
          <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Revenue</p>
              <h3 className="text-2xl font-black dark:text-white">₹{totalRev.toLocaleString()}</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
             <ArrowUpRight className="w-3 h-3" /> 12% vs last month
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Wallet className="w-24 h-24" /></div>
          <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl"><DollarSign className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Expenses</p>
              <h3 className="text-2xl font-black dark:text-white">₹{totalExp.toLocaleString()}</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-red-500">
             <ArrowDownRight className="w-3 h-3" /> 4% higher outflow
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Package className="w-24 h-24" /></div>
          <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl"><Package className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Items</p>
              <h3 className="text-2xl font-black dark:text-white">{products.length}</h3>
            </div>
          </div>
          <div className="mt-4 text-[10px] font-bold text-slate-400">
             Stocking 14 categories
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><AlertCircle className="w-24 h-24" /></div>
          <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl"><AlertCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Low Stock SKUs</p>
              <h3 className="text-2xl font-black dark:text-white">{lowStock}</h3>
            </div>
          </div>
          <div className="mt-4 text-[10px] font-bold text-amber-500">
             Requires immediate reorder
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border dark:border-slate-700 h-[450px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black dark:text-white flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Sales Performance
            </h3>
            <select className="bg-slate-50 dark:bg-slate-900 border-none text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:ring-2 ring-indigo-500">
               <option>Last 7 Days</option>
               <option>Last 30 Days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} tickFormatter={v => `₹${v}`} />
              <RechartsTooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                  backgroundColor: '#1e293b',
                  color: 'white',
                  padding: '12px'
                }} 
              />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVal)" strokeWidth={4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border dark:border-slate-700">
           <h3 className="font-black mb-8 dark:text-white flex items-center gap-3">
             <ArrowUpRight className="w-5 h-5 text-emerald-500" />
             Top Selling Products
           </h3>
           <div className="space-y-6">
              {products.slice(0, 5).map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center font-black text-slate-500 text-xs">#{idx+1}</div>
                      <div>
                         <p className="text-sm font-bold dark:text-white truncate max-w-[120px]">{p.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.sku}</p>
                      </div>
                   </div>
                   <p className="font-black text-indigo-600 dark:text-indigo-400">₹{p.price}</p>
                </div>
              ))}
           </div>
           <button className="w-full mt-10 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">View All Sales</button>
        </div>
      </div>
    </div>
  );
};

const ItemsView = ({ products }: { products: Product[] }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: 0, stock: 0, category: 'Saree' });

  const handleSave = async () => {
    if (!form.name) return;
    await addDoc(collection(db, 'products'), { ...form, location: 'Main Store' });
    setShowAdd(false);
    setForm({ name: '', sku: '', price: 0, stock: 0, category: 'Saree' });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] border dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in duration-500">
      <div className="p-8 border-b dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/20">
        <div>
          <h2 className="text-2xl font-black dark:text-white tracking-tight">Stock Inventory</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Manage variants, pricing and real-time stock counts.</p>
        </div>
        <div className="flex gap-3">
          <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 hover:bg-slate-50 transition-colors"><Filter className="w-5 h-5 text-slate-500" /></button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-widest text-[10px] border-b dark:border-slate-700">
            <tr>
              <th className="px-8 py-6">Identity</th>
              <th className="px-8 py-6">Category</th>
              <th className="px-8 py-6">Stock Level</th>
              <th className="px-8 py-6 text-right">M.R.P</th>
              <th className="px-8 py-6 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-700">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/30 transition-colors group">
                <td className="px-8 py-6">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center"><Tag className="w-5 h-5 text-indigo-600" /></div>
                      <div>
                        <div className="font-black dark:text-white text-base">{p.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">{p.sku}</div>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-6">
                   <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">{p.category}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 w-24 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                       <div className={`h-full ${p.stock < 5 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (p.stock / 20) * 100)}%` }}></div>
                    </div>
                    <span className={`text-xs font-black ${p.stock < 5 ? 'text-red-500' : 'text-slate-500'}`}>{p.stock}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right font-black text-lg text-indigo-600 dark:text-indigo-400">₹{p.price}</td>
                <td className="px-8 py-6 text-center">
                   <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors"><MoreVertical className="w-4 h-4 text-slate-400" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl scale-in duration-300">
            <h3 className="text-3xl font-black mb-2 dark:text-white tracking-tight">New Asset</h3>
            <p className="text-sm font-medium text-slate-500 mb-10">Define the core specifications of the product.</p>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Title</label>
                <input className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl dark:text-white focus:ring-2 ring-indigo-500 transition-all text-sm shadow-inner" placeholder="e.g. Banarasi Silk Saree" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">SKU Reference</label>
                    <input className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl dark:text-white focus:ring-2 ring-indigo-500 transition-all text-sm shadow-inner" placeholder="BSS-001" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                    <select className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl dark:text-white focus:ring-2 ring-indigo-500 transition-all text-sm shadow-inner" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                       <option>Saree</option>
                       <option>Dress</option>
                       <option>Fabric</option>
                       <option>Accessories</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Price (₹)</label>
                  <input type="number" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl dark:text-white focus:ring-2 ring-indigo-500 transition-all text-sm shadow-inner" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Opening Stock</label>
                  <input type="number" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl dark:text-white focus:ring-2 ring-indigo-500 transition-all text-sm shadow-inner" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-all text-[10px]">Discard</button>
              <button onClick={handleSave} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-500/40 transition-all active:scale-95 text-[10px]">Register Asset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BillingView = ({ products }: { products: Product[] }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [custName, setCustName] = useState('');
  const [showReceipt, setShowReceipt] = useState<{sale: any, items: CartItem[]} | null>(null);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return alert("Insufficient Stock Level!");
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id);
      if (existing) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);

  const handleCheckout = async () => {
    if (!cart.length) return;
    const saleData = { 
      date: new Date().toISOString(), 
      customer: custName || 'Counter Customer', 
      amount: total, 
      items: cart,
      txRef: `TXN-${Math.random().toString(36).substring(7).toUpperCase()}`
    };
    
    await addDoc(collection(db, 'sales'), saleData);
    const batch = writeBatch(db);
    cart.forEach(i => batch.update(doc(db, 'products', i.id), { stock: Math.max(0, i.stock - i.qty) }));
    await batch.commit();
    
    setShowReceipt({ sale: saleData, items: cart });
    setCart([]); setCustName('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500 relative">
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 p-8 rounded-[40px] border dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-none shadow-inner dark:text-white focus:ring-2 ring-indigo-500 transition-all text-xl font-bold placeholder:font-medium" placeholder="Quick search product or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 overflow-y-auto pr-2 pb-6 flex-1 custom-scrollbar">
          {filtered.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className={`group relative bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border dark:border-slate-700 cursor-pointer hover:border-indigo-500 hover:shadow-2xl transition-all active:scale-95 ${p.stock <= 0 ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="w-7 h-7 text-indigo-600 bg-indigo-50 rounded-full p-1.5" /></div>
              <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4"><Tag className="w-6 h-6 text-indigo-600" /></div>
              <h4 className="font-black dark:text-white text-base truncate pr-6">{p.name}</h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{p.sku}</p>
              <div className="flex justify-between items-end mt-6">
                <p className="text-indigo-600 dark:text-indigo-400 font-black text-2xl">₹{p.price}</p>
                <div className="text-right">
                   <p className={`text-[10px] font-black uppercase tracking-widest ${p.stock < 10 ? 'text-red-500' : 'text-emerald-500'}`}>{p.stock} units</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-full lg:w-[450px] bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl border dark:border-slate-700 flex flex-col h-full overflow-hidden">
        <div className="p-10 border-b dark:border-slate-700 bg-indigo-600 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><ShoppingCart className="w-24 h-24" /></div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-4 relative">Live Terminal</h2>
          <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.3em] mt-2 relative">Checkout Session: {new Date().getHours()}:{new Date().getMinutes()}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600 gap-6 opacity-50">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[32px] flex items-center justify-center"><Package className="w-12 h-12" /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Session Inactive</p>
            </div>
          ) : (
            cart.map(i => (
              <div key={i.id} className="flex justify-between items-center group animate-in slide-in-from-right-4">
                <div className="flex-1 min-w-0 pr-6">
                  <p className="font-black dark:text-white truncate text-base mb-1">{i.name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i.qty} units x ₹{i.price}</p>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                    <button onClick={() => setCart(prev => prev.map(item => item.id === i.id ? {...item, qty: Math.max(0, item.qty - 1)} : item).filter(item => item.qty > 0))} className="w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition-all text-lg font-black">-</button>
                    <span className="w-12 text-center font-black dark:text-white text-sm">{i.qty}</span>
                    <button onClick={() => addToCart(i)} className="w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition-all text-lg font-black">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-10 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="space-y-4 mb-10">
            <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <span>Subtotal</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <span>Sales Tax (0%)</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between items-center text-4xl font-black dark:text-white pt-4">
              <span>Total</span>
              <span className="text-indigo-600 dark:text-indigo-400">₹{total.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
               <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input className="w-full pl-12 pr-6 py-5 bg-white dark:bg-slate-800 rounded-2xl border-none shadow-sm text-sm dark:text-white font-bold placeholder:font-medium" placeholder="Customer Mobile / Name" value={custName} onChange={e => setCustName(e.target.value)} />
            </div>
            <button onClick={handleCheckout} disabled={!cart.length} className="w-full py-6 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-2xl shadow-indigo-500/30 active:scale-95 text-sm">Validate & Pay</button>
          </div>
        </div>
      </div>

      {showReceipt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white text-slate-900 w-full max-w-sm rounded-[40px] p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-10 h-10" /></div>
              <h3 className="text-3xl font-black tracking-tight mb-2">Transaction Success</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">Ref: {showReceipt.sale.txRef}</p>
              
              <div className="w-full space-y-4 text-left border-y py-6 mb-10">
                 {showReceipt.items.map(it => (
                   <div key={it.id} className="flex justify-between text-sm">
                      <span className="font-bold">{it.name} <span className="text-slate-400 ml-1">x{it.qty}</span></span>
                      <span className="font-black">₹{(it.price * it.qty).toLocaleString()}</span>
                   </div>
                 ))}
                 <div className="pt-4 border-t flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest">Total Paid</span>
                    <span className="text-2xl font-black text-indigo-600">₹{showReceipt.sale.amount.toLocaleString()}</span>
                 </div>
              </div>

              <div className="flex gap-4 w-full">
                 <button onClick={() => setShowReceipt(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-all">Close</button>
                 <button className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Printer className="w-3 h-3" /> Print Invoice</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const CustomersView = () => {
  const { data: customers } = useCollection<Customer>('customers', 'name');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
       <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-500 transition-colors">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors"><UserPlus className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" /></div>
          <h4 className="font-black dark:text-white mb-2">Register New Member</h4>
          <p className="text-xs text-slate-500">Add customers to track loyalty points and purchase history.</p>
       </div>
       {customers.map(c => (
         <div key={c.id} className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border dark:border-slate-700 hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-6">
               <div className="w-14 h-14 bg-indigo-50 dark:bg-slate-900 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">{c.name[0]}</div>
               <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"><MoreVertical className="w-4 h-4 text-slate-400" /></button>
            </div>
            <h4 className="font-black dark:text-white text-lg mb-1">{c.name}</h4>
            <div className="space-y-2 mb-8">
               <p className="text-xs text-slate-500 flex items-center gap-2 font-medium"><Phone className="w-3 h-3" /> {c.phone}</p>
               <p className="text-xs text-slate-500 flex items-center gap-2 font-medium"><Mail className="w-3 h-3" /> {c.email}</p>
            </div>
            <div className="pt-6 border-t dark:border-slate-700 flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Spending</p>
                  <p className="font-black text-indigo-600 dark:text-indigo-400">₹{(c.totalSpent || 0).toLocaleString()}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tier</p>
                  <p className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-amber-100 text-amber-600 rounded-lg">Gold</p>
               </div>
            </div>
         </div>
       ))}
    </div>
  );
};

const ExpensesView = () => {
  const { data: expenses } = useCollection<Expense>('expenses', 'date');
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="bg-white dark:bg-slate-800 p-10 rounded-[40px] border dark:border-slate-700 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="flex-1">
             <h2 className="text-3xl font-black dark:text-white tracking-tight mb-2">Financial Outflow</h2>
             <p className="text-sm font-medium text-slate-500">Track operating costs, payroll, and maintenance expenses.</p>
          </div>
          <div className="flex gap-4">
             <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl text-center min-w-[150px]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Month to Date</p>
                <p className="text-2xl font-black text-red-600">₹{expenses.reduce((s,i) => s + i.amount, 0).toLocaleString()}</p>
             </div>
             <button className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 transition-all active:scale-95">
                <Plus className="w-5 h-5" /> Log Expense
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-[40px] border dark:border-slate-700 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase tracking-widest text-[10px] border-b dark:border-slate-700">
                    <tr>
                      <th className="px-8 py-6">Date</th>
                      <th className="px-8 py-6">Description</th>
                      <th className="px-8 py-6">Category</th>
                      <th className="px-8 py-6 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {expenses.map(ex => (
                      <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-8 py-6 text-xs font-bold text-slate-500">{new Date(ex.date).toLocaleDateString()}</td>
                        <td className="px-8 py-6 font-black dark:text-white">{ex.description}</td>
                        <td className="px-8 py-6">
                           <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400">{ex.category}</span>
                        </td>
                        <td className="px-8 py-6 text-right font-black text-red-600">₹{ex.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-indigo-600 p-10 rounded-[40px] text-white shadow-2xl shadow-indigo-500/30">
                <div className="flex justify-between items-start mb-8">
                   <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><CreditCard className="w-7 h-7" /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Primary Account</span>
                </div>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Available Balance</p>
                <h3 className="text-4xl font-black mb-10">₹4,82,900.00</h3>
                <div className="flex justify-between text-xs font-bold">
                   <span>**** 4920</span>
                   <span className="uppercase">Visa Business</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

// --- Missing PurchasesView Component ---
const PurchasesView = ({ products }: { products: Product[] }) => {
  const { data: orders } = useCollection<PurchaseOrder>('purchaseOrders', 'date');
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="bg-white dark:bg-slate-800 p-10 rounded-[40px] border dark:border-slate-700 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="flex-1">
             <h2 className="text-3xl font-black dark:text-white tracking-tight mb-2">Procurement & Sourcing</h2>
             <p className="text-sm font-medium text-slate-500">Manage vendor shipments and bulk inventory replenishment.</p>
          </div>
          <div className="flex gap-4">
             <button className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 transition-all active:scale-95">
                <Plus className="w-5 h-5" /> Create Purchase Order
             </button>
          </div>
       </div>

       <div className="bg-white dark:bg-slate-800 rounded-[40px] border dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase tracking-widest text-[10px] border-b dark:border-slate-700">
                 <tr>
                   <th className="px-8 py-6">ID</th>
                   <th className="px-8 py-6">Vendor Name</th>
                   <th className="px-8 py-6">Status</th>
                   <th className="px-8 py-6">Creation Date</th>
                   <th className="px-8 py-6 text-right">Estimated Total</th>
                   <th className="px-8 py-6 text-center">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y dark:divide-slate-700">
                 {orders.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="px-8 py-20 text-center">
                       <div className="flex flex-col items-center gap-4 opacity-20">
                         <Truck className="w-16 h-16" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No active procurement logs</p>
                       </div>
                     </td>
                   </tr>
                 ) : (
                   orders.map(order => (
                     <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                       <td className="px-8 py-6 font-mono font-bold text-xs">#{order.id.slice(0, 8).toUpperCase()}</td>
                       <td className="px-8 py-6 font-black dark:text-white">{order.vendorName}</td>
                       <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${order.status === 'Received' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {order.status}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-xs font-bold text-slate-500">{new Date(order.date).toLocaleDateString()}</td>
                       <td className="px-8 py-6 text-right font-black text-indigo-600 dark:text-indigo-400">₹{order.total.toLocaleString()}</td>
                       <td className="px-8 py-6 text-center">
                          <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors"><MoreVertical className="w-4 h-4 text-slate-400" /></button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

const SetupView = () => {
  const sections = [
    { label: 'Store Information', desc: 'Manage branch names & basic details', icon: Building2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'System Security', desc: 'Roles, permissions & access logs', icon: Shield, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Alerts & Notifications', desc: 'Set stock threshold alerts', icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Business Automation', desc: 'Webhooks & automatic PO generation', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'ERP Extensions', desc: 'Shopify, Amazon & GST integrations', icon: Layers, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Data Warehouse', desc: 'Full cloud backups & exports', icon: Database, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {sections.map(s => (
        <div key={s.label} className="bg-white dark:bg-slate-800 p-10 rounded-[48px] border dark:border-slate-700 flex flex-col items-center text-center cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><s.icon className="w-32 h-32" /></div>
          <div className={`p-8 ${s.bg} dark:bg-opacity-10 ${s.color} rounded-[32px] mb-8 group-hover:scale-110 transition-transform shadow-sm`}><s.icon className="w-12 h-12" /></div>
          <h4 className="font-black dark:text-white text-xl tracking-tight">{s.label}</h4>
          <p className="text-xs font-medium text-slate-500 mt-3 leading-relaxed max-w-[200px]">{s.desc}</p>
          <div className="mt-10 flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
            Open Configuration <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

const DocumentsView = () => {
  const [isScanning, setIsScanning] = useState(false);
  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-[calc(100vh-140px)] animate-in fade-in duration-500">
      <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-[48px] border dark:border-slate-700 flex flex-col overflow-hidden shadow-sm relative">
        <div className="p-10 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-2xl font-black dark:text-white flex items-center gap-4"><History className="w-7 h-7 text-indigo-500" /> Cognitive Document Hub</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Smart extraction of invoice data via Inara AI vision.</p>
          </div>
          <div className="flex gap-3">
            <button className="p-4 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all shadow-sm"><RefreshCw className="w-5 h-5 text-slate-400" /></button>
            <button className="p-4 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all shadow-sm"><Filter className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>
        
        <div className="flex-1 p-20 flex flex-col items-center justify-center border-[6px] border-dashed border-slate-50 dark:border-slate-900 m-12 rounded-[56px] bg-slate-50/50 dark:bg-slate-950/10 group relative transition-all overflow-hidden">
          {isScanning && (
            <div className="absolute inset-0 bg-indigo-600/5 flex items-center justify-center z-10 animate-pulse">
               <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-[scan_2s_linear_infinite]"></div>
            </div>
          )}
          <div className="w-28 h-28 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center mb-10 shadow-2xl shadow-indigo-500/40 group-hover:scale-110 transition-transform relative">
             <Upload className="w-12 h-12" />
          </div>
          <h4 className="font-black text-3xl dark:text-white tracking-tight">AI Vision Engine</h4>
          <p className="text-slate-500 mt-5 text-center max-w-sm leading-relaxed font-medium">Upload physical purchase bills or PDF invoices. We'll automatically identify items and update stock.</p>
          <button onClick={handleScan} className="mt-12 px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px]">Initialize Upload</button>
        </div>
      </div>
      
      <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-[48px] border dark:border-slate-700 p-10 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center gap-4 mb-12"><Scan className="w-7 h-7 text-indigo-600" /><h4 className="font-black dark:text-white text-xl uppercase tracking-widest">Active Processing</h4></div>
        <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          {[1,2,3].map(i => (
            <div key={i} className="p-8 bg-slate-50 dark:bg-slate-950/50 rounded-[32px] border dark:border-slate-700 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-6">
                 <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm"><FileText className="w-5 h-5 text-slate-400" /></div>
                 <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4 mb-4 animate-pulse"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-full w-1/2 animate-pulse"></div>
              <div className="mt-8 flex justify-between items-center">
                 <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-[10px] font-black text-indigo-600 uppercase tracking-widest rounded-lg">Processing</div>
                 <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AiAssistant = ({ data }: { data: any }) => {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{r: 'ai'|'me', t: string}[]>([{r: 'ai', t: 'Greetings. I am Inara ERP Intelligence. I am ready to provide deep analysis on your sales metrics, stock velocity, and financial standing. How can I assist you today?'}]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || busy) return;
    const txt = input;
    setMsg(p => [...p, { r: 'me', t: txt }]);
    setInput(''); setBusy(true);
    try {
      // Corrected Gemini API initialization to use named parameter and direct process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contextInfo = `The business currently has ${data.products.length} types of products in inventory and has recorded ${data.sales.length} sales transactions. Revenue stands at ₹${data.sales.reduce((s: number, i: any) => s + i.amount, 0).toLocaleString()}. Expenses total ₹${data.expenses.reduce((s: number, i: any) => s + i.amount, 0).toLocaleString()}. Profit is ₹${(data.sales.reduce((s: number, i: any) => s + i.amount, 0) - data.expenses.reduce((s: number, i: any) => s + i.amount, 0)).toLocaleString()}.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${contextInfo}\n\nUser Question: ${txt}`,
        config: {
            systemInstruction: "You are Inara ERP Intelligence, a senior corporate consultant for a high-end saree and textile brand. Analyze the provided ERP context and offer strategic, data-driven advice. Use professional business terminology. Keep it insightful yet concise.",
        }
      });
      
      // Access text directly as a property from the response
      setMsg(p => [...p, { r: 'ai', t: response.text || "Connection to neural intelligence lost. Retrying..." }]);
    } catch (e) {
      console.error("AI Error:", e);
      setMsg(p => [...p, { r: 'ai', t: "An error occurred while connecting to the AI brain. Please ensure your API access is active." }]);
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msg, open]);

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-12 right-12 z-[100] w-24 h-24 bg-indigo-600 rounded-[36px] shadow-[0_30px_60px_rgba(79,70,229,0.4)] flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all group overflow-hidden">
        <div className="absolute inset-0 bg-white/10 group-hover:opacity-100 opacity-0 transition-opacity"></div>
        <Sparkles className="w-10 h-10" />
      </button>
      {open && (
        <div className="fixed bottom-40 right-12 z-[100] w-[calc(100vw-6rem)] sm:w-[500px] h-[700px] bg-white dark:bg-slate-900 rounded-[56px] shadow-[0_40px_120px_rgba(0,0,0,0.3)] border dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="p-10 bg-indigo-600 text-white flex justify-between items-center font-black relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10"><Sparkles className="w-32 h-32" /></div>
            <div className="flex items-center gap-5 relative">
               <div className="w-14 h-14 bg-white/20 rounded-[24px] flex items-center justify-center"><Sparkles className="w-7 h-7" /></div>
               <div>
                  <h3 className="text-xl tracking-tight">Inara Intelligence</h3>
                  <p className="text-[10px] text-indigo-200 font-black uppercase tracking-[0.3em]">Business Analytics Agent</p>
               </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-colors relative"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
            {msg.map((m, i) => (
              <div key={i} className={`flex ${m.r === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-6 rounded-[32px] text-sm leading-relaxed max-w-[90%] font-medium ${m.r === 'me' ? 'bg-indigo-600 text-white rounded-br-none shadow-xl shadow-indigo-500/10' : 'bg-white dark:bg-slate-800 dark:text-slate-100 border dark:border-slate-700 rounded-bl-none shadow-sm'}`}>
                  {m.t}
                </div>
              </div>
            ))}
            {busy && (
               <div className="flex justify-start">
                  <div className="p-6 rounded-[32px] bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-bl-none shadow-sm flex items-center gap-3">
                     <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Computing Data...</span>
                  </div>
               </div>
            )}
            <div ref={ref} />
          </div>
          <div className="p-8 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex gap-4">
            <input className="flex-1 px-8 py-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border-none outline-none text-sm font-bold dark:text-white shadow-inner" placeholder="Ask about profits or inventory..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
            <button onClick={handleSend} className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center shrink-0"><Send className="w-6 h-6" /></button>
          </div>
        </div>
      )}
    </>
  );
};

const LoginView = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, pass);
    } catch (err: any) {
      setError("Authorization failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc] dark:bg-[#020617] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
      <div className="w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-[56px] p-16 shadow-[0_60px_150px_rgba(0,0,0,0.15)] border dark:border-slate-800 animate-in zoom-in-95 fade-in duration-700 relative z-10">
        <div className="flex flex-col items-center mb-16">
           <div className="w-24 h-24 bg-indigo-600 rounded-[36px] flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-500/40 transform -rotate-6"><Store className="w-12 h-12" /></div>
           <h1 className="text-5xl font-black dark:text-white tracking-tighter">Satika ERP</h1>
           <p className="text-slate-400 mt-3 font-black uppercase tracking-[0.4em] text-[10px]">Unified Business Portal</p>
        </div>

        {error && (
          <div className="mb-10 p-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-3xl text-xs font-black flex items-center gap-4 border border-red-100 dark:border-red-900/30 animate-in slide-in-from-top-2">
            <AlertCircle className="w-6 h-6" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Work Identity</label>
            <input 
              type="email" 
              required 
              className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl dark:text-white focus:ring-2 ring-indigo-500 transition-all text-sm font-bold shadow-inner" 
              placeholder="admin@satika.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Access Signature</label>
            <input 
              type="password" 
              required 
              className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl dark:text-white focus:ring-2 ring-indigo-500 transition-all text-sm font-bold shadow-inner" 
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-[0.3em] shadow-[0_20px_60px_rgba(79,70,229,0.3)] hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-12 text-sm"
          >
            {loading ? <Loader2 className="w-7 h-7 animate-spin mx-auto" /> : 'Enter System'}
          </button>
        </form>
        
        <div className="mt-16 flex items-center justify-center gap-10">
           <Facebook className="w-6 h-6 text-slate-200 hover:text-indigo-500 cursor-pointer transition-colors" />
           <Instagram className="w-6 h-6 text-slate-200 hover:text-indigo-500 cursor-pointer transition-colors" />
           <Mail className="w-6 h-6 text-slate-200 hover:text-indigo-500 cursor-pointer transition-colors" />
        </div>
      </div>
    </div>
  );
};

// --- APP CONTENT ---
const AppContent = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [view, setView] = useState<'dash' | 'items' | 'bill' | 'purchase' | 'docs' | 'setup' | 'customers' | 'expenses'>('dash');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { data: products } = useCollection<Product>('products', 'name');
  const { data: sales } = useCollection<Sale>('sales', 'date');
  const { data: expenses } = useCollection<Expense>('expenses', 'date');

  const navItems = [
    { id: 'dash', label: 'Overview', icon: LayoutGrid },
    { id: 'bill', label: 'Terminal', icon: ShoppingCart },
    { id: 'items', label: 'Inventory', icon: Package },
    { id: 'purchase', label: 'Procurement', icon: Truck },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'expenses', label: 'Finance', icon: Wallet },
    { id: 'docs', label: 'Vision AI', icon: FileText },
    { id: 'setup', label: 'Configure', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-inter transition-colors duration-500">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-28'} bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col transition-all duration-700 ease-in-out relative z-50 shadow-2xl dark:shadow-none`}>
        <div className="p-10 flex items-center gap-6 overflow-hidden">
          <div className="w-14 h-14 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shrink-0 shadow-2xl shadow-indigo-500/30 transform rotate-3"><Store className="w-7 h-7" /></div>
          {isSidebarOpen && <h1 className="text-3xl font-black tracking-tighter truncate animate-in slide-in-from-left-4">Satika</h1>}
        </div>

        <nav className="flex-1 px-8 space-y-4 mt-8">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`w-full flex items-center gap-5 p-5 rounded-[24px] transition-all duration-300 group relative ${view === item.id ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <item.icon className={`w-7 h-7 shrink-0 transition-transform group-hover:scale-110 ${view === item.id ? 'scale-110' : ''}`} />
              {isSidebarOpen && <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>}
              {view === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-8 bg-white rounded-r-full"></div>}
            </button>
          ))}
        </nav>

        <div className="p-10 space-y-6">
          <button onClick={toggleTheme} className="w-full flex items-center gap-5 p-5 rounded-[24px] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
            {isDarkMode ? <Sun className="w-7 h-7" /> : <Moon className="w-7 h-7" />}
            {isSidebarOpen && <span className="font-black text-xs uppercase tracking-widest">{isDarkMode ? 'Light' : 'Dark'}</span>}
          </button>
          <button onClick={logout} className="w-full flex items-center gap-5 p-5 rounded-[24px] text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
            <LogOut className="w-7 h-7" />
            {isSidebarOpen && <span className="font-black text-xs uppercase tracking-widest">Exit</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative">
        <header className="h-28 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-12 flex justify-between items-center shrink-0 z-40 relative">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all shadow-sm">
              <Menu className="w-6 h-6 text-slate-400" />
            </button>
            <div>
               <h2 className="text-2xl font-black dark:text-white tracking-tight animate-in slide-in-from-top-4">
                  {navItems.find(n => n.id === view)?.label}
               </h2>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Operational Module v2.4.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden lg:flex items-center gap-4 px-8 py-4 bg-slate-50 dark:bg-slate-800 rounded-[24px] shadow-sm">
               <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Node Sync Active</span>
            </div>
            <div className="flex items-center gap-6 pl-8 border-l dark:border-slate-800">
               <div className="text-right hidden sm:block">
                  <p className="text-sm font-black dark:text-white">{user?.name}</p>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{user?.role}</p>
               </div>
               <div className="w-14 h-14 bg-indigo-50 dark:bg-slate-800 rounded-[20px] flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shadow-sm border-2 border-white dark:border-slate-700">{user?.name?.[0]}</div>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
          {view === 'dash' && <DashboardView products={products} sales={sales} expenses={expenses} />}
          {view === 'items' && <ItemsView products={products} />}
          {view === 'bill' && <BillingView products={products} />}
          {view === 'customers' && <CustomersView />}
          {view === 'expenses' && <ExpensesView />}
          {view === 'purchase' && <PurchasesView products={products} />}
          {view === 'docs' && <DocumentsView />}
          {view === 'setup' && <SetupView />}
        </section>

        <AiAssistant data={{ products, sales, expenses }} />
      </main>
    </div>
  );
};

const App = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950">
       <div className="relative">
          <div className="w-24 h-24 border-8 border-indigo-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Store className="w-8 h-8 text-indigo-600 animate-pulse" />
          </div>
       </div>
       <p className="mt-12 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">Initializing Ecosystem...</p>
    </div>
  );

  return user ? <AppContent /> : <LoginView />;
};

const Root = () => (
  <AuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(<Root />);
