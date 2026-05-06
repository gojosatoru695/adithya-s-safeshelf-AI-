import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  Scan, 
  BellRing, 
  RefreshCcw, 
  LayoutDashboard, 
  LineChart as LineChartIcon, 
  Menu, 
  X, 
  ArrowRight, 
  Plus,
  Package,
  Calendar,
  Camera,
  LogOut,
  Clock,
  Trash2,
  AlertTriangle,
  Search,
  Globe,
  Mic,
  Settings,
  Bell,
  Activity,
  History,
  CheckCircle2,
  Smartphone,
  ChevronDown,
  FileText,
  Share2,
  Mail,
  MessageCircle,
  FileStack,
  Download,
  AlertCircle,
  BrainCircuit,
  Sparkles,
  TrendingUp,
  DollarSign,
  Bot,
  ShoppingCart,
  ShieldAlert,
  User as UserIcon,
  Zap,
  BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { auth } from './lib/firebase.ts';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { apiService, Notification as ApiNotification } from './services/apiService.ts';
import { calculateSmartRefillScores, SmartRefillRecommendation } from './lib/smartPlanner.ts';
import { geminiService, RiskAnalysis, RefillSuggestion } from './services/geminiService.ts';
import { inventoryService } from './services/inventoryService.ts';
import { OCRScanner } from './components/OCRScanner.tsx';
import { RefillCenter } from './components/RefillCenter.tsx';
import { AssistantHub } from './components/AssistantHub.tsx';
import { CompareHub } from './components/CompareHub.tsx';
import { AlertsTab } from './components/AlertsTab.tsx';
import { QuantisAnalytics } from './components/QuantisAnalytics.tsx';
import { ReminderMonitor } from './components/ReminderMonitor.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { DosageCalendar } from './components/DosageCalendar.tsx';
import { InventoryDashboard } from './components/InventoryDashboard.tsx';
import { VoiceCommandControl } from './components/VoiceCommandControl.tsx';
import { classifyItem } from './services/categorizationService.ts';
import { Timestamp } from 'firebase/firestore';
import { userService } from './services/userService.ts';
import { LoginPage } from './components/Auth/LoginPage.tsx';
import { SignUpPage } from './components/Auth/SignUpPage.tsx';
import { Onboarding } from './components/Auth/Onboarding.tsx';
import { MedicineModal } from './components/MedicineModal.tsx';
import type { Category, Medicine, UserProfile, DoseLog } from './types.ts';

// --- Types ---
type TabType = 'overview' | 'inventory' | 'history' | 'settings' | 'reports' | 'planner' | 'compare' | 'alerts' | 'assistant';

// --- Components ---

