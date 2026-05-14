# Perfect Saturday Planner

> An AI-powered agent that builds a personalised Saturday plan based on your mood, city, budget, and interests. **No API key required to run.**

<!-- **Live Demo:** [your-deployment-url.vercel.app](https://your-deployment-url.vercel.app) -->

---

## What It Does

You give the agent your city, budget, available time, mood, interests, and constraints. It runs 6 tools in sequence — parsing your preferences, finding activities, searching food options, estimating costs, validating against your constraints, and finally assembling a rich, personal Saturday plan.

The agent streams its reasoning live so you can see every step as it happens.


---

## Architecture

```
perfect-saturday-planner/
├── src/
│   ├── app/
│   │   ├── api/plan/route.ts          → SSE streaming API endpoint
│   │   ├── page.tsx                   → Main page, full state orchestration
│   │   ├── layout.tsx                 → Root layout + metadata
│   │   └── globals.css                → Custom fonts, animations, design tokens
│   ├── components/
│   │   ├── PlannerForm.tsx            → Input form (city, budget, mood, interest tags)
│   │   ├── AgentTrace.tsx             → Live streaming agent trace with timing
│   │   └── PlanDisplay.tsx            → Timeline plan, cost breakdown, constraint check
│   ├── hooks/
│   │   └── usePlannerStream.ts        → SSE consumer, clarification state, full lifecycle
│   └── lib/
│       ├── agent/
│       │   └── planner.ts             → Agent orchestrator (runs all 6 tools in order)
│       ├── tools/
│       │   ├── parseUserPreferences.ts  → Validates input, infers mood/intensity/budget split
│       │   ├── getActivityOptions.ts    → Scores & ranks activities (Foursquare or curated)
│       │   ├── getFoodOptions.ts        → Filters food by dietary constraints & budget
│       │   ├── estimateCost.ts          → Itemised cost breakdown with transport buffer
│       │   ├── validatePlan.ts          → Constraint checker (diet, crowds, budget, time)
│       │   └── generateFinalPlan.ts     → Deterministic plan engine (no LLM required)
│       ├── data/
│       │   ├── mockData.ts              → Curated activity & food data for 5 cities
│       │   └── realData.ts             → Foursquare Places + Nominatim geocoding
│       └── types.ts                   → 100% TypeScript types throughout
├── .env.example
├── vercel.json
└── README.md
```

**Stack:** Next.js 14 · TypeScript · Tailwind CSS  
**Deployment:** Vercel

---

## Agent Tools

| # | Tool | What it does |
|---|------|-------------|
| 1 | `parseUserPreferences` | Validates input, infers energy level from mood, splits budget (45% activities / 45% food / 10% transport), detects vague inputs and triggers clarification |
| 2 | `getActivityOptions` | Fetches real places via Foursquare (or curated fallback), scores and ranks by interest/mood/crowd/budget match |
| 3 | `getFoodOptions` | Filters restaurants by dietary constraints (vegetarian, vegan), budget per person, crowd preference, and ambience |
| 4 | `estimateCost` | Builds itemised cost breakdown (per activity, per meal, transport buffer), flags budget overruns |
| 5 | `validatePlan` | Checks every constraint — dietary, crowd avoidance, time feasibility, budget — emits ✓/✗/↻ summary |
| 6 | `generateFinalPlan` | Deterministic plan engine: builds timeline, generates personalised titles/summaries/whyItFits per slot, tips, and fallback |

---

## Key Features

- ✅ **Zero API keys required** — works completely out of the box
- ✅ **Live agent trace** — every tool step streams with timing (ms)
- ✅ **Clarification flow** — if input is vague (no mood, no city), agent pauses and asks one question, then resumes
- ✅ **Real data via Foursquare** — when `FOURSQUARE_API_KEY` is set, fetches live places geocoded via OpenStreetMap Nominatim
- ✅ **Itemised cost breakdown** — rendered in full with activity/food/transport line items
- ✅ **Constraint validation panel** — shows which constraints passed ✓, failed ✗, or were adjusted ↻
- ✅ **Trade-off explanations** — each slot explains why it fits, with honest caveats when slightly over budget
- ✅ **Fallback plan** — named alternative if the primary plan falls through
- ✅ **Multi-currency** — detects city and uses correct symbol (₹ / £ / $ / €)
- ✅ **Graceful degradation** — no Foursquare key → curated data; network error → generic plan
- ✅ **Deployed on Vercel** — SSE streaming, no Pro plan required

---

## Running Locally

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/Ai-Planner
cd Ai-Planner

# 2. Install dependencies
npm install

# 3. (Optional) Set up environment for real place data
cp .env.example .env.local
# Edit .env.local and add your Foursquare Service API Key

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The app works fully without any environment variables. The `FOURSQUARE_API_KEY` is optional — without it, the app uses rich curated data for Bangalore, Mumbai, Delhi, London, and New York.

---

## Getting a Foursquare API Key (Optional)

For live place data from the Foursquare Places API (free tier: 1,000 calls/day):

1. Go to [developer.foursquare.com](https://developer.foursquare.com) and create an account
2. Create a new project (e.g. `perfect-saturday-planner`)
3. Go to **Settings → Service API Keys**
4. Click **"Generate Service API Key"**, give it a name, copy the key
5. Add it to your `.env.local`:

```env
FOURSQUARE_API_KEY=fsq3AbCdEf...your-key-here
```

> **Important:** Use the **Service API Key** (starts with `fsq3...`), not the OAuth Client ID or Client Secret shown on the same settings page — those are for a different auth flow.

When the key is active, the agent trace will show:
```
Live data: 12 places from Foursquare Places API
```
Without it:
```
Curated data: 8 hand-picked activities
```

---


## Cities with Curated Data

The app ships with hand-curated activities and food options for:

| City | Activities | Food Options |
|------|-----------|-------------|
| **Bangalore** | 8 (Cubbon Park, NGMA, Lalbagh, Humming Tree, MTR, and more) | 8 (Vidyarthi Bhavan, MTR, Truffles, and more) |
| Mumbai | 3 | 2 |
| Delhi | 2 | 2 |
| London | 2 | 2 |
| New York | 2 | 2 |

Any other city uses a well-structured generic plan. When `FOURSQUARE_API_KEY` is set, any city in the world gets real place data.

---

## How AI Tools Were Used

- **Claude (claude.ai):** Used as the primary engineering assistant. Designed the full agent architecture — tools, types, SSE streaming, clarification flow, constraint validation, cost breakdown, and the deterministic plan engine — before writing a single line of code.

The plan generation itself is a deterministic engine (no LLM at runtime), which means the app is free to run and has no external dependencies beyond the optional Foursquare key.

---

## License

MIT