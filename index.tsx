import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, 
  query, orderBy, limit, where, serverTimestamp, writeBatch, Timestamp, getDoc, setDoc 
} from "firebase/firestore";
import { 
  LayoutGrid, Users, ShoppingCart, Package, BarChart3, Settings, Search, Bell, Menu, X, Plus, 
  Filter, ArrowLeft, MessageSquare, Send, Sparkles, MoreHorizontal, DollarSign, TrendingUp, 
  Activity, Trash2, Save, Download, Store, Link as LinkIcon, LogOut, CreditCard, Facebook, 
  Instagram, ChevronDown, ChevronRight, FileText, Truck, ClipboardList, Scan, Shield, Zap, 
  Database, Globe, Mail, Moon, Sun, Lock, Loader2, AlertCircle, Printer, History, CheckCircle, Upload
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
  assignedTo: string;
};

type Sale = {
  id: string;
  date: string; // ISO string
  createdAt?: any;
  customer: string;
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
             // First time login setup
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
          // Fallback
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: 'User',
            role: 'Worker'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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

// --- AUTH COMPONENTS ---

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err: any) {
      setError("Login failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">INARA DESIGNS</h1>
          <p className="text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>
        
        {error && (
           <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm rounded-lg flex items-center gap-2">
             <AlertCircle className="w-4 h-4" /> {error}
           </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
          >
            Sign In
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400">
           Enter your registered INARA DESIGNS credentials.
        </div>
      </div>
    </div>
  );
};

// --- CUSTOM HOOKS ---

function useFirestoreCollection<T>(collectionName: string, orderField?: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, collectionName));
    if (orderField) {
      q = query(collection(db, collectionName), orderBy(orderField, 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
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

const ItemsView = ({ products }: { products: Product[] }) => {
  const { user } = useContext(AuthContext);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', sku: '', price: '', stock: '', category: 'General' });
  
  // Bulk Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) return;
    try {
      await addDoc(collection(db, 'products'), {
        name: newItem.name,
        sku: newItem.sku,
        price: Number(newItem.price),
        stock: Number(newItem.stock),
        category: newItem.category,
        location: 'Warehouse'
      });
      await logAudit(user, 'CREATE_ITEM', `Created item ${newItem.name}`);
      setShowAddModal(false);
      setNewItem({ name: '', sku: '', price: '', stock: '', category: 'General' });
    } catch (e) {
      console.error("Error adding item: ", e);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (user?.role === 'Worker') return alert("Access Denied");
    if (confirm(`Delete ${name}?`)) {
      await deleteDoc(doc(db, 'products', id));
      await logAudit(user, 'DELETE_ITEM', `Deleted item ${name}`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      await processCSV(text);
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const processCSV = async (csvText: string) => {
    setImporting(true);
    try {
      const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
      if (lines.length < 2) {
        alert("CSV file is empty or invalid format.");
        setImporting(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      // Basic validation: check if expected headers exist
      const expected = ['name', 'sku', 'price', 'stock', 'category'];
      const hasHeaders = expected.every(h => headers.includes(h));
      
      if (!hasHeaders) {
        alert(`Invalid CSV format. Expected headers: ${expected.join(', ')}`);
        setImporting(false);
        return;
      }

      const itemsToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;

        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = values[index];
        });
        
        // Data cleaning
        itemsToImport.push({
          name: item.name,
          sku: item.sku,
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          category: item.category || 'General',
          location: 'Warehouse'
        });
      }

      setImportProgress({ processed: 0, total: itemsToImport.length });

      // Firestore Batch Write (Max 500 operations per batch)
      const batchSize = 450;
      for (let i = 0; i < itemsToImport.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = itemsToImport.slice(i, i + batchSize);
        
        chunk.forEach(item => {
          const ref = doc(collection(db, 'products'));
          batch.set(ref, item);
        });

        await batch.commit();
        setImportProgress(prev => ({ ...prev, processed: Math.min(prev.total, i + batchSize) }));
      }

      await logAudit(user, 'BULK_IMPORT', `Imported ${itemsToImport.length} items from CSV`);
      alert("Bulk import successful!");

    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed. Check console for details.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-orange-50/30 dark:bg-orange-900/10">
        <h2 className="text-orange-800 dark:text-orange-300 font-bold text-lg flex items-center gap-2">
          <Package className="w-5 h-5" /> Items ({products.length})
        </h2>
        {user?.role !== 'Worker' && (
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv"
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Item
            </button>
          </div>
        )}
      </div>
      
      {/* Import Progress Modal */}
      {importing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl flex flex-col items-center">
             <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Importing Items...</h3>
             <p className="text-slate-500 dark:text-slate-400">Processed {importProgress.processed} of {importProgress.total}</p>
             <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${(importProgress.processed / Math.max(importProgress.total, 1)) * 100}%` }}
                />
             </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Add New Item</h3>
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
                    <option>Top</option>
                 </select>
              </div>
              <div className="flex gap-3 mt-6">
                 <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                 <button onClick={handleAddItem} className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Save</button>
              </div>
           </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">SKU</th>
              <th className="px-6 py-3">Stock</th>
              <th className="px-6 py-3">Rate</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                <td className="px-6 py-3 font-medium text-slate-900 dark:text-white group-hover:text-orange-600">{product.name}</td>
                <td className="px-6 py-3">{product.sku}</td>
                <td className="px-6 py-3">
                   <span className={`font-medium px-2 py-1 rounded text-xs ${product.stock < 5 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                     {product.stock} Units
                   </span>
                </td>
                <td className="px-6 py-3">₹{product.price}</td>
                <td className="px-6 py-3 text-right">
                  {user?.role !== 'Worker' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(product.id, product.name); }} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BillingView = ({ products }: { products: Product[] }) => {
  const { user } = useContext(AuthContext);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastInvoice, setLastInvoice] = useState<Sale | null>(null);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert("Item out of stock!");
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
           alert("Cannot add more than available stock");
           return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
     setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    
    const saleData = {
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      customer: customerName || 'Walk-in',
      amount: cartTotal,
      items: cart,
      channel: 'Store'
    };

    try {
      // 1. Write Sale
      const saleRef = await addDoc(collection(db, 'sales'), saleData);
      
      // 2. Update Inventory (Atomic)
      const batch = writeBatch(db);
      cart.forEach(item => {
         const productRef = doc(db, 'products', item.id);
         const newStock = Math.max(0, item.stock - item.qty);
         batch.update(productRef, { stock: newStock });
      });
      await batch.commit();

      // 3. Log
      await logAudit(user, 'SALE', `Sold ₹${cartTotal} to ${saleData.customer}`);

      // 4. Reset & Print
      setLastInvoice({ ...saleData, id: saleRef.id } as Sale);
      setCart([]);
      setCustomerName('');
      
      // Trigger Print after short delay
      setTimeout(() => window.print(), 500);

    } catch (e) {
      console.error("Sale failed", e);
      alert("Transaction failed. Check console.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 no-print">
      <div className="flex-1 flex flex-col">
         {/* Search */}
         <div className="relative mb-6">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products for billing..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
         </div>
         
         {/* Product Grid */}
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20">
            {filteredProducts.map(product => (
               <div 
                 key={product.id} 
                 onClick={() => addToCart(product)}
                 className={`bg-white dark:bg-slate-800 p-4 rounded-xl border transition-all cursor-pointer group ${
                    product.stock <= 0 
                      ? 'opacity-50 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md'
                 }`}
               >
                  <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">{product.name}</h3>
                  <div className="flex justify-between items-end mt-2">
                     <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">₹{product.price}</p>
                        <p className={`text-xs ${product.stock < 5 ? 'text-red-500' : 'text-slate-500'}`}>{product.stock} left</p>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col h-full rounded-xl shadow-lg overflow-hidden">
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10">
            <h2 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
               <ShoppingCart className="w-4 h-4" /> Current Sale
            </h2>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <ShoppingCart className="w-12 h-12 opacity-20" />
                  <span className="text-sm">Cart is empty</span>
               </div>
            ) : (
               cart.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-sm pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 group">
                     <div>
                        <p className="font-medium text-slate-800 dark:text-white">{item.name}</p>
                        <p className="text-slate-500 text-xs">{item.qty} x ₹{item.price}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <p className="font-semibold text-slate-900 dark:text-white">₹{item.price * item.qty}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                           <X className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               ))
            )}
         </div>
         
         <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 space-y-4">
            <div className="flex justify-between items-center text-lg font-bold text-slate-900 dark:text-white">
               <span>Total</span>
               <span>₹{cartTotal.toLocaleString()}</span>
            </div>
            <input 
               type="text" 
               placeholder="Customer Name (Optional)" 
               className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
               value={customerName}
               onChange={e => setCustomerName(e.target.value)}
            />
            <button 
               onClick={handleCompleteSale}
               disabled={cart.length === 0}
               className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
               <Printer className="w-4 h-4" /> Complete & Print
            </button>
         </div>
      </div>
      
      {/* Hidden Invoice Template for Print */}
      {lastInvoice && (
        <div id="invoice-print-area" className="hidden">
           <div className="p-8 max-w-2xl mx-auto border border-gray-200 mt-10">
              <div className="text-center mb-8">
                 <h1 className="text-3xl font-bold mb-2">INARA DESIGNS</h1>
                 <p className="text-gray-500">Invoice #{lastInvoice.id.slice(0,8).toUpperCase()}</p>
                 <p className="text-sm text-gray-500">{new Date(lastInvoice.date).toLocaleString()}</p>
              </div>
              <div className="mb-8">
                 <p><strong>Customer:</strong> {lastInvoice.customer}</p>
              </div>
              <table className="w-full text-left mb-8 border-collapse">
                 <thead>
                    <tr className="border-b border-gray-300">
                       <th className="py-2">Item</th>
                       <th className="py-2 text-right">Qty</th>
                       <th className="py-2 text-right">Price</th>
                       <th className="py-2 text-right">Total</th>
                    </tr>
                 </thead>
                 <tbody>
                    {lastInvoice.items.map((item, i) => (
                       <tr key={i} className="border-b border-gray-100">
                          <td className="py-2">{item.name}</td>
                          <td className="py-2 text-right">{item.qty}</td>
                          <td className="py-2 text-right">₹{item.price}</td>
                          <td className="py-2 text-right">₹{item.price * item.qty}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              <div className="text-right text-xl font-bold">
                 Total: ₹{lastInvoice.amount}
              </div>
              <div className="mt-12 text-center text-sm text-gray-400">
                 Thank you for shopping with Inara Designs!
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SalesOrdersView = () => {
   const { data: sales, loading } = useFirestoreCollection<Sale>('sales', 'createdAt');
   
   if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" /></div>;

   return (
     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
           <h2 className="text-slate-800 dark:text-white font-bold text-lg flex items-center gap-2">
              <History className="w-5 h-5" /> Sales History
           </h2>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-slate-700">
                 <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Invoice ID</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                 {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                       <td className="px-6 py-3">{new Date(sale.date).toLocaleDateString()}</td>
                       <td className="px-6 py-3 font-mono text-xs">{sale.id.slice(0,8).toUpperCase()}</td>
                       <td className="px-6 py-3">{sale.customer}</td>
                       <td className="px-6 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">₹{sale.amount}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     </div>
   );
};

// --- NEW MODULE: PURCHASES & VENDORS ---

const PurchasesView = ({ products }: { products: Product[] }) => {
  const { user } = useContext(AuthContext);
  const { data: vendors } = useFirestoreCollection<Vendor>('vendors');
  const { data: orders } = useFirestoreCollection<PurchaseOrder>('purchase_orders', 'createdAt');
  
  const [activeTab, setActiveTab] = useState<'orders' | 'vendors'>('orders');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  
  // New Vendor State
  const [newVendor, setNewVendor] = useState({ name: '', email: '', phone: '' });

  // New PO State
  const [newPO, setNewPO] = useState<{ vendorId: string, items: CartItem[] }>({ vendorId: '', items: [] });
  const [poItem, setPOItem] = useState<{ productId: string, qty: number }>({ productId: '', qty: 1 });

  const handleAddVendor = async () => {
    if(!newVendor.name) return;
    await addDoc(collection(db, 'vendors'), newVendor);
    setShowVendorModal(false);
    setNewVendor({ name: '', email: '', phone: '' });
  };

  const handleAddItemToPO = () => {
     if(!poItem.productId || poItem.qty < 1) return;
     const product = products.find(p => p.id === poItem.productId);
     if(!product) return;
     
     setNewPO(prev => ({
        ...prev,
        items: [...prev.items, { ...product, qty: poItem.qty }]
     }));
  };

  const handleCreatePO = async () => {
     if(!newPO.vendorId || newPO.items.length === 0) return;
     const vendor = vendors.find(v => v.id === newPO.vendorId);
     
     const total = newPO.items.reduce((sum, item) => sum + (item.price * item.qty), 0); // Assuming cost price same as sell price for demo

     await addDoc(collection(db, 'purchase_orders'), {
        vendorId: newPO.vendorId,
        vendorName: vendor?.name || 'Unknown',
        items: newPO.items,
        status: 'Ordered',
        total,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
     });

     setShowPOModal(false);
     setNewPO({ vendorId: '', items: [] });
     await logAudit(user, 'CREATE_PO', `Created PO for ${vendor?.name}`);
  };

  const handleReceivePO = async (order: PurchaseOrder) => {
     if(order.status !== 'Ordered') return;
     
     const batch = writeBatch(db);
     
     // Update Stock
     order.items.forEach(item => {
        const productRef = doc(db, 'products', item.id);
        // We need to fetch current stock to safely increment? 
        // For simplicity in batch, we can assume products state is relatively fresh or use increment()
        // but here we used full batch writes in billing, let's just increment based on known logic.
        // Actually, best practice is increment from field value.
        // But since we are inside a react component with `products` prop updating live:
        const currentProd = products.find(p => p.id === item.id);
        if(currentProd) {
           batch.update(productRef, { stock: currentProd.stock + item.qty });
        }
     });

     // Update PO Status
     const poRef = doc(db, 'purchase_orders', order.id);
     batch.update(poRef, { status: 'Received' });

     await batch.commit();
     await logAudit(user, 'RECEIVE_PO', `Received goods for PO ${order.id.slice(0,6)}`);
  };

  return (
     <div className="space-y-6">
        {/* Header Tabs */}
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
           <button onClick={() => setActiveTab('orders')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'orders' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}>Purchase Orders</button>
           <button onClick={() => setActiveTab('vendors')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'vendors' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}>Vendors</button>
        </div>

        {activeTab === 'vendors' ? (
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex justify-between mb-4">
                 <h2 className="font-bold text-lg dark:text-white">Suppliers</h2>
                 <button onClick={() => setShowVendorModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Add Vendor</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {vendors.map(v => (
                    <div key={v.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                       <h3 className="font-bold dark:text-white">{v.name}</h3>
                       <p className="text-sm text-slate-500">{v.email}</p>
                       <p className="text-sm text-slate-500">{v.phone}</p>
                    </div>
                 ))}
              </div>
           </div>
        ) : (
           <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold dark:text-white">Orders</h2>
                  <button onClick={() => setShowPOModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">+ New Order</button>
               </div>
               
               <div className="space-y-3">
                  {orders.map(order => (
                     <div key={order.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div>
                           <div className="flex items-center gap-2">
                              <span className="font-bold dark:text-white">{order.vendorName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span>
                           </div>
                           <p className="text-xs text-slate-500 mt-1">{new Date(order.date).toLocaleDateString()} • {order.items.length} Items</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="font-bold dark:text-white">₹{order.total}</span>
                           {order.status === 'Ordered' && (
                              <button onClick={() => handleReceivePO(order)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Receive Goods">
                                 <CheckCircle className="w-5 h-5" />
                              </button>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
           </div>
        )}

        {/* VENDOR MODAL */}
        {showVendorModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
                 <h3 className="font-bold mb-4 dark:text-white">Add Vendor</h3>
                 <input className="w-full mb-3 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Name" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                 <input className="w-full mb-3 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Email" value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} />
                 <input className="w-full mb-4 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Phone" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} />
                 <div className="flex gap-2">
                    <button onClick={() => setShowVendorModal(false)} className="flex-1 py-2 text-slate-500">Cancel</button>
                    <button onClick={handleAddVendor} className="flex-1 py-2 bg-purple-600 text-white rounded-lg">Save</button>
                 </div>
              </div>
           </div>
        )}

        {/* PO MODAL */}
        {showPOModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-lg shadow-2xl">
                 <h3 className="font-bold mb-4 dark:text-white">Create Purchase Order</h3>
                 
                 <select className="w-full mb-4 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={newPO.vendorId} onChange={e => setNewPO({...newPO, vendorId: e.target.value})}>
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>

                 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-4">
                    <div className="flex gap-2 mb-2">
                       <select className="flex-1 p-2 border rounded text-sm dark:bg-slate-700 dark:text-white" value={poItem.productId} onChange={e => setPOItem({...poItem, productId: e.target.value})}>
                          <option value="">Select Item</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                       <input type="number" className="w-20 p-2 border rounded text-sm dark:bg-slate-700 dark:text-white" value={poItem.qty} onChange={e => setPOItem({...poItem, qty: Number(e.target.value)})} />
                       <button onClick={handleAddItemToPO} className="px-3 bg-slate-200 dark:bg-slate-600 rounded">+</button>
                    </div>
                    <ul className="text-sm space-y-1">
                       {newPO.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between text-slate-600 dark:text-slate-400">
                             <span>{item.name}</span>
                             <span>x{item.qty}</span>
                          </li>
                       ))}
                    </ul>
                 </div>

                 <div className="flex gap-2">
                    <button onClick={() => setShowPOModal(false)} className="flex-1 py-2 text-slate-500">Cancel</button>
                    <button onClick={handleCreatePO} className="flex-1 py-2 bg-purple-600 text-white rounded-lg">Place Order</button>
                 </div>
              </div>
           </div>
        )}
     </div>
  );
};

const SetupView = () => {
   const { user } = useContext(AuthContext);
   const { data: audits } = useFirestoreCollection<AuditLog>('audit_logs', 'timestamp');
   const { data: users } = useFirestoreCollection<AppUser>('users');

   // Seed Data Function
   const seedData = async () => {
      if(!confirm("This will add sample data to your database. Continue?")) return;
      const batch = writeBatch(db);
      
      const products = [
         { name: 'Jamdani Saree', sku: 'SKU001', price: 3500, stock: 10, category: 'Saree' },
         { name: 'Cotton Fabric', sku: 'SKU002', price: 500, stock: 50, category: 'Fabric' },
         { name: 'Silk Kurti', sku: 'SKU003', price: 1200, stock: 3, category: 'Top' }
      ];

      products.forEach(p => {
         const ref = doc(collection(db, 'products'));
         batch.set(ref, { ...p, location: 'Store' });
      });

      await batch.commit();
      await logAudit(user, 'SEED_DATA', 'Populated sample data');
      alert("Data seeded successfully!");
   };

   const updateUserRole = async (userId: string, newRole: Role) => {
      if(user?.role !== 'Owner') return alert("Only Owners can change roles.");
      await updateDoc(doc(db, 'users', userId), { role: newRole });
   };

   return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Setup & Administration</h2>
          <button onClick={seedData} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors">
             Initialize Demo Data
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* USER MANAGEMENT */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
             <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> User Management
             </h3>
             <div className="overflow-y-auto max-h-64 space-y-3">
                {users.map(u => (
                   <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div>
                         <p className="font-medium text-sm dark:text-white">{u.name}</p>
                         <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      <select 
                         value={u.role} 
                         onChange={(e) => updateUserRole(u.id, e.target.value as Role)}
                         className="text-xs p-1 border rounded bg-white dark:bg-slate-800 dark:text-white"
                         disabled={user?.role !== 'Owner' || u.id === user.id}
                      >
                         <option value="Worker">Worker</option>
                         <option value="Admin">Admin</option>
                         <option value="Owner">Owner</option>
                      </select>
                   </div>
                ))}
             </div>
          </div>

          {/* AUDIT LOGS */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
             <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" /> Audit Logs
             </h3>
             <div className="h-64 overflow-y-auto space-y-3 pr-2">
                {audits.map(log => (
                   <div key={log.id} className="text-sm p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between mb-1">
                         <span className="font-bold text-slate-700 dark:text-slate-300">{log.action}</span>
                         <span className="text-xs text-slate-400">
                            {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                         </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{log.details}</p>
                      <p className="text-xs text-purple-500">User: {log.user}</p>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
   );
};

// --- MAIN APP LOGIC ---

const AppContent = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  
  // Real-time Data Hooks
  const { data: products, loading: pLoading } = useFirestoreCollection<Product>('products');
  const { data: sales, loading: sLoading } = useFirestoreCollection<Sale>('sales');
  
  // State
  const [currentView, setCurrentView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');

  // Computed Stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  const Sidebar = () => {
    const navItems = [
      { id: 'dashboard', label: 'Home', icon: LayoutGrid, allowed: true },
      { id: 'items_list', label: 'Items', icon: Package, allowed: true },
      { id: 'billing', label: 'POS / Billing', icon: ShoppingCart, allowed: true },
      { id: 'sales_orders', label: 'Sales History', icon: History, allowed: true },
      { id: 'purchases', label: 'Purchases', icon: Truck, allowed: user?.role !== 'Worker' }, // NEW
      { id: 'documents', label: 'Documents', icon: FileText, allowed: true },
      { id: 'settings', label: 'Setup', icon: Settings, allowed: user?.role === 'Owner' || user?.role === 'Admin' },
    ];

    return (
      <aside className={`bg-[#1e1e2d] text-gray-400 flex flex-col h-screen border-r border-gray-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} no-print`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-800 shrink-0">
          <LayoutGrid className="w-6 h-6 text-purple-500" />
          {sidebarOpen && <span className="ml-4 font-bold text-white tracking-wide">INARA</span>}
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.filter(i => i.allowed).map((item) => (
            <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors group ${currentView === item.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
              <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
              {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 shrink-0">
           <button onClick={logout} className="flex items-center w-full text-sm text-red-400 hover:text-red-300">
              <LogOut className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
              {sidebarOpen && "Sign Out"}
           </button>
        </div>
      </aside>
    );
  };

  const DashboardView = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      
      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300 animate-pulse">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Warning: {lowStockCount} items are low on stock! Check Inventory.</span>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Revenue', val: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Products', val: products.length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Total Sales', val: sales.length, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
             </div>
             <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
             <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.val}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <DashboardView />;
      case 'settings': return <SetupView />;
      case 'items_list': return <ItemsView products={products} />;
      case 'billing': return <BillingView products={products} />;
      case 'sales_orders': return <SalesOrdersView />;
      case 'purchases': return <PurchasesView products={products} />;
      case 'documents': return <div className="p-10 text-center dark:text-white">Document Management System</div>;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm z-10 shrink-0 no-print">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="w-5 h-5 text-slate-500" /></button>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={toggleTheme} className="text-slate-500 hover:text-purple-600">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-purple-700 dark:text-purple-200 font-bold text-xs">
                {user?.name?.substring(0,2).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="max-w-7xl mx-auto min-h-full pb-20">
            {pLoading || sLoading ? (
               <div className="flex justify-center pt-20"><Loader2 className="w-10 h-10 animate-spin text-purple-600" /></div>
            ) : renderView()}
          </div>
        </div>
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