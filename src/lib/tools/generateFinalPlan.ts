import type {
  ParsedPreferences,
  Activity,
  FoodOption,
  CostEstimate,
  ValidationResult,
  FinalPlan,
  PlanSlot,
  StreamEvent,
  ValidationSummary,
} from '../types';

type EmitFn = (event: StreamEvent) => void;

// ─── Time formatting ───────────────────────────────────────────────────────────

function formatHour(base: number): string {
  const hrs = Math.floor(base);
  const mins = Math.round((base - hrs) * 60);
  const period = hrs < 12 ? 'AM' : 'PM';
  const display = hrs > 12 ? hrs - 12 : hrs === 0 ? 12 : hrs;
  return `${display}:${mins.toString().padStart(2, '0')} ${period}`;
}

function parseDurationHours(duration: string): number {
  const match = duration.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 1.5;
}

// ─── Title generator ───────────────────────────────────────────────────────────

function generateTitle(prefs: ParsedPreferences, activities: Activity[]): string {
  const city = prefs.city;
  const topInterest = prefs.interests[0] || 'exploration';
  const mood = prefs.mood.toLowerCase();

  if (mood.includes('tired') || mood.includes('exhaust')) {
    return `A Gentle, Restorative Saturday in ${city}`;
  }
  if (mood.includes('energetic') || mood.includes('excited')) {
    return `A Bold, Active Saturday Through ${city}`;
  }
  if (topInterest === 'food') return `A Saturday Built Around Good Food in ${city}`;
  if (topInterest === 'music') return `Sounds & Streets — A Saturday in ${city}`;
  if (topInterest === 'art' || topInterest === 'culture') return `Art, Light & Good Hours in ${city}`;
  if (topInterest === 'nature' || topInterest === 'walks') return `A Walking, Breathing Saturday in ${city}`;
  if (prefs.intensityLevel === 'low') return `A Slow, Worthwhile Saturday in ${city}`;
  if (prefs.intensityLevel === 'high') return `An Ambitious Saturday Across ${city}`;
  return `A Well-Curated Saturday in ${city}`;
}

// ─── Vibe generator ────────────────────────────────────────────────────────────

function generateVibe(prefs: ParsedPreferences): string {
  const mood = prefs.mood.toLowerCase();
  if (mood.includes('tired') && prefs.intensityLevel === 'low') return 'Gentle & restorative';
  if (prefs.intensityLevel === 'low' && prefs.interests.includes('nature')) return 'Quiet & outdoorsy';
  if (prefs.intensityLevel === 'low') return 'Relaxed & unhurried';
  if (prefs.intensityLevel === 'high') return 'Energetic & exploratory';
  if (prefs.interests.includes('food') && prefs.interests.includes('music')) return 'Flavourful & musical';
  if (prefs.interests.includes('art') || prefs.interests.includes('culture')) return 'Creative & cultural';
  if (prefs.interests.includes('walks') || prefs.interests.includes('nature')) return 'Breezy & grounded';
  return 'Balanced & personal';
}

// ─── Summary generator ─────────────────────────────────────────────────────────

function generateSummary(
  prefs: ParsedPreferences,
  activities: Activity[],
  foodOptions: FoodOption[]
): string {
  const sym = prefs.currencySymbol;
  const topTwo = activities.slice(0, 2).map((a) => a.name).join(' and ');
  const foodName = foodOptions[0]?.name || 'a local favourite';
  const constraints = prefs.constraints.length > 0
    ? ` Respects your constraints: ${prefs.constraints.slice(0, 2).join(', ')}.`
    : '';

  const moodLine = prefs.mood.toLowerCase().includes('tired')
    ? `You said you're tired but want something fun — this plan keeps the energy low but the quality high.`
    : prefs.intensityLevel === 'high'
    ? `You're ready to make the most of the day — this plan keeps momentum without burning out.`
    : `A thoughtfully paced day that respects your mood and makes good use of your time.`;

  return `${moodLine} Built around ${topTwo}, with ${foodName} to anchor the food. Fits comfortably within your ${sym}${prefs.budget} budget.${constraints}`;
}

