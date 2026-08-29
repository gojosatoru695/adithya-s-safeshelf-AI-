import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService } from '../services/geminiService.ts';
import { inventoryService } from '../services/inventoryService.ts';
import { Medicine } from '../types.ts';

interface VoiceCommandControlProps {
  medicines: Medicine[];
  onRefresh: () => void;
  onAction?: (action: string, data?: any) => void;
  elderlyMode?: boolean;
  language?: string;
}

export const VoiceCommandControl = ({ 
  medicines, 
  onRefresh, 
  onAction,
  elderlyMode = false,
  language = 'English'
}: VoiceCommandControlProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'listening'>('idle');
  const [feedback, setFeedback] = useState('');
  const [showConfirm, setShowConfirm] = useState<{ action: string, data: any } | null>(null);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to find a matching voice for the language
    const voices = window.speechSynthesis.getVoices();
    const langCode = language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : language === 'Kannada' ? 'kn-IN' : 'en-US';
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : language === 'Kannada' ? 'kn-IN' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
      setFeedback('');
    };

    recognition.onresult = (event: any) => {
      const current = event.results[0][0].transcript;
      setTranscript(current);
      if (event.results[0].isFinal) {
        setIsListening(false);
        processCommand(current);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus('error');
      setFeedback('I missed that. Speak again?');
    };

    recognition.start();
  };

  const processCommand = async (text: string) => {
    setStatus('processing');
    setFeedback('Thinking...');

    try {
      const result = await geminiService.processVoiceCommand(text, medicines, language);
      
      if (result.confirmedRequired) {
        setShowConfirm({ action: result.action, data: result });
        setFeedback(result.message);
        speak(result.message);
        return;
      }

      await executeAction(result.action, result);
    } catch (err) {
      setStatus('error');
      setFeedback('Encryption error. Just kidding, something went wrong.');
    }
  };

  const executeAction = async (action: string, result: any) => {
    setStatus('processing');
    
    try {
      switch (action) {
        case 'ADD_ITEM':
          const itemData = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
          await inventoryService.addMedicine({
            name: itemData.name,
            dosage: itemData.dosage || 'As prescribed',
            type: 'Medicine',
            quantity: 10,
            unit: 'units',
            usagePerDay: 1,
            expiryDate: new Date(Date.now() + 30 * 86400000),
            status: 'active',
            riskScore: 0,
            confidence: 100,
            timingSlots: ['Morning'],
            mealRelation: 'After Food',
            exactTimes: ['09:00'],
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            repeatPattern: 'Daily'
          });
          break;

        case 'DELETE_ITEM':
          if (result.target === 'expired') {
             const expired = medicines.filter(m => new Date(m.expiryDate?.seconds * 1000 || m.expiryDate) < new Date());
             await Promise.all(expired.map(m => inventoryService.deleteMedicine(m.id!)));
          } else if (result.target) {
             await inventoryService.deleteMedicine(result.target);
          }
          break;

        case 'SET_REMINDER':
          if (result.target) {
            const updates: any = {};
            if (result.value?.includes(':')) updates.exactTimes = [result.value];
            else updates.reminderEnabled = result.value !== 'false';
            await inventoryService.updateMedicine(result.target, updates);
          }
          break;

        case 'SCAN_PRESCRIPTION':
          onAction?.('SCAN');
          break;

        case 'SHOW_ANALYTICS':
          if (result.message.toLowerCase().includes('refill') || result.message.toLowerCase().includes('buy')) {
            onAction?.('TAB', 'planner');
          } else {
            onAction?.('TAB', 'overview');
          }
          break;

        case 'QUERY_INVENTORY':
          // Re-use current transcript if Gemini doesn't suggest better search query
          onAction?.('SEARCH', result.value || transcript);
          break;

        case 'LIST_EXPIRY':
          onAction?.('TAB', 'inventory'); // Switch to inventory to show list
          break;

        case 'GENERATE_REPORT':
          onAction?.('GENERATE_REPORT');
          break;
      }

      setStatus('success');
      setFeedback(result.message);
      speak(result.message);
      onRefresh();
    } catch (e) {
      setStatus('error');
      setFeedback('Action failed.');
    }

    setTimeout(() => setStatus('idle'), 5000);
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-6 w-full max-w-md px-6">
      <AnimatePresence>
        {(feedback || transcript) && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`w-full p-6 rounded-[2.5rem] shadow-2xl border-2 backdrop-blur-xl ${
              status === 'success' ? 'bg-emerald-600/95 border-emerald-400 text-white' :
              status === 'error' ? 'bg-rose-600/95 border-rose-400 text-white' :
              'bg-white/95 border-slate-100 text-slate-900 shadow-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              {status === 'processing' && <Sparkles className="animate-pulse text-blue-500" size={24} />}
              {status === 'success' && <CheckCircle2 size={24} />}
              {status === 'error' && <AlertCircle size={24} />}
              {status === 'listening' && (
                <div className="flex gap-1 items-center h-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 24, 8] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-blue-500 rounded-full"
                    />
                  ))}
                </div>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                {status.toUpperCase()}
              </span>
            </div>

            {transcript && (
              <p className="text-sm font-bold opacity-60 italic mb-2">"{transcript}"</p>
            )}
            
            <p className={`${elderlyMode ? 'text-2xl' : 'text-lg'} font-black leading-tight text-balance`}>
              {feedback || (status === 'listening' ? 'Listening...' : 'Astra AI Assistant')}
            </p>

            {showConfirm && (
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => { executeAction(showConfirm.action, showConfirm.data); setShowConfirm(null); }}
                  className="flex-1 py-3 bg-white text-slate-900 rounded-2xl font-black shadow-lg"
                >
                  Yes, Proceed
                </button>
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-3 bg-black/10 text-current rounded-2xl font-black"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {isListening && (
          <motion.div 
            layoutId="aura"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-blue-400 rounded-full -m-4"
          />
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={startListening}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl border-4 ${
            isListening 
              ? 'bg-rose-600 border-rose-200' 
              : 'bg-slate-900 border-slate-700 hover:scale-105'
          }`}
        >
          {isListening ? (
            <MicOff className="text-white" size={36} />
          ) : (
            <div className="relative">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                 className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-full -m-4"
               />
               <Mic className="text-white" size={36} />
               {status === 'success' && (
                 <motion.div 
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   className="absolute -top-6 -right-6 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                 >
                   <CheckCircle2 size={16} className="text-white" />
                 </motion.div>
               )}
            </div>
          )}
        </motion.button>
      </div>

      <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border border-white shadow-xl flex items-center gap-3">
        <Volume2 size={16} className="text-blue-500" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
           {language} Mode • {elderlyMode ? 'High Clarity' : 'Standard'}
        </span>
      </div>
    </div>
  );
};
