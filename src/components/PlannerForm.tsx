'use client';

import { useState } from 'react';
import type { UserInput } from '@/lib/types';

// ─── Preset options ────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  'food', 'music', 'walks', 'art', 'nature', 'history', 'books',
  'coffee', 'shopping', 'photography', 'cinema', 'sports', 'culture',
];

const CONSTRAINT_OPTIONS = [
  'vegetarian', 'vegan', 'avoid crowded places', 'budget-conscious',
  'wheelchair accessible', 'no alcohol', 'kid-friendly', 'pet-friendly',
  'avoid outdoors', 'avoid indoors',
];

const MOOD_SUGGESTIONS = [
  'tired but wants something fun',
  'energetic and ready to explore',
  'want something low-key and peaceful',
  'feeling creative and inspired',
  'social and want to meet people',
  'need to recharge — quiet day',
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function TagButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-body border transition-all duration-200 ${
        selected
          ? 'bg-terracotta-500 text-white border-terracotta-500 shadow-sm'
          : 'bg-white text-ink-600 border-ink-200 hover:border-terracotta-400 hover:text-terracotta-500'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface PlannerFormProps {
  onSubmit: (input: UserInput) => void;
  isLoading: boolean;
}

export default function PlannerForm({ onSubmit, isLoading }: PlannerFormProps) {
  const [city, setCity] = useState('Bangalore');
  const [budget, setBudget] = useState(2000);
  const [availableTime, setAvailableTime] = useState('4 hours');
  const [mood, setMood] = useState('');
  const [interests, setInterests] = useState<string[]>(['food', 'music', 'walks']);
  const [constraints, setConstraints] = useState<string[]>(['vegetarian', 'avoid crowded places']);
  const [customConstraint, setCustomConstraint] = useState('');

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSubmit = () => {
    if (!city.trim() || !mood.trim()) return;
    onSubmit({
      city: city.trim(),
      budget,
      available_time: availableTime,
      mood: mood.trim(),
      interests,
      constraints: [
        ...constraints,
        ...(customConstraint.trim() ? [customConstraint.trim()] : []),
      ],
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-7">
        {/* City + Budget row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-body font-semibold uppercase tracking-widest text-ink-400">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bangalore"
              className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 font-body text-sm focus:outline-none focus:border-terracotta-400 focus:ring-2 focus:ring-terracotta-50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-body font-semibold uppercase tracking-widest text-ink-400">
              Budget
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-body text-sm">₹</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                min={100}
                step={100}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 font-body text-sm focus:outline-none focus:border-terracotta-400 focus:ring-2 focus:ring-terracotta-50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Available time */}
        <div className="space-y-2">
          <label className="block text-xs font-body font-semibold uppercase tracking-widest text-ink-400">
            Available Time
          </label>
          <div className="flex gap-2 flex-wrap">
            {['2 hours', '3 hours', '4 hours', '5 hours', '6 hours', 'Full day'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAvailableTime(t)}
                className={`px-4 py-2 rounded-xl text-sm font-body border transition-all duration-200 ${
                  availableTime === t
                    ? 'bg-terracotta-500 text-white border-terracotta-500'
                    : 'bg-white text-ink-600 border-ink-200 hover:border-terracotta-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div className="space-y-2">
          <label className="block text-xs font-body font-semibold uppercase tracking-widest text-ink-400">
            How are you feeling today?
          </label>
          <textarea
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="e.g. tired but wants to do something fun"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 font-body text-sm focus:outline-none focus:border-terracotta-400 focus:ring-2 focus:ring-terracotta-50 transition-all resize-none"
          />
          {/* Mood suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {MOOD_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMood(s)}
                className="px-2.5 py-1 rounded-full text-xs font-body bg-cream-200 text-ink-600 hover:bg-terracotta-50 hover:text-terracotta-500 border border-transparent hover:border-terracotta-100 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <label className="block text-xs font-body font-semibold uppercase tracking-widest text-ink-400">
            Interests <span className="text-ink-400 normal-case font-normal tracking-normal">(pick a few)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((item) => (
              <TagButton
                key={item}
                label={item}
                selected={interests.includes(item)}
                onClick={() => toggleItem(interests, setInterests, item)}
              />
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div className="space-y-2">
          <label className="block text-xs font-body font-semibold uppercase tracking-widest text-ink-400">
            Constraints <span className="text-ink-400 normal-case font-normal tracking-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONSTRAINT_OPTIONS.map((item) => (
              <TagButton
                key={item}
                label={item}
                selected={constraints.includes(item)}
                onClick={() => toggleItem(constraints, setConstraints, item)}
              />
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={customConstraint}
              onChange={(e) => setCustomConstraint(e.target.value)}
              placeholder="Add a custom constraint…"
              className="flex-1 px-3 py-2 rounded-lg border border-ink-200 bg-white text-ink-800 font-body text-sm focus:outline-none focus:border-terracotta-400 transition-all"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !city.trim() || !mood.trim()}
          className="w-full py-4 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 disabled:bg-ink-200 disabled:cursor-not-allowed text-white font-display text-lg tracking-wide transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          {isLoading ? 'Planning your Saturday…' : 'Plan My Saturday →'}
        </button>
      </div>
    </div>
  );
}
