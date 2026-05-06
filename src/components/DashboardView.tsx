import React from 'react';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, Calendar, ArrowRight, Heart, Droplet, Zap } from 'lucide-react';
import { Medicine, DoseLog } from '../types.ts';

import { getISTDate, getISTDateString, isSameISTDay } from '../lib/dateUtils.ts';

interface DashboardViewProps {
  medicines: Medicine[];
  logs: DoseLog[];
  onTakeDose: (med: Medicine, slot: string) => void;
  onOpenCalendar: () => void;
  elderlyMode?: boolean;
}

export const DashboardView = ({ medicines, logs, onTakeDose, onOpenCalendar, elderlyMode = false }: DashboardViewProps) => {
  const nowIST = getISTDate();
  const todayISTString = getISTDateString();
  const currentHour = nowIST.getHours();

  const getDoseStatus = (medId: string, slot: string) => {
    return logs.find(log => 
      log.medicineId === medId && 
      log.status === 'taken' && 
      getISTDateString(new Date(log.timestamp?.seconds * 1000 || log.timestamp)) === todayISTString &&
      log.scheduledTime === slot
    );
  };

  const slots = [
    { name: 'Morning', icon: <Droplet className="text-blue-500" />, hour: 9 },
    { name: 'Afternoon', icon: <Zap className="text-amber-500" />, hour: 14 },
    { name: 'Evening', icon: <Heart className="text-rose-500" />, hour: 18 },
    { name: 'Night', icon: <Clock className="text-indigo-500" />, hour: 21 }
  ];

  const currentSlot = slots.reduce((prev, curr) => 
    Math.abs(curr.hour - currentHour) < Math.abs(prev.hour - currentHour) ? curr : prev
  );

  const activeMedicines = medicines.filter(m => m.status === 'active' || m.status === 'low-stock');
  const activeMedIds = new Set(activeMedicines.map(m => m.id));

  const isMedicineScheduledForToday = (med: Medicine) => {
    if (!med.repeatPattern || med.repeatPattern === 'Daily') return true;
    if (med.repeatPattern === 'Specific Days' && med.selectedDays) {
      const todayIdx = nowIST.getDay(); 
      return (med.selectedDays as unknown as number[]).includes(todayIdx);
    }
    return true; 
  };

  const scheduledToday = activeMedicines
    .filter(isMedicineScheduledForToday)
    .reduce((acc, m) => acc + (m.timingSlots?.length || 0) + (m.exactTimes?.length || 0), 0);

  const takenToday = logs.filter(l => 
    l.status === 'taken' && 
    activeMedIds.has(l.medicineId) &&
    getISTDateString(new Date(l.timestamp?.seconds * 1000 || l.timestamp)) === todayISTString
  ).length;

  return (
    <div className={`space-y-10 ${elderlyMode ? 'max-w-4xl mx-auto' : ''}`}>
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.button 
          whileHover={{ scale: 1.02, translateY: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenCalendar}
          className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm text-left group transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calendar size={24} />
            </div>
            <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Dose Progress</p>
          <p className="text-2xl font-black text-slate-900">
            {takenToday} / {scheduledToday} Doses
          </p>
          <p className="mt-2 text-[10px] font-bold text-blue-500 flex items-center gap-1">
             Click for 1-week goal ledger
          </p>
        </motion.button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Attention</p>
          <p className="text-2xl font-black text-slate-900">
            {activeMedicines.filter(m => m.status === 'low-stock').length} Low Stock
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl shadow-blue-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center">
              <Clock size={24} />
            </div>
          </div>
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Next Up</p>
          <p className="text-2xl font-black text-white">{currentSlot.name} Dose</p>
        </motion.div>
      </div>

      {/* Main Schedule */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className={`${elderlyMode ? 'text-3xl' : 'text-xl'} font-black text-slate-900`}>Intake Timeline</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {slots.map((slot, idx) => {
            const medsInSlot = activeMedicines.filter(m => m.timingSlots?.includes(slot.name as any));
            if (medsInSlot.length === 0 && !elderlyMode) return null;

            return (
              <motion.div 
                key={slot.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative pl-12 pb-10 border-l-4 ${idx === slots.length - 1 ? 'border-transparent' : 'border-slate-100'}`}
              >
                {/* Slot Dot */}
                <div className={`absolute -left-[18px] top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-md ${
                  slot.hour <= currentHour ? 'bg-blue-600' : 'bg-slate-200'
                }`}>
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-slate-800">{slot.name}</span>
                    <span className="text-xs font-bold text-slate-400">{slot.hour}:00</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 list-cols-3 gap-4">
                    {medsInSlot.length > 0 ? medsInSlot.map(med => {
                      const isTaken = getDoseStatus(med.id!, slot.name);
                      return (
                        <motion.button
                          key={med.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => !isTaken && onTakeDose(med, slot.name)}
                          className={`p-6 rounded-[2rem] border-2 text-left transition-all flex items-center justify-between ${
                            isTaken 
                              ? 'bg-emerald-50 border-emerald-100 opacity-60' 
                              : 'bg-white border-slate-100 shadow-sm hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              isTaken ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {slot.icon}
                            </div>
                            <div>
                              <p className={`${elderlyMode ? 'text-lg' : 'text-sm'} font-black text-slate-900`}>{med.name}</p>
                              <p className="text-xs font-bold text-slate-400">{med.dosage} • {med.mealRelation}</p>
                            </div>
                          </div>
                          {isTaken ? (
                            <CheckCircle2 className="text-emerald-600" size={24} />
                          ) : (
                            <div className="w-10 h-10 bg-slate-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <ArrowRight size={20} />
                            </div>
                          )}
                        </motion.button>
                      );
                    }) : (
                      <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-400 text-center">No medicines scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {elderlyMode && (
        <div className="fixed bottom-32 right-10 flex flex-col gap-4">
          <button className="w-24 h-24 bg-rose-600 text-white rounded-full shadow-2xl flex items-center justify-center flex-col gap-1 border-4 border-white animate-bounce">
            <AlertCircle size={32} />
            <span className="text-[10px] font-black uppercase">SOS</span>
          </button>
        </div>
      )}
    </div>
  );
};
