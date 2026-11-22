import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Radar, RotateCcw, Send, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Field from '../components/Field';
import EmptyState from '../components/EmptyState';
import PredictionBadge from '../components/PredictionBadge';
import { LoadingBlock } from '../components/Loading';
import { useToast } from '../components/Toast';
import { useApi } from '../context/ApiContext';
import { useHistory } from '../hooks/useHistory';
import { predictRecord } from '../api/client';
import { API_BASE_URL, CATEGORICAL_FIELDS, EXAMPLE_RECORDS, FEATURE_DESCRIPTIONS, FEATURE_GROUPS } from '../config';
import { formatPercent } from '../utils/format';

const MODEL_LABELS = {
  gaussian_naive_bayes: 'Gaussian Naive Bayes',
  decision_tree: 'Decision Tree',
  xgboost: 'XGBoost',
};

function initialValues(modelInfo) {
  const values = {};
  for (const feature of modelInfo?.features || []) {
    if (CATEGORICAL_FIELDS.includes(feature)) {
      values[feature] = modelInfo?.categorical_values?.[feature]?.[0] || '';
    } else {
      values[feature] = 0;
    }
  }
  return values;
}

function validate(values, features, categoricalValues) {
  const errors = {};
  for (const feature of features) {
    const value = values[feature];
    if (CATEGORICAL_FIELDS.includes(feature)) {
      if (!value) {
        errors[feature] = 'This field is required.';
      } else if (categoricalValues[feature]?.length && !categoricalValues[feature].includes(value)) {
        errors[feature] = 'Value is not in the training vocabulary.';
      }
    } else if (value === '' || value === null || !Number.isFinite(Number(value)) || Number(value) < 0) {
      errors[feature] = 'Enter a non-negative number.';
    }
  }
  return errors;
}

export default function Detection() {
  const { modelInfo, ready, loading } = useApi();
  const { addEntry } = useHistory();
  const toast = useToast();
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (modelInfo) {
      setValues(initialValues(modelInfo));
      setErrors({});
    }
  }, [modelInfo]);

  const features = useMemo(() => modelInfo?.features || [], [modelInfo]);
  const categoricalValues = useMemo(() => modelInfo?.categorical_values || {}, [modelInfo]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values, features, categoricalValues);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Please fix the highlighted fields before running detection.');
      return;
    }
    const payload = {};
    for (const feature of features) {
      payload[feature] = CATEGORICAL_FIELDS.includes(feature)
        ? String(values[feature])
        : Number(values[feature]);
    }
    setSubmitting(true);
    setResult(null);
    try {
      const prediction = await predictRecord(payload);
      setResult(prediction);
      addEntry({
        type: 'single',
        timestamp: new Date().toISOString(),
        prediction: prediction.prediction,
        label: prediction.label,
        confidence: prediction.confidence,
        input: {
          protocol_type: payload.protocol_type,
          service: payload.service,
          flag: payload.flag,
          src_bytes: payload.src_bytes,
          dst_bytes: payload.dst_bytes,
        },
      });
      toast.success(`Prediction complete: ${prediction.prediction}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadExample = (example) => {
    setValues({ ...values, ...example });
    setErrors({});
    setResult(null);
    toast.info('Example record loaded. The API still makes the final prediction.');
  };

  if (loading && !modelInfo) return <LoadingBlock label="Loading model feature contract…" />;
  if (!ready) {
    return (
      <>
        <PageHeader eyebrow="Live classification" title="Intrusion Detection" />
        <EmptyState
          icon={Radar}
          title="Detector is waiting for the API"
          description="The feature form is built from /model-info so the fields always match the trained model. Start the FastAPI backend, then refresh."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/about" className="btn-secondary">Setup instructions</Link>
              <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer" className="btn-primary">Open API docs</a>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Live classification"
        title="Intrusion Detection"
        description="Enter one KDD Cup 1999 connection record. Inputs are scaled, transformed by PCA, one-hot encoded where needed, then voted on by all three models."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => loadExample(EXAMPLE_RECORDS.http_session)}>
              <Sparkles className="h-4 w-4" /> HTTP example
            </button>
            <button type="button" className="btn-secondary" onClick={() => loadExample(EXAMPLE_RECORDS.syn_flood_session)}>
              <Sparkles className="h-4 w-4" /> SYN example
            </button>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {FEATURE_GROUPS.map((group, index) => (
            <section key={group.id} className="card animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="section-title">{group.title}</h3>
                  <p className="text-xs text-slate-500">{group.subtitle}</p>
                </div>
                <span className="chip font-mono">{group.fields.length} fields</span>
              </div>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 2xl:grid-cols-3">
                {group.fields.map((feature) => (
                  <Field
                    key={feature}
                    name={feature}
                    label={feature}
                    value={values[feature]}
                    onChange={handleChange}
                    error={errors[feature]}
                    description={FEATURE_DESCRIPTIONS[feature]}
                    options={CATEGORICAL_FIELDS.includes(feature) ? categoricalValues[feature] : undefined}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-400/20 bg-ink-900/95 p-3 shadow-glow backdrop-blur">
            <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={submitting}>
              {submitting ? <><RotateCcw className="h-4 w-4 animate-spin" /> Detecting…</> : <><Send className="h-4 w-4" /> Detect Intrusion</>}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setValues(initialValues(modelInfo)); setErrors({}); setResult(null); }}
              disabled={submitting}
            >
              Reset form
            </button>
            <p className="ml-auto hidden text-xs text-slate-500 sm:block">{features.length} features · {modelInfo?.version}</p>
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="card">
            <h3 className="section-title">Prediction result</h3>
            <p className="mt-1 text-xs text-slate-500">Output uses the model's binary labels</p>
            {!result ? (
              <div className="mt-6 flex flex-col items-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
                  <Radar className="h-7 w-7 text-slate-500" />
                </div>
                <p className="muted mt-4">Submit a record to see the ensemble decision and each model's vote.</p>
              </div>
            ) : (
              <div className="mt-5 animate-fade-up">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                  <PredictionBadge prediction={result.prediction} />
                  <p className="mt-3 font-mono text-3xl font-semibold text-white">{formatPercent(result.confidence)}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-slate-500">ensemble vote agreement</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${result.confidence * 100}%` }} />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Individual votes</p>
                  {Object.entries(result.votes).map(([key, vote]) => (
                    <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-300">{MODEL_LABELS[key] || key}</span>
                        <span className={`font-mono text-xs ${vote.prediction === 'ATTACK' ? 'text-rose-300' : 'text-emerald-300'}`}>
                          {vote.prediction}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${vote.prediction === 'ATTACK' ? 'bg-rose-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(100, vote.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[10px] text-slate-500">{formatPercent(vote.confidence)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex gap-2 text-[11px] leading-relaxed text-slate-500">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  Agreement is the fraction of models voting for the final label. It is not a calibrated probability. Individual bars show each model's own confidence.
                </p>
              </div>
            )}
          </section>

          <section className="card">
            <h3 className="section-title">Label mapping</h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-emerald-400/[0.07] px-3 py-2">
                <span className="text-slate-400">intrusion_type = normal.</span>
                <span className="font-mono text-emerald-300">1 → NORMAL</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-rose-400/[0.07] px-3 py-2">
                <span className="text-slate-400">other 22 attack labels</span>
                <span className="font-mono text-rose-300">0 → ATTACK</span>
              </div>
            </div>
            <p className="muted mt-3 text-xs">The notebook converts the multiclass KDD target into this binary problem before training.</p>
          </section>

          {result && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Saved to browser prediction history.
            </div>
          )}
        </aside>
      </form>
    </>
  );
}
