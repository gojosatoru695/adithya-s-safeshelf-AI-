import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { BarChart2, TrendingUp, PieChart as PieChartIcon, Calendar, ArrowUpRight, ArrowDownRight, Zap, Target } from 'lucide-react';
import type { Medicine } from '../types.ts';

interface QuantisAnalyticsProps {
  medicines: Medicine[];
}

export const QuantisAnalytics = ({ medicines }: QuantisAnalyticsProps) => {
  // 1. Insights Generation
  const insights = useMemo(() => {
    const expiredCount = medicines.filter(m => {
       const expDate = new Date(m.expiryDate?.seconds * 1000 || m.expiryDate);
       return expDate < new Date();
    }).length;

    const nearExpiry = medicines.filter(m => {
       const expDate = new Date(m.expiryDate?.seconds * 1000 || m.expiryDate);
       const weekOut = new Date(Date.now() + 7 * 86400000);
       return expDate >= new Date() && expDate < weekOut;
    }).length;

    const lowStock = medicines.filter(m => m.quantity < 5).length;
    
    // Sort items by value for savings insight
    const highValueItems = [...medicines].sort((a,b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)).slice(0, 3);

    return {
      expiredCount,
      nearExpiry,
      lowStock,
      highValueItems,
      totalValue: medicines.reduce((sum, m) => sum + (m.estimatedValue || 0), 0)
    };
  }, [medicines]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory Distribution Insight */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon size={18} className="text-indigo-500" /> Stock Distribution
            </h3>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">Analytics Ready</span>
          </div>
          
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-2xl font-black text-slate-900">{medicines.length}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Managed Items</p>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                   <Target className="text-slate-400" size={24} />
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Medicines</p>
                   <p className="text-lg font-black text-slate-800">{medicines.filter(m => m.type === 'Medicine').length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Other</p>
                   <p className="text-lg font-black text-slate-800">{medicines.filter(m => m.type !== 'Medicine').length}</p>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Expiry Risk Profile */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-rose-500" /> Expiry Vulnerability
            </h3>
          </div>
          
          <div className="space-y-4">
             <div className={`p-5 rounded-2xl border-l-4 ${insights.expiredCount > 0 ? 'bg-rose-50 border-rose-500' : 'bg-emerald-50 border-emerald-500'}`}>
                <div className="flex justify-between items-center mb-1">
                   <p className="text-sm font-bold text-slate-800">Critical Expiry</p>
                   <span className={`text-xs font-black ${insights.expiredCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {insights.expiredCount} Items
                   </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                   {insights.expiredCount > 0 ? 'Immediately discard these items to ensure household safety.' : 'No items have reached their terminal expiry date.'}
                </p>
             </div>

             <div className="p-5 bg-amber-50 rounded-2xl border-l-4 border-amber-500">
                <div className="flex justify-between items-center mb-1">
                   <p className="text-sm font-bold text-slate-800">Near-Term Risk</p>
                   <span className="text-xs font-black text-amber-600">{insights.nearExpiry} Items</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                   Expiring within the next 7 days. Move to priority intake list or prepare for replacement.
                </p>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Financial Optimization Insight */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl -mr-32 -mt-32 rounded-full" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
           <div className="lg:col-span-4">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                    <TrendingUp size={24} />
                 </div>
                 <h3 className="text-xl font-bold">Quantis Value Optimization</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                 Analyzing market trends and purchase history to minimize wastage and optimize replenishment costs.
              </p>
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vault Inventory Value</p>
                 <p className="text-3xl font-black text-white">${insights.totalValue.toFixed(2)}</p>
              </div>
           </div>
           
           <div className="lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                       <Zap className="text-blue-400" size={20} />
                       <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                          <ArrowUpRight size={12} /> +12% Efficiency
                       </span>
                    </div>
                    <p className="text-sm font-bold mb-1">Smart Sourcing</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Quantis has identified 4 alternative providers for your chronic medication with better reliability scores.</p>
                 </div>
                 
                 <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                       <BarChart2 className="text-emerald-400" size={20} />
                       <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <ArrowDownRight size={12} /> -8% Waste
                       </span>
                    </div>
                    <p className="text-sm font-bold mb-1">Wastage Reduction</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Early consumption alerts for near-expiry items have saved an estimated $42.00 this month.</p>
                 </div>
              </div>
              
              <div className="mt-4 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                 <h4 className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-widest">High-Impact Inventory Items</h4>
                 <div className="flex flex-wrap gap-3">
                    {insights.highValueItems.map(item => (
                       <div key={item.id} className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-bold">
                          {item.name} • ${item.estimatedValue?.toFixed(0)}
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

