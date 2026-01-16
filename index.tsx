import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, 
  query, orderBy, limit, where, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc 
} from "firebase/firestore";
import { 
  LayoutGrid, Users, ShoppingCart, Package, BarChart3, Settings, Search, Bell, Menu, X, Plus, 
  Filter, ArrowLeft, MessageSquare, Send, Sparkles, MoreHorizontal, DollarSign, TrendingUp, 
  Activity, Trash2, Save, Download, Store, Link as LinkIcon, LogOut, CreditCard, Facebook, 
  Instagram, ChevronDown, ChevronRight, FileText, Truck, ClipboardList, Scan, Shield, Zap, 
  Database, Globe, Mail, Moon, Sun, Lock, Loader2, AlertCircle, Printer, History, CheckCircle, Upload,
  Wallet, PieChart as PieChartIcon, UserPlus, Phone, MapPin, Bot, Building2, Share2, FileInput, 
  RefreshCw, Boxes, Layers
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GEMINI AI CONFIGURATION ---
// NOTE: In a real app, do not expose API keys on the client. This is for demo purposes as per instructions.
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || "YOUR_API_KEY_HERE" });

// --- TYPES ---

type Role = 'Owner' | 'Admin' | 'Worker';

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  location: string;
  category: string;
};

type CartItem = Product & { qty: number };

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: string;
  recordedBy: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalSpent: number;
  lastVisit: string;
};

type Sale = {
  id: string;
  date: string; // ISO string
  createdAt?: any;
  customer: string;
  customerId?: string;
  amount: number;
  items: CartItem[];
  channel: string;
};

type Vendor = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type PurchaseOrder = {
  id: string;
  vendorId: string;
  vendorName: string;
  status: 'Draft' | 'Ordered' | 'Received';
  items: CartItem[];
  total: number;
  date: string;
  createdAt?: any;
};

type InventoryLog = {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  type: 'Adjustment' | 'Restock' | 'Damage' | 'Sale';
  quantity: number;
  reason: string;
  user: string;
};

type AppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type AuditLog = {
  id: string;
  action: string;
  details: string;
  user: string;
  timestamp: any;
};

// --- AUDIT LOGGER ---
const logAudit = async (user: AppUser | null, action: string, details: string) => {
  if (!user) return;
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      details,
      user: user.email,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Failed to log audit", e);
  }
};

// --- CONTEXTS ---

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>(null!);

// --- PROVIDERS ---

const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          let userData: AppUser;
          if (userSnap.exists()) {
             userData = { id: firebaseUser.uid, ...userSnap.data() } as AppUser;
          } else {
             const role = (firebaseUser.email?.includes('aneesh') || firebaseUser.email?.includes('admin')) ? 'Owner' : 'Worker';
             userData = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                role: role as Role
             };
             await setDoc(userRef, {
                email: userData.email,
                name: userData.name,
                role: userData.role
             });
          }
          setUser(userData);
        } catch (e) {
          console.error("Error fetching user data", e);
          setUser({ id: firebaseUser.uid, email: firebaseUser.email || '', name: 'User', role: 'Worker' });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => { await signInWithEmailAndPassword(auth, email, password); };
  const signup = async (email, password) => { await createUserWithEmailAndPassword(auth, email, password); };
  const logout = async () => { await signOut(auth); };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const ThemeProvider = ({ children }: { children?: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --- AUTH COMPONENT ---

const LoginScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, signup } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) await signup(email, password);
      else await login(email, password);
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">INARA DESIGNS</h1>
          <p className="text-slate-500 dark:text-slate-400">{isRegistering ? 'Create a new account' : 'Sign in to your account'}</p>
        </div>
        {error && (
           <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm rounded-lg flex items-center gap-2">
             <AlertCircle className="w-4 h-4" /> {error}
           </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input type="email" required className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input type="password" required minLength={6} className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/30 transition-all duration-200">{isRegistering ? 'Sign Up' : 'Sign In'}</button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{isRegistering ? "Already have an account?" : "Don't have an account?"} <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">{isRegistering ? 'Sign In' : 'Sign Up'}</button></p>
        </div>
      </div>
    </div>
  );
};

// --- HELPER HOOKS ---

function useFirestoreCollection<T>(collectionName: string, orderField?: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, collectionName));
    if (orderField) {
      q = query(collection(db, collectionName), orderBy(orderField, 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, orderField]);

  return { data, loading };
}