const SmartPlannerTab = ({ medicines }: { medicines: Medicine[] }) => {
  const [budget, setBudget] = useState(500);
  const [recommendations, setRecommendations] = useState<SmartRefillRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    // Artificially wait a bit to simulate "thinking"
    await new Promise(r => setTimeout(r, 800));
    try {
      const data = calculateSmartRefillScores(medicines, budget);
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="max-w-xl">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                <BrainCircuit size={14} /> AI Recommendation Engine Active
             </div>
             <h2 className="text-4xl font-display font-bold mb-6">Smart Refill Planner</h2>
             <p className="text-slate-400 text-lg leading-relaxed mb-8">
               Our lightweight ML model calculates the optimal time to refill your items based on consumption speed, budget limits, and expiry risks.
             </p>
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative flex-1">
                   <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                   <input 
                     type="number" 
                     value={budget}
                     onChange={(e) => setBudget(Number(e.target.value))}
                     placeholder="Monthly Budget" 
                     className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                   />
                </div>
                <button 
                  onClick={fetchRecommendations}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />} Calculate Plan
                </button>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:w-80">
             <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Confidence</p>
                <p className="text-2xl font-bold">94%</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Wait Time</p>
                <p className="text-2xl font-bold">~2s</p>
             </div>
             <div className="col-span-2 bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Algorithm</p>
                <p className="text-sm font-medium text-slate-300">Weighted Multi-Factor Prioritization Model v1.2</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
               <TrendingUp size={24} className="text-blue-500" /> Prioritized Refill List
            </h3>
            
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-24 w-full skeleton rounded-3xl" />)}
              </div>
            ) : recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <motion.div 
                  key={rec.itemId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center gap-6"
                >
                  <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-xl font-bold ${
                    rec.score > 80 ? 'bg-red-50 text-red-500' : rec.score > 50 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
                  }`}>
                    {rec.score}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                       <h4 className="font-bold text-slate-900">{rec.name}</h4>
                       <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-400 uppercase tracking-widest">{rec.category}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{rec.reason}</p>
                  </div>
                  <div className="grid grid-cols-2 md:flex items-center gap-6 md:gap-10">
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Depot</p>
                       <p className="text-sm font-bold text-slate-700">{rec.depletionDays} Days left</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit Price</p>
                       <p className="text-sm font-bold text-slate-700">${rec.price}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confidence</span>
                          <span className="text-[9px] font-bold text-blue-500">{rec.confidence}%</span>
                       </div>
                       <div className="w-24 h-1 bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rec.confidence}%` }}></div>
                       </div>
                    </div>
                    <button className="col-span-2 md:col-span-1 px-6 py-2.5 bg-slate-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all group-hover:bg-blue-600 group-hover:text-white">
                       Order Now
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-50 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                 <Package size={48} className="text-slate-200 mx-auto mb-4" />
                 <p className="text-slate-400 font-bold">No critical refills suggested. Your stock levels are healthy.</p>
              </div>
            )}
         </div>

         <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
               <h4 className="font-bold text-slate-900 mb-6">Model Insights</h4>
               <div className="space-y-6">
                  <div className="flex gap-4">
                     <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <LineChartIcon size={16} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-800 mb-1">Dynamic Scoring</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Adjusting weights based on your consumption patterns over the last 30 days.</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                        <AlertTriangle size={16} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-800 mb-1">Expiry Overrides</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Items expiring within 7 days receive a +30 boost to their score regardless of budget.</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                        <DollarSign size={16} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-800 mb-1">Budget Optimization</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Current plan maximizes utility while staying 15% below your set budget.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white">
               <div className="flex items-center gap-2 mb-6">
                  <Sparkles size={18} className="text-blue-400" />
                  <h4 className="font-bold text-sm">Smart Suggestion</h4>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed mb-6">
                 Based on your current inventory, we suggest bundling your pharmaceutical refills with grocery items next Tuesday to optimize shipping costs.
               </p>
               <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-bold transition-all">
                  VIEW BUNDLE PLAN
               </button>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

