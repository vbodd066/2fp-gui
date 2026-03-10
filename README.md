=====================================================
Bioinformatics Web Execution Platform (XTree & MAGUS)
=====================================================

This repository implements a queue-based, asynchronous web execution platform for
long-running bioinformatics tools. It is designed to safely accept user-submitted
sequencing data, execute computationally intensive analyses in the background, and
deliver results via email without blocking HTTP requests or overloading the web server.

The system currently supports two tools:
- XTree (large-scale sequence alignment)
- MAGUS (modular metagenomic assembly and genome recovery)

The architecture is intentionally general and can be extended to additional tools,
parallel execution, HPC schedulers, or cloud infrastructure without refactoring
core components.

===========
Set-up
===========

Terminal 1 (Next.js frontend + API routes):
    npm run dev

Terminal 2 (background worker):
    USE_EXECUTION_STUBS=true npx tsx worker.ts

The worker must be running for jobs to be processed.

=================================
High-level architecture overview
=================================

The system is composed of four main layers:

1. Frontend (React / Next.js)
    - Collects input files, parameters, and an email address
    - Submits jobs via HTTP
    - Immediately confirms successful submission
    - Does not wait for results or poll job status

2. API routes (Next.js server routes)
    - Validate user input
    - Persist job data to disk
    - Enqueue jobs for background processing
    - Return immediately to the user

3. Persistent job queue
    - Disk-backed FIFO queue
    - Ensures jobs survive crashes and restarts
    - Guarantees serial execution

4. Background worker
    - Runs as a standalone Node.js process
    - Consumes jobs from the queue
    - Executes XTree or MAGUS
    - Writes logs and updates job state
    - Sends completion or failure emails
    - No execution logic runs inside HTTP request handlers

==================
Design principles
==================

The system is built around the following principles:

1. Asynchronous by design
        Bioinformatics analyses are treated as background tasks, not request-response operations.

2. Persistent state
        Every job is stored on disk as a self-contained directory.

3. Separation of concerns
        Each layer has a single, clearly defined responsibility.

4. Platform flexibility
        Development can occur on macOS using stub executors, while real execution
        occurs on Linux, servers, or HPC systems.

5. Failure tolerance
        All job state is persisted, allowing inspection, debugging, and recovery
        after crashes or restarts.

=======================================
Frontend behavior and user interaction
=======================================

Information collected from users

For every job submission, the frontend collects:

    - Input sequencing file
        - XTree: FASTA or FASTQ
        - MAGUS: FASTQ

    - Tool-specific parameters

        XTree:
            - reference database (GTDB or RefSeq)
            - read type (short or long)
            - alignment sensitivity

        MAGUS:
            - analysis preset
            - minimum contig length

    - Email address
        - Required
        - Used as the sole mechanism for delivering results

Submission flow

    - The user uploads a file, selects parameters, and enters an email address
    - The frontend submits the job to the appropriate API route
    - On success, the UI displays:
        “Job submission successful. Your results will be emailed to you.”
    - No job ID is shown to the user
    - No job status polling occurs

=================
API routes
=================

The backend exposes two primary API routes:
    /api/xtree
    /api/magus

Responsibilities of API routes

Each API route performs only the following actions:

    - Parse multipart form data
    - Validate file format, size, and content
    - Validate tool parameters
    - Create a job directory
    - Persist job metadata and inputs
    - Enqueue the job ID

API routes explicitly do not:

    - Execute bioinformatics tools
    - Spawn child processes
    - Manage concurrency
    - Block waiting for results

This guarantees fast, reliable HTTP responses.

=====================
Job persistence model
=====================

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

meta.json

Stores immutable metadata about the job:
    - job ID
    - tool name (xtree or magus)
    - user email address
    - submission timestamp

This file is used by the worker to determine how to execute the job and where to
send notifications.

status.json

Tracks the job lifecycle:
    - queued
    - running
    - done
    - error

Timestamps and error messages are recorded when applicable.
This file is the single authoritative source of job state.

================
Queue system
================

The queue is implemented as a persistent FIFO list stored on disk.

enqueueJob(jobId)
    - Appends the job ID to the queue
    - Called only by API routes
    - Happens after all job files are successfully written

dequeueJob()
    - Removes and returns the next job ID
    - Called only by the worker
    - Returns null if no jobs are available

Rationale

A disk-backed queue:
    - requires no external services
    - survives crashes
    - is easy to inspect and debug
    - is sufficient for serial execution

This is appropriate for academic tools and early-stage deployments.

=================
Worker process
=================

The worker is a standalone Node.js process and is not part of the Next.js runtime.

Worker responsibilities

The worker:
    - Polls the job queue
    - Loads job metadata and parameters
    - Updates job status to running
    - Executes the appropriate tool
    - Captures stdout and stderr
    - Updates job status to done or error
    - Sends completion or failure emails
    - Continues processing subsequent jobs

The worker never handles HTTP requests.

Execution model

Jobs are executed serially, ensuring:
    - predictable resource usage
    - no race conditions
    - simplified debugging

