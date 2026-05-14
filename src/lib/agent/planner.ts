import type { UserInput, StreamEvent, TraceEvent } from '../types';
import { parseUserPreferences } from '../tools/parseUserPreferences';
import { getActivityOptions } from '../tools/getActivityOptions';
import { getFoodOptions } from '../tools/getFoodOptions';
import { estimateCost } from '../tools/estimateCost';
import { validatePlan } from '../tools/validatePlan';
import { generateFinalPlan } from '../tools/generateFinalPlan';

type EmitFn = (event: StreamEvent) => void;

// ─── Trace helpers ────────────────────────────────────────────────────────────

function makeTrace(
  id: string,
  tool: string,
  label: string,
  status: TraceEvent['status'],
  message: string,
  detail?: string,
  startTime?: number
): TraceEvent {
  return {
    id,
    tool,
    label,
    status,
    message,
    detail,
    timestamp: Date.now(),
    durationMs: startTime ? Date.now() - startTime : undefined,
  };
}

async function runTool<T>(
  id: string,
  tool: string,
  label: string,
  startMessage: string,
  emit: EmitFn,
  fn: () => T | Promise<T>
): Promise<T> {
  const startTime = Date.now();

  emit({
    type: 'trace_start',
    trace: makeTrace(id, tool, label, 'running', startMessage),
  });

  await new Promise((r) => setTimeout(r, 80));
  const result = await fn();

  emit({
    type: 'trace_update',
    trace: makeTrace(id, tool, label, 'done', `${label} complete`, undefined, startTime),
  });

  return result;
}

// ─── Main agent ───────────────────────────────────────────────────────────────

export async function runPlannerAgent(
  input: UserInput,
  emit: EmitFn,
  clarificationAnswer?: string
): Promise<void> {

  // ── Step 1: Parse preferences ─────────────────────────────────────────────
  const prefs = await runTool(
    'step-1',
    'parseUserPreferences',
    'Parsing your preferences',
    `Analysing mood, budget, constraints and time for ${input.city}…`,
    emit,
    () => parseUserPreferences(input)
  );

  // ── Clarification check ───────────────────────────────────────────────────
  // If vague AND no clarification answer provided yet → pause and ask
  if (prefs.clarificationNeeded && !clarificationAnswer) {
    emit({
      type: 'clarification_needed',
      question: prefs.clarificationQuestion,
      trace: makeTrace(
        'clarify',
        'clarification',
        'Clarification needed',
        'warning',
        'I need one more detail to build the best plan for you.',
        prefs.clarificationQuestion
      ),
    });
    emit({ type: 'done' }); // pause the stream; client re-submits with answer
    return;
  }

  // If clarification answer was provided, merge it back into the parsed prefs mood
  if (clarificationAnswer) {
    if (!prefs.mood || prefs.mood.length < 3) {
      prefs.mood = clarificationAnswer;
    } else if (!prefs.city || prefs.city.length < 2) {
      prefs.city = clarificationAnswer;
    }
    prefs.clarificationNeeded = false;
  }

  // ── Step 2: Get activities (real or mock) ─────────────────────────────────
  const activityResult = await runTool(
    'step-2',
    'getActivityOptions',
    'Searching for activities',
    `Finding activities in ${prefs.city} matching: ${prefs.interests.slice(0, 3).join(', ')}…`,
    emit,
    () => getActivityOptions(prefs)
  );

  // Show data source in trace
  emit({
    type: 'trace_update',
    trace: makeTrace(
      'step-2-src',
      'getActivityOptions',
      'Activity data source',
      'done',
      activityResult.dataSource === 'foursquare'
        ? `Live data: ${activityResult.all.length} places from Foursquare Places API`
        : `Curated data: ${activityResult.all.length} hand-picked activities`,
      activityResult.matchReason
    ),
  });

  // ── Step 3: Get food options ──────────────────────────────────────────────
  const foodResult = await runTool(
    'step-3',
    'getFoodOptions',
    'Searching for food options',
    `Finding${prefs.constraints.some((c) => c.toLowerCase().includes('veg')) ? ' vegetarian' : ''} restaurants and cafés within ${prefs.currencySymbol}${prefs.budgetForFood}/person…`,
    emit,
    () => getFoodOptions(prefs)
  );

  emit({
    type: 'trace_update',
    trace: makeTrace(
      'step-3-src',
      'getFoodOptions',
      'Food data source',
      'done',
      foodResult.dataSource === 'foursquare'
        ? `Live data: ${foodResult.all.length} food options from Foursquare`
        : `Curated data: ${foodResult.all.length} vetted food options`,
      foodResult.budgetNote
    ),
  });

  // ── Step 4: Estimate costs ────────────────────────────────────────────────
  const costEstimate = await runTool(
    'step-4',
    'estimateCost',
    'Estimating costs',
    `Calculating spend across activities, food, and transport…`,
    emit,
    () => estimateCost(prefs, activityResult.recommended, foodResult.recommended)
  );

  if (costEstimate.warningMessage) {
    emit({
      type: 'trace_update',
      trace: makeTrace(
        'step-4-warn',
        'estimateCost',
        'Budget note',
        costEstimate.withinBudget ? 'done' : 'warning',
        costEstimate.warningMessage
      ),
    });
  }

  // ── Step 5: Validate plan ─────────────────────────────────────────────────
  const validation = await runTool(
    'step-5',
    'validatePlan',
    'Validating plan against constraints',
    `Checking budget, dietary requirements, crowd levels, and time fit…`,
    emit,
    () => validatePlan(prefs, activityResult.recommended, foodResult.recommended, costEstimate)
  );

  if (validation.issues.length > 0) {
    emit({
      type: 'trace_update',
      trace: makeTrace(
        'step-5-warn',
        'validatePlan',
        'Constraint adjustments',
        validation.isValid ? 'done' : 'warning',
        `${validation.constraintsMet.length} constraints satisfied, ${validation.issues.length} adjustment(s) made.`,
        validation.adjustmentsNeeded.join(' • ')
      ),
    });
  }

  // ── Step 6: Generate final plan (with true token streaming) ───────────────
  const genStartTime = Date.now();

  emit({
    type: 'trace_start',
    trace: makeTrace(
      'step-6',
      'generateFinalPlan',
      'Build your plan',
      'running',
      `Assembling your personalised Saturday plan from curated picks…`
    ),
  });

  const finalPlan = await generateFinalPlan(
    prefs,
    activityResult.recommended,
    foodResult.recommended,
    costEstimate,
    validation,
    emit  // emit tokens directly from generateFinalPlan
  );

  emit({
    type: 'trace_update',
    trace: makeTrace(
      'step-6',
      'generateFinalPlan',
      'Plan complete',
      'done',
      `Plan generated: "${finalPlan.title}"`,
      undefined,
      genStartTime
    ),
  });

  emit({ type: 'plan', plan: finalPlan });
  emit({ type: 'done' });
}
