'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function ProgressBar({ value, max, color = 'indigo' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const BILLING_STATUS_COLOR: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  PAID: 'green', PENDING: 'yellow', INVOICED: 'yellow', VOID: 'red',
};
const SUB_STATUS_COLOR: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  ACTIVE: 'green', TRIALING: 'gray', PAST_DUE: 'red', CANCELED: 'red', PAUSED: 'yellow',
};

type UsageData = {
  totalMessages: number;
  totalTokens: bigint | number;
  billedCostUsd: number;
  rawCostUsd: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
};

type InvoiceRow = {
  id: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalMessages: number;
  billedCostUsd: number;
  status: string;
  stripeInvoiceId?: string;
};

type SetupFee = { id: string; chatbot?: { name: string }; amountUsd: number; status: string };
type Subscription = { id: string; chatbot?: { name: string }; industryPlan?: { name: string; priceMonthlyUsd: number }; status: string; currentPeriodEnd: string };

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<InvoiceRow[]>([]);
  const [chatbots, setChatbots] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [usageRes, historyRes, chatbotsRes] = await Promise.all([
          api.get('/billing/usage'),
          api.get('/billing/history'),
          api.get('/chatbots'),
        ]);
        setUsage(usageRes.data.data as UsageData);
        setHistory((historyRes.data.data as InvoiceRow[]) ?? []);
        setChatbots((chatbotsRes.data.data as Record<string, unknown>[]) ?? []);
      } catch { setError('Failed to load billing data.'); } finally { setLoading(false); }
    };
    load();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.get('/billing/portal');
      window.location.href = (res.data.data as { url: string }).url;
    } catch { setError('Could not open billing portal. Please ensure you have an active subscription.'); setPortalLoading(false); }
  };

  const formatTokens = (t: bigint | number | undefined) => {
    if (t === undefined || t === null) return '0';
    const n = typeof t === 'bigint' ? Number(t) : t;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  };

  const subscriptions = chatbots.map(c => ({
    id: c.id as string,
    chatbot: { name: c.name as string },
    industryPlan: c.industryPlan as { name: string; priceMonthlyUsd: number } | undefined,
    subscription: c.subscription as Record<string, unknown> | undefined,
    setupFee: c.setupFeePayment as Record<string, unknown> | undefined,
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Usage</h1>
        <Button onClick={openPortal} disabled={portalLoading} variant="secondary">
          {portalLoading ? 'Opening...' : 'Manage Billing →'}
        </Button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Subscriptions */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Active Chatbots</h2>
        {loading ? <Skeleton className="h-24" /> : subscriptions.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No chatbots yet. <a href="/chatbots/new" className="text-indigo-600 hover:underline">Create one →</a></div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map(s => {
              const sub = s.subscription;
              const status = (sub?.status as string) ?? 'DRAFT';
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{s.chatbot.name}</div>
                    <div className="text-sm text-gray-500">{s.industryPlan?.name ?? 'No plan'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.industryPlan && (
                      <span className="text-sm font-semibold text-gray-700">${s.industryPlan.priceMonthlyUsd}/mo</span>
                    )}
                    <Badge variant={SUB_STATUS_COLOR[status] ?? 'gray'}>{status}</Badge>
                    {sub && <span className="text-xs text-gray-400">Renews {new Date((sub.currentPeriodEnd as string)).toLocaleDateString()}</span>}
                    {!sub && (
                      <a href={`/chatbots/${s.id}`} className="text-xs text-indigo-600 hover:underline">Subscribe →</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* AI Usage This Month */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">AI Usage This Month</h2>
        {loading ? <Skeleton className="h-32" /> : !usage ? (
          <div className="text-sm text-gray-400">No usage data yet.</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Messages</span>
                <span className="font-medium">{usage.totalMessages.toLocaleString()}</span>
              </div>
              <ProgressBar value={usage.totalMessages} max={10000} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Tokens Used</div>
                <div className="font-bold text-gray-900">{formatTokens(usage.totalTokens)}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Raw AI Cost</div>
                <div className="font-bold text-gray-900">${Number(usage.rawCostUsd).toFixed(2)}</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-xs text-indigo-600 mb-1">Billed Amount</div>
                <div className="font-bold text-indigo-700">${Number(usage.billedCostUsd).toFixed(2)}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right">
              Period: {new Date(usage.billingPeriodStart).toLocaleDateString()} – {new Date(usage.billingPeriodEnd).toLocaleDateString()}
            </div>
          </div>
        )}
      </Card>

      {/* Cost Breakdown */}
      {usage && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600 font-medium">Item</th>
                <th className="text-right py-2 text-gray-600 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-700">Base Subscription</td>
                <td className="py-2 text-right font-medium">See subscriptions above</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-700">AI Usage (raw cost)</td>
                <td className="py-2 text-right font-medium">${Number(usage.rawCostUsd).toFixed(4)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-700">Service markup (40%)</td>
                <td className="py-2 text-right font-medium">${(Number(usage.billedCostUsd) - Number(usage.rawCostUsd)).toFixed(4)}</td>
              </tr>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-2 text-gray-900">AI Usage Total</td>
                <td className="py-2 text-right text-indigo-700">${Number(usage.billedCostUsd).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Invoice History</h2>
        {loading ? <Skeleton className="h-40" /> : history.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  {['Period', 'Messages', 'AI Cost', 'Status', 'Invoice'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-700">
                      {new Date(inv.billingPeriodStart).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-2 px-2 text-gray-700">{inv.totalMessages.toLocaleString()}</td>
                    <td className="py-2 px-2 font-medium text-gray-900">${Number(inv.billedCostUsd).toFixed(2)}</td>
                    <td className="py-2 px-2"><Badge variant={BILLING_STATUS_COLOR[inv.status] ?? 'gray'}>{inv.status}</Badge></td>
                    <td className="py-2 px-2">
                      {inv.stripeInvoiceId
                        ? <span className="text-xs text-indigo-600 hover:underline cursor-pointer">View</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
