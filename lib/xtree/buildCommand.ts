export type XTreeParams = {
  mode: "ALIGN" | "BUILD";

  global?: {
    threads?: number;
    logOut?: string;
  };

  align?: {
    db?: string;
    confidence?: number;

    outputs?: {
      perq?: boolean;
      ref?: boolean;
      tax?: boolean;
      cov?: boolean;
      orthog?: boolean;
    };

    algorithms?: {
      redistribute?: boolean;
      fastRedistribute?: boolean;
      shallowLca?: boolean;
    };

    performance?: {
      copyMem?: boolean;
      doForage?: boolean;
      halfForage?: boolean;
      noAdamantium?: boolean;
    };
  };

  build?: {
    comp?: number;
    k?: number;
  };
};

export type BuildCommandInput = {
  xtreePath: string;
  seqPath: string;
  params: XTreeParams;
  mapPath?: string;
  outputDbPath?: string;
};

export function buildXTreeCommand({
  xtreePath,
  seqPath,
  params,
  mapPath,
  outputDbPath = "xtree.db",
}: BuildCommandInput): { command: string; argv: string[] } {
  const argv: string[] = [];

  /* -------------------- executable -------------------- */
  argv.push(xtreePath);

  /* -------------------- mode -------------------- */
  argv.push(params.mode);

  /* -------------------- global -------------------- */
  argv.push("--seqs", seqPath);

  if (params.global?.threads !== undefined) {
    argv.push("--threads", String(params.global.threads));
  }

  if (params.global?.logOut) {
    argv.push("--log-out", params.global.logOut);
  }

  /* -------------------- ALIGN -------------------- */
  if (params.mode === "ALIGN" && params.align) {
    const a = params.align;

    if (a.db) {
      argv.push("--db", a.db);
    }

    if (a.confidence !== undefined) {
      argv.push("--confidence", String(a.confidence));
    }

    const o = a.outputs;
    if (o?.perq) argv.push("--perq-out", "per_query.tsv");
    if (o?.ref) argv.push("--ref-out", "reference.tsv");
    if (o?.tax) argv.push("--tax-out", "taxonomy.tsv");
    if (o?.cov) argv.push("--cov-out", "coverage.tsv");
    if (o?.orthog) argv.push("--orthog-out", "orthogonal.tsv");

    const alg = a.algorithms;
    if (alg?.redistribute) argv.push("--redistribute");
    if (alg?.fastRedistribute) argv.push("--fast-redistribute");
    if (alg?.shallowLca) argv.push("--shallow-lca");

    const perf = a.performance;
    if (perf?.copyMem) argv.push("--copymem");
    if (perf?.doForage) argv.push("--doforage");
    if (perf?.halfForage) argv.push("--half-forage");
    if (perf?.noAdamantium) argv.push("--no-adamantium");
  }

  /* -------------------- BUILD -------------------- */
  if (params.mode === "BUILD" && params.build) {
    if (mapPath) {
      argv.push("--map", mapPath);
    }

    if (params.build.comp !== undefined) {
      argv.push("--comp", String(params.build.comp));
    }

    if (params.build.k !== undefined) {
      argv.push("--k", String(params.build.k));
    }

    argv.push("--db", outputDbPath);
  }

  return {
    command: argv.join(" "),
    argv,
  };
}
