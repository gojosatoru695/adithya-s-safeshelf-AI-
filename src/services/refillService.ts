import type { Medicine } from '../types.ts';

export interface Deal {
  store: 'Blinkit' | 'Tata 1mg' | 'PharmEasy' | 'Nutrabay';
  price: number;
  deliveryTime: string;
  type: 'Cheapest' | 'Fastest' | 'Best Value';
  availability: 'In Stock' | 'Limited Stock' | 'Out of Stock';
}

export interface RefillPrediction {
  medicineId: string;
  name: string;
  daysLeft: number;
  expectedRefillDate: Date;
  status: 'critical' | 'warning' | 'stable';
  priority: 'Critical' | 'High' | 'Medium' | 'Stable';
  isLowStock: boolean;
  deals: Deal[];
  bestValueDeal?: Deal;
  reviewSummary: {
    packaging: number;
    delivery: number;
    trust: number;
    satisfaction: number;
  };
  confidenceScore: number;
}

export const refillService = {
  getPrediction: (medicine: Medicine): RefillPrediction => {
    const usage = medicine.usagePerDay || 1; 
    const daysLeft = Math.floor(medicine.quantity / usage);
    
    const expectedRefillDate = new Date();
    expectedRefillDate.setDate(expectedRefillDate.getDate() + daysLeft);

    let status: 'critical' | 'warning' | 'stable' = 'stable';
    let priority: 'Critical' | 'High' | 'Medium' | 'Stable' = 'Stable';

    if (daysLeft <= 3) {
      status = 'critical';
      priority = 'Critical';
    } else if (daysLeft <= 7) {
      status = 'warning';
      priority = 'High';
    } else if (daysLeft <= 14) {
      priority = 'Medium';
    }

    // Mock deals logic
    const basePrice = medicine.purchasePrice || 250;
    const stores: Deal['store'][] = ['Blinkit', 'Tata 1mg', 'PharmEasy', 'Nutrabay'];
    const deals: Deal[] = stores.map(store => ({
      store,
      price: Math.round(basePrice * (0.85 + Math.random() * 0.3)),
      deliveryTime: store === 'Blinkit' ? '15 mins' : '24-48 hours',
      type: 'Best Value',
      availability: Math.random() > 0.1 ? 'In Stock' : 'Limited Stock'
    }));

    // Tag deals
    const sortedByPrice = [...deals].sort((a, b) => a.price - b.price);
    sortedByPrice[0].type = 'Cheapest';
    
    const blinkitIndex = deals.findIndex(d => d.store === 'Blinkit');
    if (blinkitIndex !== -1) deals[blinkitIndex].type = 'Fastest';

    return {
      medicineId: medicine.id || '',
      name: medicine.name,
      daysLeft,
      expectedRefillDate,
      status,
      priority,
      isLowStock: daysLeft <= 5,
      deals,
      bestValueDeal: sortedByPrice[0],
      reviewSummary: {
        packaging: 80 + Math.floor(Math.random() * 20),
        delivery: 85 + Math.floor(Math.random() * 15),
        trust: 90 + Math.floor(Math.random() * 10),
        satisfaction: 88 + Math.floor(Math.random() * 12)
      },
      confidenceScore: 85 + Math.floor(Math.random() * 15)
    };
  },

  getAllPredictions: (medicines: Medicine[]): RefillPrediction[] => {
    return medicines
      .filter(m => m.usagePerDay > 0 || m.quantity < 10)
      .map(m => refillService.getPrediction(m))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }
};
