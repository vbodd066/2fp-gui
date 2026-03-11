/* ============================================================
 * Features — landing page features section
 * ============================================================
 * Highlights the three core value propositions:
 *  1. Dedicated instances (security isolation)
 *  2. Interactive MAGUS notebook
 *  3. Real-time XTree execution
 * ============================================================ */

import {
  Shield,
  NotebookPen,
  Zap,
  Server,
  GitBranch,
  Download,
} from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "Fully Isolated Instances",
    description:
      "Every customer gets their own dedicated AWS instance. Your data, processes, and filesystem are completely isolated — zero cross-tenant risk.",
  },
  {
    icon: NotebookPen,
    title: "Cell-Based MAGUS Workflow",
    description:
      "Run each MAGUS pipeline stage independently, like cells in a Jupyter notebook. Configure, execute, and inspect stages with live streaming output.",
  },
  {
    icon: Zap,
    title: "Real-Time Execution",
    description:
      "No job queues, no email notifications. Run XTree and MAGUS directly from your browser and see live stdout/stderr as processes execute.",
  },
  {
    icon: Server,
    title: "Compute-Optimized Hardware",
    description:
      "Instances run on compute-optimized EC2 with fast EBS storage — sized for deeply-sequenced metagenomics datasets.",
  },
  {
    icon: GitBranch,
    title: "Open-Source Foundation",
    description:
      "XTree and MAGUS are open-source, peer-reviewed tools. The GUI provides an accessible interface without locking you into proprietary formats.",
  },
  {
    icon: Download,
    title: "Direct File Access",
    description:
      "Download output files directly from each pipeline stage. All artifacts are stored on your instance's own filesystem.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* ---- section header ---- */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider">
            Platform Features
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Metagenomics infrastructure,{" "}
            <span className="text-accent">built for you.</span>
          </h2>
          <p className="text-secondary max-w-2xl mx-auto">
            Everything you need to run XTree and MAGUS at scale — without managing
            servers, queues, or shared resources.
          </p>
        </div>

        {/* ---- feature grid ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-secondary/15 p-6 space-y-3
                         transition hover:border-accent/30 hover:bg-accent/3"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10
                              flex items-center justify-center text-accent">
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
