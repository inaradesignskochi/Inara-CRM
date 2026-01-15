import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  LayoutGrid, 
  Users, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings, 
  Search, 
  Bell, 
  Menu, 
  X, 
  Plus, 
  Filter, 
  ArrowLeft,
  MessageSquare,
  Send,
  Sparkles,
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  Activity,
  Trash2,
  Save,
  Download,
  Store,
  Link as LinkIcon,
  LogOut,
  CreditCard,
  Facebook,
  Instagram,
  ChevronDown,
  ChevronRight,
  FileText,
  Truck,
  ClipboardList,
  Scan,
  Shield,
  Zap,
  Database,
  Globe,
  Mail
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// --- MOCK DATA & TYPES ---

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
  date: string;
  customer: string;
  amount: number;
  items: CartItem[];
  channel: string;
};

type User = {
  id: string;
  name: string;
  handle: string;
  role: 'Owner' | 'Admin' | 'Worker';
};

// Initial Data
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Jamdani print Pink', sku: 'SKU024', price: 3580, stock: 0, location: 'Indie-Loom', category: 'Saree' },
  { id: '2', name: 'organsa', sku: 'SKU009', price: 4500, stock: 1, location: 'Indie-Loom', category: 'Fabric' },
  { id: '3', name: 'Rayon top with Kalamkari print', sku: 'SKU003', price: 1500, stock: 1, location: 'Indie-Loom', category: 'Top' },
  { id: '4', name: 'Modal', sku: 'SKU015', price: 4900, stock: 0, location: 'Indie-Loom', category: 'Fabric' },
  { id: '5', name: 'crape', sku: 'SKU020', price: 2550, stock: 1, location: 'Indie-Loom', category: 'Fabric' },
  { id: '6', name: 'Saree-1', sku: 'INA 099', price: 2000, stock: 1, location: 'Inara-WareHouse', category: 'Saree' },
  { id: '7', name: 'Cotton', sku: 'SKU018', price: 2300, stock: 1, location: 'Indie-Loom', category: 'Fabric' },
  { id: '8', name: 'Kotta with lace work grey', sku: 'SKU016', price: 2700, stock: -1, location: 'Indie-Loom', category: 'Saree' },
  { id: '9', name: 'Kotta with thread work', sku: 'SKU010', price: 1550, stock: 1, location: 'Indie-Loom', category: 'Saree' },
  { id: '10', name: 'white', sku: 'SKU005', price: 3500, stock: 0, location: 'Indie-Loom', category: 'Fabric' },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: '1', date: '2026-01-07', description: 'Indee_Loom_MultiBrand_Rent', amount: 5900, category: 'Rent', assignedTo: 'Indie-Loom' },
  { id: '2', date: '2026-01-05', description: 'Electricity Bill', amount: 1200, category: 'Utilities', assignedTo: 'Indie-Loom' },
];

const INITIAL_SALES: Sale[] = [
  { id: '1', date: '2026-01-09', customer: 'Walk-in', amount: 1550, items: [], channel: 'Store' },
  { id: '2', date: '2026-01-09', customer: 'Walk-in', amount: 3500, items: [], channel: 'Store' },
  { id: '3', date: '2026-01-09', customer: 'AK', amount: 2500, items: [], channel: 'Store' },
  { id: '4', date: '2026-01-09', customer: 'Walk-in', amount: 4900, items: [], channel: 'Store' },
  { id: '5', date: '2026-01-07', customer: 'Cx_Inde_Loome', amount: 7250, items: [], channel: 'Store' },
];

const INITIAL_USERS: User[] = [
  { id: '1', name: 'EMP01', handle: '@emp01', role: 'Worker' },
  { id: '2', name: 'ADM01', handle: '@adm01', role: 'Admin' },
  { id: '3', name: 'Owner', handle: '@ak', role: 'Owner' },
];

// --- APP COMPONENT ---

