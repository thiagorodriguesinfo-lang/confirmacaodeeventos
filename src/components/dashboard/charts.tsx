'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'hsl(158 64% 40%)',
  DECLINED: 'hsl(0 72% 51%)',
  PENDING: 'hsl(38 92% 50%)',
  SENT: 'hsl(217 91% 60%)',
  NO_RESPONSE: 'hsl(240 4% 60%)',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmados',
  DECLINED: 'Recusados',
  PENDING: 'Pendentes',
  SENT: 'Enviados',
  NO_RESPONSE: 'Sem resposta',
};

export function EvolutionChart({ data }: { data: { date: string; confirmed: number; declined: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="confirmedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(158 64% 40%)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(158 64% 40%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="declinedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="confirmed" name="Confirmados" stroke="hsl(158 64% 40%)" fill="url(#confirmedGradient)" strokeWidth={2} />
        <Area type="monotone" dataKey="declined" name="Recusados" stroke="hsl(0 72% 51%)" fill="url(#declinedGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ResponseBreakdownChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#999'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, _name, entry) => [value, STATUS_LABEL[(entry.payload as { status: string }).status] ?? entry.payload]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data, dataKey, labelKey }: { data: Record<string, string | number>[]; dataKey: string; labelKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey={labelKey} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} fill="hsl(158 64% 40%)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
