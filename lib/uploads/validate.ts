import zlib from "zlib";

/* -------------------- constants -------------------- */

const FASTA_HEADER = /^>/;
const FASTQ_HEADER = /^@/;
const FASTQ_PLUS = /^\+/;

const MAX_PREFIX_BYTES = 64 * 1024; // 64 KB
const MAX_VALIDATION_LINES = 100;

const VALID_FASTA_SEQ = /^[ACGTNacgtn]+$/;

/* -------------------- helpers -------------------- */

function isGzip(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function extractTextPrefix(buffer: Buffer): string {
  let data: Buffer;

  if (isGzip(buffer)) {
    try {
      data = zlib.gunzipSync(buffer.slice(0, MAX_PREFIX_BYTES));
    } catch {
      throw new Error("Failed to decompress gzip file");
    }
  } else {
    data = buffer.slice(0, MAX_PREFIX_BYTES);
  }

  const text = data.toString("utf-8");

  if (text.includes("\u0000")) {
    throw new Error("Binary file detected");
  }

  return text;
}

function looksLikeFastq(lines: string[]): boolean {
  if (lines.length < 4) return false;

  return (
    FASTQ_HEADER.test(lines[0]) &&
    FASTQ_PLUS.test(lines[2])
  );
}

/* -------------------- main validation -------------------- */

export type SequenceFormat = "fasta" | "fastq";

export function validateSequenceFile(
  buffer: Buffer,
  filename: string
): SequenceFormat {
  /* ---- extension guard ---- */
  if (!/\.(fa|fasta|fq|fastq|gz)$/i.test(filename)) {
    throw new Error("Invalid file extension");
  }

  const text = extractTextPrefix(buffer);
  const lines = text
    .split(/\r?\n/)
    .filter(line => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("Empty or unreadable sequence file");
  }

  /* ---- FASTA ---- */
  if (FASTA_HEADER.test(lines[0])) {
    let checked = 0;

    for (const line of lines) {
      if (checked++ >= MAX_VALIDATION_LINES) break;

      if (line.startsWith(">")) continue;

      if (!VALID_FASTA_SEQ.test(line)) {
        throw new Error(
          "Unexpected characters in FASTA sequence (non-ACGTN)"
        );
      }
    }

    return "fasta";
  }

  /* ---- FASTQ ---- */
  if (looksLikeFastq(lines)) {
    return "fastq";
  }

  throw new Error("Invalid file format: must be FASTA or FASTQ");
}
