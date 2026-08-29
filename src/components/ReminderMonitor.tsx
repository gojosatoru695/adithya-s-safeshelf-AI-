import React, { useEffect, useRef, useState } from 'react';
import { Medicine, Language, TimingSlot, DoseLog } from '../types.ts';
import { reminderService } from '../services/reminderService.ts';
import { inventoryService } from '../services/inventoryService.ts';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Clock, Volume2, AlertTriangle, Mic } from 'lucide-react';

import { getISTDate, getISTDateString } from '../lib/dateUtils.ts';

interface ReminderMonitorProps {
  medicines: Medicine[];
  logs: DoseLog[];
  language: Language;
  onRefresh: () => void;
  elderlyMode?: boolean;
}

const DEFAULT_SLOT_TIMES: Record<TimingSlot, string> = {
  'Morning': '09:00',
  'Afternoon': '14:00',
  'Evening': '18:00',
  'Night': '21:00'
};

export const ReminderMonitor = ({ medicines, logs, language, onRefresh, elderlyMode = false }: ReminderMonitorProps) => {
  const lastTriggeredRef = useRef<Record<string, number>>({});
  const repeatIntervalRef = useRef<any>(null);
  const [activeAlarm, setActiveAlarm] = useState<{ med: Medicine, slot: string, repeats: number } | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Core Monitoring Loop
  useEffect(() => {
    // Suppress Vite WebSocket errors from showing up in UI
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('WebSocket')) return;
      originalError.apply(console, args);
    };

    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('WebSocket')) {
        event.preventDefault();
      }
    });

    const checkReminders = () => {
      const nowIST = getISTDate();
      const currentTime = `${String(nowIST.getHours()).padStart(2, '0')}:${String(nowIST.getMinutes()).padStart(2, '0')}`;
      const todayStr = getISTDateString(nowIST);

      medicines.forEach(medicine => {
        if (!medicine.reminderEnabled) return;

        const scheduledTimes = medicine.exactTimes?.length 
          ? medicine.exactTimes 
          : (medicine.timingSlots?.map(s => DEFAULT_SLOT_TIMES[s as TimingSlot]) || []);

        scheduledTimes.forEach((time, idx) => {
          const slotName = medicine.timingSlots?.[idx] || 'Scheduled';
          
          if (currentTime === time) {
            const key = `${medicine.id}_${time}_${todayStr}`;
            if (!lastTriggeredRef.current[key]) {
              triggerAlarm(medicine, time);
              lastTriggeredRef.current[key] = Date.now();
            }
          }
        });
      });
    };

    const interval = setInterval(checkReminders, 30000); // Optimized from 10s to 30s
    return () => clearInterval(interval);
  }, [medicines, language, activeAlarm]);

  // Voice Repeat Loop
  useEffect(() => {
    if (activeAlarm) {
      // Trigger first voice
      speakAlarm(activeAlarm.med, activeAlarm.slot);
      
      let fastRepeats = 0;
      const MAX_FAST_REPEATS = 4; // roughly 30 seconds if spoken every 7s
      const FAST_INTERVAL = 7000;

      // Fast repetition for the first 30 seconds
      const fastInterval = setInterval(() => {
        if (fastRepeats < MAX_FAST_REPEATS) {
          speakAlarm(activeAlarm.med, activeAlarm.slot);
          fastRepeats++;
        } else {
          clearInterval(fastInterval);
          startLongInterval();
        }
      }, FAST_INTERVAL);

      const startLongInterval = () => {
        const intervalMs = (activeAlarm.med.alarmRepeatInterval || 1.5) * 60000;
        repeatIntervalRef.current = setInterval(() => {
          setActiveAlarm(prev => {
            if (prev && prev.repeats < 10) {
              speakAlarm(prev.med, prev.slot);
              return { ...prev, repeats: prev.repeats + 1 };
            }
            if (prev && prev.repeats >= 10) {
              clearInterval(repeatIntervalRef.current);
            }
            return prev;
          });
        }, intervalMs);
      };

      return () => {
        clearInterval(fastInterval);
        if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
        window.speechSynthesis.cancel();
      };
    }
  }, [activeAlarm?.med.id, activeAlarm?.slot]);

  const triggerAlarm = (med: Medicine, slot: string) => {
    if (activeAlarm) return; 
    setActiveAlarm({ med, slot, repeats: 0 });
  };

  const speakAlarm = (med: Medicine, slot: string) => {
    const utterance = reminderService.triggerReminder({
      medicineName: med.name,
      timing: slot,
      language: med.voiceLanguage || language,
      customMessage: med.voiceAlarmType === 'custom' ? med.voiceCustomMessage : undefined,
      volume: 1.0 // Force full volume for real alarms
    });

    if (utterance) {
      utterance.onend = () => {
        if (activeAlarm) startVoiceCommandListener();
      };
    } else {
      if (activeAlarm) startVoiceCommandListener();
    }
  };

  const startVoiceCommandListener = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    
    const langMap: Record<Language, string> = {
      'English': 'en-US',
      'Hindi': 'hi-IN',
      'Telugu': 'te-IN',
      'Kannada': 'kn-IN'
    };
    
    recognition.lang = langMap[activeAlarm?.med.voiceLanguage || language] || 'en-US';
    recognition.continuous = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase();
      console.log('Voice Command Received:', text);
      
      const KEYWORDS = {
        taken: ['taken', 'took', 'लिया', 'తీసుకున్నా', 'ತೆಗೆದುಕೊಂಡೆ', 'yes', 'done', 'taken it', 'pill taken', 'okay', 'eat', 'finished', 'medicine taken', 'le liya', 'theek hai', 'ha', 'avunu', 'houdu'],
        snooze: ['snooze', 'wait', 'later', 'बाद में', 'స్నూజ్', 'ನಂತರ', 'sleep', 'reminder later', 'stop', 'quiet', 'off', 'shut up', 'chup', 'aagu', 'nilusu']
      };

      if (KEYWORDS.taken.some(k => text.includes(k))) {
        handleAction('taken');
      } else if (KEYWORDS.snooze.some(k => text.includes(k))) {
        handleSnooze();
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();

    // Auto-stop after 10s
    setTimeout(() => {
      try { recognition.stop(); } catch(e) {}
    }, 10000);
  };

  const handleAction = async (status: 'taken' | 'skipped') => {
    if (!activeAlarm) return;
    await inventoryService.logDose(activeAlarm.med.id!, activeAlarm.med.name, status, activeAlarm.slot);
    setActiveAlarm(null);
    onRefresh();
  };

  const handleSnooze = () => {
    setActiveAlarm(null);
    window.speechSynthesis.cancel();
    // Re-trigger in 10 mins
    setTimeout(() => {
      // Find the medicine again to ensure fresh data
      const med = medicines.find(m => m.id === activeAlarm?.med.id);
      if (med) triggerAlarm(med, activeAlarm!.slot);
    }, 600000); 
  };

  return (
    <AnimatePresence>
      {activeAlarm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className={`w-full max-w-xl bg-white rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border-8 ${elderlyMode ? 'border-rose-400' : 'border-blue-500'}`}
          >
            <div className="p-12 space-y-10 text-center">
              <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                <motion.div 
                   animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className={`absolute inset-0 rounded-full ${elderlyMode ? 'bg-rose-500' : 'bg-blue-500'}`}
                />
                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${elderlyMode ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                  <Volume2 size={48} className="animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">SafeShelf Elysia Alarm</p>
                <h2 className={`${elderlyMode ? 'text-5xl' : 'text-3xl'} font-black text-slate-900`}>
                  {activeAlarm.med.name}
                </h2>
                <div className="flex items-center justify-center gap-2">
                   <Clock size={20} className="text-slate-400" />
                   <p className="text-xl font-black text-slate-400">{activeAlarm.slot} Dose</p>
                </div>
                <p className="text-lg font-bold text-slate-500 italic max-w-sm mx-auto">
                   {activeAlarm.med.voiceAlarmType === 'custom' ? activeAlarm.med.voiceCustomMessage : `Time to take your medication.`}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleAction('taken')}
                  className={`py-8 rounded-[2.5rem] bg-emerald-600 text-white font-black border-b-[8px] border-emerald-800 shadow-xl shadow-emerald-200 transition-all hover:translate-y-1 active:translate-y-2 flex flex-col items-center gap-2 ${elderlyMode ? 'text-4xl' : 'text-2xl'}`}
                >
                  <CheckCircle2 size={elderlyMode ? 48 : 32} />
                  I TOOK IT
                </button>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={handleSnooze}
                    className="py-6 rounded-[2.5rem] bg-slate-900 text-white font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all"
                  >
                    <Clock size={24} /> SNOOZE 10M
                  </button>
                  <button
                    onClick={() => handleAction('skipped')}
                    className="py-4 rounded-[2.5rem] bg-slate-100 text-slate-400 font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
                  >
                    <XCircle size={20} /> SKIP DOSE
                  </button>
                </div>
              </div>

              {isListening && (
                <div className="flex items-center justify-center gap-2 text-blue-500 animate-pulse font-black text-sm">
                   <Mic size={16} /> Listening for voice command...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const iconSize = (em: boolean) => em ? 32 : 24;
