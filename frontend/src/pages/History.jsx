import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Search, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import PredictionBadge from '../components/PredictionBadge';
import { TrafficDonut } from '../components/Charts';
import { useHistory } from '../hooks/useHistory';
import { downloadCsv, formatPercent, formatTimestamp } from '../utils/format';
import { useToast } from '../components/Toast';

export default function History() {
  const { history, clearHistory, removeEntry } = useHistory();
  const toast = useToast();
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return history.filter((entry) => {
      const matchesFilter = filter === 'ALL'
        || (filter === 'ATTACK' && (entry.attacks > 0 || entry.prediction === 'ATTACK'))
        || (filter === 'NORMAL' && (entry.normal > 0 || entry.prediction === 'NORMAL'));
      const haystack = `${entry.filename || ''} ${entry.input?.service || ''} ${entry.input?.protocol_type || ''} ${entry.prediction || ''}`.toLowerCase();
      return matchesFilter && haystack.includes(query.toLowerCase());
    });
  }, [history, filter, query]);

  const totals = history.reduce(
    (acc, entry) => {
      if (entry.type === 'batch') {
        acc.normal += entry.normal || 0;
        acc.attacks += entry.attacks || 0;
      } else if (entry.prediction === 'NORMAL') acc.normal += 1;
      else if (entry.prediction === 'ATTACK') acc.attacks += 1;
      return acc;
    },
    { normal: 0, attacks: 0 },
  );

  const exportLog = () => {
    if (!history.length) return;
    const rows = history.map((entry) => ({
      timestamp: entry.timestamp,
      type: entry.type,
      filename: entry.filename || '',
      prediction: entry.prediction || '',
      label: entry.label ?? '',
      confidence: entry.confidence ?? '',
      normal: entry.normal ?? '',
      attacks: entry.attacks ?? '',
      total: entry.total ?? '',
      service: entry.input?.service || '',
      protocol_type: entry.input?.protocol_type || '',
      flag: entry.input?.flag || '',
    }));
    downloadCsv('ids-prediction-history.csv', Papa.unparse(rows));
    toast.success('History exported.');
  };

  return (
    <>
      <PageHeader
        eyebrow="Local activity log"
        title="Prediction History"
        description="Recent classifications saved in this browser's local storage. Clearing browser data also clears this log."
        actions={
          history.length > 0 ? (
            <>
              <button type="button" className="btn-secondary" onClick={exportLog}>Export log</button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (window.confirm('Clear all saved predictions from this browser?')) {
                    clearHistory();
                    toast.info('Prediction history cleared.');
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Clear history
              </button>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5">
              {['ALL', 'ATTACK', 'NORMAL'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === value ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search service or file…"
                className="field-input !pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={HistoryIcon}
              title={history.length ? 'No matching entries' : 'History is empty'}
              description={history.length ? 'Try a different filter or search term.' : 'Run a detection or upload a CSV to start building your local log.'}
              action={!history.length ? <Link to="/detect" className="btn-primary">Run detection</Link> : undefined}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Timestamp</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Input</th>
                    <th className="px-3 py-2.5 font-medium">Result</th>
                    <th className="px-3 py-2.5 font-medium">Confidence</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="text-slate-300">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-400">{formatTimestamp(entry.timestamp)}</td>
                      <td className="px-3 py-3 text-xs">
                        {entry.type === 'batch' ? `CSV · ${entry.total} rows` : 'Single record'}
                        {entry.filename && <p className="mt-0.5 max-w-[140px] truncate text-[11px] text-slate-500">{entry.filename}</p>}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                        {entry.type === 'batch' ? '—' : `${entry.input?.protocol_type || ''}/${entry.input?.service || ''}/${entry.input?.flag || ''}`}
                      </td>
                      <td className="px-3 py-3">
                        {entry.type === 'batch' ? (
                          <span className="text-xs">{entry.attacks || 0} attack / {entry.normal || 0} normal</span>
                        ) : <PredictionBadge prediction={entry.prediction} small />}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-cyan-300">
                        {entry.type === 'batch' ? '—' : formatPercent(entry.confidence)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="rounded-md p-1.5 text-slate-600 transition hover:bg-rose-400/10 hover:text-rose-300"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && <p className="mt-3 text-xs text-slate-600">Showing {filtered.length} of {history.length} stored events.</p>}
        </section>

        <aside className="space-y-5">
          <section className="card">
            <h3 className="section-title">Class distribution</h3>
            <TrafficDonut normal={totals.normal} attack={totals.attacks} />
          </section>
          <section className="card">
            <h3 className="section-title">Storage note</h3>
            <p className="muted mt-2 text-xs">
              History is kept in <code className="text-cyan-300">localStorage</code> under <code className="text-cyan-300">ids-prediction-history-v1</code>. It is limited to the most recent 100 events and never leaves your device.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
