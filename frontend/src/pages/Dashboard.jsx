import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, CircleDot, Database, FileSpreadsheet, RefreshCw, ShieldAlert, ShieldCheck,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import PredictionBadge from '../components/PredictionBadge';
import { PredictionBars, TrafficDonut } from '../components/Charts';
import { LoadingBlock, SkeletonCards } from '../components/Loading';
import { useApi } from '../context/ApiContext';
import { useHistory } from '../hooks/useHistory';
import { formatNumber, formatTimestamp } from '../utils/format';

export default function Dashboard() {
  const { history } = useHistory();
  const { modelInfo, loading, error, refresh } = useApi();

  const totals = history.reduce(
    (accumulator, entry) => {
      if (entry.type === 'batch') {
        accumulator.normal += entry.normal || 0;
        accumulator.attacks += entry.attacks || 0;
      } else if (entry.prediction === 'NORMAL') {
        accumulator.normal += 1;
      } else if (entry.prediction === 'ATTACK') {
        accumulator.attacks += 1;
      }
      return accumulator;
    },
    { normal: 0, attacks: 0 },
  );
  const total = totals.normal + totals.attacks;
  const attackRate = total ? ((totals.attacks / total) * 100).toFixed(1) : '0.0';
  const metrics = modelInfo?.metrics;

  return (
    <>
      <PageHeader
        eyebrow="Security overview"
        title="Dashboard"
        description="Live view of predictions made in this browser, plus verified information about the loaded model artifacts."
        actions={
          <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh status
          </button>
        }
      />

      {loading && !modelInfo ? <SkeletonCards /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Activity} label="Records analyzed" value={formatNumber(total)} hint="From browser history" tone="cyan" />
          <StatCard icon={ShieldCheck} label="Normal traffic" value={formatNumber(totals.normal)} hint={`${total ? ((totals.normal / total) * 100).toFixed(1) : '0.0'}% of analyzed`} tone="green" />
          <StatCard icon={ShieldAlert} label="Suspicious traffic" value={formatNumber(totals.attacks)} hint={`${attackRate}% attack rate`} tone="rose" />
          <StatCard icon={Database} label="Model features" value={modelInfo?.features?.length ?? '—'} hint="KDD Cup 1999 predictors" tone="violet" />
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="card">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <h3 className="section-title">Traffic distribution</h3>
              <p className="text-xs text-slate-500">Normal vs attack classifications</p>
            </div>
            <CircleDot className="h-4 w-4 text-cyan-400" />
          </div>
          <TrafficDonut normal={totals.normal} attack={totals.attacks} />
          <div className="mt-2 flex items-center justify-center gap-6 text-xs">
            <span className="flex items-center gap-2 text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Normal</span>
            <span className="flex items-center gap-2 text-slate-400"><span className="h-2 w-2 rounded-full bg-rose-400" /> Attack</span>
          </div>
        </section>

        <section className="card xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="section-title">Recent activity</h3>
              <p className="text-xs text-slate-500">Last 8 history events</p>
            </div>
            <Link to="/history" className="flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">
              View history <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <PredictionBars entries={history} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="section-title">Latest predictions</h3>
              <p className="text-xs text-slate-500">Most recent detections first</p>
            </div>
            <Link to="/detect" className="btn-secondary !px-3 !py-1.5 !text-xs">
              New detection <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {history.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No predictions yet"
              description="Run a single detection or upload a CSV to populate your dashboard."
              action={<Link to="/detect" className="btn-primary">Run detection</Link>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="pb-2.5 font-medium">Time</th>
                    <th className="pb-2.5 font-medium">Source</th>
                    <th className="pb-2.5 font-medium">Result</th>
                    <th className="pb-2.5 text-right font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {history.slice(0, 5).map((entry) => (
                    <tr key={entry.id} className="text-slate-300">
                      <td className="py-3 font-mono text-xs text-slate-400">{formatTimestamp(entry.timestamp)}</td>
                      <td className="py-3 text-xs">{entry.type === 'batch' ? `CSV · ${entry.total} rows` : 'Single record'}</td>
                      <td className="py-3">
                        {entry.type === 'batch' ? (
                          <span className="text-xs text-slate-300">{entry.attacks || 0} attack / {entry.normal || 0} normal</span>
                        ) : <PredictionBadge prediction={entry.prediction} small />}
                      </td>
                      <td className="py-3 text-right font-mono text-xs text-cyan-300">
                        {entry.type === 'batch' ? '—' : `${Math.round((entry.confidence || 0) * 100)}% vote`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="mb-4">
            <h3 className="section-title">Model information</h3>
            <p className="text-xs text-slate-500">Loaded from backend artifacts</p>
          </div>
          {loading && !modelInfo ? <LoadingBlock label="Reading model metadata…" /> : error && !modelInfo ? (
            <EmptyState icon={ShieldAlert} title="Model info unavailable" description={error} />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Ensemble</span>
                <span className="text-right text-xs text-slate-300">GNB + DT + XGBoost</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Decision rule</span>
                <span className="font-mono text-xs text-cyan-300">max voting</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Training rows</span>
                <span className="font-mono text-xs text-slate-300">{formatNumber(modelInfo?.dataset?.rows_after_deduplication)}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">PCA components</span>
                <span className="font-mono text-xs text-slate-300">{modelInfo?.preprocessing?.pca_components ?? '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Artifact version</span>
                <span className="font-mono text-[11px] text-slate-400">{modelInfo?.version || '—'}</span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Artifact evaluation</p>
                {metrics ? (
                  <div className="space-y-1.5">
                    {Object.entries(metrics).map(([name, values]) => (
                      <div key={name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-400">{name}</span>
                        <span className="font-mono text-emerald-300">{values.accuracy_percent}%</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-500">No verified metrics file found.</p>}
              </div>
              <Link to="/about" className="flex items-center gap-1 pt-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">
                How this works <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'Single record', body: 'Fill the 41 KDD features and run a prediction.', to: '/detect', cta: 'Open detector' },
          { icon: FileSpreadsheet, title: 'Batch CSV', body: 'Upload many records and download results.', to: '/csv-upload', cta: 'Upload CSV' },
          { icon: Activity, title: 'Local history', body: 'Predictions are stored only in this browser.', to: '/history', cta: 'View log' },
        ].map(({ icon: Icon, title, body, to, cta }) => (
          <Link key={title} to={to} className="card card-hover group flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
              <Icon className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{body}</p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-cyan-300 group-hover:text-cyan-200">{cta} <ArrowRight className="h-3 w-3" /></p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
