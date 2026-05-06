import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, List, Grid, ArrowUpDown, Plus, 
  Download, Mic, Package, AlertCircle, Calendar, 
  Trash2, Edit3, ExternalLink, Activity, Info, 
  CheckCircle2, AlertTriangle, MoreVertical, LayoutGrid,
  TrendingUp, TrendingDown, DollarSign
} from 'lucide-react';
import { Medicine, Category } from '../types.ts';
import { inventoryService } from '../services/inventoryService.ts';

interface InventoryDashboardProps {
  items: Medicine[];
  onRefresh: () => void;
  onEdit: (item: Medicine) => void;
  onScan: () => void;
  elderlyMode?: boolean;
}

export const InventoryDashboard = ({ items, onRefresh, onEdit, onScan, elderlyMode = false }: InventoryDashboardProps) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<Category | 'All'>('All');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    expiryStatus: 'all',
    stockStatus: 'all',
    minConfidence: 0,
    sortBy: 'expiry_near'
  });

  const categories: (Category | 'All')[] = [
    'All', 'Medicine', 'Supplement', 'Food', 'Chemical', 'Fertilizer', 'Personal Care', 'Household', 'Other'
  ];

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(s) || 
        i.brand?.toLowerCase().includes(s) || 
        i.type.toLowerCase().includes(s)
      );
    }

    // Category
    if (activeTab !== 'All') {
      result = result.filter(i => i.type === activeTab);
    }

    // Expiry Status
    const today = new Date();
    if (filters.expiryStatus === 'expired') {
      result = result.filter(i => new Date(i.expiryDate?.seconds * 1000 || i.expiryDate) < today);
    } else if (filters.expiryStatus === 'expiring') {
      const weekOut = new Date(Date.now() + 7 * 86400000);
      result = result.filter(i => {
        const d = new Date(i.expiryDate?.seconds * 1000 || i.expiryDate);
        return d > today && d < weekOut;
      });
    }

    // Stock
    if (filters.stockStatus === 'low') {
      result = result.filter(i => i.quantity < 5); // Simple threshold
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.expiryDate?.seconds * 1000 || a.expiryDate).getTime();
      const dateB = new Date(b.expiryDate?.seconds * 1000 || b.expiryDate).getTime();
      
      switch (filters.sortBy) {
        case 'expiry_near': return dateA - dateB;
        case 'expiry_far': return dateB - dateA;
        case 'confidence': return b.confidence - a.confidence;
        case 'quantity': return b.quantity - a.quantity;
        case 'cost': return (b.estimatedValue || 0) - (a.estimatedValue || 0);
        case 'recent': return new Date(b.updatedAt?.seconds * 1000 || b.updatedAt).getTime() - new Date(a.updatedAt?.seconds * 1000 || a.updatedAt).getTime();
        case 'alpha': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return result;
  }, [items, search, activeTab, filters]);

  const stats = useMemo(() => {
    const today = new Date();
    const sevenDays = new Date(Date.now() + 7 * 86400000);
    
    return {
      total: items.length,
      expiringSoon: items.filter(i => {
        const d = new Date(i.expiryDate?.seconds * 1000 || i.expiryDate);
        return d > today && d < sevenDays;
      }).length,
      expired: items.filter(i => new Date(i.expiryDate?.seconds * 1000 || i.expiryDate) < today).length,
      lowStock: items.filter(i => i.quantity < 5).length,
      totalValue: items.reduce((sum, i) => sum + (i.estimatedValue || 0), 0)
    };
  }, [items]);

  const handleDeleteMany = async () => {
    if (window.confirm(`Delete ${selectedItems.length} items?`)) {
      await Promise.all(selectedItems.map(id => inventoryService.deleteMedicine(id)));
      setSelectedItems([]);
      onRefresh();
    }
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 95) return { label: 'Excellent', color: 'text-emerald-500 bg-emerald-50', border: 'border-emerald-100' };
    if (score >= 80) return { label: 'Good', color: 'text-blue-500 bg-blue-50', border: 'border-blue-100' };
    if (score >= 60) return { label: 'Medium', color: 'text-amber-500 bg-amber-50', border: 'border-amber-100' };
    return { label: 'Verify', color: 'text-rose-500 bg-rose-50', border: 'border-rose-100' };
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.onstart = () => setIsVoiceSearching(true);
    recognition.onresult = (e: any) => {
      setSearch(e.results[0][0].transcript);
      setIsVoiceSearching(false);
    };
    recognition.onerror = () => setIsVoiceSearching(false);
    recognition.start();
  };

  return (
    <div className={`space-y-8 ${elderlyMode ? 'max-w-5xl mx-auto' : ''}`}>
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className={`${elderlyMode ? 'text-4xl' : 'text-3xl'} font-black text-slate-900 tracking-tight`}>My Inventory</h1>
          <p className={`${elderlyMode ? 'text-xl' : 'text-sm'} font-bold text-slate-400 mt-1`}>Manage products, health items & chemicals</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onScan}
            className="px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus size={24} /> <span>Scan New Item</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Items', val: stats.total, icon: <Package />, color: 'blue' },
          { label: 'Expiring Soon', val: stats.expiringSoon, icon: <AlertCircle />, color: 'amber' },
          { label: 'Expired', val: stats.expired, icon: <AlertTriangle />, color: 'rose' },
          { label: 'Low Stock', val: stats.lowStock, icon: <Activity />, color: 'orange' },
          { label: 'Total Value', val: `$${stats.totalValue.toFixed(0)}`, icon: <DollarSign />, color: 'emerald' }
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-xl font-black text-slate-900">{stat.val}</p>
          </motion.div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md py-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search bar */}
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, brand, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-16 pr-20 py-5 bg-white border-2 border-slate-100 rounded-[2rem] font-bold text-slate-700 focus:border-blue-500 transition-all shadow-sm"
            />
            <button 
              onClick={startVoiceSearch}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all ${isVoiceSearching ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-white'}`}
            >
              <Mic size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-6 py-4 rounded-[1.5rem] whitespace-nowrap text-sm font-black transition-all ${
                  activeTab === cat 
                    ? 'bg-slate-900 text-white shadow-xl' 
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border-2 border-slate-100">
              <ArrowUpDown size={14} className="text-slate-400" />
              <select 
                value={filters.sortBy}
                onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                className="bg-transparent border-none text-xs font-black text-slate-600 focus:ring-0 p-0"
              >
                <option value="expiry_near">Nearest Expiry</option>
                <option value="expiry_far">Latest Expiry</option>
                <option value="recent">Recently Added</option>
                <option value="quantity">Stock Level</option>
                <option value="cost">Item Value</option>
                <option value="confidence">Astra Confidence</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border-2 border-slate-100">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={filters.expiryStatus}
                onChange={(e) => setFilters(f => ({ ...f, expiryStatus: e.target.value }))}
                className="bg-transparent border-none text-xs font-black text-slate-600 focus:ring-0 p-0"
              >
                <option value="all">All Expiry</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white rounded-2xl p-1 border-2 border-slate-100">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-10 py-6 rounded-[3rem] shadow-2xl flex items-center gap-8"
          >
            <p className="text-lg font-black">{selectedItems.length} selected</p>
            <div className="w-[1px] h-8 bg-white/20" />
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all">
                <Download size={18} /> Export
              </button>
              <button 
                onClick={handleDeleteMany}
                className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-2xl text-sm font-bold transition-all"
              >
                <Trash2 size={18} /> Delete Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Items Display */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-4'}>
        {filteredItems.map((item, idx) => {
          const confidence = getConfidenceLevel(item.confidence || 0);
          const isSelected = selectedItems.includes(item.id!);
          const today = new Date();
          const expDate = new Date(item.expiryDate?.seconds * 1000 || item.expiryDate);
          const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
          
          let statusColor = 'bg-blue-600';
          if (daysLeft < 0) statusColor = 'bg-rose-600';
          else if (daysLeft < 7) statusColor = 'bg-amber-500';
          else if (item.quantity < 5) statusColor = 'bg-orange-500';
          else if (daysLeft < 30) statusColor = 'bg-blue-400';

          return (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => {
                if (selectedItems.length > 0) {
                  setSelectedItems(prev => isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id!]);
                }
              }}
              className={`group bg-white rounded-[3rem] border-2 transition-all cursor-pointer relative overflow-hidden h-full ${
                isSelected ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-50 hover:border-blue-100 hover:shadow-2xl hover:shadow-slate-200'
              } ${viewMode === 'table' ? 'flex items-center p-6 gap-6' : 'p-8 flex flex-col'}`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${statusColor} opacity-[0.03] -mr-16 -mt-16 rounded-full`} />
              
              <div className={viewMode === 'table' ? 'w-24 h-24 shrink-0' : 'mb-8 flex items-start justify-between'}>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItems(prev => isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id!]);
                  }}
                  className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <Package size={28} />
                </div>
                
                {viewMode === 'grid' && (
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${confidence.color} ${confidence.border}`}>
                    {confidence.label} {item.confidence}%
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-blue-600 px-2 py-0.5 bg-blue-50 rounded-md uppercase tracking-widest">{item.type}</span>
                    {item.brand && <span className="text-xs font-bold text-slate-400">• {item.brand}</span>}
                  </div>
                  <h3 className={`${elderlyMode ? 'text-2xl' : 'text-xl'} font-black text-slate-900 group-hover:text-blue-600 transition-colors`}>{item.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                       <span className="text-xs font-black text-slate-700">
                         {daysLeft < 0 ? 'Expired' : daysLeft < 7 ? 'Expiring Soon' : 'Safe'}
                       </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                    <p className="text-xs font-black text-slate-700">{daysLeft < 0 ? 'Exceeded' : `${daysLeft} Days`}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Stock Level</span>
                    <span className="text-slate-900">{item.quantity} {item.unit}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (item.quantity / (item.totalQuantity || 50)) * 100)}%` }}
                      className={`h-full ${statusColor}`} 
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-slate-400" />
                    <span className="text-sm font-black text-slate-700">${(item.estimatedValue || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                      <ExternalLink size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">No items found</h2>
          <p className="text-slate-400 font-bold max-w-sm mx-auto mt-2">Try adjusting your search or filters to see more from your inventory.</p>
        </div>
      )}
    </div>
  );
};
