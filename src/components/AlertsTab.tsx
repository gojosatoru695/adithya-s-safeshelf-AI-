import React from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  BellRing, 
  ArrowRight,
  ExternalLink,
  Package
} from 'lucide-react';
import type { Medicine } from '../types.ts';

interface AlertsTabProps {
  medicines: Medicine[];
  aiMode?: 'astra' | 'quantis';
}

export const AlertsTab = ({ medicines, aiMode = 'astra' }: AlertsTabProps) => {
  const isQuantis = aiMode === 'quantis';
  const recallAlerts = medicines.filter(m => m.batchRecallAlert);
  const expiringAlerts = medicines.filter(m => {
    if (!m.expiryDate) return false;
    const expiry = m.expiryDate instanceof Date ? m.expiryDate : (m.expiryDate as any).toDate ? (m.expiryDate as any).toDate() : new Date((m.expiryDate as any).seconds * 1000);
    const diff = expiry.getTime() - new Date().getTime();
    return diff > 0 && diff < (1000 * 60 * 60 * 24 * 7);
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 blur-[80px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isQuantis ? 'bg-slate-800 text-blue-400' : 'bg-red-50 text-red-600'}`}>
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-slate-900">{isQuantis ? 'Quantis Integrity Audit' : 'Astra Safety Watch'}</h2>
              <p className="text-sm text-slate-500 font-medium">
                {isQuantis ? 'Precision verification of batch recall datasets and safety protocols.' : 'Astra is monitoring your medicine for safety recalls and heat alerts.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{isQuantis ? 'Recall Accuracy' : 'Recall Status'}</p>
              <p className={`text-2xl font-bold ${recallAlerts.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {recallAlerts.length > 0 ? `${recallAlerts.length} Flagged` : '100% Secure'}
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Expiring (7D)</p>
              <p className="text-2xl font-bold text-slate-900">{expiringAlerts.length} Items</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Safety Score</p>
              <p className="text-2xl font-bold text-blue-600">88/100</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
             <BellRing size={24} className={isQuantis ? 'text-slate-900' : 'text-red-500'} /> {isQuantis ? 'Anomalies & Recalls' : 'Urgent Safety Alerts'}
          </h3>

          {recallAlerts.length > 0 ? (
            recallAlerts.map(med => (
              <motion.div 
                key={med.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border border-red-100 rounded-3xl p-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 bg-red-100 text-red-600 rounded-bl-3xl font-bold text-[10px] uppercase tracking-widest">
                  Batch Recall
                </div>
                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
                    <AlertTriangle size={28} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{med.name}</h4>
                    <p className="text-xs text-red-700 font-bold mb-4">Batch Number: {med.batchNumber || 'N/A'}</p>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-lg mb-6">
                      A safety recall has been issued for batch <span className="font-bold">{med.batchNumber}</span> by <span className="font-bold">{med.manufacturer || 'the manufacturer'}</span>. Please stop usage immediately and verify with your healthcare provider.
                    </p>
                    <div className="flex gap-4">
                      <button className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-2">
                        View Recall Details <ExternalLink size={14} />
                      </button>
                      <button className="px-6 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all">
                        Mark as Disposed
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">No active batch recalls detected for your inventory.</p>
              <p className="text-xs text-slate-400 mt-2">We monitor CDSCO and global FDA databases in real-time.</p>
            </div>
          )}

          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 pt-6">
             <CheckCircle2 size={24} className="text-emerald-500" /> {isQuantis ? 'Storage Validation Rules' : 'Astra\'s Storage Tips'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {medicines.filter(m => m.storageNotes).map(m => (
               <div key={m.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:border-blue-200 transition-all">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Package size={20} />
                   </div>
                   <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Storage Guide</p>
                    <p className="text-sm text-slate-700 font-medium">{m.storageNotes}</p>
                 </div>
               </div>
             ))}
             {medicines.filter(m => m.storageNotes).length === 0 && (
               <div className="col-span-full p-10 bg-slate-50 rounded-3xl text-center border border-slate-200">
                 <Info className="mx-auto text-slate-300 mb-2" />
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No storage notes found</p>
               </div>
             )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full translate-x-10 translate-y-10"></div>
              <h4 className="text-xl font-bold mb-4 font-display">Compliance Scan</h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-8">
                Your inventory compliance score is calculated based on expiry proximity, batch security, and storage conditions.
              </p>
              <div className="space-y-4">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold">Audit Health</span>
                    <span className="text-xs font-bold text-emerald-400">Stable</span>
                 </div>
                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[88%]"></div>
                 </div>
              </div>
              <button className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold transition-all uppercase tracking-widest">
                Force Database Sync
              </button>
           </div>

           <div className="dashboard-card p-6 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3 mb-4">
                 <AlertTriangle size={20} className="text-amber-500" />
                 <h5 className="font-bold text-slate-900">Environmental Alert</h5>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Temperature in your region is currently higher than 30°C. Check items marked "Store below room temp" for stability.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
