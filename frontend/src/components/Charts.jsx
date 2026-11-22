import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: '#0a1120',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
  fontSize: 12,
};

export function TrafficDonut({ normal = 0, attack = 0 }) {
  const data = [
    { name: 'Normal', value: normal, color: '#34d399' },
    { name: 'Attack', value: attack, color: '#fb7185' },
  ].filter((item) => item.value > 0);
  const total = normal + attack;

  return (
    <div className="relative h-64 w-full">
      {total === 0 ? (
        <div className="grid h-full place-items-center text-sm text-slate-500">No predictions yet</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={72} outerRadius={98} paddingAngle={4} stroke="none">
                {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [value, 'records']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-semibold text-white">{total}</span>
            <span className="text-[11px] uppercase tracking-widest text-slate-500">records</span>
          </div>
        </>
      )}
    </div>
  );
}

export function PredictionBars({ entries = [] }) {
  const data = entries.slice(0, 8).reverse().map((entry, index) => ({
    name: `#${index + 1}`,
    Normal: entry.normal ?? (entry.prediction === 'NORMAL' ? 1 : 0),
    Attack: entry.attacks ?? entry.attack ?? (entry.prediction === 'ATTACK' ? 1 : 0),
  }));

  if (!data.length) {
    return <div className="grid h-56 place-items-center text-sm text-slate-500">No activity to chart yet</div>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="Normal" stackId="a" fill="#34d399" radius={[0, 0, 4, 4]} />
          <Bar dataKey="Attack" stackId="a" fill="#fb7185" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
