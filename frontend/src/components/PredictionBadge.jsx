export default function PredictionBadge({ prediction, small = false }) {
  const isAttack = String(prediction).toUpperCase().includes('ATTACK');
  const isNormal = String(prediction).toUpperCase().includes('NORMAL');
  const classes = isAttack
    ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
    : isNormal
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
      : 'border-slate-500/30 bg-slate-500/10 text-slate-300';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide ${classes} ${small ? 'px-2.5 py-0.5 text-[11px]' : 'px-3.5 py-1.5 text-sm'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isAttack ? 'bg-rose-400' : isNormal ? 'bg-emerald-400' : 'bg-slate-400'}`} />
      {prediction || 'UNKNOWN'}
    </span>
  );
}