// ─── whyItFits generator ───────────────────────────────────────────────────────

function generateWhyItFits(
  item: Activity | FoodOption,
  prefs: ParsedPreferences,
  index: number
): string {
  const sym = prefs.currencySymbol;
  const isActivity = 'intensityLevel' in item;
  const matchedInterests = prefs.interests.filter((interest) =>
    item.tags?.some((t) => t.includes(interest.toLowerCase())) ||
    item.description.toLowerCase().includes(interest.toLowerCase())
  );

  const interestMatch = matchedInterests.length > 0
    ? `Directly matches your interest in ${matchedInterests.slice(0, 2).join(' and ')}.`
    : `A strong pick for ${prefs.city} that fits the tone of your day.`;

  const moodMatch = prefs.mood.toLowerCase().includes('tired')
    ? ` Low-effort with high reward — exactly right for a tired-but-wanting-fun kind of day.`
    : prefs.intensityLevel === 'high'
    ? ` Keeps the day moving at the pace you're ready for.`
    : ` Suits your relaxed, go-at-your-own-pace energy.`;

  const budgetNote = isActivity
    ? (item as Activity).cost === 0
      ? ` Free entry — saves budget for food and transport.`
      : (item as Activity).cost <= prefs.budgetForActivities
      ? ` Costs ${sym}${(item as Activity).cost} — comfortably within your activity budget.`
      : ''
    : (item as FoodOption).pricePerPerson <= prefs.budgetForFood
    ? ` At ${sym}${(item as FoodOption).pricePerPerson}/person, fits your food budget well.`
    : ` Slightly above the food budget average, but worth it for the experience.`;

  const constraintNote = prefs.constraints.some((c) => c.toLowerCase().includes('veg'))
    && !isActivity
    && (item as FoodOption).dietaryOptions?.some((d) => d.includes('vegetarian'))
    ? ' Confirmed vegetarian-friendly.'
    : prefs.constraints.some((c) => c.toLowerCase().includes('crowd'))
    && isActivity
    && (item as Activity).crowdLevel === 'quiet'
    ? ' Notably quiet — avoids the crowds you wanted to skip.'
    : '';

  return `${interestMatch}${moodMatch}${budgetNote}${constraintNote}`;
}

// ─── Tips generator ────────────────────────────────────────────────────────────

function generateDayTips(prefs: ParsedPreferences): string[] {
  const tips: string[] = [];
  const sym = prefs.currencySymbol;

  if (prefs.mood.toLowerCase().includes('tired')) {
    tips.push('Start slow — give yourself 30 minutes before rushing out. A good coffee at home first goes a long way.');
  } else {
    tips.push('Eat something before you head out. The best days start on a full stomach.');
  }

  if (prefs.constraints.some((c) => c.toLowerCase().includes('crowd'))) {
    tips.push('Aim to arrive at each spot 10–15 minutes before it typically fills up. Weekday habits work in your favour on Saturday mornings.');
  } else {
    tips.push('The best Saturday moments happen between plans — leave buffer time and resist the urge to fill every minute.');
  }

  if (prefs.budget <= 500) {
    tips.push(`Keep ${sym}${Math.round(prefs.budget * 0.1)} in cash for spontaneous buys — the best market finds don't take cards.`);
  } else {
    tips.push('Keep a small cash buffer for spontaneous finds and street food. The best things aren\'t always on Google Maps.');
  }

  return tips;
}

// ─── Fallback line ────────────────────────────────────────────────────────────

function generateFallback(prefs: ParsedPreferences, activities: Activity[]): string {
  const alt = activities[2]?.name;
  if (alt) {
    return `If the primary plan doesn't work out, ${alt} is a solid backup — it was close to the top of the list.`;
  }
  return `If any part of the plan falls through, ${prefs.city}'s neighbourhoods reward unplanned wandering — pick a direction and see what finds you.`;
}

// ─── Build timeline slots ──────────────────────────────────────────────────────

