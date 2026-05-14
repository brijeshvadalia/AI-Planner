import type { ParsedPreferences, Activity, FoodOption, CostEstimate } from '../types';

export function estimateCost(
  prefs: ParsedPreferences,
  activities: Activity[],
  foodOptions: FoodOption[]
): CostEstimate {
  const breakdown = [];

  // Activities (pick top 2 for time feasibility)
  const selectedActivities = activities.slice(0, 2);
  for (const activity of selectedActivities) {
    breakdown.push({
      label: activity.name,
      amount: activity.cost,
      type: 'activity' as const,
    });
  }

  // Food (pick top 1-2 based on hours available)
  const mealsCount = prefs.hoursAvailable >= 5 ? 2 : 1;
  const selectedFood = foodOptions.slice(0, mealsCount);
  for (const food of selectedFood) {
    breakdown.push({
      label: food.name,
      amount: food.pricePerPerson,
      type: 'food' as const,
    });
  }

  // Transport estimate
  const transportEstimate = Math.round(prefs.budget * 0.08);
  breakdown.push({
    label: 'Transport (estimated)',
    amount: transportEstimate,
    type: 'transport' as const,
  });

  const totalEstimated = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const withinBudget = totalEstimated <= prefs.budget;
  const bufferAmount = prefs.budget - totalEstimated;

  let warningMessage: string | undefined;
  if (!withinBudget) {
    warningMessage = `Estimated cost (${prefs.currencySymbol}${totalEstimated}) slightly exceeds budget (${prefs.currencySymbol}${prefs.budget}). The plan has been adjusted to fit — see trade-offs noted in each slot.`;
  } else if (bufferAmount > prefs.budget * 0.3) {
    warningMessage = `You have a comfortable ${prefs.currencySymbol}${bufferAmount} buffer. Consider upgrading one meal or adding an extra activity.`;
  }

  return {
    totalEstimated,
    breakdown,
    withinBudget,
    bufferAmount,
    warningMessage,
  };
}
