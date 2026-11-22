import { AlertCircle, Info } from 'lucide-react';

export default function Field({ name, label, value, onChange, error, description, options, required = true }) {
  const control = options ? (
    <select
      id={name}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      className={`field-input ${error ? 'border-rose-400/60' : ''}`}
    >
      <option value="">Select…</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  ) : (
    <input
      id={name}
      name={name}
      type="number"
      min="0"
      step="any"
      inputMode="decimal"
      value={value ?? ''}
      onChange={onChange}
      placeholder="0"
      className={`field-input font-mono ${error ? 'border-rose-400/60' : ''}`}
    />
  );

  return (
    <div className="min-w-0">
      <label htmlFor={name} className="field-label">
        {label.replaceAll('_', ' ')}
        {required && <span className="text-cyan-400">*</span>}
        {description && (
          <span className="group relative ml-0.5 cursor-help text-slate-500" title={description}>
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-400">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      ) : description ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}
