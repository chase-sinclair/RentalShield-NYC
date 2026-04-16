# RentalShield NYC — Codex Build Spec

## 1) Product Overview

Build a polished MVP web application called **RentalShield NYC** that helps NYC renters assess whether a rental listing or landlord/broker interaction may be a scam.

The app should accept:
- A **listing URL**
- **Pasted email/text message content** from the landlord or broker
- **Uploaded screenshots** of email/text messages
- Optional extracted or user-provided **price**

The app should then:
- Extract key facts from the inputs
- Verify the address and listing plausibility
- Check broker/license details when enough identifying information is available
- Compare the quoted rent to neighborhood/property rent context
- Run a scam-risk analysis using Bedrock
- Return a **Scam Risk Score (0–100)**, a **Low/Medium/High** label, ranked factors behind the score, verified facts, and recommended next steps

This is a **mobile-friendly Next.js app** with a strong trust-oriented UX, built for **NYC / Manhattan only in V1**. Brooklyn may be added later as V1.1 or V2.

---

## 2) MVP Scope

### In Scope
- Responsive Next.js frontend that works cleanly on desktop and mobile
- No user authentication in V1
- Single analysis workflow:
  1. User submits listing URL and/or message text/screenshots
  2. App extracts facts
  3. App runs tool-based checks through an MCP-backed architecture
  4. App returns risk results and explanation
- Address normalization and verification using Google Maps Geocoding
- Price/rent context using RentCast
- Broker/license verification when name/company context is available
- Bedrock-powered multimodal extraction and scam reasoning
- Ability to switch Bedrock model IDs via environment/config for evaluation/demo purposes
- Supabase for persistence/storage as needed by the app backend, but **do not implement saved user history in V1**
- File upload support for screenshots
- Legal disclaimer / risk estimate language in the UI

### Out of Scope for V1
- Auth / user accounts
- Saved analysis history
- Payments/subscriptions
- Notifications
- Full borough expansion beyond Manhattan unless easy to include cleanly
- Full real-time listing availability verification for individual units
- Legal guarantee or definitive “this is a scam” claim

---

## 3) Product Principles

1. **Explainability over black-box scoring**
   - The user should understand *why* the score was assigned.
2. **Evidence-based verification**
   - The app should separate verified facts from model-inferred risks.
3. **Trust-first UX**
   - Calm, clear, reassuring, and credible.
4. **Mobile-first submission flow**
   - Many users will submit screenshots from their phone.
5. **Portfolio-quality implementation**
   - The codebase should visibly demonstrate agentic orchestration, Bedrock use, and model evaluation readiness.

---

## 4) Technical Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons

### Backend / Server
- Next.js server routes for API endpoints
- TypeScript backend logic in-app unless a dedicated service becomes clearly necessary
- Zod for validation

### AI / Agent Layer
- AWS Bedrock
- Default model: **Claude 3.7 Sonnet on Bedrock**
- Model ID should be configurable in env so other Bedrock models can be tested later
- MCP-style tool orchestration layer for analysis workflow

### Database / Storage
- Supabase
- Use for any lightweight persistence, temporary result metadata, and/or file references as needed
- Do not implement end-user history browsing in V1

### Third-Party Integrations
- Google Maps Geocoding API
- RentCast API
- Broker/license verification source(s) for NY real estate license lookup

### Deployment
- Frontend/app deployment on Vercel
- Supabase managed separately
- AWS Bedrock credentials via environment variables / server-side usage only

---

## 5) Core User Flow

### Screen 1 — Landing / Submit
Purpose: quickly explain what the app does and let the user submit evidence.

Elements:
- App title: **RentalShield NYC**
- Short subtitle explaining scam-risk verification for NYC rentals
- Inputs:
  - Listing URL input
  - Text area for email/text message paste
  - Screenshot upload area (drag/drop + mobile file picker)
  - Optional manual price field (only if useful as fallback)
- CTA button: **Analyze Listing**
- Small disclaimer text below CTA

### Screen 2 — Extraction Review
Purpose: show what the app extracted before/while scoring.

Show extracted fields such as:
- Address
- Borough / neighborhood if resolved
- Claimed rent
- Claimed broker/landlord name
- Claimed company / brokerage
- Mentioned payment method
- Mentioned urgency language
- Mentioned inability to tour / “out of town” language

