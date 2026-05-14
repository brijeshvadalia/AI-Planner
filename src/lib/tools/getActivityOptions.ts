import type { ParsedPreferences, Activity } from '../types';
import { getCityActivities } from '../data/mockData';
import { getRealActivities } from '../data/realData';

// ─── Scoring ───────────────────────────────────────────────────────────────────

function scoreActivity(activity: Activity, prefs: ParsedPreferences): number {
  let score = 0;

  // +2 for each matching interest
  for (const interest of prefs.interests) {
    if (
      activity.tags.some((t) => t.includes(interest.toLowerCase())) ||
      activity.category.includes(interest.toLowerCase()) ||
      activity.description.toLowerCase().includes(interest.toLowerCase())
    ) {
      score += 2;
    }
  }

  // Intensity match
  if (activity.intensityLevel === prefs.intensityLevel) score += 3;
  if (prefs.intensityLevel === 'low' && activity.intensityLevel === 'medium') score += 1;

  // Crowd constraints
  const avoidCrowded = prefs.constraints.some(
    (c) => c.toLowerCase().includes('crowd') || c.toLowerCase().includes('busy') || c.toLowerCase().includes('quiet')
  );
  if (avoidCrowded) {
    if (activity.crowdLevel === 'quiet') score += 3;
    if (activity.crowdLevel === 'busy') score -= 4;
  }

  // Budget: free activities are always a plus for tight budgets
  if (activity.cost === 0) score += 1;
  if (activity.cost > prefs.budgetForActivities) score -= 3;

  // Duration feasibility
  const durationHours = parseFloat(activity.duration);
  if (durationHours <= prefs.hoursAvailable * 0.5) score += 1;

  return score;
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function filterActivities(activities: Activity[], prefs: ParsedPreferences): Activity[] {
  return activities.filter((a) => {
    // Hard filter: must not exceed per-activity budget (with 20% flex)
    if (a.cost > prefs.budgetForActivities * 1.2) return false;
    return true;
  });
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function getActivityOptions(prefs: ParsedPreferences): Promise<{
  recommended: Activity[];
  all: Activity[];
  matchReason: string;
  dataSource: 'foursquare' | 'mock';
}> {
  const { data: allActivities, source } = await getRealActivities(prefs.city, prefs.interests);
  const filtered = filterActivities(allActivities, prefs);

  const scored = filtered
    .map((a) => ({ activity: a, score: scoreActivity(a, prefs) }))
    .sort((a, b) => b.score - a.score);

  const recommended = scored.slice(0, 4).map((s) => s.activity);
  const all = scored.map((s) => s.activity);

  const topInterests = prefs.interests.slice(0, 2).join(' and ');
  const matchReason = `Found ${all.length} activities in ${prefs.city} via ${source === 'foursquare' ? 'Foursquare Places' : 'curated data'} — filtered and ranked for ${topInterests}, ${prefs.intensityLevel} energy level${
    prefs.constraints.some((c) => c.includes('crowd')) ? ', avoiding crowds' : ''
  }.`;

  return { recommended, all, matchReason, dataSource: source };
}
