'use client';

import { useState } from 'react';
import PlannerForm from '@/components/PlannerForm';
import AgentTrace from '@/components/AgentTrace';
import PlanDisplay from '@/components/PlanDisplay';
import { usePlannerStream } from '@/hooks/usePlannerStream';

function Divider() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent" />
      <div className="flex gap-1">
        <span className="w-1 h-1 rounded-full bg-terracotta-400" />
        <span className="w-1 h-1 rounded-full bg-terracotta-300" />
        <span className="w-1 h-1 rounded-full bg-terracotta-200" />
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-ink-200 to-transparent" />
    </div>
  );
}

function Header() {
  return (
    <header className="w-full max-w-2xl mx-auto pt-10 pb-6 px-4 text-center">
      <p className="text-xs font-body font-semibold uppercase tracking-[0.25em] text-ink-400 mb-4">
        Saturday Edition · AI-Powered Planner
      </p>
      <div className="masthead-rule mb-5" />
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 leading-tight mb-3">
        The Perfect<span className="font-display italic text-terracotta-500"> Saturday</span>
      </h1>
      <p className="font-body text-base text-ink-500 leading-relaxed max-w-md mx-auto">
        Tell us your mood, city, and budget. Our AI agent builds a day that actually fits you.
      </p>
      <div className="masthead-rule mt-5" />
    </header>
  );
}

function ErrorCard({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-red-100 p-6 text-center">
        <p className="text-2xl mb-3">⚠️</p>
        <h3 className="font-display text-xl text-ink-900 mb-2">Something went wrong</h3>
        <p className="text-sm font-body text-ink-500 mb-5 leading-relaxed">{message}</p>
        <button onClick={onReset} className="px-6 py-2.5 rounded-xl bg-terracotta-500 text-white font-body text-sm hover:bg-terracotta-600 transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Clarification card ────────────────────────────────────────────────────────

function ClarificationCard({
  question,
  onAnswer,
}: {
  question: string;
  onAnswer: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState('');
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-terracotta-100 p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-terracotta-500 text-lg flex-shrink-0">?</span>
          <div>
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-ink-400 mb-1">
              One quick question
            </p>
            <p className="font-body text-ink-800 text-base leading-relaxed">{question}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && answer.trim() && onAnswer(answer.trim())}
            placeholder="Type your answer…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 bg-cream-50 text-ink-800 font-body text-sm focus:outline-none focus:border-terracotta-400 focus:ring-2 focus:ring-terracotta-50 transition-all"
            autoFocus
          />
          <button
            onClick={() => answer.trim() && onAnswer(answer.trim())}
            disabled={!answer.trim()}
            className="px-5 py-2.5 rounded-xl bg-terracotta-500 text-white font-body text-sm hover:bg-terracotta-600 disabled:bg-ink-200 disabled:cursor-not-allowed transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const {
    status, traces, plan, error,
    clarificationQuestion,
    startPlanning, answerClarification, reset,
  } = usePlannerStream();

  const isPlanning   = status === 'planning';
  const isClarifying = status === 'clarifying';
  const isDone       = status === 'done';
  const isError      = status === 'error';
  const isIdle       = status === 'idle';

  return (
    <main className="min-h-screen pb-20 px-4">
      <Header />

      <div className="space-y-6">
        {/* Form — idle or planning */}
        {(isIdle || isPlanning) && !isDone && (
          <div className="animate-fade-in">
            <PlannerForm onSubmit={startPlanning} isLoading={isPlanning} />
          </div>
        )}

        {/* Trace — planning, clarifying, or done */}
        {(isPlanning || isClarifying || isDone) && traces.length > 0 && (
          <>
            <Divider />
            <AgentTrace traces={traces} isPlanning={isPlanning} />
          </>
        )}

        {/* Clarification question */}
        {isClarifying && clarificationQuestion && (
          <>
            <Divider />
            <ClarificationCard question={clarificationQuestion} onAnswer={answerClarification} />
          </>
        )}

        {/* Error */}
        {isError && (
          <>
            <Divider />
            <ErrorCard message={error || 'An unexpected error occurred.'} onReset={reset} />
          </>
        )}

        {/* Final plan */}
        {isDone && plan && (
          <>
            <Divider />
            <PlanDisplay plan={plan} onReset={reset} />
          </>
        )}
      </div>

      <footer className="fixed bottom-0 inset-x-0 py-3 text-center pointer-events-none">
        <p className="text-xs font-body text-ink-400 opacity-60">
          Built with 🤎  · Perfect Saturday Planner
        </p>
      </footer>
    </main>
  );
}