Parallelism or HPC scheduling can be added later.

=================
Execution layer
=================

The execution layer is pluggable and tool-specific.

Real execution (Linux / HPC)

In production environments:
    - XTree and MAGUS are executed via native binaries
    - stdout and stderr are captured
    - Non-zero exit codes mark jobs as failed

Stub execution (macOS development)

For development on unsupported platforms:
    - Stub functions simulate execution
    - Artificial delays mimic runtime
    - Predictable output is written to logs

Stub execution is controlled by an environment variable and requires no code changes.

============================
Email notification model
============================

The platform uses email-only notification:

    - Users are notified immediately that submission succeeded
    - A completion email is sent when processing finishes
    - Failure emails are sent if execution errors occur

No dashboards, polling, or authentication are required.

This model aligns with common bioinformatics usage patterns and minimizes system
complexity.

================================
Authentication and access control
================================

The current system:
    - does not require user authentication
    - uses email as the identity anchor
    - does not expose job IDs publicly

This is appropriate for:
    - academic tools
    - manuscript-linked web interfaces
    - demonstration platforms

Authentication can be added later without refactoring core components.

=============================
Cleanup and lifecycle notes
=============================

Jobs are currently retained indefinitely.

Future cleanup policies may include:
    - deleting jobs after a fixed time window
    - removing failed jobs earlier
    - manual or scheduled cleanup scripts

These are operational concerns and do not affect the architecture.

=======================
Technology Stack
=======================

Frontend:
    - Next.js 16.1.1 (React 19.2.3)
    - TypeScript
    - Tailwind CSS 4.1.18
    - Lucide React (icons)

Backend:
    - Next.js API routes
    - Node.js with TypeScript
    - tsx for TypeScript execution
    - nodemailer for email notifications
    - File-based job queue (no database required)

Bioinformatics Tools:
    - XTree: Phylogenetic placement and taxonomic classification
    - MAGUS: Modular Assembly and Genome recovery Unified System

=======================
Project Structure
=======================

Key directories:

app/
    - Next.js 16 app directory structure
    - Frontend pages and API routes
    - globals.css for styling

components/
    - React components for XTree and MAGUS interfaces
    - citations.tsx: Reference citations
    - magus.tsx: MAGUS workflow UI
    - xtree.tsx: XTree workflow UI
    - magus/: MAGUS-specific components
        - dependencies.ts: Dependency graph logic
        - workflowStages/: Stage-specific UI components

lib/
    - Shared utilities and core business logic
    - email/: Email template rendering and sending
    - execution/: Job execution and locking
    - magus/: MAGUS command building and workflow compilation
    - queue/: Job queue implementation
    - uploads/: File validation and sanitization
    - xtree/: XTree command building

jobs/
    - Job storage directory (each job gets its own UUID subdirectory)
    - queue.json: Persistent job queue

scripts/
    - magus/2FP_MAGUS/: Complete MAGUS pipeline implementation
    - xtree/2FP-XTree/: XTree tool implementation

worker.ts
    - Standalone background worker process
    - Polls queue and executes jobs

=======================
Development Workflow
=======================

1. Install dependencies:
    npm install

2. Configure environment variables:
    Create a .env.local file with:
        SMTP_HOST=<your-smtp-server>
        SMTP_PORT=<port>
        SMTP_USER=<username>
        SMTP_PASS=<password>
        FROM_EMAIL=<sender-email>

3. Run the frontend and API:
    npm run dev

4. Run the background worker:
    USE_EXECUTION_STUBS=true npx tsx worker.ts

    For production execution (Linux/HPC only):
    npx tsx worker.ts

5. Access the application:
    http://localhost:3000

=======================
Testing Strategy
=======================

Development Testing:
    - USE_EXECUTION_STUBS=true enables stub execution
    - Simulates tool execution without requiring actual binaries
    - Generates predictable output for testing email and state management
    - Works on any platform (macOS, Windows, Linux)

Production Testing:
    - Remove USE_EXECUTION_STUBS or set to false
    - Requires actual XTree and MAGUS binaries
    - Linux/HPC environment typically required
    - Full end-to-end execution with real bioinformatics tools

=======================
MAGUS Workflow Stages
=======================

The MAGUS pipeline consists of several modular stages:

1. Input & Execution Setup
    - File validation and parameter configuration

2. Preprocessing
    - Quality control and read filtering
    - Adapter trimming and quality assessment

3. Assembly & Binning
    - Metagenomic assembly
    - Contig binning and clustering

4. Annotation & Gene Catalog
    - ORF calling and annotation
    - Gene catalog construction

5. Taxonomy & Filtering
    - Taxonomic classification
    - Contamination filtering

6. Phylogeny & Final Processing
    - Phylogenetic tree building
    - MAG dereplication and finalization

7. Specialized Analyses
    - Eukaryotic detection
    - Viral identification
    - Host genome assembly

Each stage is represented in the UI with:
    - Parameter configuration options
    - Dependency visualization
    - Conditional activation based on previous stages

