'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { Card } from '../../../../components/ui/Card';

type Tab = 'overview' | 'configuration' | 'branding' | 'whatsapp' | 'conversations';

const STATUS_COLOR: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  ACTIVE: 'green', DRAFT: 'gray', PAUSED: 'yellow', ARCHIVED: 'red',
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function ChatbotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [chatbot, setChatbot] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conversations, setConversations] = useState<unknown[]>([]);
  const [convoPage, setConvoPage] = useState(1);

  const [config, setConfig] = useState({ systemPrompt: '', maxTokens: 1024, temperature: 0.7, aiModelId: '' });
  const [branding, setBranding] = useState({
    primaryColor: '#6366F1', userBubbleColor: '#6366F1', botBubbleColor: '#F3F4F6',
    backgroundColor: '#F9FAFB', textColor: '#111827', position: 'BOTTOM_RIGHT',
    welcomeMessage: 'Hello! How can I help you today?', launcherText: 'Chat with us',
    headerTitle: '', borderRadius: 16,
  });

  const fetchChatbot = useCallback(async () => {
    try {
      const res = await api.get(`/chatbots/${id}`);
      const data = res.data.data as Record<string, unknown>;
      setChatbot(data);
      setConfig({
        systemPrompt: (data.systemPrompt as string) ?? '',
        maxTokens: (data.maxTokens as number) ?? 1024,
        temperature: (data.temperature as number) ?? 0.7,
        aiModelId: (data.aiModelId as string) ?? '',
      });
      const b = data.branding as Record<string, unknown> | undefined;
      if (b) setBranding(prev => ({ ...prev, ...b }));
    } catch {
      setError('Failed to load chatbot');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchChatbot(); }, [fetchChatbot]);

  useEffect(() => {
    if (tab === 'conversations') {
      api.get(`/analytics/conversations?chatbotId=${id}&page=${convoPage}&limit=20`)
        .then(r => setConversations((r.data.data?.data as unknown[]) ?? []))
        .catch(() => {});
    }
  }, [tab, id, convoPage]);

  const saveConfig = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch(`/chatbots/${id}`, config);
      setSuccess('Configuration saved.');
      fetchChatbot();
    } catch { setError('Failed to save.'); } finally { setSaving(false); }
  };

  const saveBranding = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch(`/chatbots/${id}/branding`, branding);
      setSuccess('Branding saved.');
    } catch { setError('Failed to save branding.'); } finally { setSaving(false); }
  };

  const toggleStatus = async (action: 'activate' | 'pause') => {
    setSaving(true); setError('');
    try {
      await api.post(`/chatbots/${id}/${action}`);
      fetchChatbot();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Action failed.');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!chatbot) return <div className="p-6 text-red-600">{error || 'Chatbot not found.'}</div>;

  const name = chatbot.name as string;
  const status = chatbot.status as string;
  const channels = (chatbot.channel as string[]) ?? [];
  const widgetDeployment = chatbot.widgetDeployment as Record<string, unknown> | undefined;
  const apiKey = widgetDeployment?.apiKey as string | undefined;
  const embedSnippet = apiKey
    ? `<script src="https://cdn.chatbot-x.com/widget.v1.js" data-key="${apiKey}" defer></script>`
    : '';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'configuration', label: 'Configuration' },
    { key: 'branding', label: 'Branding' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'conversations', label: 'Conversations' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/chatbots')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Back to chatbots</button>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={STATUS_COLOR[status] ?? 'gray'}>{status}</Badge>
            {channels.map(c => <Badge key={c} variant="gray">{c}</Badge>)}
          </div>
        </div>
        <div className="flex gap-2">
          {status !== 'ACTIVE' && <Button onClick={() => toggleStatus('activate')} disabled={saving}>Activate</Button>}
          {status === 'ACTIVE' && <Button variant="secondary" onClick={() => toggleStatus('pause')} disabled={saving}>Pause</Button>}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {embedSnippet && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Embed Snippet</h3>
                <CopyButton text={embedSnippet} />
              </div>
              <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{embedSnippet}</pre>
              <p className="text-xs text-gray-500 mt-2">Add this to your website's &lt;body&gt; tag. The chatbot will appear automatically.</p>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-sm text-gray-500">Status</div>
              <Badge variant={STATUS_COLOR[status] ?? 'gray'} className="mt-1">{status}</Badge>
            </Card>
            <Card>
              <div className="text-sm text-gray-500">Created</div>
              <div className="font-medium mt-1">{new Date(chatbot.createdAt as string).toLocaleDateString()}</div>
            </Card>
            <Card>
              <div className="text-sm text-gray-500">Channels</div>
              <div className="flex gap-1 mt-1">{channels.map(c => <Badge key={c} variant="gray">{c}</Badge>)}</div>
            </Card>
            <Card>
              <div className="text-sm text-gray-500">API Key</div>
              <div className="font-mono text-xs mt-1 truncate">{apiKey ?? '—'}</div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Configuration */}
      {tab === 'configuration' && (
        <div className="space-y-5">
          <Card>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea
              value={config.systemPrompt} onChange={e => setConfig(p => ({ ...p, systemPrompt: e.target.value }))}
              rows={8} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="You are a helpful assistant for..."
            />
            <div className="text-xs text-gray-400 mt-1">{config.systemPrompt.length} characters</div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens: {config.maxTokens}</label>
              <input type="range" min={256} max={4096} step={128} value={config.maxTokens}
                onChange={e => setConfig(p => ({ ...p, maxTokens: +e.target.value }))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>256</span><span>4096</span></div>
            </Card>
            <Card>
              <label className="block text-sm font-medium text-gray-700 mb-2">Temperature: {config.temperature}</label>
              <input type="range" min={0} max={1} step={0.1} value={config.temperature}
                onChange={e => setConfig(p => ({ ...p, temperature: +e.target.value }))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Precise (0)</span><span>Creative (1)</span></div>
            </Card>
          </div>
          <Button onClick={saveConfig} disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</Button>
        </div>
      )}

      {/* Tab: Branding */}
      {tab === 'branding' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Colors</h3>
              {[
                { label: 'Primary Color', key: 'primaryColor' },
                { label: 'User Bubble', key: 'userBubbleColor' },
                { label: 'Bot Bubble', key: 'botBubbleColor' },
                { label: 'Background', key: 'backgroundColor' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between mb-3">
                  <label className="text-sm text-gray-700">{label}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={(branding as Record<string, string>)[key]}
                      onChange={e => setBranding(p => ({ ...p, [key]: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                    <span className="text-xs font-mono text-gray-500">{(branding as Record<string, string>)[key]}</span>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Text</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-700 block mb-1">Welcome Message</label>
                  <input value={branding.welcomeMessage} onChange={e => setBranding(p => ({ ...p, welcomeMessage: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-700 block mb-1">Launcher Text</label>
                  <input value={branding.launcherText} onChange={e => setBranding(p => ({ ...p, launcherText: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-700 block mb-1">Header Title</label>
                  <input value={branding.headerTitle} onChange={e => setBranding(p => ({ ...p, headerTitle: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </Card>
            <Button onClick={saveBranding} disabled={saving}>{saving ? 'Saving...' : 'Save Branding'}</Button>
          </div>

          {/* Live Preview */}
          <div className="sticky top-4">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
              <div className="relative bg-gray-100 rounded-lg p-4 h-96 overflow-hidden" style={{ backgroundColor: branding.backgroundColor }}>
                {/* Bot message */}
                <div className="flex gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: branding.primaryColor }} />
                  <div className="max-w-xs px-3 py-2 rounded-2xl rounded-tl-none text-sm" style={{ backgroundColor: branding.botBubbleColor, color: branding.textColor }}>
                    {branding.welcomeMessage}
                  </div>
                </div>
                {/* User message */}
                <div className="flex justify-end mb-3">
                  <div className="max-w-xs px-3 py-2 rounded-2xl rounded-tr-none text-sm text-white" style={{ backgroundColor: branding.userBubbleColor }}>
                    Hi, I have a question!
                  </div>
                </div>
                {/* Launcher button */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <div className="bg-white rounded-full shadow px-3 py-1 text-xs font-medium" style={{ color: branding.primaryColor }}>
                    {branding.launcherText}
                  </div>
                  <div className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white" style={{ backgroundColor: branding.primaryColor, borderRadius: `${branding.borderRadius}px` }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: WhatsApp */}
      {tab === 'whatsapp' && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">WhatsApp Setup</h3>
            <ol className="space-y-4">
              {[
                { step: 1, title: 'Connect Meta Business Account', desc: 'You need a verified Meta Business account with WhatsApp Business API access.', action: <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">Open Meta Business →</a> },
                { step: 2, title: 'Get Phone Number ID & WABA ID', desc: 'From Meta Business Dashboard → WhatsApp → API Setup', action: null },
                { step: 3, title: 'Enter Credentials', desc: null, action: null },
                { step: 4, title: 'Configure Webhook', desc: `Set this URL in Meta: https://api.chatbot-x.com/api/v1/webhooks/whatsapp/${id}`, action: <CopyButton text={`https://api.chatbot-x.com/api/v1/webhooks/whatsapp/${id}`} /> },
              ].map(({ step, title, desc, action }) => (
                <li key={step} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">{step}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{title}</div>
                    {desc && <div className="text-sm text-gray-500 mt-1">{desc}</div>}
                    {action && <div className="mt-2">{action}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Credentials</h3>
            <div className="space-y-3">
              {[
                { label: 'Phone Number ID', key: 'phoneNumberId', placeholder: '1234567890' },
                { label: 'WhatsApp Business Account ID', key: 'wabaId', placeholder: '1234567890' },
                { label: 'Access Token', key: 'accessToken', placeholder: 'EAAxxxxxx...', type: 'password' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type ?? 'text'} placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
            <Button className="mt-4">Save WhatsApp Config</Button>
          </Card>
        </div>
      )}

      {/* Tab: Conversations */}
      {tab === 'conversations' && (
        <div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Visitor', 'Channel', 'Status', 'Messages', 'Sentiment', 'Started'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conversations.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No conversations yet</td></tr>
                  : (conversations as Record<string, unknown>[]).map((c) => {
                    const sentiment = (c.sentiment as number | null);
                    const sentColor = sentiment === null ? 'bg-gray-200' : sentiment > 0.3 ? 'bg-green-400' : sentiment > -0.3 ? 'bg-yellow-400' : 'bg-red-400';
                    return (
                      <tr key={c.id as string} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{((c.endUserId as string) ?? '—').slice(0, 12)}...</td>
                        <td className="px-4 py-3"><Badge variant="gray">{c.channel as string}</Badge></td>
                        <td className="px-4 py-3"><Badge variant={STATUS_COLOR[c.status as string] ?? 'gray'}>{c.status as string}</Badge></td>
                        <td className="px-4 py-3 text-gray-700">{c._count ? (c._count as Record<string, number>).messages : '—'}</td>
                        <td className="px-4 py-3"><div className={`w-3 h-3 rounded-full ${sentColor}`} title={String(sentiment ?? 'N/A')} /></td>
                        <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt as string).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button variant="secondary" disabled={convoPage === 1} onClick={() => setConvoPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-gray-500">Page {convoPage}</span>
            <Button variant="secondary" disabled={conversations.length < 20} onClick={() => setConvoPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
