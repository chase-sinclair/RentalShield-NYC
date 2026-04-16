# RentalShield NYC

RentalShield NYC is a production-minded MVP for Manhattan-focused rental scam screening. The app now supports a real request flow, explainable scoring, screenshot upload validation, Bedrock-ready orchestration, optional Supabase persistence, and a mobile-first trust-oriented UI.

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
- Live request flow with graceful fallback services where integrations are incomplete
- Optional Supabase persistence and server-backed result retrieval
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

3. Fill in `.env.local` with the keys you want to enable first. The app degrades gracefully when some integrations are unset, but Bedrock, Google Maps, RentCast, and Supabase each improve coverage when configured.

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
- OCR still falls back to mock extraction text when Bedrock multimodal support is unavailable
- Broker verification uses a simple lookup strategy and may need a stronger NY license data source
- Persistence expects a Supabase table named `rental_analyses`

## Suggested next implementation steps

1. Wire `app/api/upload/route.ts` to Supabase Storage or a signed upload flow.
2. Expand screenshot OCR into true multimodal Bedrock extraction using stored image assets instead of metadata-only fallback behavior.
3. Create and migrate the `rental_analyses` Supabase table for durable result retrieval across sessions.
4. Strengthen broker verification with a more robust NY licensing/provider strategy and explicit normalization rules.
5. Add accessibility QA, mobile QA, and a final deployment checklist for Vercel + Supabase.

## Disclaimer

RentalShield NYC provides an informational risk estimate based on the evidence a user submits. It does not provide legal advice, guarantee that a listing is legitimate, or replace independent verification.
