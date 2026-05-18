'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface Provider {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  providerType: string;
  authType: string;
}

interface ConnectedIntegration {
  id: string;
  providerId: string;
  chatbotId: string;
  isActive: boolean;
  syncedAt?: string;
  provider?: { name: string; slug: string; providerType: string };
}

interface Chatbot {
  id: string;
  name: string;
}

const PROVIDER_ICONS: Record<string, string> = {
  shopify: '🛍️',
  woocommerce: '🛒',
  google_calendar: '📅',
  salesforce: '☁️',
  hubspot: '🔶',
  square: '⬛',
  stripe: '💳',
  zapier: '⚡',
  slack: '💬',
  webhook: '🔗',
};

const TYPE_COLORS: Record<string, 'success' | 'warning' | 'gray' | 'danger'> = {
  ECOMMERCE: 'success',
  CALENDAR: 'warning',
  CRM: 'gray',
  POS: 'success',
  PAYMENT: 'gray',
  AUTOMATION: 'warning',
  COMMUNICATION: 'gray',
  WEBHOOK: 'gray',
};

function ConnectModal({ provider, chatbots, onClose, onConnected }: {
  provider: Provider;
  chatbots: Chatbot[];
  onClose: () => void;
  onConnected: () => void;
}) {
  const [chatbotId, setChatbotId] = useState(chatbots[0]?.id ?? '');
  const [apiKey, setApiKey] = useState('');
  const [storeDomain, setStoreDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!chatbotId) { setError('Select a chatbot.'); return; }
    if (!apiKey.trim()) { setError('API key is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/v1/chatbots/${chatbotId}/integrations`, {
        providerId: provider.id,
        credentials: { apiKey, storeDomain: storeDomain || undefined },
        config: {},
      });
      onConnected();
    } catch {
      setError('Failed to connect. Please check your credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <span className="text-2xl">{PROVIDER_ICONS[provider.slug] ?? '🔌'}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Connect {provider.name}</h2>
            <p className="text-sm text-gray-500">{provider.description}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot</label>
            <select
              value={chatbotId}
              onChange={e => setChatbotId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {chatbots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {provider.slug === 'shopify' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Domain</label>
              <input
                value={storeDomain}
                onChange={e => setStoreDomain(e.target.value)}
                placeholder="mystore.myshopify.com"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key / Access Token</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Stored securely and never exposed in the UI again.</p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Connect</Button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connected, setConnected] = useState<ConnectedIntegration[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [providersRes, chatbotsRes] = await Promise.all([
        api.get('/api/v1/integrations/providers'),
        api.get('/api/v1/chatbots'),
      ]);
      const bots = (chatbotsRes.data.data as Chatbot[]) ?? [];
      const provs = (providersRes.data as Provider[]) ?? [];
      setProviders(provs);
      setChatbots(bots);

      const allConnected: ConnectedIntegration[] = [];
      await Promise.all(
        bots.map(async (bot) => {
          try {
            const res = await api.get(`/api/v1/chatbots/${bot.id}/integrations`);
            const items = (res.data as ConnectedIntegration[]) ?? [];
            allConnected.push(...items);
          } catch { /* ignore */ }
        })
      );
      setConnected(allConnected);
    } catch {
      setError('Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const disconnect = async (integration: ConnectedIntegration) => {
    try {
      await api.delete(`/api/v1/chatbots/${integration.chatbotId}/integrations/${integration.id}`);
      load();
    } catch { /* ignore */ }
  };

  const connectedProviderIds = new Set(connected.map(c => c.providerId));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Connect your tools to enable agentic actions: inventory sync, booking, CRM, and more.</p>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Connected */}
      {connected.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Connected ({connected.length})</h2>
          <div className="space-y-2">
            {connected.map(c => {
              const prov = providers.find(p => p.id === c.providerId);
              return (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{PROVIDER_ICONS[prov?.slug ?? ''] ?? '🔌'}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{prov?.name ?? 'Unknown'}</div>
                      {c.syncedAt && (
                        <div className="text-xs text-gray-400">Last synced {new Date(c.syncedAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={c.isActive ? 'success' : 'gray'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => disconnect(c)}>Disconnect</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Available */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Available Integrations</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(p => {
              const isConnected = connectedProviderIds.has(p.id);
              return (
                <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{PROVIDER_ICONS[p.slug] ?? '🔌'}</span>
                    <Badge variant={TYPE_COLORS[p.providerType] ?? 'gray'} className="text-xs">
                      {p.providerType}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 mb-3 line-clamp-2">{p.description}</p>
                  {isConnected ? (
                    <span className="inline-flex items-center text-xs text-green-600 font-medium">
                      <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Connected
                    </span>
                  ) : chatbots.length > 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => setConnecting(p)}>Connect</Button>
                  ) : (
                    <span className="text-xs text-gray-400">Create a chatbot first</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {connecting && (
        <ConnectModal
          provider={connecting}
          chatbots={chatbots}
          onClose={() => setConnecting(null)}
          onConnected={() => { setConnecting(null); load(); }}
        />
      )}
    </div>
  );
}
