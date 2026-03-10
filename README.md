# 2FP Bioinformatics Platform (XTree & MAGUS)

This repository implements a secure, interactive web platform for running long-running bioinformatics tools (XTree and MAGUS) on isolated AWS EC2 instances. Each lab receives its own instance, with usage-based billing, a shared access code, and a cell-based MAGUS interface for maximum control and safety.

Supported tools:
- XTree (phylogenetic placement and taxonomic classification)
- MAGUS (modular metagenomic assembly and genome recovery)

The platform is designed for per-lab isolation, real-time results, and extensibility to future SaaS or on-premises models.

## Set-up

For production, each lab instance is provisioned automatically via the central billing portal. Local development uses:

    npm install
    npm run dev

No background worker or queue is required. All jobs execute directly from the web interface.

## High-level architecture overview

The platform is composed of three main layers:

1. Frontend (React / Next.js)
    - Collects input files, parameters, and shared access code
    - Provides dashboard, usage, and navigation between XTree and MAGUS
    - MAGUS interface is fully cell-based (notebook style)

2. API routes (Next.js server routes)
    - Validate user input
    - Execute jobs directly (no queue or worker)
    - Stream real-time output to the browser (SSE)
    - Persist job data and results to disk

3. EC2 instance isolation
    - Each lab gets its own EC2 instance, filesystem, and processes
    - No cross-lab data leakage or shared resources
    - Usage and billing tracked via AWS APIs

## Design principles

1. Per-lab isolation
    - Each lab has its own EC2 instance, filesystem, and processes
    - No cross-lab data leakage or shared resources

2. Real-time, interactive execution
    - Jobs run directly from the web interface
    - Output is streamed live to the browser

3. Cell-based MAGUS interface
    - Each pipeline stage is an independent, interactive cell
    - Users can run, inspect, and re-run stages individually

4. Usage-based billing
    - AWS costs are tracked and displayed in-app
    - Stripe integration for automated invoices

5. Simple shared authentication
    - Access controlled by a shared password/access code
    - No per-user accounts for v1

## Frontend behavior and user interaction

Information collected from users

For every job submission, the frontend collects:

    - Input sequencing file
        - XTree: FASTA or FASTQ
        - MAGUS: FASTQ

    - Tool-specific parameters
        - XTree: reference database, read type, alignment sensitivity
        - MAGUS: stage configs, cell parameters

    - Shared access code (password)
        - Required for instance access

Submission flow

    - User logs in with access code
    - Dashboard shows usage, billing, and navigation
    - User uploads file, configures parameters, and runs jobs
    - Output is streamed live to the browser
    - Results are downloadable as individual files

## API routes

The backend exposes two primary API routes:
    /api/xtree/run
    /api/magus/run

Responsibilities of API routes

Each API route performs:
    - Parse form data
    - Validate file format, size, and content
    - Validate tool parameters
    - Create a job directory
    - Execute bioinformatics tools directly
    - Stream output to the browser (SSE)
    - Persist job metadata and results

No queue, worker, or email notification is used.

## Job persistence model

Each job is stored as a directory:

    jobs/<jobId>/

Where <jobId> is a UUID generated at submission time.

Job directory contents

Each job directory contains:

    input/
        - Uploaded sequencing file (original filename preserved)

    params.json
        - Validated tool parameters

    meta.json
        - Immutable job metadata

    status.json
        - Current job state

    stdout.log
        - Execution output (after completion)

    stderr.log
        - Execution errors (if any)

No email address is stored; results are accessed and downloaded in-app.

## Queue system

No queue is used in the new architecture. All jobs execute directly from the API route, one at a time per instance.

## Worker process

No worker process is used. All execution happens synchronously from the API route, with real-time streaming to the browser.

## Email notification model

No email notifications for job completion or errors. Email integration is used only for billing, password resets, and instance lifecycle events.

## Authentication and access control