const ManualEntryForm = ({ onClose, onSave }: { onClose: () => void, onSave: (data: any) => Promise<void> }) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'units',
    expiryDate: '',
    usagePerDay: 1,
    category: 'other',
    price: 0,
    batchNumber: '',
    manufacturer: '',
    storageNotes: ''
  });

  const calculateConfidence = (data: typeof formData) => {
    let score = 100;
    if (!data.name) score -= 20;
    if (!data.expiryDate) score -= 20;
    if (!data.batchNumber) score -= 10;
    if (!data.manufacturer) score -= 10;
    if (!data.price) score -= 5;
    return Math.max(0, score);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expiry = new Date(formData.expiryDate);
    const autoCategory = await classifyItem(formData.name);
    
    await onSave({
      name: formData.name,
      dosage: 'Standard',
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      unit: formData.unit,
      usagePerDay: Number(formData.usagePerDay),
      type: formData.category !== 'other' ? formData.category : autoCategory,
      riskScore: 0,
      confidence: calculateConfidence(formData),
      expiryDate: Timestamp.fromDate(expiry),
      status: 'active',
      batchNumber: formData.batchNumber,
      manufacturer: formData.manufacturer,
      storageNotes: formData.storageNotes,
      batchRecallAlert: false
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-900 rounded-[2rem] p-8 text-white overflow-hidden"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold">Manual Inventory Entry</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Confidence Score: {calculateConfidence(formData)}%</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Name</label>
          <input 
            required
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-all outline-none" 
            placeholder="e.g., Amoxicillin" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
          <select 
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
          >
            <option value="other" className="text-slate-900">Auto-detect</option>
            <option value="medicine" className="text-slate-900">Medicine</option>
            <option value="grocery" className="text-slate-900">Grocery</option>
            <option value="cleaning" className="text-slate-900">Cleaning</option>
            <option value="personal-care" className="text-slate-900">Personal Care</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batch Number</label>
            <input 
              type="text" 
              value={formData.batchNumber}
              onChange={e => setFormData({...formData, batchNumber: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" 
              placeholder="LOT-123456"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manufacturer</label>
            <input 
              type="text" 
              value={formData.manufacturer}
              onChange={e => setFormData({...formData, manufacturer: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" 
              placeholder="e.g., Pfizer"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</label>
            <input 
              required
              type="number" 
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiry Date</label>
            <input 
              required
              type="date" 
              value={formData.expiryDate}
              onChange={e => setFormData({...formData, expiryDate: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" 
            />
          </div>
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Storage Safety Notes</label>
          <input 
            type="text" 
            value={formData.storageNotes}
            onChange={e => setFormData({...formData, storageNotes: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" 
            placeholder="e.g., Keep refrigerated, Avoid direct sunlight"
          />
        </div>
        <div className="md:col-span-2 pt-4">
          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20">
            Securely Add to Inventory
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="dashboard-card p-6 flex items-center gap-4">
        <div className="w-12 h-12 skeleton rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 skeleton" />
          <div className="h-3 w-1/4 skeleton" />
        </div>
        <div className="w-20 h-6 skeleton rounded-full" />
      </div>
    ))}
  </div>
);

const ReportsTab = ({ medicines, aiMode = 'astra' }: { medicines: Medicine[], aiMode?: 'astra' | 'quantis' }) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [schedule, setSchedule] = useState('none');
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  const isQuantis = aiMode === 'quantis';

  // Sample data for charts based on medicines
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    medicines.forEach(m => {
      counts[m.type] = (counts[m.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [medicines]);

  const spendData = useMemo(() => {
    // Generate some trend data
    return [
      { name: 'Jan', value: 450 },
      { name: 'Feb', value: 380 },
      { name: 'Mar', value: 520 },
      { name: 'Apr', value: 410 },
      { name: 'May', value: 490 },
      { name: 'Jun', value: 550 },
    ];
  }, []);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  useEffect(() => {
    fetchHistory();
    fetchUserSchedule();
  }, []);

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/reports/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReportHistory(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const fetchUserSchedule = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSchedule(data.report_interval || 'none');
    } catch (err) {
      console.error('Failed to fetch schedule', err);
    }
  };

  const handleUpdateSchedule = async (newInterval: string) => {
    setIsUpdatingSchedule(true);
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ interval: newInterval })
      });
      setSchedule(newInterval);
    } catch (err) {
      alert('Failed to update schedule');
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const downloadHistorical = async (reportId: number) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/reports/download/${reportId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SafeShelf_Archived_Report_${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (medicines.length === 0) {
      alert('No data available to export. Please add items to your vault first.');
      return;
    }
    
    setIsGenerating(format);
    try {
      const response = await fetch(`/api/reports/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: medicines, format })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Report generation failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SafeShelf_Report_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Refresh history after generation
      setTimeout(fetchHistory, 1000);
    } catch (err: any) {
      console.error(err);
      alert(`Report Failed: ${err.message}`);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Visual Analytics - Quantis exclusive style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <BarChart2 className="text-blue-600" size={18} /> Category Composition
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" size={18} /> {isQuantis ? 'Monthly Spend & Savings' : 'Usage Trends'}
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={spendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="max-w-2xl">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <FileText size={32} />
              </div>
              <h3 className="text-2xl font-display font-bold text-slate-900 mb-4">Inventory Data Export</h3>
              <p className="text-slate-500 mb-10 text-lg leading-relaxed">
                Generate detailed audit-ready reports of your medical vault. Our system will analyze your current stock, categories, and risks to compile a comprehensive document.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => handleDownload('excel')}
                  disabled={!!isGenerating}
                  className="flex items-center justify-between p-8 bg-emerald-50 text-emerald-700 rounded-[2rem] border-2 border-emerald-100/50 hover:bg-emerald-100 transition-all group"
                >
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600/60 mb-2">Spreadsheet</p>
                    <p className="text-xl font-bold">Excel (.xlsx)</p>
                    <p className="text-xs mt-1 text-emerald-600/80">Data analysis ready</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    {isGenerating === 'excel' ? <RefreshCcw size={20} className="animate-spin" /> : <Download size={20} />}
                  </div>
                </button>

                <button 
                  onClick={() => handleDownload('pdf')}
                  disabled={!!isGenerating}
                  className="flex items-center justify-between p-8 bg-red-50 text-red-700 rounded-[2rem] border-2 border-red-100/50 hover:bg-red-100 transition-all group"
                >
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-600/60 mb-2">Print Ready</p>
                    <p className="text-xl font-bold">Audit PDF</p>
                    <p className="text-xs mt-1 text-red-600/80">Formal document</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                    {isGenerating === 'pdf' ? <RefreshCcw size={20} className="animate-spin" /> : <Download size={20} />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <History size={24} className="text-slate-400" /> Report History
            </h4>
            <div className="space-y-4">
              {reportHistory.length > 0 ? (
                reportHistory.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400">
                        {report.file_type === 'pdf' ? <FileText size={18} /> : <FileStack size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Archive_{report.id}.{report.file_type}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{new Date(report.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => downloadHistorical(report.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm font-medium">No archived reports found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Clock size={24} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Automated Insights</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Schedule recurring audits to stay ahead of risks and stockouts.
            </p>

            <div className="space-y-3">
              {['none', 'daily', 'weekly', 'monthly'].map((int) => (
                <button
                  key={int}
                  onClick={() => handleUpdateSchedule(int)}
                  disabled={isUpdatingSchedule}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all ${
                    schedule === int 
                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="capitalize font-bold text-sm">{int}</span>
                  {schedule === int && <CheckCircle2 size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-card p-8 border-l-4 border-l-amber-500">
             <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-amber-500" size={20} />
                <p className="text-sm font-bold text-slate-800">Pro Tip</p>
             </div>
             <p className="text-xs text-slate-500 leading-relaxed font-medium">
               Weekly audits are recommended for high-traffic vaults to maintain 100% compliance score.
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const UserProfileComponent = ({ user, profile, onLogout }: { user: User, profile: UserProfile | null, onLogout: () => void }) => (
  <div className="flex items-center gap-3 pl-2 pr-2 py-1.5 hover:bg-slate-50 rounded-full transition-colors group relative cursor-pointer">
    {user.photoURL ? (
      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
        {profile?.fullName?.charAt(0) || user.displayName?.charAt(0) || 'U'}
      </div>
    )}
    <div className="hidden sm:block text-left">
      <p className="text-xs font-bold text-slate-700 leading-none mb-0.5">{profile?.fullName?.split(' ')[0] || user.displayName?.split(' ')[0] || 'User'}</p>
      <p className="text-[10px] text-slate-400 font-medium">{profile?.role || 'Basic User'}</p>
    </div>
    <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
    
    {/* Dropdown Menu */}
    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-[#e6ebf1] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-50 mb-1">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Account ID</p>
         <p className="text-[10px] font-mono text-slate-500 truncate">{user.uid}</p>
      </div>
      <button className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
         <UserIcon size={14} /> View Vault Profile
      </button>
      <button className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
         <Settings size={14} /> Vault Access
      </button>
      <div className="h-px bg-slate-50 my-2"></div>
      <button 
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
      >
         <LogOut size={14} /> Secure Sign Out
      </button>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [refills, setRefills] = useState<RefillSuggestion[]>([]);
  const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]);
  const [activeTab, setActiveTab ] = useState<TabType>('overview');
  const [aiMode, setAiMode] = useState<'astra' | 'quantis'>('astra');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState<'menu' | 'chat' | 'voice' | 'settings'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'expiring' | 'high-risk' | 'out-of-stock'>('all');
  const [inventorySort, setInventorySort] = useState<'expiry' | 'risk' | 'quantity'>('expiry');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date());
  const [isPremium, setIsPremium] = useState(false);

  const fetchMedicinesAndLogs = async () => {
    try {
      const data = await inventoryService.getMedicines();
      setMedicines(data);
      const doseLogs = await inventoryService.getDoseLogs();
      setLogs(doseLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeDose = async (med: Medicine, slot: string) => {
    await inventoryService.logDose(med.id!, med.name, 'taken', slot);
    await fetchMedicinesAndLogs();
  };

  const handleVoiceCommand = (command: string, args?: any) => {
    switch (command) {
      case 'add':
        if (args?.item_name) {
          // Pre-fill modal with voice entities
          const mockMed: any = {
            name: args.item_name,
            quantity: args.quantity || 1,
            unit: args.unit || 'Tablets',
            type: args.category || 'Medicine'
          };
          setSelectedMedicine(mockMed);
          setIsMedicineModalOpen(true);
        } else {
          setIsScannerOpen(true);
        }
        break;
      case 'search':
        setSearchQuery(args || '');
        setActiveTab('inventory');
        break;
      case 'filter':
        setInventoryFilter(args);
        setActiveTab('inventory');
        break;
      case 'tab':
        setActiveTab(args as any);
        break;
      case 'action':
        if (args === 'SCAN') setIsScannerOpen(true);
        break;
      default:
        console.log('Voice Command Received:', command, args);
    }
  };

  // Update system time every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Notification engine
  useEffect(() => {
    medicines.forEach(med => {
      const status = getDisplayStatus(med);
      if (status.label === 'Expired') {
        const lastNotified = localStorage.getItem(`notified_expired_${med.id}`);
        if (!lastNotified) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("SafeShelf Alert", {
              body: `Item ${med.name} has expired.`,
              icon: '/vite.svg'
            });
            localStorage.setItem(`notified_expired_${med.id}`, new Date().toISOString());
          }
        }
      }
    });
  }, [medicines, systemTime]);

  const filteredMedicines = useMemo(() => {
    let result = medicines.filter(med => 
      med.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply Filter
    if (inventoryFilter === 'expiring') {
      result = result.filter(med => {
        const d = med.expiryDate && (med.expiryDate as any).seconds 
          ? new Date((med.expiryDate as any).seconds * 1000)
          : new Date(med.expiryDate as unknown as string);
        const diff = d.getTime() - systemTime.getTime();
        return diff > 0 && diff < (1000 * 60 * 60 * 24 * 7); // 7 days
      });
    } else if (inventoryFilter === 'high-risk') {
      result = result.filter(med => med.riskScore > 75);
    } else if (inventoryFilter === 'out-of-stock') {
      result = result.filter(med => med.quantity <= 0);
    }

    // Apply Sort
    result.sort((a, b) => {
      if (inventorySort === 'expiry') {
        const dA = a.expiryDate && (a.expiryDate as any).seconds ? (a.expiryDate as any).seconds : new Date(a.expiryDate as unknown as string).getTime() / 1000;
        const dB = b.expiryDate && (b.expiryDate as any).seconds ? (b.expiryDate as any).seconds : new Date(b.expiryDate as unknown as string).getTime() / 1000;
        return dA - dB;
      } else if (inventorySort === 'risk') {
        return (b.riskScore || 0) - (a.riskScore || 0);
      } else if (inventorySort === 'quantity') {
        return a.quantity - b.quantity;
      }
      return 0;
    });

    return result;
  }, [medicines, searchQuery, inventoryFilter, inventorySort, systemTime]);

  // Listeners
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const profile = await userService.getProfile(u.uid);
          setUserProfile(profile);
          await fetchMedicinesAndLogs();
          // Auto-switch to dashboard if profile exists
          if (profile) setAuthMode('login'); 
        } catch (e) {
          console.error("Error fetching profile", e);
        }
      } else {
        setUserProfile(null);
        setMedicines([]);
        setLogs([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Guard for voice search and other actions
  useEffect(() => {
    if (selectedMedicine && !isMedicineModalOpen) {
      setIsMedicineModalOpen(true);
    }
  }, [selectedMedicine]);

  const closeMedicineModal = () => {
    setIsMedicineModalOpen(false);
    setSelectedMedicine(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await userService.getProfile(user.uid);
      setUserProfile(profile);
    }
  };

  // Real-time Inventory Subscription
  useEffect(() => {
    if (user) {
      const unsubscribe = inventoryService.subscribeToUserMedicines(user.uid, (data) => {
        setMedicines(data);
      });

      // Initial notification fetch
      apiService.getNotifications(user.uid).then(setApiNotifications).catch(console.error);

      return () => unsubscribe();
    }
  }, [user]);

  const lastAnalysisRef = useRef<string>('');

  // AI Analysis triggered by inventory changes
  useEffect(() => {
    if (user && medicines.length > 0) {
      const performAnalysis = async () => {
        // Create a simple fingerprint of current medicines to check for real changes
        const fingerprint = JSON.stringify(medicines.map(m => ({ id: m.id, q: m.quantity, e: m.expiryDate })));
        if (fingerprint === lastAnalysisRef.current) return;
        
        try {
          const [risk, suggestions] = await Promise.all([
            geminiService.analyzeRisk(medicines),
            geminiService.getRefillSuggestions(medicines)
          ]);
          setRiskAnalysis(risk);
          setRefills(suggestions);
          lastAnalysisRef.current = fingerprint;
        } catch (e) {
          console.error("AI Analysis failed", e);
        }
      };

      const timeout = setTimeout(performAnalysis, 5000); // Increased debounce to 5s
      return () => clearTimeout(timeout);
    }
  }, [user, medicines]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check for expired items periodically
    const checkExpiredItems = () => {
      const now = new Date();
      const expiredItems = medicines.filter(m => {
        const expiry = m.expiryDate instanceof Timestamp ? m.expiryDate.toDate() : new Date(m.expiryDate);
        return expiry < now;
      });

      if (expiredItems.length > 0 && Notification.permission === 'granted') {
        new Notification("Inventory Alert", {
          body: `${expiredItems.length} items have expired and need urgent attention.`,
          icon: "/vite.svg"
        });
      }
    };

    const interval = setInterval(checkExpiredItems, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [medicines]);

  // --- Astra Voice Reminders ---
  // Replaced by ReminderMonitor component for better multilingual and scheduled support
  
  const getDisplayStatus = (medicine: Medicine) => {
    // Backend returns data with seconds if it's a Timestamp-like object from Firestore
    let expiryDate: Date;
    try {
      if (medicine.expiryDate && (medicine.expiryDate as any).seconds) {
        expiryDate = new Date((medicine.expiryDate as any).seconds * 1000);
      } else if (medicine.expiryDate instanceof Date) {
        expiryDate = medicine.expiryDate;
      } else if (medicine.expiryDate) {
        expiryDate = new Date(medicine.expiryDate as unknown as string);
      } else {
        expiryDate = new Date(systemTime.getTime() + 1000 * 60 * 60 * 24 * 365); // Default to 1 year away if missing
      }
      
      // Check if date is valid
      if (isNaN(expiryDate.getTime())) {
        expiryDate = systemTime;
      }
    } catch (e) {
      expiryDate = systemTime;
    }
      
    const diffTime = expiryDate.getTime() - systemTime.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: 'Expired', color: 'bg-red-500', textColor: 'text-red-500', bg: 'bg-red-50', pulse: true };
    if (diffDays <= 7) return { label: 'Expiring Soon', color: 'bg-amber-500', textColor: 'text-amber-600', bg: 'bg-amber-50', pulse: false };
    return { label: 'Active', color: 'bg-emerald-500', textColor: 'text-emerald-500', bg: 'bg-slate-50', pulse: false };
  };

  const stats = useMemo(() => {
    const expired = medicines.filter(m => getDisplayStatus(m).label === 'Expired').length;
    const soon = medicines.filter(m => getDisplayStatus(m).label === 'Expiring Soon').length;
    return { total: medicines.length, expired, soon };
  }, [medicines, systemTime]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Initializing Secure Shelf AI...</p>
        </div>
      </div>
    );
  }

  // Auth Flow
  if (!user) {
    return (
      <AnimatePresence mode="wait">
        {authMode === 'login' ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginPage 
              onSignUpClick={() => setAuthMode('signup')} 
              onLoginSuccess={() => {}} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="signup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SignUpPage 
              onSignInClick={() => setAuthMode('login')} 
              onSignUpSuccess={() => setAuthMode('login')} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Onboarding Flow
  if (user && userProfile && !userProfile.onboardingCompleted) {
    return <Onboarding uid={user.uid} onComplete={refreshProfile} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* --- Top Bar --- */}
      <nav className="top-bar">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck size={18} />
            </div>
            <span className="text-lg font-display font-bold tracking-tight hidden lg:block">SafeShelf</span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-2xl relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search inventory, labels, or dosage records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-[#e6ebf1] rounded-xl py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 shrink-0">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
               <Globe size={20} />
            </button>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative"
            >
               <Bell size={20} />
               {stats.expired + stats.soon > 0 && (
                 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
               )}
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>
            {user && (
               <UserProfileComponent user={user} profile={userProfile} onLogout={handleLogout} />
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-10">
        {userProfile && (
          <ReminderMonitor 
            medicines={medicines} 
            logs={logs}
            language={userProfile.preferredLanguage || 'English'} 
            onRefresh={fetchMedicinesAndLogs}
            elderlyMode={userProfile.role === 'Elderly User'}
          />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-3 space-y-6">
              <div className="dashboard-card p-4">
                <nav className="space-y-1">
                  {[
                    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                    { id: 'inventory', icon: Package, label: 'My Inventory' },
                    { id: 'assistant', icon: Bot, label: 'AI Assistant' },
                    { id: 'compare', icon: ShoppingCart, label: 'Compare Prices' },
                    { id: 'planner', icon: BrainCircuit, label: 'Refill Planner' },
                    { id: 'reports', icon: FileText, label: 'Reports' },
                    { id: 'alerts', icon: ShieldAlert, label: 'Safety Alerts' },
                    { id: 'settings', icon: Settings, label: 'Vault Settings' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as TabType)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Model Switcher: Astra vs Quantis */}
              <div className="dashboard-card p-6 bg-slate-900 text-white border-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-10 -mt-10 rounded-full group-hover:bg-blue-600/20 transition-all"></div>
                <div className="flex items-center gap-3 mb-6 relative">
                   <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                      <Sparkles size={16} />
                   </div>
                   <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Intelligence</p>
                    <p className="text-sm font-display font-bold text-white capitalize">{aiMode} Core</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-3 relative">
                   <button 
                    onClick={() => setAiMode('astra')}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                      aiMode === 'astra' 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/10' 
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                   >
                     <div className="text-left">
                       <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Astra</p>
                       <p className="text-[10px] font-medium opacity-60">Conversational Help</p>
                     </div>
                     {aiMode === 'astra' && <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>}
                   </button>
                   <button 
                    onClick={() => setAiMode('quantis')}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                      aiMode === 'quantis' 
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-500/10' 
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                   >
                     <div className="text-left">
                       <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Quantis</p>
                       <p className="text-[10px] font-medium opacity-60">Analytical Optimization</p>
                     </div>
                     {aiMode === 'quantis' && <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>}
                   </button>
                </div>
              </div>
            </div>

            {/* --- Main Dashboard --- */}
            <div className="lg:col-span-9 space-y-8">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">Welcome back, {userProfile?.fullName?.split(' ')[0] || user.displayName?.split(' ')[0] || 'User'}</h2>
                  <p className="text-slate-400 text-sm font-medium">Your household is looking stable today.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsManualAddOpen(true)}
                    className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Manual Entry
                  </button>
                  <button 
                    onClick={() => setIsScannerOpen(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={18} /> New Label Scan
                  </button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[
                   { label: 'Active Items', val: stats.total - stats.expired, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                   { label: 'Expiring Soon', val: stats.soon, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                   { label: 'Action Required', val: stats.expired, icon: BellRing, color: 'text-red-600', bg: 'bg-red-50' },
                 ].map((stat, i) => (
                   <div key={i} className="dashboard-card p-6 flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-display font-bold text-slate-900">{stat.val}</p>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Main Content Areas based on Tab */}
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-10"
                  >
                    {/* Integrated Scheduler Dashboard */}
                    <DashboardView 
                      medicines={medicines} 
                      logs={logs} 
                      onTakeDose={handleTakeDose}
                      onOpenCalendar={() => setIsCalendarOpen(true)}
                      elderlyMode={userProfile?.role === 'Elderly User'}
                    />

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Smart Refill System */}
                      <div className="xl:col-span-2">
                        <RefillCenter medicines={medicines} isPremium={isPremium} aiMode={aiMode} />
                      </div>

                      {aiMode === 'quantis' && (
                        <div className="xl:col-span-2">
                          <QuantisAnalytics medicines={medicines} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}                {activeTab === 'inventory' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <InventoryDashboard 
                      items={medicines}
                      onRefresh={fetchMedicinesAndLogs}
                      onEdit={(item) => setSelectedMedicine(item)}
                      onScan={() => setIsScannerOpen(true)}
                      elderlyMode={userProfile?.role === 'Elderly User'}
                    />
                  </motion.div>
                )}

                {activeTab === 'reports' && (
                  <ReportsTab medicines={medicines} aiMode={aiMode} />
                )}

                {activeTab === 'planner' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="dashboard-card p-10">
                      <RefillCenter medicines={medicines} isPremium={isPremium} aiMode={aiMode} />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'compare' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <CompareHub aiMode={aiMode} />
                  </motion.div>
                )}

                {activeTab === 'alerts' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AlertsTab medicines={medicines} aiMode={aiMode} />
                  </motion.div>
                )}

                {activeTab === 'assistant' && (
                  <div className="h-[75vh] bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col items-center justify-center p-10 text-center">
                    <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                      <Bot size={48} />
                    </div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">The AI Hub is active.</h2>
                    <p className="text-slate-500 max-w-md mb-10 text-lg leading-relaxed">
                      Use the floating assistant bubble in the bottom right to chat, use voice commands, or switch between assistant modes.
                    </p>
                    <div className="flex gap-4">
                       <button 
                        onClick={() => { setIsAssistantOpen(true); setAssistantMode('chat'); }}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:scale-105 transition-all cursor-pointer"
                       >
                        Chat with AI
                       </button>
                       <button 
                        onClick={() => { setIsAssistantOpen(true); setAssistantMode('voice'); }}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:scale-105 transition-all cursor-pointer"
                       >
                        Voice Control
                       </button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
      </main>

      {/* --- Unified AI Hub --- */}
      {user && (
        <AssistantHub 
          medicines={medicines} 
          onCommand={handleVoiceCommand} 
          isOpen={isAssistantOpen}
          setIsOpen={setIsAssistantOpen}
          mode={assistantMode}
          setMode={setAssistantMode}
          aiMode={aiMode}
          setAiMode={setAiMode}
          language={userProfile?.preferredLanguage || 'English'}
          onRefresh={fetchMedicinesAndLogs}
        />
      )}

      {/* --- Notification Drawer --- */}
      <AnimatePresence>
        {isScannerOpen && (
          <OCRScanner 
            onClose={() => setIsScannerOpen(false)}
            onSave={async (data) => {
              await inventoryService.addMedicine(data);
              setIsScannerOpen(false);
            }}
            aiMode={aiMode}
            elderlyMode={userProfile?.role === 'Elderly User'}
          />
        )}
        {isCalendarOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 rounded-[3rem] shadow-3xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Health Ledger</h3>
                  <p className="text-sm font-bold text-slate-400">1-Week Progress Snapshot</p>
                </div>
                <button 
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-12 h-12 bg-white text-slate-400 hover:text-slate-900 rounded-2xl flex items-center justify-center shadow-sm transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <DosageCalendar medicines={medicines} logs={logs} />
              
              <div className="mt-8 p-6 bg-blue-600 rounded-3xl text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Elysia Insight</p>
                    <p className="text-xs opacity-80 leading-relaxed">
                      Maintaining a 90% or higher adherence score significantly reduces your health risks. 
                      You're doing great this week!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isNotificationsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationsOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-2 bottom-2 right-2 w-full max-w-sm bg-white rounded-3xl shadow-3xl z-[70] p-8 border border-[#e6ebf1] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold font-display text-slate-900">Notifications</h3>
                <button onClick={() => setIsNotificationsOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                {apiNotifications.map(notif => (
                  <div key={notif.id} className={`p-5 rounded-2xl flex gap-4 ${
                    notif.type === 'warning' ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      notif.type === 'warning' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {notif.type === 'warning' ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold mb-1 ${notif.type === 'warning' ? 'text-red-900' : 'text-blue-900'}`}>
                        {notif.type === 'warning' ? 'Safety Alert' : 'System Update'}
                      </p>
                      <p className={`text-xs leading-relaxed ${notif.type === 'warning' ? 'text-red-600' : 'text-blue-600'}`}>
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}

                {apiNotifications.length === 0 && (
                  <div className="text-center py-20">
                     <Bell size={48} className="text-slate-100 mx-auto mb-4" />
                     <p className="text-sm font-bold text-slate-400">All caught up!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {userProfile && (
        <MedicineModal
          isOpen={isMedicineModalOpen || isManualAddOpen}
          onClose={() => { closeMedicineModal(); setIsManualAddOpen(false); }}
          onSave={fetchMedicinesAndLogs}
          medicine={selectedMedicine}
          language={userProfile.preferredLanguage || 'English'}
        />
      )}

      <footer className="py-8 bg-[#f6f9fc] border-t border-[#e6ebf1]">
         <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-4">
               <span>SafeShelf Secure AI v2.4</span>
               <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
               <span>HIPAA Compliant Vault</span>
            </div>
            <div className="flex items-center gap-8">
               <button className="hover:text-blue-600 transition-colors">Privacy Protocol</button>
               <button className="hover:text-blue-600 transition-colors">Node Status</button>
               <button className="hover:text-blue-600 transition-colors">Contact Support</button>
            </div>
         </div>
      </footer>
    </div>
  );
}
