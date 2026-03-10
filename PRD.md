# PRD: 2FP-GUI Platform Refactor — Isolated AWS Instances & Cell-Based MAGUS

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| **Status**       | Updated draft                              |
| **Author**       | Victor Boddy                               |
| **Created**      | 2026-03-09                                 |
| **Last updated** | 2026-03-09 (requirements interview)         |
| **Target start** | TBD                                        |

---

## 1  Executive Summary

Today the 2FP-GUI is a single-instance Next.js application that accepts bioinformatics jobs (XTree and MAGUS), queues them on disk, processes them with a long-running worker, and notifies users by email when execution completes. This architecture assumes a shared, centrally managed server.

This refactor transitions the platform to a **per-customer isolated AWS deployment model**. Each paying customer receives their own AWS instance running a private copy of the codebase. Because the user is the sole operator of their instance, the job queue, worker process, and email notification system become unnecessary and will be removed. Additionally, the MAGUS interface will be redesigned so each pipeline stage **operates independently like a cell in a Jupyter notebook**, giving users fine-grained, interactive control over their metagenomic workflows.

---

## 2  Goals & Non-Goals

### 2.1 Goals

| #   | Goal                                                                                          |
| --- | --------------------------------------------------------------------------------------------- |
| G1  | **Security isolation** — eliminate attack surface from shared file systems, malicious file names, and untrusted FASTQ processing by giving every customer their own instance. |
| G2  | **Remove the job queue** — XTree and MAGUS execute directly in the user's session; no background worker or polling loop. |
| G3  | **Remove email notifications** — results are surfaced in-app in real time since the user is present on their own instance. |
| G4  | **Cell-based MAGUS execution** — each pipeline stage runs independently with its own input/output, status, and logs, analogous to a Jupyter notebook cell. |
| G5  | **Paid account model** — introduce a billing/provisioning layer that spins up a new AWS instance for each customer, with usage-based billing and in-app dashboard. |
| G6  | **Simple shared authentication** — access controlled by a shared password/access code per instance, no per-user accounts for v1. |

### 2.2 Non-Goals

| #    | Non-Goal                                                                                 |
| ---- | ---------------------------------------------------------------------------------------- |
| NG1  | Building a multi-tenant SaaS on a single shared server (future V2 possible).             |
| NG2  | Rewriting XTree or MAGUS CLI tools themselves — only the web GUI and execution layer change. |
| NG3  | Mobile-responsive design (desktop-first bioinformatics tool).                            |
| NG4  | Implementing a custom container orchestration layer — standard AWS services will be used. |
| NG5  | On-premises or container-based deployment (future V2 possible).                          |

---

## 3  Background & Current Architecture

### 3.1 Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS 4
- **Runtime:** Node.js, TypeScript
- **Email:** Nodemailer
- **Bioinformatics tools:** XTree binary (`scripts/xtree/2FP-XTree/xtree`), MAGUS Python pipeline (`scripts/magus/2FP_MAGUS/magus/`)

### 3.2 Current Flow

```
User (browser)
  │
  ├─► POST /api/xtree   ─┐
  │                       │  writes job dir (input/, params.json, meta.json, status.json)
  ├─► POST /api/magus  ──┤  enqueues job ID into jobs/queue.json
  │                       │
  │                       ▼
  │                  worker.ts  (long-running Node process)
  │                       │  polls queue.json every 2 s
  │                       │  dequeues job → spawns CLI process
  │                       │  writes stdout.log, status.json
  │                       │  sends success/failure email via nodemailer
  │                       │  cleans up jobs > 24 h
  │                       ▼
  └── (user receives email with results)
```

### 3.3 Key Files Affected