This can be displayed as:
- either a brief “Reviewing your evidence” progress UI
- or a structured “Extracted facts” section on the result page

### Screen 3 — Results
Purpose: deliver the trust/risk assessment.

Output:
- **Scam Risk Score (0–100)**
- **Risk label**: Low / Medium / High
- Ranked score factors with contribution and explanation
- Verified facts section
- Recommended next steps
- “What we could not verify” section if relevant

### Screen 4 — Safety Guidance / Next Steps
Can live on result page for V1.

Examples:
- Ask for an in-person or verified live virtual tour
- Never send deposit before a signed lease and verified unit access
- Verify broker license independently
- Confirm address/building details through public sources

---

## 6) Design Direction

Design the app to feel:
- Clean
- Modern
- Mobile friendly
- Trustworthy
- Soft neutral palette
- Slight NYC housing vibe without becoming gimmicky

Suggested visual cues:
- Soft grays, off-whites, muted navy/charcoal accents
- Rounded cards
- Strong spacing and readable typography
- Subtle trust indicators (shield/checkmark/search motifs)
- Calm but serious tone

Avoid:
- Loud “danger” branding everywhere
- Overly flashy fintech/crypto style
- Overloaded dashboards in V1

---

## 7) Information Architecture

Suggested routes:
- `/` — landing + submission
- `/analyze` — optional intermediate processing route/page if needed
- `/results/[id]` — optional result page if persisting result payloads temporarily
- `/api/analyze` — main orchestration endpoint
- `/api/upload` — file upload handler if needed
- `/api/health` — optional sanity endpoint

---

## 8) MCP / Agentic Architecture Requirements

Implement an internal tool orchestration layer that behaves like an agentic MCP-style server architecture, even if simplified for MVP.

The reasoning model should be able to coordinate tool calls across the following capabilities:

### Required Tools
1. **listing_parser_tool**
   - Input: listing URL
   - Output: parsed listing metadata if retrievable
   - Extract likely address, price, title, description

2. **message_extraction_tool**
   - Input: pasted text and/or OCR text from screenshots
   - Output: structured extracted fields
   - Detect scam patterns and important entities

3. **ocr_or_multimodal_extraction_tool**
   - Input: uploaded screenshots
   - Output: extracted text and image-derived signals
   - Prefer Bedrock multimodal extraction for this workflow

4. **address_verification_tool**
   - Input: extracted/raw address
   - Uses Google Maps Geocoding
   - Output: normalized address, lat/lng, confidence, Manhattan match status

5. **nyc_property_context_tool**
   - Input: normalized address
   - Output: property plausibility/context using NYC-focused logic and sources where reasonable
   - Goal is not perfect availability detection, but property/building plausibility and context

6. **broker_verification_tool**
   - Input: claimed broker/agent name and/or company
   - Output: whether a likely NY real estate license match exists, partial match info, or unable to verify
   - Gracefully skip when insufficient identifying info is present

7. **rent_comparison_tool**
   - Input: normalized address, neighborhood context, rent amount
   - Uses RentCast
   - Output: comparison context / anomaly signals

8. **risk_scoring_tool**
   - Input: outputs from all prior tools
   - Output: scored factors + overall scam risk score + rationale

### Agent / Orchestration Behavior
The orchestration logic should:
- Accept incomplete input gracefully
- Use whichever evidence types are available
- Prefer tool results over unsupported model guessing
- Separate:
  - verified facts
  - inferred concerns
  - unavailable checks
- Produce a structured analysis object for rendering

---

## 9) Risk Scoring Framework

Return a structured output with:
- `score` (0–100)
- `label` (`low` | `medium` | `high`)
- `rankedFactors[]`
- `verifiedFacts[]`
- `unverifiedOrMissing[]`
- `recommendedNextSteps[]`
- `disclaimer`

### Example factor categories
- Below-market price anomaly
- Address mismatch or unresolved address
- Message contains urgency / pressure language
- Refusal/inability to show unit
- Upfront payment request before standard process
- Request for unusual payment method
- Broker identity unverifiable
- Listing metadata inconsistent with address or property context
- Poor or suspicious communication patterns

