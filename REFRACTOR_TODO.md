# 2FP-GUI Refactor — Interactive Todo List

> Update this file as tasks are completed. Delete items when done.

## Phase 1 — Remove Queue, Worker, and Email

- [x] Delete `worker.ts`
- [x] Delete `lib/queue/index.ts`
- [x] Delete `jobs/queue.json`
- [x] Delete `lib/execution/jobLock.ts`
- [x] Delete `lib/email/sendEmail.ts`
- [x] Delete `lib/email/renderTemplate.ts`
- [x] Delete all files in `lib/email/templates/`
- [x] Remove Nodemailer and `@types/nodemailer` from `package.json`
- [x] Remove email `<input>` from `components/magus.tsx` and `components/xtree.tsx`
- [x] Remove email validation from API routes (routes rewritten from scratch)
- [x] Remove `email` field from job metadata writes (queue system removed)
- [x] Remove queue/email/jobLock imports from API routes (routes rewritten)

## Phase 2 — Cell-Based MAGUS Interface

- [x] Define `MagusCell` state model (see PRD §6.4) — `lib/types/magus.ts`
- [x] Create `components/magus/MagusNotebook.tsx` (top-level container for cells)
- [x] Create `components/magus/MagusCell.tsx` (single cell: config panel, run button, output viewer)
- [x] Create `components/magus/CellOutput.tsx` (live streaming stdout/stderr display)
- [x] Create `components/magus/CellToolbar.tsx` ("Run All", "Run From Here", "Reset All")
- [x] Refactor `components/magus/workflowStages/*.tsx` to embed inside `MagusCell`
- [x] Update `components/magus/dependencies.ts` to provide warnings (not auto-disable)
- [x] Rewrite `components/magus.tsx` as a thin wrapper for `MagusNotebook`
- [x] Implement SSE-capable API routes (backend):
    - [x] `/api/magus/run` (single stage)
    - [x] `/api/magus/run-all` (sequential stages)
    - [x] `/api/magus/output` (output file listing)
- [x] Create SSE client hook (`hooks/useSSE.ts`) for frontend streaming
- [x] Refactor `lib/execution/runMAGUS.ts` to `spawnStage()` — streaming child process
- [x] Update `lib/execution/stubs/runMAGUSStub.ts` to `spawnStageStub()` — streaming stub
- [x] Add output file listing and download support for each cell (frontend)
- [x] Add "Run All", "Run From Here", "Reset All" toolbar actions

## Phase 3 — XTree API/UI Simplification

- [x] Rewrite `app/api/xtree/run/route.ts` to execute via SSE streaming
- [x] Refactor `lib/execution/runXTree.ts` to `spawnXTree()` — streaming child process
- [x] Update `lib/execution/stubs/runXtreeStub.ts` to `spawnXTreeStub()` — streaming stub
- [x] Remove queue/email logic from XTree UI and backend
- [x] Update `components/xtree.tsx` to remove email field and simplify job submission
- [x] Verify XTree end-to-end with stub executor

## Phase 4 — Upload Limits & Output Management

- [x] Update `lib/uploads/limits.ts` to relax upload limits (instance-local)
- [x] Ensure output files are written to per-stage directories as described in PRD §6.7
- [x] Add output file download links to MAGUS and XTree UI

## Phase 5 — Landing Page, Auth & Billing UI

- [x] Create landing page (`app/page.tsx` — Hero, Features, Pricing, Footer)
- [x] Create shared `Navbar` component (`components/landing/Navbar.tsx`)
- [x] Create sign-in page (`app/auth/signin/page.tsx` — access code auth)
- [x] Create sign-up page (`app/auth/signup/page.tsx` — multi-step plan + account + Stripe checkout)
- [x] Create dashboard page (`app/dashboard/page.tsx` — instance status, billing, lifecycle controls)
- [x] Move tools interface to `/tools` route (`app/tools/page.tsx`)
- [x] Implement auth API routes (`/api/auth/signin`, `/api/auth/signup`, `/api/auth/session`, `/api/auth/signout`)
- [x] Implement billing API route (`/api/billing/checkout` — Stripe stub, ready for real integration)
- [x] Add auth context/provider (`lib/auth/AuthProvider.tsx` + `lib/auth/ProtectedRoute.tsx`)
- [x] Add protected layouts for `/tools` and `/dashboard` routes

## Phase 6 — AWS Provisioning & Account Model (Separate Repo)

- [ ] Create custom AMI with all dependencies (Node.js, Python, MAGUS, XTree)
- [ ] Write IaC (Terraform/CDK) for EC2 instance provisioning
- [ ] Implement provisioning API: payment → create instance → configure DNS
- [ ] Add instance lifecycle management (start/stop/terminate)
- [ ] Set up SSL certificates (ACM + ALB or Caddy)
- [ ] Document operational runbooks (scaling, monitoring, backups)

## Phase 6 — Hardening & Polish

- [ ] Add in-app result history (local filesystem index)
- [ ] Add "Download All Outputs" for completed MAGUS workflows
- [ ] Improve error handling and user-facing error messages
- [ ] Add instance health-check endpoint for monitoring
- [ ] End-to-end testing on a provisioned AWS instance
- [ ] Update README and user documentation
