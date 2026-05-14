import type { UserInput, ParsedPreferences } from '../types';
import { getCurrencySymbol, normalizeCity } from '../data/mockData';

// ─── Mood → intensity mapping ──────────────────────────────────────────────────

const INTENSITY_SIGNALS: Record<'low' | 'medium' | 'high', string[]> = {
  low: ['tired', 'exhausted', 'chill', 'relaxed', 'lazy', 'slow', 'rest', 'peaceful', 'quiet', 'low energy'],
  medium: ['bored', 'okay', 'neutral', 'average', 'moderate', 'casual', 'fun', 'good', 'happy'],
  high: ['energetic', 'excited', 'adventurous', 'pumped', 'active', 'motivated', 'explore', 'go out'],
};

function inferIntensity(mood: string): 'low' | 'medium' | 'high' {
  const lower = mood.toLowerCase();
  for (const [level, signals] of Object.entries(INTENSITY_SIGNALS) as [
    'low' | 'medium' | 'high',
    string[]
  ][]) {
    if (signals.some((s) => lower.includes(s))) return level;
  }
  return 'medium';
}

// ─── Mood → mood tags ─────────────────────────────────────────────────────────

function extractMoodTags(mood: string): string[] {
  const lower = mood.toLowerCase();
  const tags: string[] = [];
  if (lower.includes('tired') || lower.includes('exhausted')) tags.push('low-energy');
  if (lower.includes('fun') || lower.includes('exciting')) tags.push('fun');
  if (lower.includes('relax') || lower.includes('chill')) tags.push('relaxed');
  if (lower.includes('social') || lower.includes('friend')) tags.push('social');
  if (lower.includes('solo') || lower.includes('alone')) tags.push('solo');
  if (lower.includes('creative') || lower.includes('inspir')) tags.push('creative');
  if (tags.length === 0) tags.push('flexible');
  return tags;
}

// ─── Time string → hours ──────────────────────────────────────────────────────

function parseHours(timeString: string): number {
  const lower = timeString.toLowerCase().trim();

  // Match patterns like "4 hours", "3.5 hours", "half a day", "full day"
  const hoursMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/);
  if (hoursMatch) return parseFloat(hoursMatch[1]);

  if (lower.includes('half')) return 4;
  if (lower.includes('full') || lower.includes('whole')) return 8;
  if (lower.includes('morning') || lower.includes('afternoon')) return 4;
  if (lower.includes('evening')) return 3;

  // Fallback: if it's just a number, treat as hours
  const plainNumber = parseFloat(lower);
  if (!isNaN(plainNumber)) return plainNumber;

  return 4; // sensible default
}

// ─── Budget split ─────────────────────────────────────────────────────────────

function splitBudget(budget: number) {
  return {
    budgetForActivities: Math.round(budget * 0.45),
    budgetForFood: Math.round(budget * 0.45),
    // 10% buffer for transport / misc
  };
}

// ─── Clarification check ──────────────────────────────────────────────────────

function checkClarification(input: UserInput): {
  needed: boolean;
  question?: string;
} {
  if (!input.city || input.city.trim().length < 2) {
    return { needed: true, question: 'Which city are you planning your Saturday in?' };
  }
  if (input.budget <= 0) {
    return { needed: true, question: 'What\'s your rough budget for the day?' };
  }
  if (!input.mood || input.mood.trim().length < 3) {
    return {
      needed: true,
      question: 'How are you feeling today? (e.g. tired but want some fun, energetic, want to be social)',
    };
  }
  return { needed: false };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function parseUserPreferences(input: UserInput): ParsedPreferences {
  const clarification = checkClarification(input);
  const { budgetForActivities, budgetForFood } = splitBudget(input.budget);
  const hoursAvailable = parseHours(input.available_time);
  const intensityLevel = inferIntensity(input.mood);
  const moodTags = extractMoodTags(input.mood);
  const normalizedCity = normalizeCity(input.city);
  const currencySymbol = getCurrencySymbol(input.city);

  return {
    ...input,
    normalizedCity,
    currencySymbol,
    budgetForActivities,
    budgetForFood,
    hoursAvailable,
    intensityLevel,
    moodTags,
    clarificationNeeded: clarification.needed,
    clarificationQuestion: clarification.question,
  };
}
