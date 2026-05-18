'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
type TriggerType = 'SCHEDULED' | 'EVENT_TRIGGERED' | 'MANUAL';
type Channel = 'WHATSAPP' | 'WIDGET';

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  triggerType: TriggerType;
  channel: Channel;
  messageTemplate: string;
  scheduledAt: string | null;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

interface Chatbot {
  id: string;
  name: string;
}

const STATUS_COLOR: Record<CampaignStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  ACTIVE: 'success',
  DRAFT: 'gray',
  PAUSED: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
};

const TRIGGER_LABELS: Record<TriggerType, string> = {
  SCHEDULED: 'Scheduled',
  EVENT_TRIGGERED: 'Event Triggered',
  MANUAL: 'Manual',
};

function CreateCampaignModal({ chatbots, onClose, onCreated }: {
  chatbots: Chatbot[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    chatbotId: chatbots[0]?.id ?? '',
    name: '',
    triggerType: 'MANUAL' as TriggerType,
    channel: 'WHATSAPP' as Channel,
    messageTemplate: '',
    scheduledAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name.trim() || !form.messageTemplate.trim() || !form.chatbotId) {
      setError('Name, message template, and chatbot are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/chatbots/${form.chatbotId}/campaigns`, {
        name: form.name,
        triggerType: form.triggerType,
        channel: form.channel,
        messageTemplate: form.messageTemplate,
        triggerConfig: {},
        scheduledAt: form.scheduledAt || null,
      });
      onCreated();
    } catch {
      setError('Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Campaign</h2>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Welcome new customers"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot</label>
            <select
              value={form.chatbotId}
              onChange={e => setForm(f => ({ ...f, chatbotId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {chatbots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select
                value={form.triggerType}
                onChange={e => setForm(f => ({ ...f, triggerType: e.target.value as TriggerType }))}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="MANUAL">Manual</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="EVENT_TRIGGERED">Event Triggered</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value as Channel }))}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="WIDGET">Widget</option>
              </select>
            </div>
          </div>

          {form.triggerType === 'SCHEDULED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date & Time</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
            <textarea
              value={form.messageTemplate}
              onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))}
              rows={4}
              placeholder="Hi {{name}}, we have a special offer for you! ..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Use {'{{name}}'} for personalization variables</p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create Campaign</Button>
        </div>
      </div>
    </div>
  );
}

function CampaignRow({ campaign, chatbots, onRefresh }: { campaign: Campaign; chatbots: Chatbot[]; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  const chatbot = chatbots.find(b =>
    (campaign as Campaign & { chatbotId?: string }).chatbotId
      ? b.id === (campaign as Campaign & { chatbotId?: string }).chatbotId
      : false
  );

  const activate = async () => {
    setLoading(true);
    try {
      const chatbotId = (campaign as Campaign & { chatbotId?: string }).chatbotId;
      await api.post(`/chatbots/${chatbotId}/campaigns/${campaign.id}/activate`);
      onRefresh();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const pause = async () => {
    setLoading(true);
    try {
      const chatbotId = (campaign as Campaign & { chatbotId?: string }).chatbotId;
      await api.post(`/chatbots/${chatbotId}/campaigns/${campaign.id}/pause`);
      onRefresh();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const deliveryRate = campaign.sentCount > 0
    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
    : 0;

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900 text-sm">{campaign.name}</div>
        {chatbot && <div className="text-xs text-gray-400 mt-0.5">{chatbot.name}</div>}
      </td>
      <td className="py-3 px-4">
        <Badge variant={STATUS_COLOR[campaign.status]}>{campaign.status}</Badge>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{TRIGGER_LABELS[campaign.triggerType]}</td>
      <td className="py-3 px-4 text-sm text-gray-600">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${campaign.channel === 'WHATSAPP' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
          {campaign.channel === 'WHATSAPP' ? 'WhatsApp' : 'Widget'}
        </span>
      </td>
      <td className="py-3 px-4 text-sm">
        {campaign.sentCount > 0 ? (
          <div>
            <span className="font-medium text-gray-900">{campaign.sentCount.toLocaleString()}</span>
            <span className="text-gray-400 ml-1">sent</span>
            <div className="text-xs text-gray-400">{deliveryRate}% delivered</div>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-xs text-gray-400">
        {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
            <Button size="sm" variant="secondary" onClick={activate} loading={loading}>Activate</Button>
          ) : campaign.status === 'ACTIVE' ? (
            <Button size="sm" variant="ghost" onClick={pause} loading={loading}>Pause</Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<(Campaign & { chatbotId?: string })[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const load = async () => {
    try {
      const [chatbotsRes] = await Promise.all([api.get('/chatbots')]);
      const bots = (chatbotsRes.data.data as Chatbot[]) ?? [];
      setChatbots(bots);

      const allCampaigns: (Campaign & { chatbotId: string })[] = [];
      await Promise.all(
        bots.map(async (bot) => {
          try {
            const res = await api.get(`/chatbots/${bot.id}/campaigns`);
            const items = (res.data as (Campaign & { chatbotId: string })[]) ?? [];
            items.forEach(c => { c.chatbotId = bot.id; });
            allCampaigns.push(...items);
          } catch { /* ignore per-bot errors */ }
        })
      );

      allCampaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCampaigns(allCampaigns);
    } catch {
      setError('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filterStatus === 'ALL' ? campaigns : campaigns.filter(c => c.status === filterStatus);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.sentCount ?? 0), 0),
    totalDelivered: campaigns.reduce((sum, c) => sum + (c.deliveredCount ?? 0), 0),
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Proactive outbound messaging via WhatsApp and widget</p>
        </div>
        {chatbots.length > 0 && (
          <Button onClick={() => setShowCreate(true)}>+ New Campaign</Button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: stats.total },
          { label: 'Active', value: stats.active, highlight: true },
          { label: 'Messages Sent', value: stats.totalSent.toLocaleString() },
          { label: 'Delivered', value: stats.totalDelivered.toLocaleString() },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className={`text-2xl font-bold ${s.highlight ? 'text-indigo-600' : 'text-gray-900'}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-200 animate-pulse rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">No campaigns yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">Create your first outbound campaign to start messaging customers proactively.</p>
            {chatbots.length > 0 ? (
              <Button onClick={() => setShowCreate(true)}>Create Campaign</Button>
            ) : (
              <p className="text-sm text-gray-400">You need at least one chatbot to create campaigns.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  {['Campaign', 'Status', 'Trigger', 'Channel', 'Reach', 'Scheduled', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <CampaignRow key={c.id} campaign={c} chatbots={chatbots} onRefresh={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && chatbots.length > 0 && (
        <CreateCampaignModal
          chatbots={chatbots}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
