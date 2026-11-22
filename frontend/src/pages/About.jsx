import {
  ArrowUpRight, Binary, Database, GitBranch, Layers3, Scale, ShieldCheck, Vote,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApi } from '../context/ApiContext';
import { formatNumber } from '../utils/format';

const STEPS = [
  { title: 'Load & clean', body: 'Read 42 KDD columns with explicit names, remove duplicate rows and keep the first occurrence.' },
  { title: 'Binary target', body: "Map 'normal.' to 1 and all 22 intrusion labels to 0, as the original notebook does." },
  { title: 'Numeric pipeline', body: 'Standardize 38 numeric features, then apply PCA keeping 98% of the variance.' },
  { title: 'Categorical encoding', body: 'Binary one-hot encode protocol_type, service and flag using the saved training vocabulary.' },
  { title: 'Three classifiers', body: 'Fit the custom Gaussian NB, custom Gini decision tree and XGBoost on their notebook inputs.' },
  { title: 'Max voting', body: 'Combine the three labels with np.bincount(...).argmax(); the majority label wins.' },
];

const ALGORITHMS = [
  {
    icon: Binary,
    name: 'Gaussian Naive Bayes',
    body: 'Computes per-class Gaussian mean and variance on the PCA features and multiplies per-feature densities, as implemented in notebook cell 42.',
  },
  {
    icon: GitBranch,
    name: 'Decision Tree',
    body: 'A from-scratch CART-style tree using Gini impurity and information gain. It consumes all 41 original predictors, including categorical strings.',
  },
  {
    icon: Layers3,
    name: 'XGBoost',
    body: 'Gradient-boosted trees trained on PCA features combined with the three binary-encoded categorical fields.',
  },
];

export default function About() {
  const { modelInfo } = useApi();
  const artifactMetrics = modelInfo?.metrics;
  const notebookMetrics = modelInfo?.notebook_reference_metrics;

  return (
    <>
      <PageHeader
        eyebrow="Project background"
        title="About Project"
        description="This dashboard is a presentation layer over the machine-learning approach in the original Intrusion Detection System repository. The model logic was not replaced."
      />

      <section className="card card-hover">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h3 className="section-title">What the system does</h3>
            <p className="muted mt-3">
              An Intrusion Detection System monitors network connections and flags traffic that looks like an attack. The original project uses the KDD Cup 1999 dataset and converts a 23-class problem into a binary one: normal connections versus attacks. Organisations care more about blocking malicious traffic than naming the exact attack family, so binary classification reduces the risk of an intrusion being accepted as normal.
            </p>
            <p className="muted mt-3">
              The backend in this project loads the trained artifacts once at startup. Each incoming record passes through the same scaling, PCA and categorical encoding used during training, then Gaussian Naive Bayes, the custom Decision Tree and XGBoost each cast a vote. The final label is the majority vote.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
            <ShieldCheck className="h-6 w-6 text-cyan-300" />
            <p className="mt-3 text-sm font-semibold text-white">Model labels, not UI guesses</p>
            <p className="muted mt-2 text-xs">
              NORMAL means the model's encoded label is 1 (original class <code className="text-cyan-300">normal.</code>). ATTACK means label 0, covering the other 22 KDD intrusion labels.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
              <Database className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="section-title">Dataset</h3>
              <p className="muted mt-2 text-sm">
                KDD Cup 1999 10% corrected, the dataset named in the original README and notebook. It contains 494,021 raw rows and 23 intrusion_type labels. The notebook removes duplicates before training; this run kept {formatNumber(modelInfo?.dataset?.rows_after_deduplication)} clean rows ({formatNumber(modelInfo?.dataset?.normal_rows)} normal, {formatNumber(modelInfo?.dataset?.attack_rows)} attack).
              </p>
              <p className="muted mt-2 text-xs">
                The dataset is not bundled with this project. It must be downloaded separately and passed to the training script.
              </p>
              {modelInfo?.dataset?.source_url && (
                <a
                  href={modelInfo.dataset.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  UCI KDD Cup 1999 archive <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <h3 className="section-title">Workflow</h3>
          <div className="mt-4 space-y-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-400/10 font-mono text-[11px] text-cyan-300">{index + 1}</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-5">
        <h3 className="mb-3 text-lg font-semibold text-white">Ensemble members</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {ALGORITHMS.map(({ icon: Icon, name, body }) => (
            <div key={name} className="card card-hover">
              <Icon className="h-5 w-5 text-cyan-300" />
              <p className="mt-3 text-sm font-semibold text-white">{name}</p>
              <p className="muted mt-2 text-xs">{body}</p>
            </div>
          ))}
        </div>
        <div className="card mt-4 flex flex-col gap-3 border-cyan-400/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Vote className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <p className="text-sm font-semibold text-white">Majority-vote ensemble</p>
              <p className="muted mt-1 text-xs">Three votes per record; the label with at least two votes becomes the final prediction. Confidence shown in the UI is the fraction of agreeing models, not a calibrated probability.</p>
            </div>
          </div>
          <span className="chip shrink-0 font-mono text-cyan-300">np.bincount(votes).argmax()</span>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-cyan-300" />
            <h3 className="section-title">Artifact evaluation</h3>
          </div>
          <p className="muted mt-1 text-xs">Computed by training script on its fixed shared held-out split.</p>
          {artifactMetrics ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="pb-2 font-medium">Model</th><th className="pb-2 text-right font-medium">Accuracy</th><th className="pb-2 text-right font-medium">False positives</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {Object.entries(artifactMetrics).map(([name, values]) => (
                    <tr key={name} className="text-slate-300">
                      <td className="py-2.5 text-xs">{name}</td>
                      <td className="py-2.5 text-right font-mono text-xs text-emerald-300">{values.accuracy_percent}%</td>
                      <td className="py-2.5 text-right font-mono text-xs text-rose-300">{values.false_positives}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted mt-4 text-sm">No verified metrics file is available.</p>}
        </div>

        <div className="card">
          <h3 className="section-title">Original notebook reference</h3>
          <p className="muted mt-1 text-xs">{notebookMetrics?.note}</p>
          {notebookMetrics ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="pb-2 font-medium">Technique</th><th className="pb-2 text-right font-medium">Accuracy</th><th className="pb-2 text-right font-medium">False positives</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {notebookMetrics.models.map((item) => (
                    <tr key={item.name} className="text-slate-300">
                      <td className="py-2.5 text-xs">{item.name}</td>
                      <td className="py-2.5 text-right font-mono text-xs text-cyan-300">{item.accuracy_percent}%</td>
                      <td className="py-2.5 text-right font-mono text-xs text-slate-400">{item.false_positives}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-slate-600">Source: {notebookMetrics.source}</p>
            </div>
          ) : <p className="muted mt-4 text-sm">Reference results unavailable.</p>}
        </div>
      </section>
    </>
  );
}