=========
Summary
=========

This repository implements a robust, extensible backend for asynchronous
bioinformatics workflows. It avoids common pitfalls such as blocking HTTP
requests, shared temporary files, and opaque execution state.

The system is:

    - asynchronous
    - persistent
    - debuggable
    - platform-agnostic
    - suitable for academic and production use

All remaining enhancements (authentication, downloads, cleanup, scaling) can be
added incrementally without architectural changes.

=======================
Next Steps to Complete
=======================

Critical for Production:

1. Email Configuration Verification
    - Test email delivery with production SMTP settings
    - Implement email template customization
    - Add result attachment handling for large outputs

2. File Size and Security Hardening
    - Implement file size limits enforcement
    - Add virus scanning for uploaded files
    - Implement rate limiting per IP address
    - Add CAPTCHA or similar anti-abuse measures

3. Job Cleanup and Retention Policy
    - Implement automated job cleanup after N days
    - Add configuration for retention policies
    - Create admin script for manual cleanup
    - Archive completed jobs to cheaper storage

4. Error Handling and Recovery
    - Improve error messages in failure emails
    - Add automatic retry logic for transient failures
    - Implement dead letter queue for permanently failed jobs
    - Add health check endpoint for monitoring

5. Production Deployment
    - Configure reverse proxy (nginx/Apache)
    - Set up SSL/TLS certificates
    - Configure worker as systemd service or similar
    - Set up log rotation
    - Implement monitoring and alerting

6. Result Download Interface
    - Add secure download links in completion emails
    - Implement time-limited signed URLs
    - Create web interface for result download
    - Add result preview functionality

Nice-to-Have Enhancements:

7. Authentication and User Accounts
    - Implement user registration and login
    - Add job history per user
    - Create user dashboard
    - Add OAuth integration (Google, ORCID)

8. Job Status Tracking
    - Add optional job status page with UUID
    - Implement WebSocket or SSE for real-time updates
    - Create progress indicators for long-running jobs
    - Add estimated completion time

9. Queue and Execution Improvements
    - Implement job priority levels
    - Add parallel execution support
    - Integrate with HPC schedulers (SLURM, PBS)
    - Add job cancellation functionality

10. Enhanced MAGUS Features
    - Add visualization of intermediate results
    - Implement stage-level progress tracking
    - Add ability to restart from specific stage
    - Create comparison view for multiple runs

11. Documentation and Support
    - Create video tutorials for tool usage
    - Add interactive tour for first-time users
    - Implement FAQ section
    - Add example datasets and expected outputs

12. API and Integration
    - Create REST API for programmatic access
    - Add API authentication and rate limiting
    - Implement webhook callbacks for job completion
    - Create Python/R client libraries

13. Analytics and Reporting
    - Add usage statistics dashboard
    - Track job success/failure rates
    - Monitor execution times and resource usage
    - Generate usage reports for funding agencies

=======================
Future Ideas
=======================

Interactive Notebook-Style MAGUS Pipeline:

A compelling enhancement would be to convert the MAGUS pipeline into a Jupyter
notebook-style interface where:

    - Each pipeline stage is represented as an executable "cell"
    - Users can run stages individually rather than the entire pipeline
    - Intermediate data and results are visualized between stages
    - Users can inspect, download, or modify data at any point
    - Failed stages can be re-run without restarting from the beginning
    - Parameters can be adjusted and stages re-executed iteratively

Benefits:
    - Enhanced interactivity and control for researchers
    - Educational value for learning metagenomics workflows
    - Debugging capabilities for pipeline development
    - Flexibility to customize workflows for specific research needs
    - Visual feedback and quality control at each step

Implementation Considerations:
    - Requires preserving intermediate outputs from each stage
    - Need efficient storage and retrieval of intermediate data
    - UI must support cell-based execution model
    - Backend must track stage-level dependencies
    - Visualization libraries needed for common data types:
        * Sequence quality plots
        * Assembly statistics
        * Taxonomic composition charts
        * Phylogenetic trees
        * Gene abundance heatmaps

Technical Approach:
    - Could use actual Jupyter notebooks on backend
    - Or build custom cell-based execution engine
    - Leverage existing workflowStages components
    - Integrate visualization libraries (Plotly, D3.js)
    - Implement stage result caching and state management

This would transform MAGUS from a "black box" pipeline into an interactive
research platform, making it more accessible to researchers and students while
maintaining the robustness of the current architecture.

=======================
Contributing
=======================

This project is part of academic research. Contributions, bug reports, and
feature requests are welcome.

When contributing:
    - Follow existing code style and conventions
    - Add tests for new functionality
    - Update documentation for user-facing changes
    - Ensure stub execution still works for development

=======================
License
=======================

[Add appropriate license information]

=======================
Acknowledgments
=======================

This platform was developed to support bioinformatics research and make
advanced metagenomic analysis tools accessible to the broader scientific
community.

For questions or support, please contact: [Add contact information]
