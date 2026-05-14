'use client';

import type { FinalPlan, PlanSlot, SlotType } from '@/lib/types';

const SLOT_CONFIG: Record<SlotType, { color: string; bg: string; dot: string }> = {
  activity: { color: 'text-sage-600',      bg: 'bg-sage-50 border-sage-100',           dot: 'bg-sage-500'      },
  food:     { color: 'text-terracotta-500', bg: 'bg-terracotta-50 border-terracotta-100', dot: 'bg-terracotta-500' },
  travel:   { color: 'text-ink-400',        bg: 'bg-cream-100 border-cream-200',         dot: 'bg-ink-300'       },
  rest:     { color: 'text-ink-400',        bg: 'bg-cream-100 border-cream-200',         dot: 'bg-ink-200'       },
};

// ─── Timeline slot ─────────────────────────────────────────────────────────────

function TimelineSlot({ slot, index, currencySymbol }: { slot: PlanSlot; index: number; currencySymbol: string }) {
  const config = SLOT_CONFIG[slot.type] || SLOT_CONFIG.activity;
  return (
    <div
      className="flex gap-4 animate-slide-up"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both', opacity: 0 }}
    >
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-5 ${config.dot} shadow-sm`} />
        <div className="w-px flex-1 bg-cream-200 mt-1" />
      </div>
      <div className={`flex-1 mb-4 rounded-2xl border p-4 ${config.bg}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-ink-400 bg-white px-2 py-0.5 rounded-full border border-cream-200">{slot.time}</span>
              <span className={`text-xs font-body font-semibold uppercase tracking-wide ${config.color}`}>{slot.type}</span>
            </div>
            <h3 className="font-display text-lg text-ink-900 leading-tight">{slot.title}</h3>
            <p className="text-xs font-body text-ink-400 mt-0.5">{slot.neighbourhood} · {slot.duration}</p>
          </div>
          {slot.cost > 0 ? (
            <p className="text-sm font-body font-semibold text-ink-700 flex-shrink-0">{currencySymbol}{slot.cost}</p>
          ) : (
            <span className="text-xs font-body font-medium text-sage-600 bg-sage-50 border border-sage-100 px-2 py-1 rounded-full flex-shrink-0">Free</span>
          )}
        </div>
        <p className="text-sm font-body text-ink-600 leading-relaxed mb-3">{slot.description}</p>
        <div className="bg-white bg-opacity-70 rounded-xl p-3 border border-white">
          <p className="text-xs font-body font-semibold uppercase tracking-widest text-ink-400 mb-1">Why it fits you</p>
          <p className="text-sm font-body text-ink-700 leading-relaxed italic">{slot.whyItFits}</p>
        </div>
        {slot.tradeoffs && (
          <div className="mt-2 flex items-start gap-2">
            <span className="text-amber-500 text-xs mt-0.5">⚠</span>
            <p className="text-xs font-body text-amber-700 leading-relaxed">{slot.tradeoffs}</p>
          </div>
        )}
        {slot.tips && (
          <div className="mt-2 flex items-start gap-2">
            <span className="text-terracotta-400 text-xs mt-0.5">💡</span>
            <p className="text-xs font-body text-ink-500 leading-relaxed">{slot.tips}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cost breakdown table ──────────────────────────────────────────────────────

function CostBreakdown({ plan }: { plan: FinalPlan }) {
  if (!plan.breakdown || plan.breakdown.length === 0) return null;
  const sym = plan.currencySymbol || '₹';
  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-4 shadow-sm">
      <h3 className="font-body font-semibold text-xs uppercase tracking-widest text-ink-400 mb-3">Cost Breakdown</h3>
      <div className="space-y-2">
        {plan.breakdown.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                item.type === 'activity' ? 'bg-sage-500' :
                item.type === 'food'     ? 'bg-terracotta-500' :
                item.type === 'transport'? 'bg-ink-300' : 'bg-ink-200'
              }`} />
              <span className="text-sm font-body text-ink-600">{item.label}</span>
            </div>
            <span className="text-sm font-body font-medium text-ink-800">
              {item.amount === 0 ? 'Free' : `${sym}${item.amount}`}
            </span>
          </div>
        ))}
        <div className="pt-2 mt-2 border-t border-cream-200 flex items-center justify-between">
          <span className="text-sm font-body font-semibold text-ink-800">Total</span>
          <span className="text-base font-display text-ink-900">{sym}{plan.totalCost}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Validation summary ────────────────────────────────────────────────────────

function ValidationSummaryPanel({ plan }: { plan: FinalPlan }) {
  const vs = plan.validationSummary;
  if (!vs) return null;
  const hasContent = vs.constraintsMet.length > 0 || vs.constraintsViolated.length > 0 || vs.adjustments.length > 0;
  if (!hasContent) return null;
  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-4 shadow-sm">
      <h3 className="font-body font-semibold text-xs uppercase tracking-widest text-ink-400 mb-3">Constraint Check</h3>
      <div className="space-y-1.5">
        {vs.constraintsMet.map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-sage-500 text-xs mt-0.5 flex-shrink-0">✓</span>
            <p className="text-xs font-body text-ink-600 leading-relaxed">{c}</p>
          </div>
        ))}
        {vs.constraintsViolated.map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">✗</span>
            <p className="text-xs font-body text-red-600 leading-relaxed">{c}</p>
          </div>
        ))}
        {vs.adjustments.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-amber-400 text-xs mt-0.5 flex-shrink-0">↻</span>
            <p className="text-xs font-body text-amber-700 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PlanDisplay({ plan, onReset }: { plan: FinalPlan; onReset: () => void }) {
  const sym = plan.currencySymbol || '₹';
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-block bg-terracotta-50 border border-terracotta-100 text-terracotta-500 text-xs font-body font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          {plan.vibe}
        </div>
        <h2 className="font-display text-3xl md:text-4xl text-ink-900 leading-tight mb-3">{plan.title}</h2>
        <p className="text-sm font-body text-ink-500 leading-relaxed max-w-lg mx-auto">{plan.summary}</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="text-center">
            <p className="text-xs font-body text-ink-400 uppercase tracking-wider">Total Cost</p>
            <p className="text-lg font-display text-ink-800">{sym}{plan.totalCost}</p>
          </div>
          <div className="w-px h-8 bg-cream-200" />
          <div className="text-center">
            <p className="text-xs font-body text-ink-400 uppercase tracking-wider">Duration</p>
            <p className="text-lg font-display text-ink-800">{plan.totalDuration}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        {plan.slots.map((slot, i) => (
          <TimelineSlot key={`${slot.time}-${i}`} slot={slot} index={i} currencySymbol={sym} />
        ))}
      </div>

      {/* Cost breakdown */}
      <CostBreakdown plan={plan} />

      {/* Validation summary */}
      <ValidationSummaryPanel plan={plan} />

      {/* Tips */}
      {plan.tips?.length > 0 && (
        <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-4 shadow-sm">
          <h3 className="font-body font-semibold text-xs uppercase tracking-widest text-ink-400 mb-3">Saturday Tips</h3>
          <ul className="space-y-2">
            {plan.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-terracotta-400 mt-0.5 flex-shrink-0">·</span>
                <p className="text-sm font-body text-ink-600 leading-relaxed">{tip}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback */}
      {plan.fallback && (
        <div className="bg-cream-100 rounded-2xl border border-cream-200 p-4 mb-6">
          <p className="text-xs font-body font-semibold uppercase tracking-widest text-ink-400 mb-1">If plans change</p>
          <p className="text-sm font-body text-ink-600 leading-relaxed">{plan.fallback}</p>
        </div>
      )}

      {/* Budget note */}
      {plan.budgetNote && (
        <p className="text-center text-xs font-body text-ink-400 mb-6">{plan.budgetNote}</p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="w-full py-3 rounded-xl border border-ink-200 text-ink-600 font-body text-sm hover:border-terracotta-400 hover:text-terracotta-500 transition-all duration-200"
      >
        ← Plan a different Saturday
      </button>
    </div>
  );
}