| Path                                         | Role                                         | Disposition     |
| -------------------------------------------- | --------------------------------------------- | --------------- |
| `worker.ts`                                  | Background job runner                         | **Remove**      |
| `lib/queue/index.ts`                         | File-based enqueue/dequeue                    | **Remove**      |
| `jobs/queue.json`                            | Queue persistence                             | **Remove**      |
| `lib/email/sendEmail.ts`                     | Nodemailer transport                          | **Remove**      |
| `lib/email/renderTemplate.ts`                | Email template rendering                      | **Remove**      |
| `lib/email/templates/*`                      | Email templates (success/failure)             | **Remove**      |
| `lib/execution/jobLock.ts`                   | File-based job lock                           | **Remove**      |
| `app/api/magus/route.ts`                     | MAGUS submission endpoint                     | **Rewrite**     |
| `app/api/xtree/route.ts`                     | XTree submission endpoint                     | **Rewrite**     |
| `components/magus.tsx`                        | MAGUS UI (monolithic form)                    | **Rewrite**     |
| `components/xtree.tsx`                        | XTree UI                                      | **Modify**      |
| `components/magus/workflowStages/*.tsx`       | Stage config panels (7 files)                 | **Modify**      |
| `components/magus/dependencies.ts`           | Stage dependency engine                       | **Modify**      |
| `lib/magus/compileWorkflow.ts`               | Workflow compiler                             | **Modify**      |
| `lib/magus/buildCommand.ts`                  | CLI argv builder                              | **Keep**        |
| `lib/execution/runMAGUS.ts`                  | MAGUS child-process executor                  | **Rewrite**     |
| `lib/execution/runXTree.ts`                  | XTree child-process executor                  | **Modify**      |
| `lib/uploads/validate.ts`                    | Sequence file validation                      | **Keep**        |
| `lib/uploads/sanitize.ts`                    | Filename sanitization                         | **Keep**        |
| `lib/uploads/limits.ts`                      | Upload size limits                            | **Modify**      |
| `app/page.tsx`                               | Root page (tab switcher)                      | **Modify**      |
| `package.json`                               | Dependencies                                  | **Modify**      |

---

## 4  Proposed Architecture

### 4.1 Deployment Model — Per-Customer AWS EC2 Instances

```
┌─────────────────────────────────────────────────────────────┐
│                  2FP Billing / Provisioning                  │
│                  (Central management plane)                  │
│                                                             │
│  • Account sign-up & payment (Stripe, etc.)                 │
│  • On payment: provision new AWS instance via IaC            │
│  • Copy codebase → instance                                 │
│  • Configure DNS / subdomain (e.g. alice.2fp.bio)           │
│  • Instance lifecycle management (start/stop/terminate)      │
└──────────────────────┬──────────────────────────────────────┘
                       │ provisions
          ┌────────────┴────────────┐
          ▼                         ▼
  ┌─────────────────┐     ┌─────────────────┐
  │  Customer A      │     │  Customer B      │
  │  EC2 instance    │     │  EC2 instance    │
  │  ┌─────────────┐ │     │  ┌─────────────┐ │
  │  │  2fp-gui    │ │     │  │  2fp-gui    │ │
  │  │  (Next.js)  │ │     │  │  (Next.js)  │ │
  │  │  + XTree    │ │     │  │  + XTree    │ │
  │  │  + MAGUS    │ │     │  │  + MAGUS    │ │
  │  └─────────────┘ │     │  └─────────────┘ │
  │  own filesystem   │     │  own filesystem   │
  │  own processes    │     │  own processes    │
  └─────────────────┘     └─────────────────┘
```

**Security rationale:** Isolating each customer onto their own instance eliminates cross-tenant risk entirely. Malicious file names, pathological FASTQ content, or resource-exhaustion attacks can only affect the attacker's own instance. No shared queue, no shared filesystem, no shared processes.

**AWS instance specification (TBD):**

