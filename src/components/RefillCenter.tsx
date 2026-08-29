import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Zap, 
  Clock, 
  Package, 
  ExternalLink, 
  ArrowRight, 
  CheckCircle2, 
  TrendingDown, 
  BarChart2, 
  AlertCircle,
  TrendingUp,
  Tag,
  ShieldCheck,
  Truck,
  Star,
  ChevronDown,
  BellRing,
  MoreVertical,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Medicine } from '../types.ts';
import { refillService, RefillPrediction, Deal } from '../services/refillService.ts';

interface RefillCenterProps {
  medicines: Medicine[];
  isPremium?: boolean;
  aiMode?: 'astra' | 'quantis';
}

export const RefillCenter = ({ medicines, isPremium = false, aiMode = 'astra' }: RefillCenterProps) => {
  const isQuantis = aiMode === 'quantis';
  const allPredictions = useMemo(() => refillService.getAllPredictions(medicines), [medicines]);
  
  const [isQueueDashboardOpen, setIsQueueDashboardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<RefillPrediction | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [showScheduler, setShowScheduler] = useState<string | null>(null);
  
  const timeoutRefs = useRef<number[]>([]);

  // Budget stats
  const budgetStats = useMemo(() => {
    const lowStock = allPredictions.filter(p => p.isLowStock || p.status !== 'stable');
    const estimatedCost = lowStock.reduce((sum, p) => sum + (p.bestValueDeal?.price || 0), 0);
    const stores = lowStock.map(p => p.bestValueDeal?.store).filter(Boolean);
    const mainStore = stores.length > 0 ? Array.from(new Set(stores))[0] : 'Scanning...';
    const criticalCount = allPredictions.filter(p => p.priority === 'Critical').length;
    const highCount = allPredictions.filter(p => p.priority === 'High').length;
    
    return {
      estimatedCost,
      mainStore,
      lowStockCount: lowStock.length,
      criticalCount,
      highCount
    };
  }, [allPredictions]);

  const filteredPredictions = useMemo(() => {
    let list = allPredictions;
    if (filterPriority !== 'All') {
      list = list.filter(p => p.priority === filterPriority);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allPredictions, filterPriority, searchQuery]);

  const expiringSoon = useMemo(() => {
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return medicines
      .filter(m => {
        const d = (m.expiryDate && typeof m.expiryDate.toDate === 'function') ? m.expiryDate.toDate() : new Date(m.expiryDate);
        return d.getTime() - now.getTime() < thirtyDays;
      })
      .sort((a, b) => {
        const da = (a.expiryDate && typeof a.expiryDate.toDate === 'function') ? a.expiryDate.toDate() : new Date(a.expiryDate);
        const db = (b.expiryDate && typeof b.expiryDate.toDate === 'function') ? b.expiryDate.toDate() : new Date(b.expiryDate);
        return da.getTime() - db.getTime();
      });
  }, [medicines]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(id => window.clearTimeout(id));
    };
  }, []);

  const startSimulation = (prediction: RefillPrediction) => {
    timeoutRefs.current.forEach(id => window.clearTimeout(id));
    timeoutRefs.current = [];

    setSelectedPrediction(prediction);
    setIsSimulating(true);
    setSimulationStep(1);
    
    const steps = [
      { label: 'Optimizing supply chain routes...', delay: 800 },
      { label: 'Securing inventory locking...', delay: 1200 },
      { label: 'Dispatched to nearest hub...', delay: 1000 },
      { label: 'Arrival confirmed for 5:30 PM', delay: 800 }
    ];

    let currentDelay = 0;
    steps.forEach((step, index) => {
      currentDelay += step.delay;
      const tid = window.setTimeout(() => {
        setSimulationStep(index + 2);
      }, currentDelay);
      timeoutRefs.current.push(tid);
    });
  };

  if (allPredictions.length === 0 && expiringSoon.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Header & Stats Summary Section */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Layers className="text-blue-600" size={28} /> Refill Planner
            </h2>
            <p className="text-sm font-medium text-slate-400 mt-1">AI-Powered inventory logistics & supply intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              {allPredictions.length} Items Monitored
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <BudgetCard 
            label="Estimated Refill" 
            value={`₹${budgetStats.estimatedCost}`} 
            subValue="For low stock items"
            icon={ShoppingCart}
            color="blue"
           />
           <BudgetCard 
            label="Cheapest Provider" 
            value={budgetStats.mainStore} 
            subValue="Best overall value"
            icon={Tag}
            color="emerald"
           />
           <BudgetCard 
            label="Procurement Risk" 
            value={budgetStats.lowStockCount > 0 ? "ATTENTION" : "NONE"} 
            subValue={`${budgetStats.lowStockCount} items need refill`}
            icon={AlertCircle}
            color={budgetStats.lowStockCount > 0 ? "rose" : "slate"}
           />
        </div>

        {/* Refill Priority Queue Launcher Card (Replaces the raw list in the main tab) */}
        <div className="pt-2">
          <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl text-white shadow-xl shadow-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl -mr-20 -mt-20 rounded-full pointer-events-none"></div>
            
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5">
                  <TrendingDown size={12} /> Refill Priority Queue
                </span>
                {budgetStats.criticalCount > 0 && (
                  <span className="px-2.5 py-1 bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                    <AlertCircle size={12} /> {budgetStats.criticalCount} Critical
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Inspect Active Refill Priority Queue
              </h3>
              <p className="text-xs text-slate-300 font-medium max-w-xl">
                Review algorithmic depletion timelines, verify store deal comparisons across Blinkit, 1mg, & PharmEasy, and schedule 1-click doorstep restock.
              </p>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <button
                type="button"
                onClick={() => setIsQueueDashboardOpen(true)}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Check Priority Queue</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Refill Priority Queue Dashboard Modal */}
      <AnimatePresence>
        {isQueueDashboardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-50 border border-slate-200 rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Dashboard Header */}
              <div className="bg-white border-b border-slate-200 px-6 sm:px-10 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                    <Layers size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-900">Refill Priority Queue</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                        {allPredictions.length} Total
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-400">
                      Predictive replenishment and dynamic price matching across registered pharmacies
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsQueueDashboardOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
                  >
                    Close Dashboard
                  </button>
                </div>
              </div>

              {/* Controls Bar: Search & Priority Filter Tabs */}
              <div className="px-6 sm:px-10 py-4 bg-white/80 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {['All', 'Critical', 'High', 'Medium'].map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPriority(p)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        filterPriority === p 
                          ? 'bg-slate-900 text-white shadow-md' 
                          : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p} {p === 'All' ? `(${allPredictions.length})` : `(${allPredictions.filter(item => item.priority === p).length})`}
                    </button>
                  ))}
                </div>

                <div className="w-full md:w-72">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search medicine in queue..."
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Scrollable Dashboard Body */}
              <div className="p-6 sm:p-10 overflow-y-auto space-y-8 flex-1">
                {/* Medicines in Queue */}
                <div className="space-y-4">
                  {filteredPredictions.map((p) => (
                    <RefillItemCard 
                      key={p.medicineId}
                      prediction={p}
                      onRefill={() => startSimulation(p)}
                      onSnooze={() => setShowScheduler(p.medicineId)}
                      showScheduler={showScheduler === p.medicineId}
                      onScheduleClose={() => setShowScheduler(null)}
                      isQuantis={isQuantis}
                    />
                  ))}

                  {filteredPredictions.length === 0 && (
                    <div className="p-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                      <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-4" />
                      <p className="text-base font-bold text-slate-700">No medicines match this criteria.</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">All medications in this category are fully stocked and stable.</p>
                    </div>
                  )}
                </div>

                {/* Expiry Risk Watchlist Section in Dashboard */}
                {expiringSoon.length > 0 && (
                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} /> Expiry Risk Watchlist (Upcoming 30 Days)
                      </h3>
                      <span className="text-xs font-bold text-slate-400">{expiringSoon.length} medicines flagged</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {expiringSoon.map(item => {
                         const d = (item.expiryDate && typeof item.expiryDate.toDate === 'function') ? item.expiryDate.toDate() : new Date(item.expiryDate);
                         const daysRem = Math.floor((d.getTime() - Date.now()) / (86400000));
                         return (
                           <div key={item.id} className="p-5 bg-rose-50/80 border border-rose-100 rounded-3xl flex items-center justify-between">
                              <div className="flex items-center gap-3.5">
                                 <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                                    <AlertCircle size={20} />
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-wider ${daysRem < 7 ? 'text-red-600' : 'text-slate-500'}`}>
                                      Expires in {daysRem} days ({d.toLocaleDateString()})
                                    </p>
                                 </div>
                              </div>
                              <span className="px-2.5 py-1 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-rose-200">
                                {item.dosage || 'Standard'}
                              </span>
                           </div>
                         )
                       })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulation Modal */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3.5rem] p-12 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 relative">
                 <Zap size={48} className={simulationStep < 5 ? "animate-pulse" : ""} />
                 {simulationStep === 5 && (
                   <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2 rounded-full border-4 border-white shadow-lg"
                   >
                     <CheckCircle2 size={20} />
                   </motion.div>
                 )}
              </div>

              <h3 className="text-3xl font-black text-slate-900 mb-2">SafeShelf Direct</h3>
              <p className="text-sm text-slate-400 mb-10 font-medium">Auto-procuring {selectedPrediction?.name}</p>

              <div className="space-y-6 mb-12">
                {[
                   'Verifying stock requirements',
                   'Allocating nearest fulfillment node',
                   'Deploying hyper-local courier',
                   'Delivery successfully scheduled'
                ].map((label, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      simulationStep > i + 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                    }`}>
                      {simulationStep > i + 1 ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <span className={`text-[13px] font-black tracking-tight ${
                      simulationStep === i + 2 ? 'text-blue-600' : 
                      simulationStep > i + 2 ? 'text-slate-900' : 'text-slate-300'
                    }`}>{label}</span>
                  </div>
                ))}
              </div>

              {simulationStep >= 5 ? (
                <button 
                  onClick={() => setIsSimulating(false)}
                  className="w-full py-5 bg-slate-900 text-white rounded-3xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl cursor-pointer"
                >
                  Track Order <ArrowRight size={18} />
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2">
                   <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* Components */

const BudgetCard = ({ label, value, subValue, icon: Icon, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-600 text-white',
    emerald: 'bg-emerald-500 text-white',
    rose: 'bg-rose-500 text-white',
    slate: 'bg-slate-100 text-slate-600'
  };

  return (
    <div className={`p-8 rounded-[2.5rem] flex flex-col h-full bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1`}>
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${color === 'slate' ? 'bg-slate-50 text-slate-400' : `bg-${color}-50 text-${color}-600`}`}>
          <Icon size={24} />
       </div>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <h4 className="text-3xl font-black text-slate-900 mb-2">{value}</h4>
       <p className="text-xs font-medium text-slate-400">{subValue}</p>
    </div>
  );
};

const RefillItemCard = ({ prediction, onRefill, onSnooze, showScheduler, onScheduleClose, isQuantis }: { 
  prediction: RefillPrediction; 
  onRefill: () => void;
  onSnooze: () => void;
  showScheduler: boolean;
  onScheduleClose: () => void;
  isQuantis: boolean;
}) => {
  const priorityColors = {
    Critical: 'bg-red-500 text-white',
    High: 'bg-amber-500 text-white',
    Medium: 'bg-blue-500 text-white',
    Stable: 'bg-slate-100 text-slate-400'
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all relative overflow-hidden group">
       {/* Store Availability Badge */}
       <div className={`absolute top-0 right-10 px-4 py-1.5 rounded-b-xl text-[9px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1.5 ${
         prediction.bestValueDeal?.availability === 'In Stock' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
       }`}>
          <Package size={10} /> {prediction.bestValueDeal?.availability}
       </div>

       <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          {/* Main Info */}
          <div className="flex-1 space-y-4">
             <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${prediction.status === 'critical' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                   <Package size={24} />
                </div>
                <div>
                   <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-xl font-black text-slate-900">{prediction.name}</h4>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${priorityColors[prediction.priority]}`}>
                        {prediction.priority}
                      </span>
                   </div>
                   <p className="text-sm font-medium text-slate-500">
                     Approx. <span className="font-bold text-slate-900">{prediction.daysLeft} days</span> remaining
                   </p>
                </div>
             </div>
             
             {/* Simple Metrics (No charts) */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniMetric label="Depletion" value={`${prediction.daysLeft}d left`} />
                <MiniMetric label="Confidence" value={`${prediction.confidenceScore}%`} />
                <MiniMetric label="Quantity" value="Low" status="danger" />
                <MiniMetric label="Refill Date" value={prediction.expectedRefillDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
             </div>
          </div>

          {/* AI Best Deal & Review Summary */}
          <div className="lg:w-80 space-y-4">
             <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl group-hover:bg-white group-hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Quantis Best Deal</p>
                   <Tag size={12} className="text-indigo-400" />
                </div>
                <div className="flex items-center justify-between">
                   <div>
                      <p className="text-sm font-bold text-slate-900">{prediction.bestValueDeal?.store}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Faster Delivery: {prediction.bestValueDeal?.deliveryTime}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-lg font-black text-slate-900">₹{prediction.bestValueDeal?.price}</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-4 gap-2">
                <ReviewStat label="Pack" value={prediction.reviewSummary.packaging} icon={Package} />
                <ReviewStat label="Ship" value={prediction.reviewSummary.delivery} icon={Truck} />
                <ReviewStat label="Trust" value={prediction.reviewSummary.trust} icon={ShieldCheck} />
                <ReviewStat label="Satis" value={prediction.reviewSummary.satisfaction} icon={Star} />
             </div>
          </div>

          {/* Action Column */}
          <div className="lg:w-48 lg:border-l border-slate-100 lg:pl-8 space-y-3">
             <button 
              onClick={onRefill}
              className={`w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                isQuantis ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-slate-900' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
              }`}
             >
                <Zap size={14} /> Refill Now
             </button>
             <button className="w-full py-4 bg-white border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                <ShoppingCart size={14} /> Compare
             </button>
             <div className="flex gap-2">
                <button 
                  onClick={onSnooze}
                  className="flex-1 py-3 bg-slate-50 rounded-xl font-black text-[9px] uppercase text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5"
                >
                   <Clock size={12} /> Snooze
                </button>
                <button className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                   <MoreVertical size={14} />
                </button>
             </div>
          </div>
       </div>

       {/* Scheduler Popover */}
       <AnimatePresence>
          {showScheduler && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-6 border-t border-slate-100 overflow-hidden"
            >
               <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BellRing size={12} /> Schedule Refill Reminder
                  </p>
                  <button onClick={onScheduleClose} className="text-xs font-black text-slate-300 hover:text-slate-900">Close</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Tomorrow', icon: Clock },
                    { label: 'In 3 Days', icon: TrendingUp },
                    { label: 'When Stock Low', icon: AlertCircle }
                  ].map(opt => (
                    <button key={opt.label} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-blue-200 hover:bg-white transition-all group">
                       <span className="text-xs font-bold text-slate-700">{opt.label}</span>
                       <opt.icon size={14} className="text-slate-300 group-hover:text-blue-500" />
                    </button>
                  ))}
               </div>
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
};

const MiniMetric = ({ label, value, status = 'default' }: any) => (
  <div className="p-3 bg-slate-50/50 rounded-2xl">
     <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
     <p className={`text-[10px] font-black ${status === 'danger' ? 'text-red-500' : 'text-slate-900'}`}>{value}</p>
  </div>
);

const ReviewStat = ({ label, value, icon: Icon }: any) => (
  <div className="flex flex-col items-center gap-1.5 p-2 bg-slate-50/50 rounded-2xl group/stat hover:bg-slate-100 transition-colors">
     <Icon size={12} className="text-slate-300 group-hover/stat:text-slate-600" />
     <span className="text-[7px] font-black uppercase text-slate-400 tracking-tighter">{label}</span>
     <span className="text-[10px] font-black text-slate-900">{value}%</span>
  </div>
);