const App = () => {
  // State
  const [currentView, setCurrentView] = useState('home');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentOrg, setCurrentOrg] = useState('INARA');

  // Computed Dashboard Stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const lowStockCount = products.filter(p => p.stock < 2).length;

  // --- SUB-COMPONENTS ---

  // 1. Sidebar Navigation
  const Sidebar = () => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
      'sales': true,
      'inventory': false,
      'purchases': false,
      'items': true,
    });

    const toggleGroup = (groupId: string) => {
      setExpandedGroups(prev => ({...prev, [groupId]: !prev[groupId]}));
    };

    const navItems = [
      { id: 'dashboard', label: 'Home', icon: LayoutGrid, color: 'text-purple-400', type: 'link' },
      { 
        id: 'items', label: 'Items', icon: Package, color: 'text-orange-400', type: 'group',
        children: [
          { id: 'items_list', label: 'Items' },
          { id: 'item_groups', label: 'Item Groups' },
        ]
      },
      { 
        id: 'inventory', label: 'Inventory', icon: ClipboardList, color: 'text-amber-400', type: 'group',
        children: [
          { id: 'inv_adjustments', label: 'Inventory Adjustments' },
          { id: 'inv_packages', label: 'Packages' },
          { id: 'inv_shipments', label: 'Shipments' },
        ]
      },
      { 
        id: 'sales', label: 'Sales', icon: ShoppingCart, color: 'text-emerald-400', type: 'group',
        children: [
          { id: 'billing', label: 'POS / Billing' },
          { id: 'sales_customers', label: 'Customers' },
          { id: 'sales_orders', label: 'Sales Orders' },
          { id: 'sales_invoices', label: 'Invoices' },
        ]
      },
      { 
        id: 'purchases', label: 'Purchases', icon: Truck, color: 'text-red-400', type: 'group',
        children: [
          { id: 'purchases_vendors', label: 'Vendors' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'purchases_orders', label: 'Purchase Orders' },
        ]
      },
      { id: 'documents', label: 'Documents', icon: FileText, color: 'text-gray-400', type: 'link' },
      { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-blue-400', type: 'link' },
      { id: 'integrations', label: 'Integrations', icon: LinkIcon, color: 'text-pink-400', type: 'link' },
      { id: 'settings', label: 'Setup', icon: Settings, color: 'text-gray-300', type: 'link' },
    ];

    return (
      <aside className={`bg-[#1e1e2d] text-gray-400 transition-all duration-300 flex flex-col h-screen overflow-y-auto ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-800 shrink-0">
          <button onClick={() => setCurrentView('home')} className="hover:text-white transition-colors">
             <LayoutGrid className="w-6 h-6" />
          </button>
          {sidebarOpen && <span className="ml-4 font-bold text-white tracking-wide">INARA DESIGNS</span>}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map((item) => {
            if (item.type === 'group' && sidebarOpen) {
              return (
                <div key={item.id} className="mb-2">
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center">
                      <item.icon className={`w-5 h-5 mr-3 ${item.color}`} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    {expandedGroups[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedGroups[item.id] && (
                    <div className="ml-9 space-y-1 mt-1 border-l border-gray-700 pl-2">
                      {item.children?.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setCurrentView(child.id)}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                            currentView === child.id ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // Link or collapsed view
            return (
              <button
                key={item.id}
                onClick={() => item.type === 'group' ? toggleGroup(item.id) : setCurrentView(item.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors group ${
                  currentView === item.id 
                    ? 'bg-white/10 text-white' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'} ${item.color}`} />
                {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 shrink-0">
          <button className="flex items-center w-full text-sm hover:text-white transition-colors">
             <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold mr-3">
               JD
             </div>
             {sidebarOpen && (
               <div className="text-left">
                 <p className="text-white font-medium">John Doe</p>
                 <p className="text-xs">Administrator</p>
               </div>
             )}
          </button>
        </div>
      </aside>
    );
  };

  // 2. Setup / Settings View (New Grid Layout)
  const SetupView = () => {
    const sections = [
      {
        title: "General",
        icon: Settings,
        links: ["Personal Settings", "Users", "Company Settings", "Calendar Booking", "Motivator"]
      },
      {
        title: "Security Control",
        icon: Shield,
        links: ["Profiles", "Roles and Sharing", "Zoho Mail Add-on Users", "Compliance Settings", "Territory Management", "Security Policies"]
      },
      {
        title: "Channels",
        icon: Mail,
        links: ["Email", "Telephony", "Business Messaging", "Notification SMS", "Webforms", "Social", "Chat", "Portals"]
      },
      {
        title: "Customization",
        icon: Zap,
        links: ["Modules and Fields", "Pipelines", "Wizards", "Kiosk Studio", "Canvas", "Customize Home page", "Templates"]
      },
      {
        title: "Automation",
        icon: Zap,
        links: ["Workflow Rules", "Actions", "Schedules", "Assignment", "Case Escalation Rules", "Scoring Rules"]
      },
      {
        title: "Data Administration",
        icon: Database,
        links: ["Import/Export", "Data Backup", "Storage", "Recycle Bin", "Audit Log"]
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Setup</h2>
          <div className="relative w-64">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search Setup" className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {sections.map((section, idx) => (
             <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
               <div className="flex items-center gap-2 mb-4">
                 <section.icon className="w-5 h-5 text-gray-600" />
                 <h3 className="font-bold text-gray-900">{section.title}</h3>
               </div>
               <ul className="space-y-2">
                 {section.links.map((link, i) => (
                   <li key={i} className="text-sm text-gray-500 hover:text-purple-600 cursor-pointer transition-colors">
                     {link}
                   </li>
                 ))}
               </ul>
             </div>
           ))}
        </div>
      </div>
    );
  };

  // 3. Documents View (Autoscan UI)
  const DocumentsView = () => {
    return (
      <div className="flex h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-6 text-gray-700 font-bold">
            <FileText className="w-5 h-5" /> Documents
          </div>
          <button className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium mb-4 hover:bg-purple-700">
            + Upload File
          </button>
          <div className="space-y-1">
            <div className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium cursor-pointer">Inbox</div>
            <div className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm cursor-pointer">All Documents</div>
            <div className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm cursor-pointer">Trash</div>
          </div>
          <div className="mt-8 text-xs font-semibold text-gray-400 uppercase">Folders</div>
          <div className="mt-2 text-sm text-gray-500 px-3">There are no folders.</div>
          <button className="text-purple-600 text-sm px-3 mt-2 hover:underline">Create New Folder</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-6 p-6 bg-gray-50 rounded-full border-2 border-dashed border-gray-300">
             <Scan className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Introducing Document Autoscan</h3>
          <p className="text-gray-500 max-w-md mb-6">
            Automatically capture data from your receipts and convert them into transactions in Inara Inventory.
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg max-w-lg text-left text-sm text-amber-800 mb-6">
            To continue using Inboxes, you need to accept the new Terms and Conditions. All the files that you've uploaded will still be available.
          </div>
          <button className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
            Enable Autoscan
          </button>
        </div>
      </div>
    );
  };

  // 4. Items View (Was Inventory Product List)
  const ItemsView = () => {
    const [newItem, setNewItem] = useState({ name: '', sku: '', qty: '', price: '', location: '' });

    const handleAddItem = () => {
      if (!newItem.name || !newItem.price) return;
      const product: Product = {
        id: Date.now().toString(),
        name: newItem.name,
        sku: newItem.sku || `SKU${Date.now()}`,
        stock: Number(newItem.qty) || 0,
        price: Number(newItem.price),
        location: newItem.location || 'Warehouse',
        category: 'General'
      };
      setProducts([product, ...products]);
      setNewItem({ name: '', sku: '', qty: '', price: '', location: '' });
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-orange-50/30">
          <h2 className="text-orange-800 font-bold text-lg flex items-center gap-2">
            <Package className="w-5 h-5" /> Items
          </h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 shadow-sm">
              <Download className="w-4 h-4" /> Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 shadow-sm">
              <Plus className="w-4 h-4" /> New Item
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
           <div className="relative max-w-lg">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search items..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-1 focus:ring-orange-500 outline-none" />
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-3 font-medium text-gray-900 group-hover:text-orange-600">{product.name}</td>
                  <td className="px-6 py-3 text-gray-500">{product.sku}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 border border-gray-200">{product.location}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`font-medium ${product.stock < 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                       {product.stock} Units
                    </span>
                  </td>
                  <td className="px-6 py-3">₹{product.price}</td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 5. Sales Order View
  const SalesOrderView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-emerald-50/30">
          <h2 className="text-emerald-800 font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Sales Orders
          </h2>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 shadow-sm">
             + New Order
          </button>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
           <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
           <p className="text-lg font-medium">No Sales Orders Yet</p>
           <p className="text-sm">Create a new sales order to get started.</p>
        </div>
    </div>
  );

  // 6. Purchases View
  const PurchasesView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-red-50/30">
          <h2 className="text-red-800 font-bold text-lg flex items-center gap-2">
            <Truck className="w-5 h-5" /> Purchase Orders
          </h2>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 shadow-sm">
             + New Purchase Order
          </button>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
           <Truck className="w-16 h-16 mb-4 text-gray-300" />
           <p className="text-lg font-medium">No Purchase Orders</p>
           <p className="text-sm">Manage your vendor orders here.</p>
        </div>
    </div>
  );

  // 7. Expenses View (Reused)
  const ExpensesView = () => {
    const [newExpense, setNewExpense] = useState({ desc: '', amt: '', cat: 'Rent', assign: '' });
    const handleAddExpense = () => {
      if(!newExpense.desc || !newExpense.amt) return;
      const expense: Expense = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        description: newExpense.desc,
        amount: Number(newExpense.amt),
        category: newExpense.cat,
        assignedTo: newExpense.assign || 'Indie-Loom'
      };
      setExpenses([expense, ...expenses]);
      setNewExpense({ desc: '', amt: '', cat: 'Rent', assign: '' });
    };

    return (
      <div className="space-y-6">
        <h2 className="text-red-600 font-bold text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Expenses
        </h2>
        
        {/* Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
               <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
               <input 
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500" 
                 value={newExpense.desc}
                 onChange={e => setNewExpense({...newExpense, desc: e.target.value})}
               />
             </div>
             <div>
               <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount</label>
               <input 
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500" 
                 type="number"
                 value={newExpense.amt}
                 onChange={e => setNewExpense({...newExpense, amt: e.target.value})}
               />
             </div>
             <div>
               <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
               <select 
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 bg-white"
                 value={newExpense.cat}
                 onChange={e => setNewExpense({...newExpense, cat: e.target.value})}
               >
                 <option>Rent</option>
                 <option>Utilities</option>
                 <option>Salary</option>
                 <option>Inventory</option>
               </select>
             </div>
             <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Assign to</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 bg-white"
                  value={newExpense.assign}
                  onChange={e => setNewExpense({...newExpense, assign: e.target.value})}
                >
                  <option value="">-- Select Entity --</option>
                  <option value="Indie-Loom">Indie-Loom</option>
                </select>
             </div>
           </div>
           <button 
             onClick={handleAddExpense}
             className="w-full py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm"
           >
             Save Expense
           </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Desc</th>
                <th className="px-6 py-3">Assigned</th>
                <th className="px-6 py-3 text-right">Amt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500">{exp.date}</td>
                  <td className="px-6 py-3">
                    {exp.description} <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded ml-2 border border-red-100">{exp.category}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{exp.assignedTo}</td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">₹{exp.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 8. Dashboard View (Reused)
  const DashboardView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Business Overview</p>
        </div>
        <div className="flex bg-white rounded-lg border border-gray-200 p-1 text-xs">
          {['Week', 'Month', 'Quarter', 'Year'].map(p => (
            <button key={p} className={`px-3 py-1 rounded ${p === 'Month' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', val: `₹${totalRevenue.toLocaleString()}`, sub: 'Gross Sales', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Low Stock Items', val: lowStockCount, sub: 'Needs Reorder', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Net Profit', val: `₹${netProfit.toLocaleString()}`, sub: 'Estimated', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Expenses', val: `₹${totalExpenses.toLocaleString()}`, sub: 'This Month', icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                 <stat.icon className="w-6 h-6" />
               </div>
             </div>
             <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
             <p className="text-2xl font-bold text-gray-900 mt-1">{stat.val}</p>
             <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" /> Sales Channels
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Store Walk-in</span>
                <span className="font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 w-full" />
              </div>
            </div>
            {['Instagram Shop', 'Facebook Marketplace', 'Website'].map(channel => (
              <div key={channel}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-500">{channel}</span>
                  <span className="font-bold text-gray-500">₹0</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-300 w-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {sales.slice(0, 5).map((sale, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CheckIcon />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.customer}</p>
                    <p className="text-xs text-gray-500">{sale.date} • via {sale.channel}</p>
                  </div>
                </div>
                <span className="font-semibold text-emerald-600">+₹{sale.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // 9. Billing / POS View (Reused)
  const BillingView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customerName, setCustomerName] = useState('');
    const addToCart = (product: Product) => {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
        }
        return [...prev, { ...product, qty: 1 }];
      });
    };
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const handleCompleteSale = () => {
      if (cart.length === 0) return;
      const newSale: Sale = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        customer: customerName || 'Walk-in',
        amount: cartTotal,
        items: [...cart],
        channel: 'Store'
      };
      setSales([newSale, ...sales]);
      setCart([]);
      setCustomerName('');
      alert('Sale Completed!');
    };
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div className="flex h-[calc(100vh-100px)] gap-6">
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <div className="relative w-full max-w-md">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Search products..." 
                 className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
             </div>
          </div>
          <div className="grid grid-cols-3 gap-4 overflow-y-auto pr-2 pb-20">
            {filteredProducts.map(product => (
              <div key={product.id} onClick={() => addToCart(product)} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group">
                <h3 className="font-medium text-gray-900 line-clamp-1 group-hover:text-emerald-700">{product.name}</h3>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">₹{product.price}</p>
                    <p className={`text-xs ${product.stock <= 0 ? 'text-red-500' : 'text-gray-500'}`}>Stock: {product.stock}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors"><Plus className="w-4 h-4" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-80 bg-white border border-gray-200 flex flex-col h-full rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-emerald-50/50">
            <h2 className="font-semibold text-emerald-800 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Current Order</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2"><ShoppingCart className="w-8 h-8 opacity-20" /><span>Cart is empty</span></div> : cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm pb-3 border-b border-gray-50 last:border-0">
                  <div><p className="font-medium text-gray-800">{item.name}</p><p className="text-gray-500 text-xs">{item.qty} x ₹{item.price}</p></div>
                  <p className="font-semibold text-gray-900">₹{item.price * item.qty}</p>
                </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
            <div className="flex justify-between items-center text-lg font-bold text-gray-900"><span>Total</span><span>₹{cartTotal}</span></div>
            <input type="text" placeholder="Customer Name (Optional)" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            <button onClick={handleCompleteSale} disabled={cart.length === 0} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">Complete Sale</button>
          </div>
        </div>
      </div>
    );
  };

  // Main Render View Logic
  const renderView = () => {
    switch(currentView) {
      // Top Level
      case 'dashboard': return <DashboardView />;
      case 'settings': return <SetupView />;
      case 'documents': return <DocumentsView />;
      
      // Items
      case 'items_list': return <ItemsView />;
      case 'item_groups': return <div className="p-10 text-center text-gray-500">Item Groups Module</div>;
      
      // Inventory
      case 'inv_adjustments': return <div className="p-10 text-center text-gray-500">Inventory Adjustments Module</div>;
      case 'inv_packages': return <div className="p-10 text-center text-gray-500">Packages Module</div>;
      
      // Sales
      case 'billing': return <BillingView />;
      case 'sales_orders': return <SalesOrderView />;
      case 'sales_customers': return <div className="p-10 text-center text-gray-500">Customers Module</div>;
      
      // Purchases
      case 'expenses': return <ExpensesView />;
      case 'purchases_orders': return <PurchasesView />;
      case 'purchases_vendors': return <div className="p-10 text-center text-gray-500">Vendors Module</div>;
      
      default: return <AppLauncher onSelectApp={(app) => setCurrentView(app === 'home' ? 'dashboard' : app)} />;
    }
  };

  // AI Context
  const getContextData = () => {
    return {
      currentView,
      totalRevenue,
      totalExpenses,
      recentSales: sales.slice(0, 5),
      inventorySummary: { count: products.length, lowStock: lowStockCount }
    };
  };

  if (currentView === 'home') {
    return <AppLauncher onSelectApp={(app) => setCurrentView(app === 'dashboard' ? 'dashboard' : app)} />;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
               {/* Organization Dropdown */}
               <div className="relative group cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                     <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                        {currentOrg.substring(0, 2)}
                     </div>
                     <span className="text-sm font-semibold text-gray-900">{currentOrg}</span>
                     <ChevronDown className="w-3 h-3 text-gray-500" />
                  </div>
                  {/* Dropdown Menu (Mock) */}
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 hidden group-hover:block p-2 z-50">
                     <div className="text-xs font-semibold text-gray-400 px-2 py-1">MY ORGANIZATIONS</div>
                     <div className="flex items-center gap-2 px-2 py-2 bg-purple-50 rounded text-purple-700 cursor-pointer">
                        <Store className="w-4 h-4" />
                        <span className="text-sm font-medium">INARA</span>
                     </div>
                     <div className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded text-gray-600 cursor-pointer mt-1">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">New Organization</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Search in INARA..." 
                 className="pl-9 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white focus:border-purple-500 focus:ring-0 rounded-full text-sm w-64 transition-all"
               />
            </div>
            <button className="relative text-gray-500 hover:text-purple-600">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="text-gray-500 hover:text-purple-600">
               <Settings className="w-5 h-5" onClick={() => setCurrentView('settings')} />
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">JD</div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="max-w-7xl mx-auto min-h-full pb-20">
            {renderView()}
          </div>
        </div>

        <AIAssistant contextData={getContextData()} />
      </main>
    </div>
  );
};

