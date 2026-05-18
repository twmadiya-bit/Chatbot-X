'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface Stats {
  totalTenants: number;
  activeChatbots: number;
  totalConversations: number;
  monthRevenuUsd: number;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string | null;
  createdAt: string;
  _count: { chatbots: number };
}

interface AiModel {
  id: string;
  modelId: string;
  name: string;
  isActive: boolean;
  provider: { name: string; providerKey: string };
  pricing: { inputCostPerMillion: number; outputCostPerMillion: number }[];
}

interface PlatformSettings {
  defaultMarkupPct: number;
  setupFeeWidget: number;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="text-center py-5">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </Card>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({ defaultMarkupPct: 40, setupFeeWidget: 99 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'tenants' | 'models' | 'settings'>('overview');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [pricingEdit, setPricingEdit] = useState<Record<string, { input: string; output: string }>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, tenantsRes, modelsRes, settingsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/tenants?limit=50'),
          api.get('/admin/models'),
          api.get('/admin/settings'),
        ]);
        setStats(statsRes.data.data as Stats);
        setTenants((tenantsRes.data.data?.data as Tenant[]) ?? []);
        const m = (modelsRes.data.data as AiModel[]) ?? [];
        setModels(m);
        setPricingEdit(Object.fromEntries(m.map(model => [
          model.id,
          {
            input: String(model.pricing[0]?.inputCostPerMillion ?? 0),
            output: String(model.pricing[0]?.outputCostPerMillion ?? 0),
          },
        ])));
        setSettings(settingsRes.data.data as PlatformSettings);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, []);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api.patch('/admin/settings', settings);
    } catch { /* ignore */ } finally { setSettingsSaving(false); }
  };

  const saveModelPricing = async (modelId: string, model: AiModel) => {
    const edit = pricingEdit[model.id];
    if (!edit) return;
    try {
      await api.patch(`/admin/models/${model.modelId}/pricing`, {
        inputCostPerMillion: parseFloat(edit.input),
        outputCostPerMillion: parseFloat(edit.output),
      });
    } catch { /* ignore */ }
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'tenants' as const, label: 'Tenants' },
    { key: 'models' as const, label: 'AI Models' },
    { key: 'settings' as const, label: 'Platform Settings' },
  ];

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-xl" />)}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Platform management — internal use only</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Active Tenants" value={stats.totalTenants} />
            <StatCard label="Active Chatbots" value={stats.activeChatbots} />
            <StatCard label="Conversations (MTD)" value={stats.totalConversations.toLocaleString()} />
            <StatCard label="Revenue (MTD)" value={`$${Number(stats.monthRevenuUsd).toFixed(2)}`} sub="AI usage billed" />
          </div>
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Recent Tenants</h2>
            <div className="space-y-2">
              {tenants.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{t._count.chatbots} bots</span>
                    <Badge variant={t.status === 'ACTIVE' ? 'green' : 'gray'}>{t.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tenants */}
      {tab === 'tenants' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  {['Tenant', 'Email', 'Chatbots', 'Status', 'Joined'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="font-mono text-xs text-gray-400">{t.id.slice(0, 8)}…</div>
                    </td>
                    <td className="py-3 px-3 text-gray-600">{t.email}</td>
                    <td className="py-3 px-3 text-center">{t._count.chatbots}</td>
                    <td className="py-3 px-3">
                      <Badge variant={t.status === 'ACTIVE' ? 'green' : t.status === 'SUSPENDED' ? 'red' : 'gray'}>{t.status}</Badge>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* AI Models */}
      {tab === 'models' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">AI Models & Pricing</h2>
          <div className="space-y-3">
            {models.map(model => {
              const edit = pricingEdit[model.id] ?? { input: '0', output: '0' };
              return (
                <div key={model.id} className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900 text-sm">{model.name}</span>
                        <Badge variant={model.isActive ? 'green' : 'gray'} className="text-xs">{model.isActive ? 'Active' : 'Inactive'}</Badge>
                        <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{model.provider.name}</span>
                      </div>
                      <div className="font-mono text-xs text-gray-400">{model.modelId}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Input $/1M</label>
                        <input
                          type="number"
                          step="0.01"
                          value={edit.input}
                          onChange={e => setPricingEdit(prev => ({ ...prev, [model.id]: { ...edit, input: e.target.value } }))}
                          className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs text-right focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Output $/1M</label>
                        <input
                          type="number"
                          step="0.01"
                          value={edit.output}
                          onChange={e => setPricingEdit(prev => ({ ...prev, [model.id]: { ...edit, output: e.target.value } }))}
                          className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs text-right focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => saveModelPricing(model.id, model)}>Save</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Platform Settings */}
      {tab === 'settings' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-5">Platform Settings</h2>
          <div className="space-y-5 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Cost Markup: {settings.defaultMarkupPct}%
              </label>
              <input
                type="range" min={0} max={200} step={5}
                value={settings.defaultMarkupPct}
                onChange={e => setSettings(s => ({ ...s, defaultMarkupPct: +e.target.value }))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0%</span><span>200%</span></div>
              <p className="text-xs text-gray-500 mt-1">Applied on top of raw AI provider cost when billing tenants.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Widget Setup Fee (USD)</label>
              <input
                type="number" min={0} step={1}
                value={settings.setupFeeWidget}
                onChange={e => setSettings(s => ({ ...s, setupFeeWidget: +e.target.value }))}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">One-time fee charged per new widget chatbot.</p>
            </div>
            <Button onClick={saveSettings} loading={settingsSaving}>Save Settings</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