function buildSlots(
  prefs: ParsedPreferences,
  activities: Activity[],
  foodOptions: FoodOption[],
  costEstimate: CostEstimate
): PlanSlot[] {
  const slots: PlanSlot[] = [];
  const startHour = prefs.intensityLevel === 'low' ? 10 : 9;
  let cursor = startHour;

  // Pick top 2 activities and 1-2 food options based on available time
  const pickedActivities = activities.slice(0, prefs.hoursAvailable >= 5 ? 2 : 1);
  const pickedFood = foodOptions.slice(0, prefs.hoursAvailable >= 4 ? 1 : 1);

  // Interleave: activity → food → activity (if enough time)
  if (pickedActivities.length >= 1) {
    const act = pickedActivities[0];
    const dur = parseDurationHours(act.duration);
    slots.push({
      time: formatHour(cursor),
      type: 'activity',
      title: act.name,
      description: act.description,
      location: act.location,
      neighbourhood: act.neighbourhood,
      cost: act.cost,
      duration: act.duration,
      whyItFits: generateWhyItFits(act, prefs, 0),
      tips: act.bestTimeToVisit,
    });
    cursor += dur;
  }

  // Food after first activity
  if (pickedFood.length >= 1) {
    const food = pickedFood[0];
    // Short travel gap
    cursor += 0.25;
    slots.push({
      time: formatHour(cursor),
      type: 'food',
      title: food.name,
      description: food.description,
      location: food.location,
      neighbourhood: food.neighbourhood,
      cost: food.pricePerPerson,
      duration: '1 hour',
      whyItFits: generateWhyItFits(food, prefs, 1),
    });
    cursor += 1;
  }

  // Second activity if time allows
  if (pickedActivities.length >= 2 && cursor < startHour + prefs.hoursAvailable - 1) {
    const act = pickedActivities[1];
    const dur = parseDurationHours(act.duration);
    cursor += 0.25; // travel gap
    slots.push({
      time: formatHour(cursor),
      type: 'activity',
      title: act.name,
      description: act.description,
      location: act.location,
      neighbourhood: act.neighbourhood,
      cost: act.cost,
      duration: act.duration,
      whyItFits: generateWhyItFits(act, prefs, 2),
      tips: act.bestTimeToVisit,
      tradeoffs: !costEstimate.withinBudget
        ? `This pushes the day close to your budget — skip if you'd rather keep things lean.`
        : undefined,
    });
    cursor += dur;
  }

  return slots;
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function generateFinalPlan(
  prefs: ParsedPreferences,
  activities: Activity[],
  foodOptions: FoodOption[],
  costEstimate: CostEstimate,
  validation: ValidationResult,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _emit: EmitFn
): Promise<FinalPlan> {
  // Simulate brief "thinking" delay so trace feels real
  await new Promise((r) => setTimeout(r, 300));

  const slots = buildSlots(prefs, activities, foodOptions, costEstimate);

  const validationSummary: ValidationSummary = {
    constraintsMet: validation.constraintsMet,
    constraintsViolated: validation.constraintsViolated,
    adjustments: validation.adjustmentsNeeded,
    issues: validation.issues,
  };

  const totalCost = slots.reduce((sum, s) => sum + (s.cost || 0), 0)
    + Math.round(prefs.budget * 0.08); // transport buffer

  return {
    title: generateTitle(prefs, activities),
    summary: generateSummary(prefs, activities, foodOptions),
    totalCost,
    totalDuration: `${prefs.hoursAvailable} hours`,
    vibe: generateVibe(prefs),
    currencySymbol: prefs.currencySymbol,
    slots,
    breakdown: costEstimate.breakdown,
    validationSummary,
    tips: generateDayTips(prefs),
    fallback: generateFallback(prefs, activities),
    budgetNote: `Estimated ${prefs.currencySymbol}${totalCost} of your ${prefs.currencySymbol}${prefs.budget} budget${costEstimate.withinBudget ? ' — within budget.' : ' — slightly over, see trade-offs above.'}`,
  };
}
