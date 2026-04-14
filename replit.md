# Dupefy

## Overview

Dupefy is a mobile-friendly web app for comparing luxury beauty products with their affordable alternatives (dupes) available in Europe. Built with a minimalist Sephora/Apple-inspired design.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/dupefy)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Features

- Side-by-side luxury vs dupe product comparison
- Match score (similarity percentage)
- Price difference and savings percentage
- Instant search filtering by product name/brand
- Category filtering (Skincare, Makeup, Profumi)
- GDPR cookie consent banner
- Euro (€) currency formatting
- Mobile-first responsive design

## Database Schema

- **products**: id, name, brand, price, image_url, affiliate_link, category, type (Luxury/Dupe), match_id, match_score

## API Endpoints

- `GET /api/products` — List products (filterable by category, search)
- `GET /api/matches` — List product match pairs (filterable by category, search)
- `GET /api/matches/:matchId` — Get specific match detail
- `GET /api/categories/summary` — Category counts
- `GET /api/trending` — Trending matches
- `GET /api/healthz` — Health check

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
