import { Medicine } from './inventoryService.ts';

export interface RefillPrediction {
  medicineId: string;
  name: string;
  daysLeft: number;
  expectedRefillDate: Date;
  status: 'critical' | 'warning' | 'stable';
  isLowStock: boolean;
}

export const refillService = {
  getPrediction: (medicine: Medicine): RefillPrediction => {
    const usage = medicine.usagePerDay || 1; // Fallback to 1 if not set
    const daysLeft = Math.floor(medicine.quantity / usage);
    
    const expectedRefillDate = new Date();
    expectedRefillDate.setDate(expectedRefillDate.getDate() + daysLeft);

    let status: 'critical' | 'warning' | 'stable' = 'stable';
    if (daysLeft <= 3) status = 'critical';
    else if (daysLeft <= 7) status = 'warning';

    return {
      medicineId: medicine.id || '',
      name: medicine.name,
      daysLeft,
      expectedRefillDate,
      status,
      isLowStock: daysLeft <= 5
    };
  },

  getAllPredictions: (medicines: Medicine[]): RefillPrediction[] => {
    return medicines
      .filter(m => m.usagePerDay > 0)
      .map(m => refillService.getPrediction(m))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }
};
