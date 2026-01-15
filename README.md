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
