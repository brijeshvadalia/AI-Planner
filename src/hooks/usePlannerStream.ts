import { useState, useCallback, useRef } from 'react';
import type { UserInput, TraceEvent, FinalPlan, StreamEvent } from '@/lib/types';

export type PlannerStatus = 'idle' | 'planning' | 'clarifying' | 'done' | 'error';

export interface UsePlannerStreamResult {
  status: PlannerStatus;
  traces: TraceEvent[];
  plan: FinalPlan | null;
  error: string | null;
  clarificationQuestion: string | null;
  startPlanning: (input: UserInput) => Promise<void>;
  answerClarification: (answer: string) => Promise<void>;
  reset: () => void;
}

export function usePlannerStream(): UsePlannerStreamResult {
  const [status, setStatus] = useState<PlannerStatus>('idle');
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [plan, setPlan] = useState<FinalPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);

  const savedInputRef = useRef<UserInput | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setTraces([]);
    setPlan(null);
    setError(null);
    setClarificationQuestion(null);
    savedInputRef.current = null;
  }, []);

  const consumeStream = useCallback(async (input: UserInput, clarificationAnswer?: string) => {
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, clarificationAnswer }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const chunk of lines) {
          const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          const jsonStr = dataLine.slice('data: '.length).trim();
          if (!jsonStr) continue;

          let event: StreamEvent;
          try { event = JSON.parse(jsonStr); }
          catch { continue; }

          switch (event.type) {
            case 'trace_start':
              if (event.trace) {
                setTraces((prev) => {
                  const exists = prev.find((t) => t.id === event.trace!.id);
                  return exists ? prev : [...prev, event.trace!];
                });
              }
              break;

            case 'trace_update':
              if (event.trace) {
                setTraces((prev) =>
                  prev.find((t) => t.id === event.trace!.id)
                    ? prev.map((t) => (t.id === event.trace!.id ? event.trace! : t))
                    : [...prev, event.trace!]
                );
              }
              break;

            case 'clarification_needed':
              setClarificationQuestion(event.question || 'Could you give me a bit more detail?');
              if (event.trace) {
                setTraces((prev) => [...prev, event.trace!]);
              }
              setStatus('clarifying');
              return;

            case 'plan':
              if (event.plan) setPlan(event.plan);
              break;

            case 'error':
              setError(event.message || 'Something went wrong');
              setStatus('error');
              return;

            case 'done':
              setStatus((prev) => prev === 'planning' ? 'done' : prev);
              break;
          }
        }
      }

      setStatus((prev) => (prev === 'planning' ? 'done' : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }, []);

  const startPlanning = useCallback(async (input: UserInput) => {
    reset();
    savedInputRef.current = input;
    setStatus('planning');
    await consumeStream(input);
  }, [reset, consumeStream]);

  const answerClarification = useCallback(async (answer: string) => {
    if (!savedInputRef.current) return;
    setClarificationQuestion(null);
    setStatus('planning');
    await consumeStream(savedInputRef.current, answer);
  }, [consumeStream]);

  return { status, traces, plan, error, clarificationQuestion, startPlanning, answerClarification, reset };
}