| Concern                | Consideration                                                  |
| ---------------------- | -------------------------------------------------------------- |
| Instance type          | Compute-optimized EC2 (e.g. `c6i.xlarge` or higher for MAGUS)  |
| Storage                | EBS gp3 volume, sized per customer needs                       |
| AMI                    | Custom AMI with Node.js, Python, MAGUS deps, XTree binary      |
| Networking             | VPC per customer or shared VPC with security groups            |
| DNS                    | Subdomain per customer (e.g. `<slug>.2fp.bio`)                 |
| HTTPS                  | ACM certificate + ALB, or Caddy/nginx on-instance              |
| Shutdown               | Auto-stop after idle period; user can restart from portal       |
| Authentication         | Shared password/access code gate for lab access                |

### 4.2 Provisioning Flow

1. User signs up on the central 2FP marketing/billing site.
2. Payment is processed (Stripe integration).
3. Provisioning service (Lambda, Step Functions, or simple script):
  - Launches an EC2 instance from the 2FP custom AMI.
  - Clones/copies the latest codebase onto the instance.
  - Sets environment variables (instance ID, customer ID, etc.).
  - Configures DNS record (`<customer>.2fp.bio → instance IP`).
  - Runs `npm run build && npm start` (or PM2 / systemd service).
  - Sets shared password/access code for lab access.
4. User receives their instance URL and access code, and can begin using the tools.

### 4.3 Infrastructure-as-Code

All provisioning should be codified (Terraform, AWS CDK, or Pulumi) to ensure reproducibility. The IaC repository will be separate from this GUI codebase. Stripe integration for billing and instance lifecycle events (stop/start/terminate) is required.

---

## 5  Refactor: Remove Job Queue & Email Notifications

### 5.1 Rationale

In the current shared-server model, a background worker is required because multiple users share a single machine and jobs must be serialized. Email notification exists because the user submits a job and walks away. In the per-customer model:

- The user is the **sole operator** — no contention, no queue needed.
- The user is **present in the browser** — results can be shown in real time; no email needed.

### 5.2 What Gets Removed

| Component                        | Files                                                       |
| -------------------------------- | ----------------------------------------------------------- |
| Background worker process        | `worker.ts`                                                  |
| File-based job queue             | `lib/queue/index.ts`, `jobs/queue.json`                      |
| File-based job lock              | `lib/execution/jobLock.ts`                                   |
| Email transport                  | `lib/email/sendEmail.ts`                                     |
| Email template renderer          | `lib/email/renderTemplate.ts`                                |
| Email templates                  | `lib/email/templates/magus-success.txt`, `magus-failure.txt`, `xtree-success.txt`, `xtree-failure.txt` |
| Email field in UI                | Email `<input>` in `components/magus.tsx` and `components/xtree.tsx` |
| Email field in API routes        | Email validation in `app/api/magus/route.ts` and `app/api/xtree/route.ts` |
| Nodemailer dependency            | `nodemailer` and `@types/nodemailer` in `package.json`       |
| Billing/instance lifecycle email | Email integration for billing, password resets, and lifecycle events |

### 5.3 New Execution Model

Jobs execute **synchronously from the API route** (or via Server-Sent Events / WebSocket for streaming output). The flow becomes:

```
User clicks "Run" in browser
  │
  ├─► POST /api/xtree/run   ─── spawns xtree process
  │                               streams stdout/stderr to client
  │                               returns result when complete
  │
  ├─► POST /api/magus/stage  ─── runs a single MAGUS stage (see §6)
  │                               streams output to client
  │                               returns result when complete
  │
  └── User sees results in-app immediately
```

**Streaming approach (recommended):** Use Server-Sent Events (SSE) from the Next.js API route so the browser can display real-time stdout/stderr output as the bioinformatics tool runs. This is especially important for MAGUS stages that may run for minutes or hours.

### 5.4 XTree Changes

XTree's current submission flow (upload file → enqueue → worker runs → email) will be simplified to:

1. User uploads file and configures parameters (existing UI, minus email field).
2. User clicks "Run".
3. `POST /api/xtree/run` receives the file, validates, spawns the `xtree` binary.
4. Output is streamed back to the browser via SSE.
5. On completion, results are displayed in-app (stdout, downloadable output files).
6. No queue, no email, no worker.

