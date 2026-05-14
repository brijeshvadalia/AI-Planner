import type { ParsedPreferences, Activity, FoodOption, CostEstimate, ValidationResult } from '../types';

export function validatePlan(
  prefs: ParsedPreferences,
  activities: Activity[],
  foodOptions: FoodOption[],
  costEstimate: CostEstimate
): ValidationResult {
  const issues = [];
  const constraintsMet: string[] = [];
  const constraintsViolated: string[] = [];
  const adjustmentsNeeded: string[] = [];

  // ── Budget check ────────────────────────────────────────────────────────────
  if (!costEstimate.withinBudget) {
    issues.push({
      type: 'warning' as const,
      field: 'budget',
      message: `Estimated total (${prefs.currencySymbol}${costEstimate.totalEstimated}) slightly exceeds budget of ${prefs.currencySymbol}${prefs.budget}.`,
    });
    adjustmentsNeeded.push('Swap one paid activity for a free alternative to reduce costs.');
  } else {
    constraintsMet.push(`Budget of ${prefs.currencySymbol}${prefs.budget} — plan fits within budget.`);
  }

  // ── Vegetarian check ────────────────────────────────────────────────────────
  const isVegetarian = prefs.constraints.some((c) =>
    c.toLowerCase().includes('vegetarian') || c.toLowerCase().includes('veg')
  );
  if (isVegetarian) {
    const nonVegFood = foodOptions.filter(
      (f) => !f.dietaryOptions.some((d) => d.includes('vegetarian') || d.includes('vegan'))
    );
    if (nonVegFood.length > 0) {
      issues.push({
        type: 'error' as const,
        field: 'dietary',
        message: `${nonVegFood.map((f) => f.name).join(', ')} may not have vegetarian options.`,
      });
      constraintsViolated.push('Vegetarian requirement');
      adjustmentsNeeded.push('Replace non-vegetarian food options with vegetarian-confirmed alternatives.');
    } else {
      constraintsMet.push('Vegetarian — all food options confirmed vegetarian-friendly.');
    }
  }

  // ── Crowd check ─────────────────────────────────────────────────────────────
  const avoidCrowded = prefs.constraints.some(
    (c) => c.toLowerCase().includes('crowd') || c.toLowerCase().includes('busy')
  );
  if (avoidCrowded) {
    const crowdedActivities = activities.filter((a) => a.crowdLevel === 'busy');
    if (crowdedActivities.length > 0) {
      issues.push({
        type: 'warning' as const,
        field: 'crowds',
        message: `${crowdedActivities.map((a) => a.name).join(', ')} can get busy. Going early or on weekday mornings helps.`,
      });
      adjustmentsNeeded.push('Visit busy spots early (before 10am) to avoid crowds.');
    } else {
      constraintsMet.push('Avoid crowded places — all selected activities are quiet to moderate.');
    }
  }

  // ── Time feasibility ────────────────────────────────────────────────────────
  // Mirror exactly what buildSlots picks: 1 activity for <5hrs, 2 for >=5hrs
  // and 1 food slot for >=4hrs
  const activitiesToUse = activities.slice(0, prefs.hoursAvailable >= 5 ? 2 : 1);
  const foodToUse = foodOptions.slice(0, 1);

  const totalActivityHours = activitiesToUse.reduce((sum, a) => {
    const hrs = parseFloat(a.duration);
    return sum + (isNaN(hrs) ? 1.5 : hrs);
  }, 0);
  const foodHours = foodToUse.length * 1;    // 1 hour per meal slot
  const travelHours = activitiesToUse.length * 0.25; // 15 min travel gap per slot
  const totalHoursNeeded = totalActivityHours + foodHours + travelHours;

  if (totalHoursNeeded > prefs.hoursAvailable) {
    issues.push({
      type: 'warning' as const,
      field: 'time',
      message: `Plan may need ~${Math.round(totalHoursNeeded * 10) / 10} hours but you have ${prefs.hoursAvailable} available.`,
    });
    adjustmentsNeeded.push('One activity has been marked optional — skip it if you\'re running low on time.');
  } else {
    constraintsMet.push(`Time — plan fits comfortably within your ${prefs.hoursAvailable}-hour window.`);
  }

  // ── Minimum activities check ────────────────────────────────────────────────
  if (activities.length === 0) {
    issues.push({
      type: 'error' as const,
      field: 'activities',
      message: 'No activities matched your preferences and constraints. A fallback plan has been generated.',
    });
  }

  const isValid = !issues.some((i) => i.type === 'error');
  const hasFallback = !isValid || adjustmentsNeeded.length > 0;

  return {
    isValid,
    issues,
    constraintsMet,
    constraintsViolated,
    hasFallback,
    adjustmentsNeeded,
  };
}
