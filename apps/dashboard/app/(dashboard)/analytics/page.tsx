'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

type Period = '7d' | '30d' | '90d';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [chatbotId, setChatbotId] = useState('');
  const [chatbots, setChatbots] = useState<{ id: string; name: string }[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [usageChart, setUsageChart] = useState<unknown[]>([]);
  const [sentimentChart, setSentimentChart] = useState<unknown[]>([]);
  const [conversations, setConversations] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/chatbots').then(r => setChatbots((r.data.data as { id: string; name: string }[]) ?? [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (chatbotId) params.set('chatbotId', chatbotId);
      const [metricsRes, usageRes, sentimentRes, convoRes] = await Promise.all([
        api.get(`/analytics/dashboard?${params}`),
        api.get(`/analytics/usage?${params}&groupBy=day`),
        api.get(`/analytics/sentiment?${params}`),
        api.get(`/analytics/conversations?${params}&limit=10`),
      ]);
      setMetrics(metricsRes.data.data as Record<string, unknown>);
      setUsageChart((usageRes.data.data as unknown[]) ?? []);
      setSentimentChart((sentimentRes.data.data as unknown[]) ?? []);
      setConversations((convoRes.data.data?.data as unknown[]) ?? []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [period, chatbotId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (n: unknown) => typeof n === 'number' ? n.toLocaleString() : '—';
  const pct = (n: unknown) => typeof n === 'number' ? `${(n * 100).toFixed(1)}%` : '—';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-3">
          {/* Chatbot filter */}
          <select
            value={chatbotId} onChange={e => setChatbotId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Chatbots</option>
            {chatbots.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {/* Period filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Conversations" value={fmt(metrics?.totalConversations)} sub={`${period} period`} />
          <StatCard label="Resolution Rate" value={pct(metrics?.resolutionRate)} sub="Bot resolved" />
          <StatCard label="Avg Response Time" value={metrics?.avgResponseTimeMs ? `${Math.round((metrics.avgResponseTimeMs as number) / 1000)}s` : '—'} sub="End-to-end" />
          <StatCard label="Escalation Rate" value={pct(metrics?.escalationRate)} sub="Human handoff" />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Conversations Over Time</h3>
          {loading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={usageChart as Record<string, unknown>[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={v => String(v).slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="conversations" stroke="#6366F1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Sentiment Trend</h3>
          {loading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sentimentChart as Record<string, unknown>[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => String(v).slice(5)} />
                <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(2) : v, 'Sentiment']} />
                <Area type="monotone" dataKey="avgSentiment" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Token usage chart */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">AI Token Usage</h3>
        {loading ? <Skeleton className="h-48" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={usageChart as Record<string, unknown>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={v => String(v).slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`} />
              <Tooltip />
              <Bar dataKey="tokens" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top questions + recent conversations */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Top Intents</h3>
          {loading ? <Skeleton className="h-40" /> : (
            <div className="space-y-2">
              {((metrics?.topIntents as { intent: string; count: number }[]) ?? []).length === 0
                ? <div className="text-sm text-gray-400 py-4 text-center">No intent data yet</div>
                : ((metrics?.topIntents as { intent: string; count: number }[]) ?? []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-sm text-gray-700">{item.intent}</span>
                    </div>
                    <Badge variant="gray">{item.count}</Badge>
                  </div>
                ))
              }
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Recent Conversations</h3>
          {loading ? <Skeleton className="h-40" /> : (
            <div className="space-y-2">
              {conversations.length === 0
                ? <div className="text-sm text-gray-400 py-4 text-center">No conversations yet</div>
                : (conversations as Record<string, unknown>[]).map((c) => {
                  const sentiment = c.sentiment as number | null;
                  const sentColor = sentiment === null ? 'bg-gray-300' : sentiment > 0.3 ? 'bg-green-400' : sentiment > -0.3 ? 'bg-yellow-400' : 'bg-red-400';
                  return (
                    <div key={c.id as string} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${sentColor}`} />
                        <span className="text-xs font-mono text-gray-600">{((c.endUserId as string) ?? 'visitor').slice(0, 12)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="gray">{c.channel as string}</Badge>
                        <span className="text-xs text-gray-400">{new Date(c.createdAt as string).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
