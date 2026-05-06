import type { Medicine } from '../types.ts';

export interface SmartRefillRecommendation {
  itemId: string;
  name: string;
  category: string;
  score: number; // 0-100
  confidence: number; // 0-100
  reason: string;
  price: number;
  depletionDays: number;
}

export function calculateSmartRefillScores(medicines: Medicine[], monthlyBudget: number): SmartRefillRecommendation[] {
  const recommendations: SmartRefillRecommendation[] = medicines.map(item => {
    const usage = item.usagePerDay || 1;
    const depletionDays = item.quantity / usage;
    
    // 1. Urgency Score (40% weight)
    // Low depletion days = high urgency. If < 3 days, max score.
    const urgencyScore = Math.max(0, Math.min(100, (30 - depletionDays) * 3.33));

    // 2. Expiry Risk Score (20% weight)
    // Days until expiry. < 7 days = high risk.
    const now = new Date();
    const expiryDate = (item.expiryDate && typeof item.expiryDate.toDate === 'function') 
      ? item.expiryDate.toDate() 
      : new Date(item.expiryDate);
    const daysToExpiry = Math.max(0, (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expiryRiskScore = Math.max(0, Math.min(100, (30 - daysToExpiry) * 3.33));

    // 3. Affordability Score (20% weight)
    // Higher if the price is a small fraction of the budget.
    const itemPrice = item.estimatedValue || item.purchasePrice || 0;
    const affordabilityScore = monthlyBudget > 0 
      ? Math.max(0, Math.min(100, (1 - (itemPrice / monthlyBudget)) * 100))
      : 50;

    // 4. Historical Priority Score (20% weight)
    // If not refilled in 30 days, higher priority.
    let historicalPriorityScore = 50;
    if (item.lastRefilledAt) {
      const lastRefilled = (item.lastRefilledAt && typeof item.lastRefilledAt.toDate === 'function') 
        ? item.lastRefilledAt.toDate() 
        : new Date(item.lastRefilledAt);
      const daysSinceRefill = (now.getTime() - lastRefilled.getTime()) / (1000 * 60 * 60 * 24);
      historicalPriorityScore = Math.min(100, daysSinceRefill * 3.33);
    }

    // Weighted Score
    const finalScore = (
      (urgencyScore * 0.4) + 
      (expiryRiskScore * 0.2) + 
      (affordabilityScore * 0.2) + 
      (historicalPriorityScore * 0.2)
    );

    // Contextual Reason
    let reason = "Stable stock";
    if (urgencyScore > 80 && affordabilityScore > 70) reason = "Low stock + affordable";
    else if (urgencyScore > 80) reason = "Low stock + high usage";
    else if (expiryRiskScore > 80) reason = "Expiring soon";
    else if (affordabilityScore > 80) reason = "Within budget";
    else if (historicalPriorityScore > 80) reason = "Long time since last refill";

    // Confidence Score
    // Based on how "extreme" the factors are.
    const confidence = Math.min(100, Math.max(50, finalScore + 10));

    return {
      itemId: item.id || '',
      name: item.name,
      category: item.type,
      score: Math.round(finalScore),
      confidence: Math.round(confidence),
      reason,
      price: itemPrice,
      depletionDays: Math.round(depletionDays * 10) / 10
    };
  });

  // Filter out items that are very stable (score < 20) and sort by score descending
  return recommendations
    .sort((a, b) => b.score - a.score);
}
