import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Search, 
  TrendingUp, 
  Truck, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  BarChart2, 
  DollarSign, 
  Zap,
  Info,
  Loader2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { geminiService } from '../services/geminiService.ts';

interface StoreDeal {
  store: string;
  price: number;
  eta: string;
  availability: boolean;
  offer?: string;
  isBestDeal?: boolean;
  isFastest?: boolean;
}

interface ProductComparison {
  name: string;
  deals: StoreDeal[];
}

export const CompareHub = ({ aiMode = 'astra' }: { aiMode?: 'astra' | 'quantis' }) => {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [comparison, setComparison] = useState<ProductComparison | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [reliability, setReliability] = useState<any>(null);

  const isQuantis = aiMode === 'quantis';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setIsLoading(true);
    try {
      const [marketData, reviewData] = await Promise.all([
        geminiService.getMarketComparison(search),
        geminiService.getReviewSummary(search)
      ]);
      
      if (marketData) {
        setComparison({
          name: marketData.productName,
          deals: marketData.deals
        });
      }
      if (reviewData) {
        setReliability(reviewData);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOrderUrl = (store: string, productName: string) => {
    const query = encodeURIComponent(productName);
    switch (store.toLowerCase()) {
      case 'tata 1mg':
      case '1mg':
        return `https://www.1mg.com/search/all?name=${query}`;
      case 'pharmeasy':
        return `https://pharmeasy.in/search/all?searchText=${query}`;
      case 'blinkit':
        return `https://blinkit.com/s/?q=${query}`;
      case 'netmeds':
        return `https://www.netmeds.com/catalogsearch/result?q=${query}`;
      default:
        return `https://www.google.com/search?q=buy+${query}+at+${encodeURIComponent(store)}`;
    }
  };

  const handleApplyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopyStatus(code);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const sortedDeals = useMemo(() => {
    if (!comparison) return [];
    return [...comparison.deals].sort((a, b) => a.price - b.price);
  }, [comparison]);

  // Initial load
  useEffect(() => {
    if (!comparison && !isLoading) {
      setSearch('Dolo 650mg');
      geminiService.getMarketComparison('Dolo 650mg')
        .then(data => {
          if (data) setComparison({ name: data.productName, deals: data.deals });
        })
        .catch(err => {
          console.error("Initial search failed:", err);
        });
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-display font-bold mb-4">Multi-Store Compare Hub</h2>
          <p className="text-slate-400 mb-8 max-w-xl">
            {isQuantis 
              ? "Quantis Optimization Engine: Analyzing price efficiency, delivery logistics, and quantity optimization across verified platforms."
              : "Astra Market Scout: Finding the best prices and delivery times across major stores for your home health."}
          </p>
          <form onSubmit={handleSearch} className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Search medicine or wellness product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-600"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="animate-spin text-indigo-400" size={18} />
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Deal List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
               <TrendingUp size={20} className="text-indigo-500" />
               Current Market Analysis: {comparison?.name || 'Searching...'}
            </h3>
            {isQuantis && (
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <BarChart2 size={12} /> Quantis Model Active
              </div>
            )}
          </div>

          <div className="space-y-4">
            {isLoading && (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-slate-300 mx-auto mb-4" size={32} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Grounded Market Sync Active...</p>
              </div>
            )}

            {!isLoading && sortedDeals.map((deal, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={deal.store}
                className={`bg-white rounded-3xl p-6 border transition-all flex items-center gap-6 group hover:shadow-lg ${deal.isBestDeal ? 'border-indigo-200 shadow-sm ring-1 ring-indigo-50' : 'border-slate-100 shadow-sm'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${deal.isBestDeal ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <ShoppingCart size={24} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-bold text-slate-900">{deal.store}</h4>
                    {deal.isBestDeal && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">🏆 Best Price</span>}
                    {deal.isFastest && <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">⚡ Fastest</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><Truck size={12} /> {deal.eta}</span>
                    {deal.offer && <span className="text-emerald-600 flex items-center gap-1"><Zap size={12} /> {deal.offer}</span>}
                  </div>
                </div>

                <div className="text-right shrink-0 mr-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price</p>
                  <p className="text-2xl font-display font-bold text-slate-900">₹{deal.price}</p>
                </div>

                <a 
                  href={getOrderUrl(deal.store, comparison?.name || search)}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex items-center gap-2 px-6 py-3 bg-slate-900 group-hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                >
                  Order Now <ExternalLink size={12} />
                </a>
              </motion.div>
            ))}
          </div>

          {isQuantis && !isLoading && comparison && (
             <div className="mt-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
               <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                 <BarChart2 className="text-indigo-500" /> Quantis: Mathematical Analysis
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price Comparison Bar Chart Mockup using Tailwind */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price Efficiency (Lower is Better)</p>
                    <div className="space-y-3">
                      {sortedDeals.map(d => (
                        <div key={d.store} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>{d.store}</span>
                            <span>₹{d.price}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${(d.price / Math.max(...sortedDeals.map(x => x.price))) * 100}%` }}
                               className={`h-full rounded-full ${d.isBestDeal ? 'bg-indigo-600' : 'bg-slate-400'}`}
                             />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Savings Potential</p>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100">
                       <p className="text-3xl font-display font-bold text-indigo-600 mb-2">₹{(sortedDeals[sortedDeals.length-1].price - sortedDeals[0].price).toFixed(2)}</p>
                       <p className="text-xs text-slate-500 font-medium">Potential savings on next refill by switching to <span className="text-indigo-600 font-bold">{sortedDeals[0].store}</span>.</p>
                       <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                          <TrendingUp size={14} /> Efficiency Gain Mode
                       </div>
                    </div>
                  </div>
               </div>
             </div>
          )}
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200">
              <h4 className="font-bold mb-4 flex items-center gap-2 text-lg">
                 <Zap size={18} className="text-amber-300" /> Smart Choice Code
              </h4>
              <p className="text-sm font-medium opacity-90 leading-relaxed mb-6">
                Tata 1mg currently offers an additional 15% discount using the code below. Valid on first 3 orders.
              </p>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20 mb-6 flex items-center justify-between group/code relative">
                 <span className="font-mono font-bold tracking-tighter text-xl">HEALTH15</span>
                 <button 
                  onClick={() => handleApplyCode('HEALTH15')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                 >
                   {copyStatus === 'HEALTH15' ? <CheckCircle2 size={18} className="text-emerald-300" /> : <Copy size={18} />}
                 </button>
                 <AnimatePresence>
                  {copyStatus === 'HEALTH15' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-[10px] px-2 py-1 rounded-md"
                    >
                      COPIED
                    </motion.div>
                  )}
                 </AnimatePresence>
              </div>
              <button 
                onClick={() => handleApplyCode('HEALTH15')}
                className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Apply Deal Code <ArrowRight size={16} />
              </button>
           </div>

           <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Truck className="text-slate-400" /> Delivery Logistics
              </h4>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Fastest Route</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Blinkit delivers in under 15 mins via local micro-warehouse.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Inventory Status</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">All 4 platforms currently have the requested SKU in stock.</p>
                  </div>
                </div>
              </div>
           </div>

           {reliability && (
             <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" /> Review Reliability Meter
                  </h4>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                       <svg className="w-full h-full transform -rotate-90">
                         <circle
                           cx="64"
                           cy="64"
                           r="58"
                           stroke="currentColor"
                           strokeWidth="8"
                           fill="transparent"
                           className="text-slate-100"
                         />
                         <motion.circle
                           cx="64"
                           cy="64"
                           r="58"
                           stroke="currentColor"
                           strokeWidth="8"
                           strokeDasharray={364}
                           initial={{ strokeDashoffset: 364 }}
                           animate={{ strokeDashoffset: 364 - (364 * reliability.reliabilityScore) / 100 }}
                           fill="transparent"
                           className="text-indigo-600"
                         />
                       </svg>
                       <span className="absolute text-2xl font-display font-bold">{reliability.reliabilityScore}%</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 capitalize tracking-widest">{reliability.reliabilityScore > 80 ? 'High Confidence' : 'Moderate Confidence'}</p>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(reliability.summary).map(([key, val]) => (
                      <div key={key} className="text-[10px]">
                        <span className="font-bold text-slate-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        <p className="text-slate-500 line-clamp-2">{val as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
