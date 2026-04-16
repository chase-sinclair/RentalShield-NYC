# RentalShield NYC

RentalShield NYC is a production-minded MVP scaffold for a Manhattan-focused rental scam screening product. This baseline emphasizes clean architecture, explainable results, Bedrock-ready orchestration, and a mobile-first trust-oriented UI without overbuilding every feature up front.

## Stack

- Next.js 15 App Router
- React 19 + strict TypeScript
- Tailwind CSS
- shadcn/ui-style component setup
- Supabase client scaffolding
- AWS Bedrock client scaffolding
- MCP-compatible internal tool orchestration structure

## What is included

- App Router pages for home, analyze, results, and disclaimer
- Shared layout and sticky navigation
- Reusable UI components for upload, score display, factor explanations, verified facts, and next steps
- Thin API routes with service-based orchestration
- Placeholder services for all requested verification and scoring capabilities
- Mock analysis data so the UI works before live APIs are connected
- Environment variable parsing and setup helpers
- Supabase and Bedrock client wrappers
- Manhattan-only scope messaging and disclaimer language

## Project structure

```text
app/
components/
lib/
services/
types/
public/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local` with the keys you want to enable first. The scaffold runs with mock data even if external integrations are unset.

## Development commands

```bash
npm run dev
```

```bash
npm run lint
```

```bash
npm run build
```

```bash
npm run typecheck
```

## Environment notes

- `BEDROCK_MODEL_ID` controls the active Bedrock model for extraction and reasoning.
- `BEDROCK_FALLBACK_MODEL_ID` is available for later evaluation and model comparison work.
- `SUPABASE_SERVICE_ROLE_KEY`, AWS credentials, Google Maps, and RentCast keys must stay server-side.
- File upload limits are configured through `MAX_UPLOAD_FILE_SIZE_MB` and `MAX_UPLOAD_FILE_COUNT`.

## Current MVP constraints

- Manhattan-only V1 UX and messaging
- No auth
- No saved user history UI
- Upload API is scaffolded only
- Live OCR, geocoding, rent comparison, and broker verification remain TODO-backed service integrations
- Result pages use mock data until persistence is connected

## Suggested next implementation steps

1. Wire `app/api/upload/route.ts` to Supabase Storage or a signed upload flow.
2. Replace service placeholders with live Google Maps, RentCast, Bedrock, and broker lookup integrations.
3. Persist analysis results in Supabase and switch `/results/[id]` to real data retrieval.
4. Add extraction review state between submit and results when the orchestration pipeline is live.

## Disclaimer

RentalShield NYC provides an informational risk estimate based on the evidence a user submits. It does not provide legal advice, guarantee that a listing is legitimate, or replace independent verification.
