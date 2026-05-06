import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, Package, Trash2, Calendar, Repeat, HeartPulse, User, Sparkles, Smartphone, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExtractedPrescriptionItem, TimingSlot, MealRelation, Category, RepeatPattern, Medicine } from '../types.ts';

interface PrescriptionReviewProps {
  items: ExtractedPrescriptionItem[];
  onSave: (finalItems: any[]) => Promise<void>;
  onCancel: () => void;
  elderlyMode?: boolean;
}

interface ReviewItem extends Omit<Medicine, 'id'> {
  id: number;
  timings: TimingSlot[];
  meal: MealRelation;
  duration?: string;
  stock: number;
  category: Category;
  reminderEnabled: boolean;
  timingSlots: TimingSlot[];
  mealRelation: MealRelation;
  exactTimes: string[];
  startDate: string;
  endDate: string;
  repeatPattern: RepeatPattern;
}

export const PrescriptionReview = ({ items: initialItems, onSave, onCancel, elderlyMode = false }: PrescriptionReviewProps) => {
  const [items, setItems] = useState<ReviewItem[]>(initialItems.map((item, idx) => ({
    ...item,
    id: idx,
    stock: 10,
    category: 'Medicine' as Category,
    reminderEnabled: true,
    timingSlots: item.timings,
    mealRelation: item.meal,
    exactTimes: item.timings.map(t => t === 'Morning' ? '09:00' : t === 'Afternoon' ? '14:00' : t === 'Evening' ? '18:00' : '21:00'),
    startDate: new Date().toISOString().split('T')[0],
    endDate: item.duration?.toLowerCase().includes('day') 
      ? new Date(Date.now() + parseInt(item.duration || '7') * 86400000).toISOString().split('T')[0]
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    repeatPattern: 'Daily' as RepeatPattern,
    name: item.name,
    type: 'Medicine' as Category,
    dosage: item.dosage || 'As prescribed',
    quantity: 10,
    unit: 'units',
    usagePerDay: item.timings.length,
    status: 'active' as const,
    riskScore: 0,
    confidence: 100,
    userId: '', // Will be set on save
    expiryDate: null,
    createdAt: null,
    updatedAt: null
  })));

  const [saving, setSaving] = useState(false);

  const toggleTiming = (itemId: number, timing: TimingSlot) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const isSelected = item.timingSlots.includes(timing);
        const newTimings = isSelected
          ? item.timingSlots.filter(t => t !== timing)
          : [...item.timingSlots, timing];
        
        // Match default times for simplicity
        const defaultTime = timing === 'Morning' ? '09:00' : timing === 'Afternoon' ? '14:00' : timing === 'Evening' ? '18:00' : '21:00';
        const newExactTimes = isSelected
          ? item.exactTimes.filter(t => t !== defaultTime)
          : [...item.exactTimes, defaultTime];

        return { ...item, timingSlots: newTimings, exactTimes: newExactTimes };
      }
      return item;
    }));
  };

  const updateItem = (itemId: number, field: string, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleFinalSave = async () => {
    setSaving(true);
    try {
      const finalMedicines = items.map(item => ({
        name: item.name,
        dosage: item.dosage || 'As prescribed',
        quantity: item.stock,
        unit: 'units',
        type: item.category,
        timingSlots: item.timingSlots,
        exactTimes: item.exactTimes,
        mealRelation: item.mealRelation,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        repeatPattern: item.repeatPattern,
        reminderEnabled: item.reminderEnabled,
        status: 'active',
        riskScore: 0,
        confidence: 95,
        notes: item.notes,
        usagePerDay: item.timingSlots.length
      }));
      await onSave(finalMedicines);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const cardPadding = elderlyMode ? "p-10" : "p-6";
  const titleSize = elderlyMode ? "text-3xl" : "text-lg";
  const textSize = elderlyMode ? "text-xl" : "text-sm";
  const iconSize = elderlyMode ? 32 : 24;

  return (
    <div className={`space-y-6 ${elderlyMode ? 'max-w-4xl mx-auto' : ''}`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className={`${titleSize} font-display font-bold text-slate-900`}>Elysia AI Review</h3>
          <p className={`${textSize} text-slate-400 font-medium`}>Setup schedule for {items.length} medicines</p>
        </div>
        {elderlyMode && (
          <div className="flex items-center gap-4 px-6 py-3 bg-blue-100 rounded-full border-2 border-blue-200 shadow-sm animate-pulse">
            <Volume2 className="text-blue-600" size={24} />
            <span className="text-lg font-bold text-blue-700">Voice-ready Mode</span>
          </div>
        )}
      </div>

      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pb-10">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative bg-white border-2 ${elderlyMode ? 'border-slate-300' : 'border-slate-100'} rounded-[3rem] shadow-xl hover:shadow-2xl transition-all overflow-hidden ${cardPadding}`}
            >
              <div className="flex flex-col gap-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 ${elderlyMode ? 'w-20 h-20 bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'} rounded-[1.5rem] flex items-center justify-center shadow-lg`}>
                      <HeartPulse size={iconSize} />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className={`${titleSize} font-extrabold text-slate-900 bg-transparent border-none p-0 focus:ring-0`}
                      />
                      <p className={`${textSize} font-bold text-slate-400`}>{item.dosage || 'Standard Dosage'}</p>
                    </div>
                  </div>
                  <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={iconSize} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className={`${elderlyMode ? 'text-sm' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest mb-3 block`}>Take During</label>
                      <div className="flex flex-wrap gap-3">
                        {(['Morning', 'Afternoon', 'Evening', 'Night'] as TimingSlot[]).map(slot => (
                          <button
                            key={slot}
                            onClick={() => toggleTiming(item.id, slot)}
                            className={`px-5 py-3 rounded-2xl ${elderlyMode ? 'text-lg' : 'text-xs'} font-bold transition-all shadow-sm ${
                              item.timingSlots.includes(slot)
                                ? 'bg-blue-600 text-white scale-105 shadow-blue-200'
                                : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className={`${elderlyMode ? 'text-sm' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest mb-3 block`}>Start Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="date"
                            value={item.startDate}
                            onChange={(e) => updateItem(item.id, 'startDate', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className={`${elderlyMode ? 'text-sm' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest mb-3 block`}>Finish Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="date"
                            value={item.endDate}
                            onChange={(e) => updateItem(item.id, 'endDate', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className={`${elderlyMode ? 'text-sm' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest mb-3 block`}>Meal Routine</label>
                      <div className="flex flex-wrap gap-2">
                        {(['Before Food', 'After Food', 'Empty Stomach'] as MealRelation[]).map(meal => (
                          <button
                            key={meal}
                            onClick={() => updateItem(item.id, 'mealRelation', meal)}
                            className={`px-4 py-2 rounded-xl ${elderlyMode ? 'text-sm' : 'text-[10px]'} font-black border-2 transition-all ${
                              item.mealRelation === meal
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
                                : 'border-transparent bg-slate-50 text-slate-500'
                            }`}
                          >
                            {meal}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                      <div className="flex items-center gap-3">
                        <Smartphone className="text-blue-600" size={24} />
                        <span className={`${elderlyMode ? 'text-lg' : 'text-sm'} font-bold text-blue-900`}>Smart Reminders</span>
                      </div>
                      <button 
                        onClick={() => updateItem(item.id, 'reminderEnabled', !item.reminderEnabled)}
                        className={`w-14 h-8 rounded-full relative transition-colors ${item.reminderEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${item.reminderEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-4 pt-6">
        <button 
          onClick={onCancel}
          className={`flex-1 py-6 bg-slate-100 text-slate-500 rounded-[2rem] ${elderlyMode ? 'text-xl' : 'text-sm'} font-black hover:bg-slate-200 transition-all uppercase tracking-widest`}
        >
          Discard
        </button>
        <button 
          onClick={handleFinalSave}
          disabled={saving || items.length === 0}
          className={`flex-[2] py-6 bg-emerald-600 text-white rounded-[2rem] ${elderlyMode ? 'text-2xl' : 'text-sm'} font-black shadow-2xl shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50`}
        >
          {saving ? 'Saving...' : <>Confirm & Schedule <ChevronRight size={24} /></>}
        </button>
      </div>
    </div>
  );
};
