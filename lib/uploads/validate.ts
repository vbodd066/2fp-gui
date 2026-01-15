import zlib from "zlib";

const FASTA_HEADER = /^>/;
const FASTQ_HEADER = /^@/;
const FASTQ_PLUS = /^\+/;

const MAX_PREFIX_BYTES = 64 * 1024; // 64 KB
const MAX_VALIDATION_LINES = 100;

function isGzip(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function getTextPrefix(buffer: Buffer): string {
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

function looksLikeFastq(text: string): boolean {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 4) return false;

  return (
    FASTQ_HEADER.test(lines[0]) &&
    FASTQ_PLUS.test(lines[2])
  );
}

export function validateSequenceFile(
  buffer: Buffer,
  filename: string
): "fasta" | "fastq" {
  if (!filename.match(/\.(fa|fasta|fq|fastq|gz)$/i)) {
    throw new Error("Invalid file extension");
  }

  const text = getTextPrefix(buffer);
  const lines = text.split(/\r?\n/);

  if (FASTA_HEADER.test(lines[0])) {
    let checked = 0;

    for (const line of lines) {
      if (checked++ > MAX_VALIDATION_LINES) break;
      if (line.startsWith(">") || line.trim() === "") continue;

      if (!/^[ACGTNacgtn]+$/.test(line)) {
        throw new Error("Unexpected characters in FASTA sequence");
      }
    }

    return "fasta";
  }

  if (looksLikeFastq(text)) {
    return "fastq";
  }

  throw new Error("Invalid file format: must be FASTA or FASTQ");
}