Each factor should include:
- `title`
- `severity`
- `weight` or contribution indicator
- `explanation`
- `evidenceSource` (URL/text/screenshot/tool result)

Important: avoid presenting fabricated precision. The score should be useful and explainable, not overconfident.

---

## 10) Model Evaluation / Demo Readiness

The build should make it easy to demonstrate model evaluation / model selection experience.

### Requirements
- Bedrock model ID must be configurable via env
- The code should be organized so the extraction/reasoning model can be swapped
- Add light internal support for comparing outputs from different model IDs later
- Keep prompts modular and stored in a clear location
- Log enough metadata for testing/debugging (without building a full evaluation suite in V1)

Suggested structure:
- `lib/ai/models.ts`
- `lib/ai/prompts.ts`
- `lib/ai/bedrock.ts`
- `lib/analysis/orchestrator.ts`
- `lib/analysis/scoring.ts`

Optional lightweight evaluation hooks:
- capture chosen model ID in analysis payload
- capture extraction confidence or parser notes
- store timestamped result metadata in Supabase if useful

---

## 11) Data Handling Requirements

### Input Types
- Listing URL
- Pasted message text
- Uploaded screenshots
- Optional manual rent

### File Upload Rules
- Accept common image formats
- Provide mobile-friendly upload flow
- Enforce reasonable file count and size limits
- Validate file type server-side

### Privacy / Safety
- Do not claim long-term storage for end users in V1
- Do not expose server-side API keys to client
- Add plain-language disclaimer around analysis limitations

---

## 12) Disclaimer Requirements

Include a visible disclaimer such as:

> RentalShield NYC provides an informational risk estimate based on the evidence you submit. It does not provide legal advice, guarantee that a listing is legitimate, or replace independent verification. Never send money or sensitive personal information until you have independently verified the property, the person, and the lease process.

This should appear:
- near submission CTA
- on results page

---

## 13) Geographic Scope Logic

### V1 Scope
- Manhattan only

Behavior:
- If address resolves outside Manhattan, do not break the app
- Return a friendly notice such as:
  - “This MVP is currently optimized for Manhattan listings. We can still analyze message-based scam signals, but address/property checks may be limited.”

Brooklyn can be staged as V1.1 / V2.

---

## 14) Environment Variables (.env.local)

Use environment variables for all secrets/config.

```env
# App
NEXT_PUBLIC_APP_NAME=RentalShield NYC
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# AWS / Bedrock
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=
BEDROCK_FALLBACK_MODEL_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Maps Geocoding
GOOGLE_MAPS_API_KEY=

# RentCast
RENTCAST_API_KEY=

# Optional NYC datasets / tokens if used
NYC_OPEN_DATA_APP_TOKEN=

# Optional broker/license lookup configuration
NY_LICENSE_LOOKUP_BASE_URL=

# File upload limits / config
MAX_UPLOAD_FILE_SIZE_MB=10
MAX_UPLOAD_FILE_COUNT=5
```

Notes:
- Keep Bedrock access strictly server-side
- Supabase service role key must remain server-side
- Client should only receive `NEXT_PUBLIC_*` variables where appropriate

---

## 15) Suggested Project Structure

```text
/app
  /api
    /analyze
      route.ts
    /upload
      route.ts
    /health
      route.ts
  /results/[id]
    page.tsx
  layout.tsx
  page.tsx

/components
  submission-form.tsx
  upload-dropzone.tsx
  extracted-facts-card.tsx
  risk-score-card.tsx
  ranked-factors-list.tsx
  verified-facts-card.tsx
  next-steps-card.tsx
  disclaimer-banner.tsx
  loading-analysis.tsx

/lib
  /ai
    bedrock.ts
    models.ts
    prompts.ts
  /analysis
    orchestrator.ts
    scoring.ts
    types.ts
  /tools
    listing-parser.ts
    message-extractor.ts
    address-verification.ts
    property-context.ts
    broker-verification.ts
    rent-comparison.ts
  /integrations
    google-maps.ts
    rentcast.ts
    supabase.ts
  /utils
    validation.ts
    text.ts
    urls.ts

/public

/styles

/types
```

---

## 16) API / Orchestrator Output Contract

Design a typed response object similar to:

```ts
export type ScamRiskLabel = 'low' | 'medium' | 'high';

export interface RankedFactor {
  title: string;
  severity: 'low' | 'medium' | 'high';
  contribution: number;
  explanation: string;
  evidenceSource: string;
}

export interface VerifiedFact {
  label: string;
  value: string;
  source: string;
}

export interface AnalysisResult {
  score: number;
  label: ScamRiskLabel;
  summary: string;
  rankedFactors: RankedFactor[];
  verifiedFacts: VerifiedFact[];
  unverifiedOrMissing: string[];
  recommendedNextSteps: string[];
  normalizedAddress?: string;
  borough?: string;
  neighborhood?: string;
  extractedRent?: number;
  extractedBrokerName?: string;
  extractedCompany?: string;
  modelIdUsed: string;
  disclaimer: string;
}
```

---

## 17) UI Requirements

### Submission Form
- Simple, high-trust copy
- Inputs clearly labeled
- Helpful placeholder examples
- Button disabled only when there is truly no usable input
- Graceful validation messages

### Loading State
- Smooth progress experience
- Can mention steps like:
  - Extracting details
  - Verifying address
  - Checking broker details
  - Comparing price context
  - Calculating risk score

### Results UI
- Score card at top
- Ranked factors below
- Verified facts section
- Next steps section
- Disclaimer section

### Mobile UX
- Large tap targets
- Easy file upload from phone
- Strong readability
- Stack cards vertically

---

## 18) Error Handling Requirements

Handle gracefully:
- Invalid or unreachable listing URL
- No extractable text from screenshot
- Partial input only (e.g., just a message with no URL)
- Address cannot be resolved
- RentCast unavailable
- Broker verification unavailable
- Bedrock timeout/error

User-facing rule:
- never fail the whole analysis if only one tool fails
- degrade gracefully and explain which checks were unavailable

---

## 19) Build Order / Implementation Priorities

### Phase 1 — App Skeleton
- Set up Next.js app
- Tailwind + shadcn/ui
- Landing page and submit form
- Basic layout and design system

### Phase 2 — Input Handling
- URL input
- Text paste input
- Screenshot upload
- Validation and file handling

### Phase 3 — AI + Tooling Core
- Bedrock client wrapper
- Extraction prompts
- Structured extraction pipeline
- Orchestrator that calls tools based on available input

### Phase 4 — External Integrations
- Google Maps Geocoding integration
- RentCast integration
- Broker verification integration
- Manhattan scope logic

### Phase 5 — Scoring + Results UI
- Risk score system
- Ranked factors
- Verified facts
- Next steps
- Disclaimer sections

### Phase 6 — Polish
- Loading states
- Empty states
- Error states
- Mobile QA
- README updates
- .env.example

---

## 20) Deliverables Expected from Codex

Codex should produce:
- A working Next.js MVP app
- Clean folder structure
- Type-safe analysis pipeline
- Reusable AI/tool modules
- `.env.example`
- Clear `README.md` with setup steps
- Good UI polish for a demo/portfolio project

Codex should optimize for:
- clarity
- maintainability
- demo readiness
- visible architectural quality

---

## 21) README Setup Expectations

The generated README should include:
- project overview
- stack summary
- setup instructions
- how to configure `.env.local`
- how to run locally
- note on Manhattan-only MVP scope
- note on Bedrock model switching
- note on limitations/disclaimer

---

## 22) Final Notes for Codex

This project should feel like a serious, modern trust-and-verification product, not a hackathon toy.

Prioritize:
- real usability
- professional visual quality
- structured AI/tool orchestration
- explainable results

Do **not** overbuild. This is an MVP, but it should be architected cleanly enough to later expand into:
- Brooklyn and additional boroughs
- saved user history
- auth
- richer evaluation framework
- broader rental verification coverage

---

## Codex Memory Log

### Phase 1 Complete - Real Submission Flow
- Wired the submission form to `POST /api/analyze` instead of redirecting directly to the sample result.
- Added client-side rent normalization and surfaced API validation errors back into the form.
- Stored returned analysis payloads in browser session storage so `/results/[id]` can render request-specific mock-backed results before Supabase persistence is implemented.
- Refactored results rendering into reusable client/view components and added a loading state while session results are being resolved.
- Updated the landing/analyze copy so the app now describes the live mock-backed analysis flow accurately.