---

## 6  Refactor: Cell-Based MAGUS Interface

### 6.1 Concept

Today, MAGUS presents all 7 pipeline stages as a single form. The user toggles stages, configures parameters, and submits the entire workflow at once. The backend compiles all enabled stages into a linear execution plan and runs them sequentially.

The refactored interface treats each stage as an **independent, interactive cell** — analogous to cells in a Jupyter notebook:

- Each cell can be **configured, run, and inspected independently**.
- A cell's output becomes the input for downstream cells.
- Cells display their own **status** (idle → running → success / error), **logs**, and **output files**.
- Users can **re-run** individual cells without re-running the entire pipeline.
- The dependency engine still warns about unsatisfied prerequisites, but does not prevent execution.

### 6.2 Visual Design

```
┌────────────────────────────────────────────────────────────────┐
│  MAGUS Workflow                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▶ [1] Input & Execution Settings              [Run ▶]  │  │
│  │   Status: ✅ Complete (2 files uploaded)                 │  │
│  │   ┌─ Output ────────────────────────────────────────┐   │  │
│  │   │ sample_reads.fastq (1.2 GB)                     │   │  │
│  │   └─────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▶ [2] QC / Preprocessing                      [Run ▶]  │  │
│  │   Status: 🔄 Running…  (elapsed 03:42)                  │  │
│  │   ┌─ Live output ───────────────────────────────────┐   │  │
│  │   │ [shi7] Trimming adapters…                       │   │  │
│  │   │ [shi7] Processed 1,204,882 / 12,048,820 reads  │   │  │
│  │   │ █████████░░░░░░░░░░░░ 10%                       │   │  │
│  │   └─────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▷ [3] Assembly & Binning                      [Run ▶]  │  │
│  │   Status: ⏸ Idle                                        │  │
│  │   ⚠ Depends on: [2] QC / Preprocessing                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▷ [4] Taxonomy & Filtering                    [Run ▶]  │  │
│  │   Status: ⏸ Idle                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▷ [5] Specialized Analyses (Euk / Virus)      [Run ▶]  │  │
│  │   Status: ⏸ Idle                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▷ [6] Annotation & Gene Catalogs              [Run ▶]  │  │
│  │   Status: ⏸ Idle                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▷ [7] Phylogeny & Final Outputs               [Run ▶]  │  │
│  │   Status: ⏸ Idle                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [Run All ▶▶]   [Run From Selected ▶]   [Reset All ↺]   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 6.3 Cell State Machine

Each MAGUS stage cell follows this state model:

```
           configure
    ┌──────────────────┐
    │                  │
    ▼                  │
  IDLE ──── Run ───► RUNNING
    ▲                  │
    │          ┌───────┴───────┐
    │          ▼               ▼
    │       SUCCESS          ERROR
    │          │               │
    └──── Re-run ◄─────── Re-run
```

| State       | UI Indicators                                                  |
| ----------- | -------------------------------------------------------------- |
| `idle`      | Grey badge, "Run" button enabled (if dependencies met)         |
| `running`   | Animated spinner, elapsed time, live stdout stream, "Run" disabled |
| `success`   | Green badge, output file list, downloadable artifacts, "Re-run" button |
| `error`     | Red badge, stderr output, error message, "Re-run" button       |

### 6.4 Cell Data Model

```typescript
type CellStatus = "idle" | "running" | "success" | "error";

type MagusCell = {
  stage: StageKey;                   // "input" | "preprocessing" | … | "phylogeny"
  label: string;                     // Human-readable name
  config: Record<string, any>;       // Stage-specific parameters
  status: CellStatus;
  startedAt?: number;
  finishedAt?: number;
  stdout: string;                    // Accumulated stdout (streamed)
  stderr: string;                    // Accumulated stderr
  outputFiles: string[];             // Paths to output artifacts
  error?: string;                    // Error message if status === "error"
};
```

### 6.5 API Surface

#### Run a single stage

```
POST /api/magus/run
Content-Type: application/json

