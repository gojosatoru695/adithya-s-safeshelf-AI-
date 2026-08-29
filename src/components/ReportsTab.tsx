import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Grid3X3, 
  MessageCircle, 
  Mail, 
  Download, 
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Medicine } from '../types.ts';

interface ReportsTabProps {
  medicines: Medicine[];
  aiMode: 'astra' | 'quantis';
  onExport: (format: 'pdf' | 'excel' | 'whatsapp' | 'email') => void;
  reportSchedule: 'weekly' | 'monthly' | 'none';
  onSetSchedule: (s: 'weekly' | 'monthly' | 'none') => void;
  reportHistory: any[];
}

export const ReportsTab = ({ 
  medicines, 
  aiMode, 
  onExport, 
  reportSchedule, 
  onSetSchedule,
  reportHistory 
}: ReportsTabProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl -mr-20 -mt-20 rounded-full" />
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
               <h3 className="text-3xl font-black mb-4">Inventory Reporting</h3>
               <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                  Generate comprehensive safety audits, expiry maps, and stock lifecycle reviews. Automated or manual delivery.
               </p>
               <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => onExport('pdf')}
                    className="px-8 py-4 bg-blue-600 rounded-2xl font-black shadow-xl shadow-blue-500/20 flex items-center gap-2 hover:scale-105 transition-all text-sm uppercase tracking-widest"
                  >
                     <FileText size={18} /> Export PDF
                  </button>
                  <button 
                    onClick={() => onExport('excel')}
                    className="px-8 py-4 bg-white/10 rounded-2xl font-black border border-white/10 flex items-center gap-2 hover:bg-white/20 transition-all text-sm uppercase tracking-widest"
                  >
                     <Grid3X3 size={18} /> Export Excel
                  </button>
               </div>
            </div>
            <div className="space-y-6">
               <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Automated Scheduling</p>
                  <div className="grid grid-cols-3 gap-2">
                     {['none', 'weekly', 'monthly'].map(s => (
                        <button 
                          key={s}
                          onClick={() => onSetSchedule(s as any)}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            reportSchedule === s ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'
                          }`}
                        >
                           {s}
                        </button>
                     ))}
                  </div>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={() => onExport('whatsapp')}
                    className="flex-1 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex flex-col items-center gap-2 hover:bg-emerald-500/20 transition-all"
                  >
                     <MessageCircle size={24} className="text-emerald-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => onExport('email')}
                    className="flex-1 p-5 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex flex-col items-center gap-2 hover:bg-blue-500/20 transition-all"
                  >
                     <Mail size={24} className="text-blue-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Gmail Archive</span>
                  </button>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="dashboard-card p-8">
            <h4 className="text-lg font-black text-slate-900 mb-6 font-display">Recent Audits</h4>
            <div className="space-y-4">
               {reportHistory.length > 0 ? reportHistory.slice(0, 5).map((report: any, idx: number) => (
                 <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          <FileText size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-800">Inventory Status Audit</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            {new Date(report.date || Date.now()).toLocaleDateString()}
                          </p>
                       </div>
                    </div>
                    <button onClick={() => onExport('pdf')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                       <Download size={18} />
                    </button>
                 </div>
               )) : (
                 <div className="py-20 text-center opacity-30">
                    <FileText size={48} className="mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">History Vacuum Empty</p>
                 </div>
               )}
            </div>
         </div>
         
         <div className="dashboard-card p-8 bg-indigo-50 border-indigo-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <Sparkles size={120} className="text-indigo-600" />
            </div>
            <div className="relative z-10">
              <h4 className="text-lg font-black text-indigo-900 mb-6 flex items-center gap-3 font-display">
                 <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                    <CheckCircle2 size={18} />
                 </div>
                 Report Coverage
              </h4>
              <div className="grid grid-cols-1 gap-4">
                 {[
                   { t: 'Expiry Risk Tracking', d: 'Identifies items expiring within 7, 30, and 90 days.' },
                   { t: 'Stock Lifecycle Analysis', d: 'Predicts usage patterns and refill date recommendations.' },
                   { t: 'Quantis Price Integration', d: 'Compares real-time market deals for low-stock items.' },
                   { t: 'Safety Recall Mapping', d: 'Cross-checks batch codes with CDSCO databases.' }
                 ].map((insight, i) => (
                   <div key={i} className="flex gap-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-indigo-800 mb-0.5">{insight.t}</p>
                        <p className="text-xs text-indigo-600 font-medium leading-relaxed">{insight.d}</p>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="mt-8 p-4 bg-white/50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                 <Clock size={16} className="text-indigo-400" />
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                   Next Scheduled Run: {reportSchedule === 'none' ? 'Manual Only' : '23:59 IST Today'}
                 </p>
              </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
};