Access is controlled by a shared password/access code per instance. No per-user accounts for v1. Password reset is available via email.

## Cleanup and lifecycle notes

Jobs are retained indefinitely on the instance's EBS volume. No S3 backup or bulk download for v1. Users download individual files only.

## Technology Stack

Frontend:
    - Next.js 16.1.1 (React 19.2.3)
    - TypeScript
    - Tailwind CSS 4.1.18
    - Lucide React (icons)

Backend:
    - Next.js API routes
    - Node.js with TypeScript
    - Stripe for billing
    - AWS EC2 for per-lab isolation

Bioinformatics Tools:
    - XTree: Phylogenetic placement and taxonomic classification
    - MAGUS: Modular Assembly and Genome recovery Unified System

## Project Structure

Key directories:

app/
    - Next.js 16 app directory structure
    - Frontend pages and API routes
    - globals.css for styling

components/
    - React components for XTree and MAGUS interfaces
    - dashboard/: Dashboard and usage components
    - magus/: MAGUS-specific components (cell-based notebook)

lib/
    - Shared utilities and core business logic
    - magus/: MAGUS command building and workflow compilation
    - uploads/: File validation and sanitization
    - xtree/: XTree command building

jobs/
    - Job storage directory (each job gets its own UUID subdirectory)

scripts/
    - magus/2FP_MAGUS/: Complete MAGUS pipeline implementation
    - xtree/2FP-XTree/: XTree tool implementation

## Development Workflow

1. Install dependencies:
    npm install

2. Configure environment variables:
    Create a .env.local file with:
        STRIPE_API_KEY=<your-stripe-key>
        ACCESS_CODE=<shared-password>

3. Run the frontend and API:
    npm run dev

4. Access the application:
    http://localhost:3000

## Testing Strategy

Development Testing:
    - USE_EXECUTION_STUBS=true enables stub execution
    - Simulates tool execution without requiring actual binaries
    - Generates predictable output for testing state management
    - Works on any platform (macOS, Windows, Linux)

Production Testing:
    - Requires actual XTree and MAGUS binaries
    - Linux environment required
    - Full end-to-end execution with real bioinformatics tools

## MAGUS Workflow Stages

The MAGUS pipeline consists of seven modular stages, each represented as an interactive cell in the UI:

1. Input & Execution Setup
2. Preprocessing
3. Assembly & Binning
4. Annotation & Gene Catalog
5. Taxonomy & Filtering
6. Phylogeny & Final Processing
7. Specialized Analyses

Each cell can be run, inspected, and re-run independently. Output is streamed live, and results are downloadable as individual files.

## Summary

This repository implements a robust, extensible platform for interactive bioinformatics workflows, with per-lab EC2 isolation, cell-based MAGUS, real-time streaming, and usage-based billing. All enhancements (multi-tenant SaaS, on-premises, containerization) can be added incrementally without architectural changes.

## Next Steps to Complete

Critical for Production:

1. Stripe integration for billing and invoices
2. Usage dashboard with AWS cost tracking (2-3 day delay acceptable)
3. Password reset and lifecycle email integration
4. File size limits and validation
5. Error handling for job failures and billing stoppage
6. Secure download links for individual results
7. Dashboard, navigation, and cell-based MAGUS interface

Future Enhancements:
    - Multi-tenant SaaS and on-premises support
    - Container-based deployment (ECS/Fargate)
    - S3 backup and bulk download
    - Job history and analytics
    - External data source integration

## Contributing

This project is part of academic research. Contributions, bug reports, and feature requests are welcome.

When contributing:
    - Follow existing code style and conventions
    - Add tests for new functionality
    - Update documentation for user-facing changes
    - Ensure stub execution still works for development

## License

[Add appropriate license information]

## Acknowledgments

This platform was developed to support bioinformatics research and make advanced metagenomic analysis tools accessible to the broader scientific community.

For questions or support, please contact: [Add contact information]
