'use client';

import type { TraceEvent } from '@/lib/types';

const TOOL_LABELS: Record<string, string> = {
  parseUserPreferences: 'Parse preferences',
  getActivityOptions:   'Search activities',
  getFoodOptions:       'Search food options',
  estimateCost:         'Estimate costs',
  validatePlan:         'Validate constraints',
  generateFinalPlan:    'Build your plan',
  clarification:        'Clarification needed',
};

function StatusDot({ status }: { status: TraceEvent['status'] }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terracotta-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-terracotta-500" />
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="flex h-2.5 w-2.5 rounded-full bg-sage-500 flex-shrink-0 items-center justify-center">
        <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 8 8">
          <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === 'error')   return <span className="flex h-2.5 w-2.5 rounded-full bg-red-400 flex-shrink-0" />;
  if (status === 'warning') return <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 flex-shrink-0" />;
  return <span className="flex h-2.5 w-2.5 rounded-full bg-ink-200 flex-shrink-0" />;
}

function TraceRow({ trace, index }: { trace: TraceEvent; index: number }) {
  return (
    <div
      className="flex items-start gap-3 py-2.5 border-b border-cream-200 last:border-0 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="mt-1"><StatusDot status={trace.status} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-body font-medium text-ink-800 truncate">
            {TOOL_LABELS[trace.tool] || trace.label}
          </p>
          {trace.durationMs && trace.status === 'done' && (
            <span className="text-xs font-mono text-ink-400 flex-shrink-0">{trace.durationMs}ms</span>
          )}
        </div>
        <p className="text-xs font-body text-ink-400 mt-0.5 leading-relaxed">{trace.message}</p>
        {trace.detail && (
          <p className="text-xs font-body text-terracotta-500 mt-1 leading-relaxed italic">{trace.detail}</p>
        )}
      </div>
    </div>
  );
}

interface AgentTraceProps {
  traces: TraceEvent[];
  isPlanning: boolean;
}

export default function AgentTrace({ traces, isPlanning }: AgentTraceProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-cream-200" />
        <span className="text-xs font-body font-semibold uppercase tracking-widest text-ink-400 flex items-center gap-2">
          {isPlanning && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terracotta-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-terracotta-500" />
            </span>
          )}
          Agent Trace
        </span>
        <div className="flex-1 h-px bg-cream-200" />
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
        {traces.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-body text-ink-400">Initialising agent…</p>
          </div>
        ) : (
          <div className="px-4">
            {traces.map((trace, i) => (
              <TraceRow key={`${trace.id}-${i}`} trace={trace} index={i} />
            ))}
          </div>
        )}
        {isPlanning && traces.length > 0 && (
          <div className="px-4 py-3 bg-cream-50 border-t border-cream-200">
            <span className="text-xs font-body text-ink-400 animate-pulse-soft">Agent working…</span>
          </div>
        )}
      </div>
    </div>
  );
}
