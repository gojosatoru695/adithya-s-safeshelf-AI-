import React, { useState } from 'react';
import { ShoppingCart, Zap, Clock, Package, ExternalLink, ArrowRight, CheckCircle2, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Medicine } from '../services/inventoryService.ts';
import { refillService, RefillPrediction } from '../services/refillService.ts';

interface RefillCenterProps {
  medicines: Medicine[];
  isPremium?: boolean;
}

export const RefillCenter = ({ medicines, isPremium = false }: RefillCenterProps) => {
  const predictions = refillService.getAllPredictions(medicines);
  const [selectedPrediction, setSelectedPrediction] = useState<RefillPrediction | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);

  const startSimulation = (prediction: RefillPrediction) => {
    setSelectedPrediction(prediction);
    if (isPremium) {
      setIsSimulating(true);
      setSimulationStep(1);
      
      const steps = [
        { label: 'Analyzing stock levels...', delay: 1000 },
        { label: 'Dispatching SafeShelf Drone...', delay: 2000 },
        { label: 'En route to your location...', delay: 2500 },
        { label: 'Order Confirmed - Arriving in 15 mins', delay: 1500 }
      ];

      let currentDelay = 0;
      steps.forEach((step, index) => {
        currentDelay += step.delay;
        setTimeout(() => {
          setSimulationStep(index + 2);
          if (index === steps.length - 1) {
            // End simulation
          }
        }, currentDelay);
      });
    } else {
      // Blinkit / External Redirect
      window.open(`https://www.blinkit.com/s/?q=${prediction.name}`, '_blank');
    }
  };

  if (predictions.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingDown className="text-amber-500" size={20} /> Smart Refills
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Predicted by usage</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {predictions.slice(0, 3).map((prediction) => (
          <div 
            key={prediction.medicineId}
            className={`p-6 rounded-[2rem] border transition-all ${
              prediction.status === 'critical' 
                ? 'bg-red-50 border-red-100' 
                : prediction.status === 'warning'
                ? 'bg-amber-50 border-amber-100'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  prediction.status === 'critical' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Package size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{prediction.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">Approx. {prediction.daysLeft} days of stock left</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Refill Date</p>
                <p className="text-sm font-bold text-slate-900">
                  {prediction.expectedRefillDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            <button 
              onClick={() => startSimulation(prediction)}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isPremium 
                  ? 'bg-slate-900 text-white hover:bg-black' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isPremium ? (
                <> <Zap size={16} /> Instant SafeShelf Refill</>
              ) : (
                <> <ExternalLink size={16} /> Order on Blinkit</>
              )}
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isSimulating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
                 <Zap size={40} className={simulationStep < 5 ? "animate-pulse" : ""} />
                 {simulationStep === 5 && (
                   <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-4 border-white"
                   >
                     <CheckCircle2 size={16} />
                   </motion.div>
                 )}
              </div>

              <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">SafeShelf Delivery</h3>
              <p className="text-sm text-slate-400 mb-8 font-medium">Refilling {selectedPrediction?.name}</p>

              <div className="space-y-4 mb-10">
                {[
                   'Verifying stock requirements',
                   'Allocating nearest fulfillment node',
                   'Deploying hyper-local courier',
                   'Delivery successfully scheduled'
                ].map((label, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      simulationStep > i + 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                    }`}>
                      {simulationStep > i + 1 ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </div>
                    <span className={`text-xs font-bold ${
                      simulationStep === i + 2 ? 'text-blue-600' : 
                      simulationStep > i + 2 ? 'text-slate-900' : 'text-slate-300'
                    }`}>{label}</span>
                  </div>
                ))}
              </div>

              {simulationStep >= 5 ? (
                <button 
                  onClick={() => setIsSimulating(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  Close <ArrowRight size={18} />
                </button>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
