const FASTA_REGEX = /^>/;
const FASTQ_REGEX = /^@/;

export function validateSequenceFile(buffer: Buffer, filename: string) {
  const text = buffer.toString("utf-8", 0, 1024); // first KB only

  const isFasta = FASTA_REGEX.test(text);
  const isFastq = FASTQ_REGEX.test(text);

  if (!isFasta && !isFastq) {
    throw new Error("Invalid file format: must be FASTA or FASTQ");
  }

  if (!filename.match(/\.(fa|fasta|fq|fastq|gz)$/i)) {
    throw new Error("Invalid file extension");
  }

  // Optional: simple content sanity check
  if (text.match(/[^\n\rACGTN>@+\s]/i)) {
    throw new Error("Unexpected characters in sequence file");
  }
}