// --- SUB-VIEWS ---

// 1. ITEMS VIEW
const ItemsView = ({ products }: { products: Product[] }) => {
  const { user } = useContext(AuthContext);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', sku: '', price: '', stock: '', category: 'General' });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) return;
    await addDoc(collection(db, 'products'), {
      ...newItem,
      price: Number(newItem.price),
      stock: Number(newItem.stock),
      location: 'Warehouse'
    });
    await logAudit(user, 'CREATE_ITEM', `Created item ${newItem.name}`);
    setShowAddModal(false);
    setNewItem({ name: '', sku: '', price: '', stock: '', category: 'General' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
     // Simplified import logic
     alert("Import started (Demo Mode)");
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-orange-50/30 dark:bg-orange-900/10">
        <h2 className="text-orange-800 dark:text-orange-300 font-bold text-lg flex items-center gap-2">
          <Package className="w-5 h-5" /> Product List
        </h2>
        <div className="flex gap-2">
           <input type="file" ref={fileInputRef} className="hidden" onChange={handleImport} />
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm"><Upload className="w-4 h-4"/> Import</button>
           <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"><Plus className="w-4 h-4"/> New Item</button>
        </div>
      </div>
      
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-4 dark:text-white">New Product</h3>
              <div className="space-y-3">
                 <input placeholder="Item Name" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                 <input placeholder="SKU" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} />
                 <div className="flex gap-3">
                    <input type="number" placeholder="Price" className="w-1/2 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                    <input type="number" placeholder="Stock" className="w-1/2 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
                 </div>
                 <select className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                    <option>General</option>
                    <option>Saree</option>
                    <option>Fabric</option>
                 </select>
              </div>
              <div className="flex gap-3 mt-6">
                 <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-slate-500">Cancel</button>
                 <button onClick={handleAddItem} className="flex-1 py-2 bg-orange-600 text-white rounded-lg">Save</button>
              </div>
           </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">SKU</th><th className="px-6 py-3">Stock</th><th className="px-6 py-3">Price</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                <td className="px-6 py-3">{p.sku}</td>
                <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs ${p.stock<5?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>{p.stock}</span></td>
                <td className="px-6 py-3">₹{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 2. INVENTORY ADJUSTMENTS
const InventoryAdjustmentsView = ({ products }: { products: Product[] }) => {
   const { user } = useContext(AuthContext);
   const { data: logs } = useFirestoreCollection<InventoryLog>('inventory_logs', 'date');
   const [itemId, setItemId] = useState('');
   const [qty, setQty] = useState(0);
   const [type, setType] = useState<'Adjustment'|'Damage'|'Restock'>('Adjustment');
   const [reason, setReason] = useState('');

   const handleAdjust = async () => {
      if(!itemId || qty === 0) return;
      const product = products.find(p => p.id === itemId);
      if(!product) return;
      
      const newStock = type === 'Restock' ? product.stock + qty : product.stock - qty;
      
      const batch = writeBatch(db);
      batch.update(doc(db, 'products', itemId), { stock: newStock });
      batch.set(doc(collection(db, 'inventory_logs')), {
         date: new Date().toISOString(),
         itemId,
         itemName: product.name,
         type,
         quantity: qty,
         reason,
         user: user?.email
      });
      await batch.commit();
      setItemId(''); setQty(0); setReason('');
      await logAudit(user, 'INVENTORY_ADJUST', `Adjusted ${product.name} by ${type === 'Restock' ? '+' : '-'}${qty}`);
   };

   return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">New Adjustment</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-sm text-slate-500 mb-1 block">Product</label>
                  <select className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={itemId} onChange={e => setItemId(e.target.value)}>
                     <option value="">Select Product</option>
                     {products.map(p => <option key={p.id} value={p.id}>{p.name} (Cur: {p.stock})</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-sm text-slate-500 mb-1 block">Type</label>
                  <div className="flex gap-2">
                     {['Adjustment', 'Damage', 'Restock'].map(t => (
                        <button key={t} onClick={() => setType(t as any)} className={`flex-1 py-2 text-sm rounded border ${type === t ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-slate-200 text-slate-600'}`}>{t}</button>
                     ))}
                  </div>
               </div>
               <div>
                   <label className="text-sm text-slate-500 mb-1 block">Quantity</label>
                   <input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={qty} onChange={e => setQty(Number(e.target.value))} />
               </div>
               <div>
                   <label className="text-sm text-slate-500 mb-1 block">Reason</label>
                   <input className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={reason} onChange={e => setReason(e.target.value)} />
               </div>
               <button onClick={handleAdjust} className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Update Stock</button>
            </div>
         </div>
         <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold dark:text-white">Recent Movements</div>
            <div className="overflow-x-auto h-96">
               <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-900 font-semibold border-b"><tr><th className="p-3">Date</th><th className="p-3">Item</th><th className="p-3">Type</th><th className="p-3">Qty</th><th className="p-3">Reason</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {logs.map(log => (
                        <tr key={log.id}>
                           <td className="p-3">{new Date(log.date).toLocaleDateString()}</td>
                           <td className="p-3 font-medium dark:text-white">{log.itemName}</td>
                           <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${log.type === 'Restock' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.type}</span></td>
                           <td className="p-3">{log.quantity}</td>
                           <td className="p-3 text-slate-400">{log.reason}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
};

// 3. BILLING VIEW
const BillingView = ({ products }: { products: Product[] }) => {
  const { user } = useContext(AuthContext);
  const { data: customers } = useFirestoreCollection<Customer>('customers', 'name');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const addToCart = (p: Product) => {
     setCart(prev => {
        const exist = prev.find(i => i.id === p.id);
        if(exist) return prev.map(i => i.id === p.id ? {...i, qty: i.qty+1} : i);
        return [...prev, {...p, qty: 1}];
     });
  };
  const cartTotal = cart.reduce((s,i) => s + (i.price*i.qty), 0);

  const handleSale = async () => {
     if(cart.length === 0) return;
     const sale = { date: new Date().toISOString(), customer: customerSearch||'Walk-in', amount: cartTotal, items: cart, channel: 'POS', createdAt: serverTimestamp() };
     await addDoc(collection(db, 'sales'), sale);
     
     const batch = writeBatch(db);
     cart.forEach(i => batch.update(doc(db, 'products', i.id), { stock: Math.max(0, i.stock - i.qty) }));
     await batch.commit();
     
     setCart([]); setCustomerSearch('');
     await logAudit(user, 'SALE', `POS Sale ₹${cartTotal}`);
     alert("Sale Completed!");
  };

  return (
     <div className="flex h-[calc(100vh-140px)] gap-6">
        <div className="flex-1 flex flex-col">
           <input className="w-full p-3 mb-4 rounded-xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white shadow-sm" placeholder="Search Items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2">
              {filteredProducts.map(p => (
                 <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 cursor-pointer hover:border-purple-500 shadow-sm">
                    <div className="font-bold dark:text-white truncate">{p.name}</div>
                    <div className="flex justify-between mt-2 text-sm">
                       <span className="text-slate-500">Stock: {p.stock}</span>
                       <span className="font-bold text-purple-600">₹{p.price}</span>
                    </div>
                 </div>
              ))}
           </div>
        </div>
        <div className="w-80 bg-white dark:bg-slate-800 flex flex-col rounded-xl border dark:border-slate-700 shadow-lg h-full">
           <div className="p-4 border-b dark:border-slate-700 font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">Current Sale</div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(i => (
                 <div key={i.id} className="flex justify-between items-center text-sm dark:text-slate-300">
                    <div>{i.name} <span className="text-xs text-slate-500">x{i.qty}</span></div>
                    <div className="font-bold">₹{i.price*i.qty}</div>
                 </div>
              ))}
           </div>
           <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between text-lg font-bold mb-4 dark:text-white"><span>Total</span><span>₹{cartTotal}</span></div>
              <input className="w-full mb-3 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Customer Name" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
              <button onClick={handleSale} className="w-full py-3 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Checkout</button>
           </div>
        </div>
     </div>
  );
};

// 4. PURCHASES VIEW (RESTORED)
const PurchasesView = ({ products }: { products: Product[] }) => {
   const { user } = useContext(AuthContext);
   const { data: vendors } = useFirestoreCollection<Vendor>('vendors');
   const { data: orders } = useFirestoreCollection<PurchaseOrder>('purchase_orders', 'createdAt');
   
   const [activeTab, setActiveTab] = useState<'orders' | 'vendors'>('orders');
   const [showVendorModal, setShowVendorModal] = useState(false);
   const [showPOModal, setShowPOModal] = useState(false);
   const [newVendor, setNewVendor] = useState({ name: '', email: '', phone: '' });
   const [newPO, setNewPO] = useState<{ vendorId: string, items: CartItem[] }>({ vendorId: '', items: [] });
   const [poItem, setPOItem] = useState<{ productId: string, qty: number }>({ productId: '', qty: 1 });

   const handleAddVendor = async () => {
     if(!newVendor.name) return;
     await addDoc(collection(db, 'vendors'), newVendor);
     setShowVendorModal(false); setNewVendor({ name: '', email: '', phone: '' });
   };

   const handleCreatePO = async () => {
      if(!newPO.vendorId || newPO.items.length === 0) return;
      const vendor = vendors.find(v => v.id === newPO.vendorId);
      const total = newPO.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      await addDoc(collection(db, 'purchase_orders'), {
         vendorId: newPO.vendorId, vendorName: vendor?.name || 'Unknown', items: newPO.items, status: 'Ordered', total, date: new Date().toISOString(), createdAt: serverTimestamp()
      });
      setShowPOModal(false); setNewPO({ vendorId: '', items: [] });
      await logAudit(user, 'CREATE_PO', `Created PO for ${vendor?.name}`);
   };

   const handleReceivePO = async (order: PurchaseOrder) => {
      if(order.status !== 'Ordered') return;
      const batch = writeBatch(db);
      order.items.forEach(item => {
         const currentProd = products.find(p => p.id === item.id);
         if(currentProd) batch.update(doc(db, 'products', item.id), { stock: currentProd.stock + item.qty });
      });
      batch.update(doc(db, 'purchase_orders', order.id), { status: 'Received' });
      await batch.commit();
      await logAudit(user, 'RECEIVE_PO', `Received PO ${order.id}`);
   };

   return (
      <div className="space-y-6">
         <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setActiveTab('orders')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'orders' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}>Purchase Orders</button>
            <button onClick={() => setActiveTab('vendors')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'vendors' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}>Vendors</button>
         </div>
         {activeTab === 'vendors' ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
               <div className="flex justify-between mb-4"><h2 className="font-bold text-lg dark:text-white">Suppliers</h2><button onClick={() => setShowVendorModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Add Vendor</button></div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{vendors.map(v => (<div key={v.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"><h3 className="font-bold dark:text-white">{v.name}</h3><p className="text-sm text-slate-500">{v.email}</p><p className="text-sm text-slate-500">{v.phone}</p></div>))}</div>
            </div>
         ) : (
            <div className="space-y-4">
               <div className="flex justify-between items-center"><h2 className="text-xl font-bold dark:text-white">Orders</h2><button onClick={() => setShowPOModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">+ New Order</button></div>
               <div className="space-y-3">{orders.map(order => (<div key={order.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"><div><div className="flex items-center gap-2"><span className="font-bold dark:text-white">{order.vendorName}</span><span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span></div><p className="text-xs text-slate-500 mt-1">{new Date(order.date).toLocaleDateString()} • {order.items.length} Items</p></div><div className="flex items-center gap-4"><span className="font-bold dark:text-white">₹{order.total}</span>{order.status === 'Ordered' && (<button onClick={() => handleReceivePO(order)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-5 h-5" /></button>)}</div></div>))}</div>
            </div>
         )}
         {showVendorModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md"><h3 className="font-bold mb-4 dark:text-white">Add Vendor</h3><input className="w-full mb-3 p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="Name" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} /><div className="flex gap-2"><button onClick={() => setShowVendorModal(false)} className="flex-1 py-2 text-slate-500">Cancel</button><button onClick={handleAddVendor} className="flex-1 py-2 bg-purple-600 text-white rounded-lg">Save</button></div></div></div>)}
         {showPOModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-lg"><h3 className="font-bold mb-4 dark:text-white">Create Purchase Order</h3><select className="w-full mb-4 p-2 border rounded dark:bg-slate-700 dark:text-white" value={newPO.vendorId} onChange={e => setNewPO({...newPO, vendorId: e.target.value})}><option value="">Select Vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-4"><div className="flex gap-2 mb-2"><select className="flex-1 p-2 border rounded text-sm dark:bg-slate-700 dark:text-white" value={poItem.productId} onChange={e => setPOItem({...poItem, productId: e.target.value})}><option value="">Select Item</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" className="w-20 p-2 border rounded text-sm dark:bg-slate-700 dark:text-white" value={poItem.qty} onChange={e => setPOItem({...poItem, qty: Number(e.target.value)})} /><button onClick={() => { if(poItem.productId) { const p = products.find(prod => prod.id === poItem.productId); if(p) setNewPO({...newPO, items: [...newPO.items, {...p, qty: poItem.qty}]}); } }} className="px-3 bg-slate-200 dark:bg-slate-600 rounded">+</button></div><ul className="text-sm space-y-1">{newPO.items.map((item, idx) => (<li key={idx} className="flex justify-between text-slate-600 dark:text-slate-400"><span>{item.name}</span><span>x{item.qty}</span></li>))}</ul></div><div className="flex gap-2"><button onClick={() => setShowPOModal(false)} className="flex-1 py-2 text-slate-500">Cancel</button><button onClick={handleCreatePO} className="flex-1 py-2 bg-purple-600 text-white rounded-lg">Place Order</button></div></div></div>)}
      </div>
   );
};

// 5. EXPENSES VIEW (RESTORED)
const ExpensesView = () => {
   const { user } = useContext(AuthContext);
   const { data: expenses } = useFirestoreCollection<Expense>('expenses', 'date');
   const [showModal, setShowModal] = useState(false);
   const [newExp, setNewExp] = useState({ description: '', amount: '', category: 'Operational', paymentMethod: 'Cash' });

   const handleAdd = async () => {
      if(!newExp.description || !newExp.amount) return;
      await addDoc(collection(db, 'expenses'), { ...newExp, amount: Number(newExp.amount), date: new Date().toISOString(), recordedBy: user?.email });
      setShowModal(false); setNewExp({ description: '', amount: '', category: 'Operational', paymentMethod: 'Cash' });
   };

   return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-red-50/30 dark:bg-red-900/10"><h2 className="text-red-800 dark:text-red-300 font-bold text-lg flex items-center gap-2"><Wallet className="w-5 h-5" /> Expenses</h2><button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 shadow-sm"><Plus className="w-4 h-4" /> New Expense</button></div>
         <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-600 dark:text-slate-400"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-slate-700"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Category</th><th className="px-6 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{expenses.map(exp => (<tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700"><td className="px-6 py-3">{new Date(exp.date).toLocaleDateString()}</td><td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{exp.description}</td><td className="px-6 py-3"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs">{exp.category}</span></td><td className="px-6 py-3 text-right font-medium text-red-600 dark:text-red-400">-₹{exp.amount}</td></tr>))}</tbody></table></div>
         {showModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md"><h3 className="text-lg font-bold mb-4 dark:text-white">Record Expense</h3><div className="space-y-3"><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="Description" value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} /><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="Amount" value={newExp.amount} onChange={e => setNewExp({...newExp, amount: e.target.value})} /></div><div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-500">Cancel</button><button onClick={handleAdd} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Save</button></div></div></div>)}
      </div>
   );
};

// 6. CUSTOMERS VIEW (RESTORED)
const CustomersView = () => {
   const { data: customers } = useFirestoreCollection<Customer>('customers', 'name');
   const [showModal, setShowModal] = useState(false);
   const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '' });

   const handleAdd = async () => {
      if(!newCust.name) return;
      await addDoc(collection(db, 'customers'), { ...newCust, totalSpent: 0, lastVisit: new Date().toISOString() });
      setShowModal(false); setNewCust({ name: '', phone: '', email: '', address: '' });
   };

   return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10"><h2 className="text-blue-800 dark:text-blue-300 font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Customers</h2><button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><UserPlus className="w-4 h-4" /> Add Customer</button></div>
         <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-600 dark:text-slate-400"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-slate-700"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Total Spent</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{customers.map(c => (<tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700"><td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td><td className="px-6 py-3">{c.phone}</td><td className="px-6 py-3 font-bold text-emerald-600">₹{c.totalSpent}</td></tr>))}</tbody></table></div>
         {showModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md"><h3 className="text-lg font-bold mb-4 dark:text-white">New Customer</h3><div className="space-y-3"><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="Name" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} /><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="Phone" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} /></div><div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-500">Cancel</button><button onClick={handleAdd} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Save</button></div></div></div>)}
      </div>
   );
};

// 7. SALES ORDERS VIEW (RESTORED)
const SalesOrdersView = () => {
   const { data: sales } = useFirestoreCollection<Sale>('sales', 'createdAt');
   return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center"><h2 className="text-slate-800 dark:text-white font-bold text-lg flex items-center gap-2"><History className="w-5 h-5" /> Sales History</h2></div>
         <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-600 dark:text-slate-400"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-slate-700"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{sales.map(s => (<tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700"><td className="px-6 py-3">{new Date(s.date).toLocaleDateString()}</td><td className="px-6 py-3">{s.customer}</td><td className="px-6 py-3 text-right font-bold text-emerald-600">₹{s.amount}</td></tr>))}</tbody></table></div>
      </div>
   );
};

// 8. DOCUMENTS VIEW (Updated)
const DocumentsView = () => {
   return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
         <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
             <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Inbox</h3>
                <div className="flex gap-2">
                   <button className="p-2 text-slate-500 hover:bg-slate-100 rounded"><RefreshCw className="w-4 h-4"/></button>
                   <button className="p-2 text-slate-500 hover:bg-slate-100 rounded"><Filter className="w-4 h-4"/></button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                   <Scan className="w-12 h-12 mb-2 opacity-50" />
                   <p>Drag & Drop documents here</p>
                   <p className="text-xs">or click to upload for Auto-Scan</p>
                </div>
                <div className="mt-4 space-y-2">
                   {[1,2,3].map(i => (
                      <div key={i} className="flex items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                         <FileText className="w-8 h-8 text-blue-500 mr-3" />
                         <div className="flex-1">
                            <p className="font-medium text-sm dark:text-white">Invoice_Oct_{i}.pdf</p>
                            <p className="text-xs text-slate-500">Uploaded just now • 2.4 MB</p>
                         </div>
                         <button className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Process</button>
                      </div>
                   ))}
                </div>
             </div>
         </div>
         <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-bold mb-4 dark:text-white">Document Autoscan</h3>
            <div className="bg-slate-900 rounded-lg p-4 h-64 flex items-center justify-center mb-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent animate-scan" style={{ top: '50%', height: '2px', boxShadow: '0 0 20px #a855f7' }}></div>
               <p className="text-slate-400 text-sm">Select a document to preview</p>
            </div>
            <div className="space-y-3">
               <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                  <h4 className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase mb-1">Extracted Data</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Waiting for selection...</p>
               </div>
               <button className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-sm font-medium">Create Transaction</button>
            </div>
         </div>
      </div>
   );
};

// 9. INTEGRATIONS VIEW
const IntegrationsView = () => {
   const integrations = [
      { name: 'Shopify', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50', status: 'Connected' },
      { name: 'Instagram Shop', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', status: 'Connect' },
      { name: 'Facebook Market', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', status: 'Connect' },
      { name: 'WooCommerce', icon: Store, color: 'text-purple-600', bg: 'bg-purple-50', status: 'Connect' }
   ];

   return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {integrations.map(app => (
            <div key={app.name} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
               <div className={`p-4 rounded-full ${app.bg} ${app.color} mb-4`}>
                  <app.icon className="w-8 h-8" />
               </div>
               <h3 className="font-bold text-lg dark:text-white mb-2">{app.name}</h3>
               <p className="text-xs text-slate-500 mb-6">Sync products, inventory and orders automatically.</p>
               <button className={`px-6 py-2 rounded-full text-sm font-medium ${app.status === 'Connected' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {app.status}
               </button>
            </div>
         ))}
      </div>
   );
};

// 10. SETUP GRID DASHBOARD
const SetupView = () => {
   const { user } = useContext(AuthContext);
   const sections = [
      { title: 'General Settings', icon: Settings, desc: 'Company profile, currency, timezone' },
      { title: 'Users & Roles', icon: Users, desc: 'Manage access and permissions' },
      { title: 'Data Administration', icon: Database, desc: 'Backup, restore, and import data' },
      { title: 'Security', icon: Lock, desc: 'Password policy, 2FA, session logs' },
      { title: 'Automation', icon: Zap, desc: 'Workflows and email triggers' },
      { title: 'Notifications', icon: Bell, desc: 'Alert preferences and channels' }
   ];

   return (
      <div className="space-y-8">
         <h2 className="text-2xl font-bold dark:text-white">Administration</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map(s => (
               <div key={s.title} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-center gap-4 mb-3">
                     <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg group-hover:scale-110 transition-transform"><s.icon className="w-6 h-6" /></div>
                     <h3 className="font-bold text-lg dark:text-white">{s.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
               </div>
            ))}
         </div>
      </div>
   );
};

// 11. DASHBOARD VIEW (RESTORED)
const DashboardView = ({ data }: { data: any }) => {
   const { products, sales } = data;
   const totalRev = sales.reduce((s:any, i:any) => s + i.amount, 0);
   const lowStock = products.filter((p:any) => p.stock < 5).length;
   
   // Chart Data
   const chartData = useMemo(() => {
     const map = new Map();
     sales.slice(-50).forEach((s:any) => {
        const d = new Date(s.date).toLocaleDateString(undefined, {weekday:'short'});
        map.set(d, (map.get(d) || 0) + s.amount);
     });
     return Array.from(map.entries()).map(([name, value]) => ({ name, value })).slice(-7);
   }, [sales]);

   return (
      <div className="space-y-6">
         <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
         {lowStock > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300">
               <AlertCircle className="w-5 h-5" />
               <span className="font-medium">Warning: {lowStock} items are low on stock!</span>
            </div>
         )}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <div className="flex justify-between mb-4"><div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"><DollarSign className="w-6 h-6" /></div></div>
               <p className="text-slate-500 text-sm font-medium">Total Revenue</p><p className="text-2xl font-bold dark:text-white mt-1">₹{totalRev.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <div className="flex justify-between mb-4"><div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500"><Package className="w-6 h-6" /></div></div>
               <p className="text-slate-500 text-sm font-medium">Total Products</p><p className="text-2xl font-bold dark:text-white mt-1">{products.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <div className="flex justify-between mb-4"><div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500"><TrendingUp className="w-6 h-6" /></div></div>
               <p className="text-slate-500 text-sm font-medium">Total Sales</p><p className="text-2xl font-bold dark:text-white mt-1">{sales.length}</p>
            </div>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm h-80">
               <h3 className="font-bold text-slate-800 dark:text-white mb-4">Sales Trend</h3>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                     <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                     <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                     <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                     <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm h-80 flex flex-col items-center justify-center">
                <PieChartIcon className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500">Category analytics pending data.</p>
            </div>
         </div>
      </div>
   );
};

// --- AI ASSISTANT COMPONENT (FIXED) ---

const AiAssistant = ({ dataContext }: { dataContext: any }) => {
   const [open, setOpen] = useState(false);
   const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([{role: 'model', text: 'Hi! I am Inara AI. Ask me about your sales, inventory, or draft a document.'}]);
   const [input, setInput] = useState('');
   const [thinking, setThinking] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

   const handleSend = async () => {
      if(!input.trim()) return;
      const userMsg = input;
      setMessages(p => [...p, { role: 'user', text: userMsg }]);
      setInput('');
      setThinking(true);

      try {
         // Construct Context
         const context = `
            You are Inara AI, an ERP assistant. 
            Current Data Context:
            - Total Products: ${dataContext.products.length}
            - Low Stock Items: ${dataContext.products.filter((p:any) => p.stock < 5).length}
            - Recent Sales: ${dataContext.sales.length} (Last 7 days)
            - Total Revenue: ₹${dataContext.sales.reduce((s:any, i:any) => s + i.amount, 0)}
            
            Answer the user's question concisely based on this data or general business knowledge.
         `;
         
         const response = await genAI.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: [
                 {
                     role: 'user',
                     parts: [{ text: context + "\n\nUser Question: " + userMsg }]
                 }
             ]
         });
         
         setMessages(p => [...p, { role: 'model', text: response.text || "I couldn't generate a response." }]);
      } catch (e) {
         console.error(e);
         setMessages(p => [...p, { role: 'model', text: "Sorry, I encountered an error connecting to the AI service." }]);
      } finally {
         setThinking(false);
      }
   };

   return (
      <>
         <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-105 transition-transform">
            {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
         </button>

         {open && (
            <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
               <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <Bot className="w-5 h-5" />
                     <span className="font-bold">Inara Assistant</span>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Gemini 3.0</span>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                  {messages.map((m, i) => (
                     <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm'}`}>
                           {m.text}
                        </div>
                     </div>
                  ))}
                  {thinking && <div className="flex justify-start"><div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none shadow-sm"><Loader2 className="w-4 h-4 animate-spin text-purple-600" /></div></div>}
                  <div ref={scrollRef} />
               </div>
               <div className="p-3 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex gap-2">
                  <input 
                     className="flex-1 bg-slate-100 dark:bg-slate-700 border-0 rounded-full px-4 text-sm focus:ring-2 focus:ring-purple-500 dark:text-white"
                     placeholder="Ask anything..."
                     value={input}
                     onChange={e => setInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSend()}
                  />
                  <button onClick={handleSend} className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"><Send className="w-4 h-4" /></button>
               </div>
            </div>
         )}
      </>
   );
};

// --- APP CONTENT ---

const AppContent = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  
  // Data Hooks
  const { data: products } = useFirestoreCollection<Product>('products');
  const { data: sales } = useFirestoreCollection<Sale>('sales');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Grouped Navigation
  const navGroups = [
     {
        title: 'Main',
        items: [
           { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
           { id: 'documents', label: 'Documents', icon: FileText },
        ]
     },
     {
        title: 'Inventory',
        items: [
           { id: 'items_list', label: 'Product List', icon: Package },
           { id: 'inventory_adj', label: 'Adjustments', icon: ClipboardList },
        ]
     },
     {
        title: 'Sales',
        items: [
           { id: 'billing', label: 'POS / Billing', icon: ShoppingCart },
           { id: 'sales_orders', label: 'Sales History', icon: History },
           { id: 'customers', label: 'Customers', icon: Users },
        ]
     },
     {
        title: 'Purchases',
        items: [
           { id: 'purchases', label: 'Orders & Vendors', icon: Truck },
           { id: 'expenses', label: 'Expenses', icon: Wallet },
        ]
     },
     {
        title: 'System',
        items: [
           { id: 'integrations', label: 'Integrations', icon: Layers },
           { id: 'settings', label: 'Settings', icon: Settings },
        ]
     }
  ];

  const renderView = () => {
     switch(currentView) {
        case 'dashboard': return <DashboardView data={{ products, sales }} />;
        case 'items_list': return <ItemsView products={products} />;
        case 'inventory_adj': return <InventoryAdjustmentsView products={products} />;
        case 'billing': return <BillingView products={products} />;
        case 'documents': return <DocumentsView />;
        case 'purchases': return <PurchasesView products={products} />;
        case 'expenses': return <ExpensesView />;
        case 'sales_orders': return <SalesOrdersView />;
        case 'customers': return <CustomersView />;
        case 'integrations': return <IntegrationsView />;
        case 'settings': return <SetupView />;
        default: return <ItemsView products={products} />;
     }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 font-sans">
       {/* SIDEBAR */}
      <aside className={`bg-[#1e1e2d] text-slate-300 flex flex-col h-screen border-r border-slate-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} no-print`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-800 shrink-0 bg-[#151521]">
          <LayoutGrid className="w-6 h-6 text-purple-500" />
          {sidebarOpen && <span className="ml-3 font-bold text-white tracking-wide text-lg">INARA</span>}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
           {navGroups.map((group, idx) => (
              <div key={idx}>
                 {sidebarOpen && <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.title}</div>}
                 <div className="space-y-1">
                    {group.items.map(item => (
                       <button 
                          key={item.id} 
                          onClick={() => setCurrentView(item.id)}
                          className={`w-full flex items-center px-3 py-2 rounded-lg transition-all group ${currentView === item.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
                       >
                          <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                          {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                       </button>
                    ))}
                 </div>
              </div>
           ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-[#151521]">
           <button onClick={logout} className="flex items-center w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 p-2 rounded-lg transition-colors">
              <LogOut className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
              {sidebarOpen && "Sign Out"}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm z-10 shrink-0 no-print">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Menu className="w-5 h-5 text-slate-500" /></button>
             
             {/* ORG SWITCHER */}
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold dark:text-white">Inara Designs - Kochi</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
             </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input placeholder="Global Search..." className="pl-9 pr-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 border-none text-sm focus:ring-2 focus:ring-purple-500 w-64" />
             </div>
             <button onClick={toggleTheme} className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-700 rounded-full transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                {user?.name?.substring(0,2).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900 relative">
          <div className="max-w-7xl mx-auto pb-20">
             {renderView()}
          </div>
        </div>

        {/* AI ASSISTANT FLOATING BUTTON */}
        <AiAssistant dataContext={{ products, sales }} />
      </main>
    </div>
  );
};

// --- APP ROOT ---

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthWrapper />
      </AuthProvider>
    </ThemeProvider>
  );
};

const AuthWrapper = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="w-10 h-10 text-purple-600 animate-spin" /></div>;
  if (!user) return <LoginScreen />;
  return <AppContent />;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);