// --- REUSED COMPONENTS ---

const AppLauncher = ({ onSelectApp }: { onSelectApp: (app: string) => void }) => {
  const apps = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, color: 'bg-purple-600' },
    { id: 'billing', name: 'Sales & POS', icon: ShoppingCart, color: 'bg-emerald-600' },
    { id: 'items_list', name: 'Items', icon: Package, color: 'bg-orange-600' },
    { id: 'expenses', name: 'Expenses', icon: DollarSign, color: 'bg-red-600' },
    { id: 'reports', name: 'Reports', icon: Sparkles, color: 'bg-blue-600' },
    { id: 'documents', name: 'Documents', icon: FileText, color: 'bg-gray-600' },
    { id: 'settings', name: 'Setup', icon: Settings, color: 'bg-slate-700' },
  ];

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="min-h-screen bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">INARA DESIGNS</h1>
          <p className="text-white/80">Enterprise Resource Planning</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl w-full">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => onSelectApp(app.id)}
              className="group flex flex-col items-center justify-center p-6 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all duration-200 backdrop-blur-md"
            >
              <div className={`p-4 rounded-lg ${app.color} shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                <app.icon className="w-8 h-8 text-white" />
              </div>
              <span className="text-white font-medium text-lg">{app.name}</span>
            </button>
          ))}
        </div>
        
        <div className="mt-16 text-white/60 text-sm">
          Powered by Gemini 3.0 • v17.0.0
        </div>
      </div>
    </div>
  );
};

const AIAssistant = ({ contextData }: { contextData: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Hello! I am Inara AI. How can I help you analyze your data today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        You are an intelligent ERP assistant for "Inara Designs" (Satika ERP).
        Current Context Data: ${JSON.stringify(contextData)}
        User Query: ${userMsg}
        Provide a concise, professional business insight.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "No response generated." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center gap-2"
      >
        <Sparkles className="w-6 h-6" />
        {isOpen ? 'Close AI' : 'Ask AI'}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Inara AI Assistant
            </h3>
            <button onClick={() => setIsOpen(false)}><X className="w-5 h-5 opacity-80 hover:opacity-100" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-purple-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about sales, leads..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Check Icon Helper
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
