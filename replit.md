# Data Platform Portal

A centralized management console for a Kubernetes-based data platform — login, manage Spark clusters, access platform services, and control user permissions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/data-platform-portal run dev` — run the frontend (port 23721)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter, TanStack Query, shadcn/ui, Tailwind CSS, Framer Motion
- API: Express 5
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Mock in-memory sessions (ready for real backend integration)
- Data: Mock in-memory data (ready for DB integration)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation
- `artifacts/data-platform-portal/src/` — React frontend
  - `src/contexts/AuthContext.tsx` — auth state, login/logout, role-based permissions
  - `src/pages/` — Login, Dashboard, Spark, Services, Users, About
  - `src/components/` — shared layout (sidebar, header), UI components
  - `src/data/mock.ts` — mock data fallback
- `artifacts/api-server/src/routes/` — Express route handlers
  - `auth.ts` — /auth/login, /auth/logout, /auth/me (mock sessions)
  - `clusters.ts` — /clusters/spark/* (start, stop, scale, pods, events)
  - `dashboard.ts` — /dashboard/summary
  - `services.ts` — /services
  - `users.ts` — /users CRUD + toggle
  - `roles.ts` — /roles
  - `audit.ts` — /audit

## Architecture decisions

- All mock data lives in the API server routes (not the frontend), making backend integration a drop-in replacement — just swap mock objects for DB queries
- Auth uses in-memory session tokens per server restart; localStorage on the frontend persists the token across page refreshes
- Role-based access enforced in two places: sidebar visibility (frontend) and action button state (frontend). Backend routes currently trust the caller — add middleware when real auth is needed
- OpenAPI spec is the single source of truth; codegen produces both server Zod schemas and client React Query hooks
- Spark cluster state is held in-memory in clusters.ts to simulate real mutations (start/stop changes status, scale changes replica count)

## Product

- **Login** — username/password with Remember Me; mock accounts: admin/admin, thinh/thinh, analyst1/analyst1, viewer1/viewer1
- **Dashboard** — service health overview cards (Spark, MinIO, Notebook, Airflow, Kafka, OpenMetadata) + recent audit activity feed
- **Spark Cluster** — control panel with start/stop/scale actions, pod table, confirmation modal before stop
- **Services** — catalog cards with Open button (new tab); Spark Thrift shows JDBC detail modal with Copy URL
- **Users & Roles** — user table with create/edit/enable/disable; role assignments; 5 predefined roles
- **About** — platform description, components list, environment info, version

## User preferences

- No iframes for external services — open in new tab only
- Mock data first, clean extension points for real API integration
- No emojis in the UI
- Professional enterprise SaaS style (dark navy sidebar, indigo primary)

## Gotchas

- After any OpenAPI spec change, always run codegen: `pnpm --filter @workspace/api-spec run codegen`
- Spark cluster state resets on API server restart (in-memory mock)
- User session tokens also reset on API server restart

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
