'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type DataPoint = { time: string; value: number };

export function RechartsChart({ data, totalValueUsd }: { data: DataPoint[]; totalValueUsd: number }) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-[#8E8E8E]">
        <AreaChart width={600} height={300} data={[{ time: 'Today', value: totalValueUsd }]}>
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#C5FF4A" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#C5FF4A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="#C5FF4A" fill="url(#g)" strokeWidth={2} />
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="time" tick={{ fill: '#8E8E8E', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8E8E8E', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #262626', borderRadius: 0 }} labelStyle={{ color: '#8E8E8E' }} />
        </AreaChart>
      </div>
    );
  }

  return (
    <div className="min-h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#C5FF4A" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#C5FF4A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="#C5FF4A" fill="url(#g)" strokeWidth={2} />
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="time" tick={{ fill: '#8E8E8E', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8E8E8E', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #262626', borderRadius: 0 }} labelStyle={{ color: '#8E8E8E' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
