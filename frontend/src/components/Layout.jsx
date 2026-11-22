import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, FileSpreadsheet, History, Info, Menu, Radar, ShieldCheck, X,
} from 'lucide-react';
import { useApi } from '../context/ApiContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: Activity, end: true },
  { to: '/detect', label: 'Intrusion Detection', icon: Radar },
  { to: '/csv-upload', label: 'CSV Upload', icon: FileSpreadsheet },
  { to: '/history', label: 'Prediction History', icon: History },
  { to: '/about', label: 'About Project', icon: Info },
];

function StatusChip() {
  const { health, loading } = useApi();
  if (loading) {
    return <span className="chip text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />Connecting…</span>;
  }
  if (health?.model_ready) {
    return (
      <span className="chip border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-pulse-ring" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Model online
      </span>
    );
  }
  return <span className="chip border-rose-400/25 bg-rose-400/10 text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />API offline</span>;
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { error } = useApi();
  const current = NAV.find((item) => item.to === location.pathname) || NAV[0];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 shadow-glow">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">SENTINEL <span className="text-cyan-300">IDS</span></p>
          <p className="text-[11px] text-slate-500">Network threat monitor</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-cyan-400/10 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ensemble</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Gaussian NB <span className="text-cyan-400">+</span> Decision Tree <span className="text-cyan-400">+</span> XGBoost
        </p>
        <p className="mt-2 font-mono text-[10px] text-slate-600">max-voting classifier</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] bg-ink-900/95 backdrop-blur lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-ink-900 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-white/10 p-2 text-slate-300 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-white sm:text-lg">{current.label}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">KDD Cup 1999 · Binary intrusion detection</p>
            </div>
            <StatusChip />
          </div>
        </header>

        {error && (
          <div className="mx-auto mt-4 max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-200">
              <span className="font-semibold">Backend unavailable:</span> {error} Start the API and reload, or see the README deployment section.
            </div>
          </div>
        )}

        <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
