import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileUp, Loader2, ShieldAlert, X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import PredictionBadge from '../components/PredictionBadge';
import { useToast } from '../components/Toast';
import { useApi } from '../context/ApiContext';
import { useHistory } from '../hooks/useHistory';
import { predictBatchCsv } from '../api/client';
import { formatPercent } from '../utils/format';
import { downloadCsv } from '../utils/format';
import { MAX_BATCH_ROWS } from '../config';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default function CsvUpload() {
  const { modelInfo, ready } = useApi();
  const { addEntry } = useHistory();
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [sourceRows, setSourceRows] = useState([]);
  const [validation, setValidation] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const required = modelInfo?.features || [];

  const reset = () => {
    setFile(null);
    setSourceRows([]);
    setValidation(null);
    setResults([]);
    setError(null);
    setFilter('ALL');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (selected) => {
    reset();
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Only .csv files are accepted.');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('File is larger than the 10 MB limit.');
      return;
    }
    setFile(selected);
    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const fields = parsed.meta.fields || [];
        const missing = required.filter((column) => !fields.includes(column));
        const unexpected = fields.filter(
          (column) => column && !required.includes(column) && column !== 'intrusion_type',
        );
        if (!required.length) {
          setError('Model feature information is not available yet. Refresh the page.');
          return;
        }
        if (missing.length || unexpected.length) {
          setValidation({ missing, unexpected, fields });
          setError('CSV columns do not match the model feature contract.');
          return;
        }
        if (!parsed.data.length) {
          setError('The CSV has a header but no data rows.');
          return;
        }
        if (parsed.data.length > (modelInfo?.max_batch_rows || MAX_BATCH_ROWS)) {
          setError(`Too many rows (${parsed.data.length}). Maximum is ${modelInfo?.max_batch_rows || MAX_BATCH_ROWS}.`);
          return;
        }
        setSourceRows(parsed.data);
        setValidation(null);
      },
      error: (parseError) => setError(`Could not read CSV: ${parseError.message}`),
    });
  };

  const handleUpload = async () => {
    if (!file || !sourceRows.length) return;
    setUploading(true);
    setError(null);
    try {
      const response = await predictBatchCsv(file);
      setResults(response.results);
      const attacks = response.results.filter((item) => item.prediction === 'ATTACK').length;
      const normal = response.results.length - attacks;
      addEntry({
        type: 'batch',
        timestamp: new Date().toISOString(),
        filename: file.name,
        total: response.count,
        normal,
        attacks,
      });
      toast.success(`${response.count} records classified successfully.`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    const rows = results.map((result, index) => {
      const original = sourceRows[index] || {};
      return {
        ...original,
        prediction: result.prediction,
        label: result.label,
        vote_agreement: result.confidence,
        gnb_vote: result.votes?.gaussian_naive_bayes?.prediction,
        dt_vote: result.votes?.decision_tree?.prediction,
        xgb_vote: result.votes?.xgboost?.prediction,
      };
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCsv(`ids-predictions-${stamp}.csv`, Papa.unparse(rows));
    toast.success('Prediction CSV downloaded.');
  };

  const visible = results
    .map((result, index) => ({ ...result, source: sourceRows[index] }))
    .filter((item) => filter === 'ALL' || item.prediction === filter);

  const attacks = results.filter((item) => item.prediction === 'ATTACK').length;

  return (
    <>
      <PageHeader
        eyebrow="Batch classification"
        title="CSV Upload"
        description="Upload network records with the exact 41 KDD feature columns. The API validates every row and returns a decision for each record."
        actions={
          results.length > 0 ? (
            <button type="button" className="btn-primary" onClick={handleDownload}>
              <Download className="h-4 w-4" /> Download results
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="card">
            <div
              className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center transition hover:border-cyan-400/30"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => handleFile(event.target.files?.[0])}
                disabled={!ready || uploading}
              />
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <FileUp className="h-6 w-6 text-cyan-300" />
              </div>
              <p className="mt-4 text-base font-semibold text-white">Drop your CSV here or click to browse</p>
              <p className="muted mt-1.5 text-xs">Maximum 10 MB and {modelInfo?.max_batch_rows || MAX_BATCH_ROWS} rows · header row required</p>
              {file && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-cyan-300" />
                  <span className="max-w-[220px] truncate text-slate-200">{file.name}</span>
                  <span className="font-mono text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    type="button"
                    className="ml-2 rounded p-1 text-slate-500 hover:text-white"
                    onClick={(event) => { event.stopPropagation(); reset(); }}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>{error}</p>
                  {validation && (
                    <div className="mt-2 space-y-1 text-xs text-rose-300/80">
                      {validation.missing.length > 0 && <p>Missing: {validation.missing.join(', ')}</p>}
                      {validation.unexpected.length > 0 && <p>Unexpected: {validation.unexpected.join(', ')}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {file && sourceRows.length > 0 && !error && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> {sourceRows.length} valid rows
                </div>
                <button type="button" className="btn-primary ml-auto" onClick={handleUpload} disabled={uploading}>
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Classifying…</> : <>Classify records</>}
                </button>
              </div>
            )}
          </section>

          <section className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="section-title">Batch results</h3>
                <p className="text-xs text-slate-500">{results.length ? `${results.length} classifications returned` : 'Results appear here after upload'}</p>
              </div>
              {results.length > 0 && (
                <div className="flex gap-1.5">
                  {['ALL', 'ATTACK', 'NORMAL'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${filter === value ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!results.length ? (
              <EmptyState
                icon={FileSpreadsheet}
                title="No batch results yet"
                description="Upload a CSV to see per-record classifications, vote details and a downloadable report."
              />
            ) : (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Total</p>
                    <p className="mt-1 font-mono text-xl text-white">{results.length}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Normal</p>
                    <p className="mt-1 font-mono text-xl text-emerald-300">{results.length - attacks}</p>
                  </div>
                  <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Attack</p>
                    <p className="mt-1 font-mono text-xl text-rose-300">{attacks}</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">#</th>
                        <th className="px-3 py-2.5 font-medium">Service</th>
                        <th className="px-3 py-2.5 font-medium">Result</th>
                        <th className="px-3 py-2.5 font-medium">Vote</th>
                        <th className="px-3 py-2.5 font-medium">GNB</th>
                        <th className="px-3 py-2.5 font-medium">DT</th>
                        <th className="px-3 py-2.5 font-medium">XGB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {visible.slice(0, 100).map((item) => (
                        <tr key={item.index} className="text-slate-300">
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{item.index + 1}</td>
                          <td className="px-3 py-2.5 text-xs">{item.source?.service || '—'}</td>
                          <td className="px-3 py-2.5"><PredictionBadge prediction={item.prediction} small /></td>
                          <td className="px-3 py-2.5 font-mono text-xs text-cyan-300">{formatPercent(item.confidence)}</td>
                          <td className="px-3 py-2.5 text-xs">{item.votes?.gaussian_naive_bayes?.prediction === 'ATTACK' ? <span className="text-rose-300">A</span> : <span className="text-emerald-300">N</span>}</td>
                          <td className="px-3 py-2.5 text-xs">{item.votes?.decision_tree?.prediction === 'ATTACK' ? <span className="text-rose-300">A</span> : <span className="text-emerald-300">N</span>}</td>
                          <td className="px-3 py-2.5 text-xs">{item.votes?.xgboost?.prediction === 'ATTACK' ? <span className="text-rose-300">A</span> : <span className="text-emerald-300">N</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {visible.length > 100 && (
                  <p className="mt-3 text-center text-xs text-slate-500">Showing first 100 of {visible.length}. Download the CSV for all rows.</p>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card">
            <h3 className="section-title">Required CSV header</h3>
            <p className="mt-1 text-xs text-slate-500">All 41 columns, in any order. An optional <code className="text-cyan-300">intrusion_type</code> column is ignored.</p>
            <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-white/[0.06] bg-ink-950/60 p-3">
              {required.length ? (
                <ol className="space-y-1 font-mono text-[11px] text-slate-400">
                  {required.map((column, index) => (
                    <li key={column}><span className="mr-2 text-slate-600">{index + 1}.</span>{column}</li>
                  ))}
                </ol>
              ) : <p className="text-xs text-slate-500">Loading feature list…</p>}
            </div>
            {required.length > 0 && (
              <button
                type="button"
                className="btn-secondary mt-3 w-full !text-xs"
                onClick={() => {
                  downloadCsv('ids-template.csv', `${required.join(',')}\n`);
                  toast.info('CSV template downloaded.');
                }}
              >
                <Download className="h-4 w-4" /> Download template
              </button>
            )}
          </section>

          <section className="card">
            <h3 className="section-title">Before you upload</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
              <li>• Use numeric values only for the 38 numeric features.</li>
              <li>• Categorical values must exist in the training vocabulary.</li>
              <li>• The API returns per-row validation errors if a value is invalid.</li>
              <li>• Nothing is stored on the server; batch summaries stay in your browser.</li>
            </ul>
            <Link to="/about" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">
             Learn about the dataset →
            </Link>
          </section>

          {!ready && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs text-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Start the backend to enable uploads.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
