import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles, AlertCircle, 
  ShoppingCart, BarChart2, Mic, MicOff, Globe, Settings2, Zap,
  Download, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { geminiService } from '../services/geminiService.ts';
import { inventoryService } from '../services/inventoryService.ts';
import type { Medicine } from '../types.ts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
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

const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en-IN', label: 'English', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' }
];

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
    { 
      id: 'welcome', 
      role: 'assistant', 
      content: `### 🌟 Welcome to SafeShelf AI\n\nI am your **${aiMode === 'astra' ? 'Astra Clinical Care Guardian' : 'Quantis Mathematical Optimizer'}**, actively connected to your **${medicines.length} vault medications**.\n\nAsk me about **drug-food interactions**, **30-day replenishment forecasts**, **cheaper generic equivalents**, or speak to me directly in English, Hindi, Telugu, or Kannada.`, 
      timestamp: new Date(),
      suggestions: [
        '🚨 Run full safety & interaction check',
        '📉 Forecast 30-day medication budget',
        '🥗 Which meds require food?',
        '💊 Find generic equivalents for my cabinet'
      ]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentLang, setCurrentLang] = useState<LanguageCode>(
    language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : language === 'Kannada' ? 'kn-IN' : 'en-IN'
  );
  const [showConfirm, setShowConfirm] = useState<{ action: string; data: any } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { 
    if (mode === 'chat') scrollToBottom(); 
  }, [messages, mode]);

  // Voice speech synthesis
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[#*|`\[\]\(\)]/g, '').replace(/:---/g, '').substring(0, 240);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = currentLang;
        utterance.pitch = 1.0;
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("Speech synthesis failed", e);
      }
    }
  }, [currentLang]);

  // Voice recognition toggle
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => { 
      setIsListening(true); 
      setTranscript('Listening for command...'); 
    };

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
      console.error('Voice processing error:', e);
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
        case 'COMPARE_PRICE':
          onCommand('tab', 'compare');
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
        case 'LOG_DOSE':
          const medToLog = medicines.find(m => 
            m.id === target || 
            (entities?.item_name && m.name.toLowerCase().includes(entities.item_name.toLowerCase()))
          ) || medicines[0];
          if (medToLog) {
            await inventoryService.logDose(medToLog.id!, medToLog.name, 'taken', 'SafeShelf Voice Agent');
          }
          break;
      }
      
      speak(result.message);
      setMessages(prev => [
        ...prev, 
        { id: Date.now().toString(), role: 'user', content: transcript, timestamp: new Date() },
        { id: (Date.now() + 1).toString(), role: 'assistant', content: result.message, timestamp: new Date() }
      ]);
      onRefresh?.();
    } catch (e) {
      console.error("Voice execution failure:", e);
    }
  };

  // Main Chat Handler
  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setMode('chat');

    try {
      const historyContext = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
      const response = await geminiService.chatQuery(text, medicines, aiMode, historyContext, language);
      
      setMessages(prev => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: response.content, 
          suggestions: response.suggestions,
          timestamp: new Date() 
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev, 
        { id: 'err', role: 'assistant', content: 'AI Service error. Please retry in a moment.', timestamp: new Date() }
      ]);
    } finally { 
      setIsLoading(false); 
    }
  };

  // Export consultation to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('SafeShelf AI: Clinical & Medication Audit Log', 14, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | Engine: ${aiMode.toUpperCase()}`, 14, 28);
    doc.text(`Connected Vault: ${medicines.length} Monitored Items`, 14, 34);
    
    let y = 45;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 38, 196, 38);

    messages.forEach((msg, index) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(msg.role === 'user' ? 37 : 14, msg.role === 'user' ? 99 : 116, msg.role === 'user' ? 235 : 144);
      doc.text(`${msg.role === 'user' ? 'User Question' : 'SafeShelf AI Analysis'} (${msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`, 14, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      
      const cleanContent = msg.content.replace(/[#*|`\[\]]/g, '').replace(/:---/g, '');
      const lines = doc.splitTextToSize(cleanContent, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 8;
    });

    doc.save(`SafeShelf_Consultation_${Date.now()}.pdf`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="absolute bottom-20 right-0 w-[450px] max-w-[calc(100vw-2rem)] min-h-[580px] max-h-[calc(100vh-7rem)] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col z-[210]"
          >
            {/* Header */}
            <div className={`p-6 text-white flex flex-col transition-colors ${aiMode === 'astra' ? 'bg-gradient-to-r from-blue-700 to-indigo-800' : 'bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                    {aiMode === 'quantis' ? <Zap className="text-amber-300" size={22} /> : <Sparkles className="text-blue-200" size={22} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold tracking-tight text-lg">
                        {aiMode === 'astra' ? 'Astra Clinical Guardian' : 'Quantis Optimizer'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-wider">
                        v3.7 AI
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      RAG Live Sync: {medicines.length} Vault Items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {messages.length > 2 && (
                    <button
                      onClick={handleExportPDF}
                      title="Export Chat to PDF"
                      className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all cursor-pointer"
                    >
                      <Download size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Mode Toggle Bar */}
              <div className="flex bg-black/30 backdrop-blur-md rounded-2xl p-1 gap-1 border border-white/10">
                <button 
                  onClick={() => setAiMode('astra')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    aiMode === 'astra' 
                      ? 'bg-white text-blue-800 shadow-md scale-100' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sparkles size={13} /> Astra (Clinical Care)
                </button>
                <button 
                  onClick={() => setAiMode('quantis')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    aiMode === 'quantis' 
                      ? 'bg-white text-slate-900 shadow-md scale-100' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Zap size={13} /> Quantis (Optimization)
                </button>
              </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/70 space-y-4">
              {mode === 'menu' && (
                <div className="space-y-4">
                  {/* Action Cards Grid */}
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      onClick={() => setMode('chat')}
                      className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Interactive AI Consultation</p>
                          <p className="text-xs text-slate-400">Ask questions with live medication context</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </button>

                    <button
                      onClick={() => setMode('voice')}
                      className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-rose-200 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mic size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Multilingual Voice Agent</p>
                          <p className="text-xs text-slate-400">Speak commands in English, Hindi, Telugu, or Kannada</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-rose-600 transition-colors" />
                    </button>

                    <button
                      onClick={() => {
                        onCommand('tab', 'compare');
                        setIsOpen(false);
                      }}
                      className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ShoppingCart size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Multi-Store Price Compare Hub</p>
                          <p className="text-xs text-slate-400">Compare Blinkit, Tata 1mg, PharmEasy & Netmeds</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </button>
                  </div>

                  {/* Preset Recommended Prompts */}
                  <div className="pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2.5">
                      Suggested Instant Analyses
                    </p>
                    <div className="space-y-2">
                      {[
                        '🚨 Run comprehensive drug interaction & safety audit',
                        '📉 Forecast 30-day medication budget & stockout dates',
                        '🥗 Which of my medications require strict meal timing?',
                        '💊 Find cheaper generic formulations for my vault'
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="w-full p-3 bg-white hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 rounded-xl text-left text-xs font-semibold text-slate-700 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate">{prompt}</span>
                          <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === 'chat' && (
                <div className="space-y-4 pb-2">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div 
                        className={`max-w-[92%] p-4 rounded-3xl text-xs leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-slate-900 text-white rounded-tr-none shadow-md font-medium' 
                            : 'bg-white shadow-sm border border-slate-200/80 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed font-sans">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Suggestions list from AI */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[92%]">
                          {msg.suggestions.map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(sug)}
                              className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 rounded-xl text-[11px] font-bold transition-all shadow-2xs text-left cursor-pointer"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-2.5 text-xs text-blue-700 font-bold p-3 bg-blue-50/80 rounded-2xl border border-blue-100 w-fit animate-pulse">
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      SafeShelf AI is generating clinical & supply insights...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {mode === 'voice' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  <div className="relative">
                    <motion.button
                      animate={isListening ? { scale: [1, 1.08, 1], boxShadow: "0 0 50px rgba(37, 99, 235, 0.4)" } : {}}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      onClick={toggleListening}
                      className={`w-28 h-28 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isListening 
                          ? 'bg-blue-600 text-white shadow-2xl' 
                          : 'bg-slate-900 text-white shadow-xl hover:bg-black'
                      }`}
                    >
                      {isListening ? (
                        <div className="flex gap-1.5 items-center h-8">
                          {[1, 2, 3, 4].map(i => (
                            <motion.div
                              key={i}
                              animate={{ height: [8, 36, 8] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                              className="w-1.5 bg-white rounded-full"
                            />
                          ))}
                        </div>
                      ) : (
                        <Mic size={36} />
                      )}
                    </motion.button>
                  </div>

                  <div className="text-center px-4 space-y-2">
                    <p className="font-extrabold text-slate-900 text-base">
                      {isListening ? 'Elysia is listening...' : isLoading ? 'Analyzing intent...' : 'Tap to speak with SafeShelf Voice'}
                    </p>
                    <p className="text-xs text-slate-400 font-medium max-w-xs">
                      {isListening 
                        ? 'Speak clearly in your chosen language...' 
                        : transcript ? `"${transcript}"` : 'Try: "Add 2 boxes of Paracetamol" or "Compare price for Dolo"'}
                    </p>
                  </div>

                  {/* Language Selector in Voice */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setCurrentLang(lang.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentLang === lang.code 
                            ? 'bg-white text-blue-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {lang.native}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Overlay */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2.5">
              <form 
                onSubmit={e => { 
                  e.preventDefault(); 
                  handleSend(); 
                }} 
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={
                    aiMode === 'quantis' 
                      ? "Ask Quantis: forecast cost, compare deals, optimize refills..." 
                      : "Ask Astra: drug interactions, meal relations, safety warnings..."
                  }
                  className="flex-1 px-4 py-3.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400"
                />
                
                <button 
                  type="button"
                  onClick={() => setMode('voice')}
                  className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all cursor-pointer"
                  title="Speak Voice Command"
                >
                  <Mic size={18} />
                </button>

                <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading}
                  className={`p-3.5 text-white rounded-2xl transition-all disabled:opacity-40 cursor-pointer ${
                    aiMode === 'astra' 
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20' 
                      : 'bg-slate-900 hover:bg-black shadow-md shadow-slate-900/20'
                  }`}
                >
                  <Send size={18} />
                </button>
              </form>

              {mode !== 'menu' && (
                <div className="flex items-center justify-between px-1">
                  <button 
                    onClick={() => setMode('menu')} 
                    className="text-[10px] font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    ← Main Menu
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Language: {LANGUAGES.find(l => l.code === currentLang)?.label}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Launcher Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[1.75rem] shadow-2xl flex items-center justify-center relative group cursor-pointer transition-all ${
          aiMode === 'astra' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30' : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/30'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <X key="x" size={28} />
          ) : (
            <div className="relative">
              <Bot key="bot" size={28} />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
