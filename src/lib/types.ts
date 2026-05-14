// ─── User Input ───────────────────────────────────────────────────────────────

export interface UserInput {
  city: string;
  budget: number;
  available_time: string;
  mood: string;
  interests: string[];
  constraints: string[];
}

// ─── Parsed / Enriched Preferences ────────────────────────────────────────────

export interface ParsedPreferences extends UserInput {
  budgetForActivities: number;
  budgetForFood: number;
  hoursAvailable: number;
  intensityLevel: 'low' | 'medium' | 'high';
  moodTags: string[];
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
  normalizedCity: string;
  currencySymbol: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  name: string;
  category: string;
  location: string;
  neighbourhood: string;
  duration: string;          // e.g. "1.5 hours"
  cost: number;
  description: string;
  tags: string[];
  intensityLevel: 'low' | 'medium' | 'high';
  crowdLevel: 'quiet' | 'moderate' | 'busy';
  bestTimeToVisit?: string;
}

// ─── Food Option ──────────────────────────────────────────────────────────────

export interface FoodOption {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  neighbourhood: string;
  pricePerPerson: number;
  description: string;
  dietaryOptions: string[];
  ambience: string;
  crowdLevel: 'quiet' | 'moderate' | 'busy';
  tags: string[];
}

// ─── Cost Estimate ────────────────────────────────────────────────────────────

export interface CostBreakdownItem {
  label: string;
  amount: number;
  type: 'activity' | 'food' | 'transport' | 'misc';
}

export interface CostEstimate {
  totalEstimated: number;
  breakdown: CostBreakdownItem[];
  withinBudget: boolean;
  bufferAmount: number;
  warningMessage?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationIssue {
  type: 'error' | 'warning';
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  constraintsMet: string[];
  constraintsViolated: string[];
  hasFallback: boolean;
  adjustmentsNeeded: string[];
}

// ─── Final Plan ───────────────────────────────────────────────────────────────

export type SlotType = 'activity' | 'food' | 'travel' | 'rest';

export interface PlanSlot {
  time: string;
  type: SlotType;
  title: string;
  description: string;
  location: string;
  neighbourhood: string;
  cost: number;
  duration: string;
  whyItFits: string;
  tradeoffs?: string;
  tips?: string;
  icon?: string;
}

export interface ValidationSummary {
  constraintsMet: string[];
  constraintsViolated: string[];
  adjustments: string[];
  issues: ValidationIssue[];
}

export interface FinalPlan {
  title: string;
  summary: string;
  totalCost: number;
  totalDuration: string;
  vibe: string;
  currencySymbol: string;
  slots: PlanSlot[];
  breakdown: CostBreakdownItem[];
  validationSummary: ValidationSummary;
  tips: string[];
  fallback: string;
  budgetNote: string;
}

// ─── Agent Trace ──────────────────────────────────────────────────────────────

export type TraceStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped' | 'warning';

export interface TraceEvent {
  id: string;
  tool: string;
  label: string;
  status: TraceStatus;
  message: string;
  detail?: string;
  timestamp: number;
  durationMs?: number;
}

// ─── SSE Stream Events ────────────────────────────────────────────────────────

export type StreamEventType =
  | 'trace_start'
  | 'trace_update'
  | 'plan'
  | 'error'
  | 'done'
  | 'clarification_needed';

export interface StreamEvent {
  type: StreamEventType;
  trace?: TraceEvent;
  plan?: FinalPlan;
  message?: string;
  question?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface PlanRequest {
  input: UserInput;
}

export interface PlanError {
  error: string;
  detail?: string;
}
