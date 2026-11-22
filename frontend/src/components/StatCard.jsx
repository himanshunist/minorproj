const TONES = {
  cyan: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20',
  green: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  rose: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  violet: 'text-violet-300 bg-violet-400/10 border-violet-400/20',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'cyan' }) {
  return (
    <div className="card card-hover animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-white sm:text-3xl">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${TONES[tone] || TONES.cyan}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
