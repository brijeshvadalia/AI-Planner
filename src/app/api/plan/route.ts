import { NextRequest } from 'next/server';
import { runPlannerAgent } from '@/lib/agent/planner';
import type { StreamEvent, UserInput } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { input: UserInput; clarificationAnswer?: string };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { input, clarificationAnswer } = body;

  if (!input?.city || typeof input.city !== 'string') {
    return Response.json({ error: 'city is required' }, { status: 422 });
  }
  if (typeof input.budget !== 'number' || input.budget <= 0) {
    return Response.json({ error: 'budget must be a positive number' }, { status: 422 });
  }

  const safeInput: UserInput = {
    city: input.city.trim(),
    budget: input.budget,
    available_time: input.available_time || '4 hours',
    mood: input.mood || '',
    interests: Array.isArray(input.interests) ? input.interests : [],
    constraints: Array.isArray(input.constraints) ? input.constraints : [],
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // controller already closed
        }
      };

      try {
        await runPlannerAgent(safeInput, emit, clarificationAnswer?.trim());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        emit({ type: 'error', message });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
