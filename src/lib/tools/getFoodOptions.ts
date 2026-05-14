import type { ParsedPreferences, FoodOption } from '../types';
import { getCityFood } from '../data/mockData';
import { getRealFoodOptions } from '../data/realData';

// ─── Scoring ───────────────────────────────────────────────────────────────────

function scoreFoodOption(food: FoodOption, prefs: ParsedPreferences): number {
  let score = 0;

  // Dietary constraints (hard-ish — penalise violations heavily)
  const isVegetarian = prefs.constraints.some((c) =>
    c.toLowerCase().includes('vegetarian') || c.toLowerCase().includes('veg')
  );
  const isVegan = prefs.constraints.some((c) => c.toLowerCase().includes('vegan'));

  if (isVegetarian || isVegan) {
    if (food.dietaryOptions.includes('vegetarian') || food.dietaryOptions.includes('vegan')) {
      score += 5;
    } else if (!food.dietaryOptions.some((d) => d.includes('vegetarian'))) {
      score -= 10; // heavy penalty
    }
  }

  // Budget fit
  if (food.pricePerPerson <= prefs.budgetForFood) score += 3;
  if (food.pricePerPerson <= prefs.budgetForFood * 0.7) score += 2; // cheaper is bonus
  if (food.pricePerPerson > prefs.budgetForFood * 1.2) score -= 4;

  // Crowd preference
  const avoidCrowded = prefs.constraints.some(
    (c) => c.toLowerCase().includes('crowd') || c.toLowerCase().includes('busy')
  );
  if (avoidCrowded) {
    if (food.crowdLevel === 'quiet') score += 3;
    if (food.crowdLevel === 'busy') score -= 3;
  }

  // Interest match
  if (prefs.interests.includes('food') || prefs.interests.includes('restaurants')) score += 2;

  // Mood-food match
  if (prefs.intensityLevel === 'low') {
    if (food.ambience.toLowerCase().includes('calm') || food.ambience.toLowerCase().includes('quiet') || food.ambience.toLowerCase().includes('cosy')) {
      score += 2;
    }
  }

  return score;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function getFoodOptions(prefs: ParsedPreferences): Promise<{
  recommended: FoodOption[];
  all: FoodOption[];
  vegetarianFriendly: boolean;
  budgetNote: string;
  dataSource: 'foursquare' | 'mock';
}> {
  const { data: allFood, source } = await getRealFoodOptions(prefs.city, prefs.constraints);

  const isVegetarian = prefs.constraints.some((c) =>
    c.toLowerCase().includes('vegetarian') || c.toLowerCase().includes('veg')
  );

  const scored = allFood
    .map((f) => ({ food: f, score: scoreFoodOption(f, prefs) }))
    .sort((a, b) => b.score - a.score);

  const recommended = scored
    .filter((s) => s.score >= 0)
    .slice(0, 3)
    .map((s) => s.food);

  const finalRecommended = recommended.length > 0 ? recommended : scored.slice(0, 2).map((s) => s.food);

  const avgCost = finalRecommended.reduce((sum, f) => sum + f.pricePerPerson, 0) / (finalRecommended.length || 1);
  const budgetNote =
    avgCost <= prefs.budgetForFood
      ? `Food options avg ${prefs.currencySymbol}${Math.round(avgCost)}/person via ${source === 'foursquare' ? 'Foursquare' : 'curated data'} — within food budget.`
      : `Options avg ${prefs.currencySymbol}${Math.round(avgCost)}/person, slightly above food budget. Adjusted to best available.`;

  return {
    recommended: finalRecommended,
    all: scored.map((s) => s.food),
    vegetarianFriendly: isVegetarian,
    budgetNote,
    dataSource: source,
  };
}
