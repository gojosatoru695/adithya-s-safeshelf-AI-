import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles, AlertCircle, 
  ShoppingCart, BarChart2, Mic, MicOff, Globe, Settings2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { geminiService } from '../services/geminiService.ts';
import { inventoryService } from '../services/inventoryService.ts';
import type { Medicine } from '../types.ts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type Mode = 'menu' | 'chat' | 'voice' | 'settings';

interface AssistantHubProps {
  medicines: Medicine[];
  onCommand: (command: string, args?: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  aiMode: 'astra' | 'quantis';
  setAiMode: (mode: 'astra' | 'quantis') => void;
  language?: string;
  onRefresh?: () => void;
}

type LanguageCode = 'en-IN' | 'hi-IN' | 'te-IN' | 'kn-IN';

const LANGUAGES: { code: LanguageCode, label: string, native: string }[] = [
  { code: 'en-IN', label: 'English', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' }
];

const FEEDBACK_MESSAGES: Record<LanguageCode, {
  processing: string;
  unknown: string;
  error: string;
}> = {
  'en-IN': { processing: 'Thinking...', unknown: "I didn't catch that.", error: 'System error.' },
  'hi-IN': { processing: 'सोच रहा हूँ...', unknown: "समझ नहीं आया।", error: 'सिстема त्रुटि।' },
  'te-IN': { processing: 'ఆలోచిస్తున్నాను...', unknown: "అర్థం కాలేదు.", error: 'లోపం.' },
  'kn-IN': { processing: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...', unknown: "ಅರ್ಥವಾಗಲಿಲ್ಲ.", error: 'ದೋಷ.' }
};

export function AssistantHub({ 
  medicines, 
  onCommand,
  isOpen,
  setIsOpen,
  mode,
  setMode,
  aiMode,
  setAiMode,
  language = 'English',
  onRefresh
}: AssistantHubProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'SafeShelf Elysia is ready. How can I help?', timestamp: new Date() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentLang, setCurrentLang] = useState<LanguageCode>(
    language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : language === 'Kannada' ? 'kn-IN' : 'en-IN'
  );
  const [showConfirm, setShowConfirm] = useState<{ action: string, data: any } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { if (mode === 'chat') scrollToBottom(); }, [messages, mode]);

  // --- Voice Logic ---
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        // Clean markdown for speech
        const cleanText = text.replace(/[#*|`\[\]\(\)]/g, '').replace(/:---/g, '').substring(0, 200);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = currentLang;
        utterance.pitch = 1.0;
        utterance.rate = 1.0; // Fast for action-based Elysia
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("Elysia speech failed", e);
      }
    }
  }, [currentLang]);

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLang;
    recognition.onstart = () => { setIsListening(true); setTranscript('Elysia is listening...'); };
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      if (event.results[0].isFinal) {
        setIsListening(false);
        await processVoiceCommand(text);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const processVoiceCommand = async (text: string) => {
    setIsLoading(true);
    setTranscript(text);
    try {
      const result = await geminiService.processVoiceCommand(text, medicines, language);
      if (result.confirmedRequired) {
        setShowConfirm({ action: result.action, data: result });
        speak(result.message);
        setTranscript(result.message);
      } else {
        await executeVoiceAction(result.action, result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const executeVoiceAction = async (action: string, result: any) => {
    try {
      const { entities, target } = result;
      
      switch (action) {
        case 'ADD_ITEM':
          onCommand('add', entities); 
          break;
        case 'DELETE_ITEM':
          if (target || entities?.item_name) {
            const med = medicines.find(m => m.id === target || m.name.toLowerCase().includes(entities?.item_name?.toLowerCase() || ''));
            if (med) await inventoryService.deleteMedicine(med.id!);
          }
          break;
        case 'QUERY_INVENTORY':
        case 'SEARCH':
          onCommand('tab', 'inventory');
          if (entities?.item_name) onCommand('search', entities.item_name);
          break;
        case 'UPDATE_QUANTITY':
          if (target || entities?.item_name) {
             const med = medicines.find(m => m.id === target || m.name.toLowerCase().includes(entities?.item_name?.toLowerCase() || ''));
             if (med && entities?.quantity !== undefined) {
               await inventoryService.updateMedicine(med.id!, { quantity: entities.quantity });
             }
          }
          break;
        case 'LIST_EXPIRY':
          onCommand('tab', 'inventory');
          onCommand('filter', 'expiring');
          break;
        case 'SET_REMINDER':
          if (entities?.item_name && entities?.time) {
            const med = medicines.find(m => m.name.toLowerCase().includes(entities.item_name.toLowerCase()));
            if (med) {
              await inventoryService.updateMedicine(med.id!, { 
                reminderEnabled: true,
                exactTimes: [entities.time]
              });
            }
          }
          break;
        case 'SCAN_PRESCRIPTION':
          onCommand('action', 'SCAN');
          break;
        case 'SHOW_ANALYTICS':
          onCommand('tab', 'overview');
          break;
        case 'SET_CUSTOM_ALARM':
          if (entities?.item_name && entities?.message) {
            const med = medicines.find(m => m.name.toLowerCase().includes(entities.item_name.toLowerCase()));
            if (med) {
              await inventoryService.updateMedicine(med.id!, { 
                voiceAlarmType: 'custom',
                voiceCustomMessage: entities.message 
              });
            }
          }
          break;
        case 'LOG_DOSE':
          const medToLog = medicines.find(m => 
            m.id === target || 
            (entities?.item_name && m.name.toLowerCase().includes(entities.item_name.toLowerCase()))
          );
          if (medToLog) {
            await inventoryService.logDose(medToLog.id!, medToLog.name, 'taken', 'Elysia Voice Command');
          }
          break;
      }
      
      speak(result.message);
      setMessages(prev => [...prev, 
        { id: Date.now().toString(), role: 'user', content: transcript, timestamp: new Date() },
        { id: (Date.now()+1).toString(), role: 'assistant', content: result.message, timestamp: new Date() }
      ]);
      onRefresh?.();
    } catch (e) {
      console.error("Elysia Execution Error:", e);
    }
  };

  // --- Chat Logic ---
  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await geminiService.chatQuery(text, medicines, aiMode);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: response, timestamp: new Date() }]);
      
      // Auto-speak Elysia responses for accessibility if in Elysia mode
      if (aiMode === 'astra' && mode === 'voice') {
        speak(response);
      }
    } catch {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'AI Service error.', timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const handleReviewSummary = async (name: string) => {
    setIsLoading(true);
    setMode('chat');
    try {
      const data = await geminiService.getReviewSummary(name);
      if (!data) throw new Error();
      
      const content = `
### Review Summary by Elysia ✨
#### ${name}
**Reliability Meter: ${data.reliabilityScore}%**

| Category | Elysia's Insight |
| :--- | :--- |
| **Value for Money** | ${data.summary.valueForMoney} |
| **Quality** | ${data.summary.quality} |
| **Packaging** | ${data.summary.packaging} |
| **Delivery** | ${data.summary.delivery} |
| **Trust** | ${data.summary.trust} |
| **Taste** | ${data.summary.taste} |
| **User Satisfaction** | ${data.summary.userSatisfaction} |
      `;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'Failed to fetch review summary.', timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const menuOptions = [
    { id: 'voice', label: 'Voice Assistant', icon: <Mic className="w-6 h-6" />, color: 'bg-rose-500', desc: 'Control via speech' },
    { id: 'chat', label: 'AI Chat', icon: <MessageSquare className="w-6 h-6" />, color: 'bg-indigo-600', desc: 'Natural conversations' },
    { id: 'summary', label: 'Inventory Summary', icon: <BarChart2 className="w-6 h-6" />, color: 'bg-amber-500', desc: 'Instant status update' },
    { id: 'settings', label: 'AI Settings', icon: <Settings2 className="w-6 h-6" />, color: 'bg-slate-600', desc: 'Languages & Config' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[420px] max-w-[calc(100vw-2rem)] min-h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className={`p-5 text-white flex flex-col transition-colors ${aiMode === 'astra' ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                    {aiMode === 'quantis' ? <BarChart2 className="text-blue-200" /> : <Sparkles className="text-amber-200" />}
                  </div>
                  <div>
                    <h3 className="font-bold tracking-tight text-lg">{aiMode === 'astra' ? 'Elysia Assistant' : 'Quantis Engine'}</h3>
                    <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold">
                      {mode === 'menu' ? 'SafeShelf Elysia Active' : `${mode} Mode Active`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mode !== 'menu' && (
                    <button onClick={() => setMode('menu')} className="text-xs font-bold hover:bg-white/10 px-3 py-1 rounded-lg transition-colors">Back</button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-black/20 rounded-xl p-1 gap-1">
                <button 
                  onClick={() => setAiMode('astra')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${aiMode === 'astra' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/60 hover:text-white'}`}
                >
                  <Sparkles size={12} /> Elysia
                </button>
                <button 
                  onClick={() => setAiMode('quantis')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${aiMode === 'quantis' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
                >
                  <Zap size={12} /> Quantis
                </button>
              </div>
            </div>

            {/* Container for Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {mode === 'menu' && (
                <div className="space-y-4">
                   {medicines.length > 0 && (
                     <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                       <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">Recent Items (Review Summaries)</p>
                       <div className="flex flex-wrap gap-2">
                         {medicines.slice(0, 3).map(m => (
                           <button 
                            key={m.id}
                            onClick={() => handleReviewSummary(m.name)}
                            className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 border border-blue-100 hover:border-blue-300 transition-all shadow-sm"
                           >
                            {m.name} Review
                           </button>
                         ))}
                       </div>
                     </div>
                   )}

                  <div className="grid grid-cols-1 gap-3">
                    {menuOptions.map((opt) => (
                      <motion.button
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          if (opt.id === 'summary') handleSend('Generate a summary of my current inventory.');
                          setMode(opt.id as any);
                        }}
                        key={opt.id}
                        className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                      >
                        <div className={`w-12 h-12 ${opt.color} text-white rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg`}>
                          {opt.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">{opt.label}</p>
                          <p className="text-xs text-gray-500 font-medium">{opt.desc}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'chat' && (
                <div className="space-y-4 pb-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white shadow-sm border border-gray-100 rounded-tl-none'}`}>
                        <div className="prose prose-sm prose-slate max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse font-bold p-2">
                    <Loader2 size={14} className="animate-spin" />
                    SafeShelf AI is computing...
                  </div>}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {mode === 'voice' && (
                <div className="flex flex-col items-center justify-center h-full py-10 space-y-6">
                  <AnimatePresence>
                    {showConfirm && (
                      <motion.div 
                        initial={{ opacity:0, y: 10 }}
                        animate={{ opacity:1, y: 0 }}
                        className="bg-white p-6 rounded-2xl shadow-xl border border-rose-100 flex flex-col gap-4 w-full"
                      >
                         <p className="text-sm font-bold text-slate-800">{showConfirm.data.message}</p>
                         <div className="flex gap-2">
                           <button 
                            onClick={() => { executeVoiceAction(showConfirm.action, showConfirm.data); setShowConfirm(null); }}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                           >
                            Confirm
                           </button>
                           <button 
                            onClick={() => setShowConfirm(null)}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                           >
                            Cancel
                           </button>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    animate={isListening ? { scale: [1, 1.1, 1], boxShadow: "0 0 40px rgba(59,130,246,0.3)" } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    onClick={toggleListening}
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-blue-600 text-white shadow-xl' : 'bg-slate-900 text-white shadow-lg'}`}
                  >
                    {isListening ? (
                      <div className="flex gap-1 items-center h-8">
                        {[1, 2, 3].map(i => (
                          <motion.div
                            key={i}
                            animate={{ height: [8, 32, 8] }}
                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                            className="w-1.5 bg-white rounded-full"
                          />
                        ))}
                      </div>
                    ) : ( transcript ? <Zap className="w-10 h-10" /> : <Mic className="w-10 h-10" /> )}
                  </motion.button>
                  <div className="text-center px-6">
                    <p className="font-bold text-gray-900 text-lg">
                      {isListening ? 'Listening...' : isLoading ? 'Thinking...' : 'Elysia Voice AI'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2 italic">
                      {isListening ? 'Speak now...' : transcript || 'Try "Add Crocin"'}
                    </p>
                  </div>
                </div>
              )}

              {mode === 'settings' && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">AI Voice Language</p>
                  <div className="grid grid-cols-1 gap-2">
                    {LANGUAGES.map(lang => (
                      <button 
                        key={lang.code}
                        onClick={() => setCurrentLang(lang.code)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currentLang === lang.code ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className="font-bold">{lang.native}</span>
                        <span className="text-xs opacity-60">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Overlay for Chat */}
            {(mode === 'chat' || mode === 'menu') && (
              <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
                <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={aiMode === 'quantis' ? "Ask Quantis for optimization or forecasting..." : "Ask Elysia about your health & home..."}
                    className="flex-1 px-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-slate-900 text-sm transition-all placeholder:text-slate-400"
                  />
                  <button 
                    type="submit" 
                    disabled={!input.trim() || isLoading}
                    className={`p-3 text-white rounded-xl transition-all disabled:opacity-50 ${aiMode === 'astra' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-black'}`}
                  >
                    <Send size={20}/>
                  </button>
                </form>
                {mode !== 'menu' && (
                  <div className="flex justify-center">
                    <button onClick={() => setMode('menu')} className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest flex items-center gap-1">
                      <X size={10} /> Exit to Menu
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center relative group cursor-pointer hover:bg-black transition-all"
      >
        <AnimatePresence mode="wait">
          {isOpen ? <X key="x" className="w-8 h-8" /> : <Bot key="bot" className="w-8 h-8" />}
        </AnimatePresence>
        {!isOpen && <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse" />}
      </motion.button>
    </div>
  );
}