{
  "stage": "preprocessing",
  "config": { … }
}

Response: SSE stream
  event: stdout
  data: {"line": "[shi7] Trimming adapters…"}

  event: status
  data: {"status": "success", "outputFiles": ["qc_reads.fastq.gz"]}
```

#### Run all stages (sequential)

```
POST /api/magus/run-all
Content-Type: application/json

{
  "stages": { … }        // full workflow state (same shape as today)
}

Response: SSE stream
  event: stage-start
  data: {"stage": "preprocessing"}

  event: stdout
  data: {"stage": "preprocessing", "line": "…"}

  event: stage-complete
  data: {"stage": "preprocessing", "status": "success"}

  event: stage-start
  data: {"stage": "assembly"}
  …
```

#### Check stage output / files

```
GET /api/magus/output?stage=preprocessing

Response:
{
  "files": [
    { "name": "qc_reads.fastq.gz", "size": 1048576, "path": "/outputs/preprocessing/qc_reads.fastq.gz" }
  ]
}
```

### 6.6 Frontend Components

| Component (new/modified)                        | Responsibility                                              |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `components/magus/MagusNotebook.tsx` (new)      | Top-level container, manages array of `MagusCell` state     |
| `components/magus/MagusNotebook.tsx` (new)      | Top-level container, manages array of `MagusCell` state     |
| `components/magus/MagusCell.tsx` (new)           | Single cell: config panel + run button + output viewer      |
| `components/magus/CellOutput.tsx` (new)          | Live-streaming stdout/stderr display with auto-scroll       |
| `components/magus/CellToolbar.tsx` (new)         | "Run All", "Run From Here", "Reset All" toolbar             |
| `components/magus/workflowStages/*.tsx` (modify) | Retain existing config UIs, but embed inside `MagusCell`    |
| `components/magus/dependencies.ts` (modify)      | Keep dependency rules; surface as warnings on cells, not blockers |
| `components/magus.tsx` (rewrite)                 | Thin wrapper that renders `<MagusNotebook />`               |
| `components/dashboard/Dashboard.tsx` (new)       | Dashboard screen showing usage, billing, and navigation     |

### 6.7 Inter-Cell Data Flow

Each stage writes its output to a well-known directory on the instance filesystem:

```
/workspace/outputs/
  ├── input/
  │   └── sample_reads.fastq
  ├── preprocessing/
  │   └── qc_reads.fastq.gz
  ├── assembly/
  │   ├── contigs.fasta
  │   └── bins/
  ├── taxonomy/
  │   └── classifications.tsv
  ├── specialized/
  │   ├── viral_contigs.fasta
  │   └── euk_bins/
  ├── annotation/
  │   ├── orfs.fasta
  │   └── gene_catalog.tsv
  └── phylogeny/
      └── tree.nwk
```

When a cell runs, it reads from its upstream stage's output directory. The API route resolves these paths automatically based on the stage dependency graph.

### 6.8 Dependency Handling in Cell Mode

The existing `STAGE_DEPENDENCY_RULES` from `components/magus/dependencies.ts` will be reused. Behavior changes:

| Current behavior                           | New behavior                                           |
| ------------------------------------------ | ------------------------------------------------------ |
| Stages auto-disabled if deps unmet         | Stages show a warning but remain configurable           |
| Submit blocked if invalid                  | "Run" button shows tooltip "Requires: Assembly"         |
| No feedback on stage completion            | Downstream cells highlight when upstream completes      |

---

## 7  Removed Features: Detail

### 7.1 Email Field

- Remove the email `<input>` from both `components/magus.tsx` and `components/xtree.tsx`.
- Remove email validation from `app/api/magus/route.ts` and `app/api/xtree/route.ts`.
- Remove `email` field from `meta.json` writes.

### 7.2 Worker Process

- Delete `worker.ts` entirely.
- Remove the `worker` script from `package.json` if present.
- Remove `nodemailer` and `@types/nodemailer` from dependencies.

### 7.3 Queue

- Delete `lib/queue/index.ts`.
- Delete `jobs/queue.json`.
- Remove `enqueueJob` / `dequeueJob` imports from API routes.

### 7.4 Job Lock

- Delete `lib/execution/jobLock.ts`.
- The per-instance model allows only one user, so process-level concurrency control (if needed) can be a simple in-memory flag.

---

## 8  Upload Size Limits

Currently defined in `lib/uploads/limits.ts`. On a per-customer instance the limits can be relaxed since the user is only impacting their own machine. No S3 backup or bulk download for v1; users download individual files only.

| Limit                    | Current value | Proposed change                     |
| ------------------------ | ------------- | ----------------------------------- |
| `MAX_MAGUS_UPLOAD_SIZE`  | TBD           | Increase or remove (instance-local) |
| `ABSOLUTE_MAX_UPLOAD_SIZE` | TBD         | Governed by EBS volume size         |

---

## 9  Implementation Phases

### Phase 1 — Remove queue, worker, and email (estimated: 1–2 days)

1. Delete `worker.ts`, `lib/queue/`, `lib/email/`, `lib/execution/jobLock.ts`.
2. Remove `nodemailer` / `@types/nodemailer` from `package.json`.
3. Remove email field from both UI components and API routes.
4. Rewrite `POST /api/xtree` to execute synchronously (or SSE) and return results.
5. Rewrite `POST /api/magus` to execute synchronously (or SSE) and return results.
6. Verify XTree end-to-end with stub executor.

### Phase 2 — Cell-based MAGUS interface (estimated: 3–5 days)

1. Define `MagusCell` state model and create `MagusNotebook.tsx`.
2. Create `MagusCell.tsx` with config panel, run button, and output viewer.
3. Create `CellOutput.tsx` with SSE-driven live streaming.
4. Create SSE-capable API routes (`/api/magus/run`, `/api/magus/run-all`).
5. Refactor `runMAGUS.ts` to run a single stage and stream output.
6. Modify existing `workflowStages/*.tsx` components to embed inside cells.
7. Update `dependencies.ts` to provide warnings without auto-disabling.
8. Add "Run All", "Run From Here", "Reset All" toolbar.
9. Add output file listing and download.

### Phase 3 — AWS provisioning & account model (estimated: 5–10 days)

1. Design and build the central billing/provisioning site (separate repo).
2. Create custom AMI with all dependencies (Node.js, Python, MAGUS, XTree).
3. Write IaC (Terraform / CDK) for EC2 instance provisioning.
4. Implement provisioning API: payment → create instance → configure DNS.
5. Add instance lifecycle management (start/stop/terminate).
6. Set up SSL certificates (ACM + ALB or on-instance Caddy).
7. Create customer onboarding flow (sign up → pay → receive instance URL).
8. Document operational runbooks (scaling, monitoring, backups).

### Phase 4 — Hardening & polish (estimated: 2–3 days)

1. Add in-app result history (local filesystem index).
2. Add "Download All Outputs" for completed MAGUS workflows.
3. Improve error handling and user-facing error messages.
4. Add instance health-check endpoint for monitoring.
5. End-to-end testing on a provisioned AWS instance.
6. Update README and user documentation.

---

## 10  Technical Decisions & Open Questions

| #   | Question                                                                                      | Status      |
| --- | --------------------------------------------------------------------------------------------- | ----------- |
| Q1  | Which AWS EC2 instance type(s) should be offered? Single tier or multiple?                    | Open        |
| Q2  | Should the provisioning plane be a separate Next.js app, or a serverless API (Lambda)?        | Open        |
| Q3  | Payment processor — Stripe integration for automated billing?                                 | Stripe      |
| Q4  | Should instances auto-sleep after idle time to reduce cost? If so, what timeout?              | Open        |
| Q5  | Should the codebase be delivered via AMI bake or git clone?                                  | AMI         |
| Q6  | Do we need persistent storage (S3 sync) for outputs, or is ephemeral EBS sufficient?         | EBS for v1  |
| Q7  | Should the cell-based MAGUS support uploading intermediate files (e.g. user's own contigs)?   | Future V2   |
| Q8  | SSE vs. WebSocket for streaming — SSE is simpler but unidirectional; is that sufficient?      | SSE         |
| Q9  | Shared password/access code for authentication; no per-user accounts for v1.                  | Decided     |
| Q10 | Should we support instance updates (new codebase versions) in-place or via re-provisioning?   | Open        |
| Q11 | Multi-tenant SaaS or on-premises support for V2?                                             | Future V2   |

---

## 11  Risks & Mitigations

| Risk                                                    | Impact | Mitigation                                                       |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| AWS costs scale linearly with customer count             | High   | Auto-stop idle instances; right-size instance types; reserved instances |
| Instance provisioning is slow (minutes)                  | Medium | Pre-warm pool of instances; async provisioning with status page  |
| Codebase drift between instances                         | Medium | Immutable AMI versioning; automated update pipeline              |
| User loses data if instance is terminated                | High   | EBS persists until terminated; clear warnings before deletion    |
| Long-running MAGUS stages cause browser timeout          | Medium | SSE streaming keeps connection alive; reconnect logic            |
| Single-user instance underutilizes resources             | Low    | Right-size instances; allow instance resizing                    |
| Stripe/AWS API outages                                  | Medium | Graceful degradation: hide usage dashboard, disable job submission |

---

## 12  Success Metrics

| Metric                                                         | Target                      |
| -------------------------------------------------------------- | --------------------------- |
| Time from payment to usable instance                           | < 5 minutes                 |
| MAGUS stage execution feedback latency (first stdout line)     | < 2 seconds                 |
| Zero cross-customer data leakage incidents                     | 0                           |
| Customer can run full MAGUS pipeline interactively              | End-to-end in browser       |
| Codebase has no references to queue, email, or worker           | 0 dead-code references      |
| Usage dashboard reflects AWS costs within 2-3 days              | Accurate, timely            |
| Password reset and lifecycle emails delivered reliably          | Yes                         |

---

## 13  Appendix: Current MAGUS Pipeline Stages

For reference, these are the 7 stages and their sub-steps as compiled by `lib/magus/compileWorkflow.ts`:

| #   | Stage                    | StageKey       | Sub-steps                                                                                  |
| --- | ------------------------ | -------------- | ------------------------------------------------------------------------------------------ |
| 1   | Input & Execution        | `input`        | File upload, execution settings (no CLI command)                                           |
| 2   | QC / Preprocessing       | `preprocessing`| `magus qc`                                                                                 |
| 3   | Assembly & Binning       | `assembly`     | `magus single-assembly`, `magus binning`, `magus cluster-contigs`, `magus coassembly`, `magus coassembly-binning` |
| 4   | Taxonomy & Filtering     | `taxonomy`     | `magus taxonomy`, `magus filter-mags`                                                      |
| 5   | Specialized Analyses     | `specialized`  | `magus find-viruses`, `magus find-euks`, `magus dereplicate`                               |
| 6   | Annotation & Gene Catalogs | `annotation` | `magus call-orfs`, `magus annotate`, `magus build-gene-catalog`, `magus consolidate-gene-catalog` |
| 7   | Phylogeny & Final        | `phylogeny`    | `magus build-tree`, `magus finalize-bacterial-mags`                                        |

Each cell in the new interface corresponds to one row in this table. Sub-steps within a stage run sequentially within that cell.
