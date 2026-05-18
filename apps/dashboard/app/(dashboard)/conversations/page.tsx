'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

type ConvStatus = 'OPEN' | 'ESCALATED' | 'CLOSED';
type Channel = 'WIDGET' | 'WHATSAPP';

interface Conversation {
  id: string;
  chatbotId: string;
  channel: Channel;
  endUserId: string | null;
  endUserName: string | null;
  endUserPhone: string | null;
  status: ConvStatus;
  sentiment: number | null;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  chatbot?: { name: string };
}

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
  sentimentScore?: number | null;
  isEscalated?: boolean;
}

interface ConvDetail {
  id: string;
  status: ConvStatus;
  endUserId: string | null;
  endUserName: string | null;
  endUserPhone: string | null;
  channel: Channel;
  sentiment: number | null;
  messages: Message[];
  chatbot: { id: string; name: string };
}

interface Chatbot {
  id: string;
  name: string;
}

const STATUS_COLOR: Record<ConvStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  OPEN: 'success',
  ESCALATED: 'danger',
  CLOSED: 'gray',
};

function sentimentLabel(score: number | null): { text: string; color: string } {
  if (score === null) return { text: '—', color: 'text-gray-400' };
  if (score > 0.3) return { text: 'Positive', color: 'text-green-600' };
  if (score > -0.3) return { text: 'Neutral', color: 'text-yellow-600' };
  return { text: 'Negative', color: 'text-red-600' };
}

function sentimentDot(score: number | null) {
  if (score === null) return 'bg-gray-300';
  if (score > 0.3) return 'bg-green-400';
  if (score > -0.3) return 'bg-yellow-400';
  return 'bg-red-400';
}

function ConversationThread({ detail, onStatusChange }: { detail: ConvDetail; onStatusChange: (status: ConvStatus) => void }) {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (status: ConvStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/api/v1/analytics/conversations/${detail.id}/status`, { status });
      onStatusChange(status);
    } catch { /* ignore */ } finally { setUpdating(false); }
  };

  const { text: sentText, color: sentColor } = sentimentLabel(detail.sentiment);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">
              {detail.endUserName ?? detail.endUserPhone ?? detail.endUserId?.slice(0, 16) ?? 'Anonymous'}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={STATUS_COLOR[detail.status]}>{detail.status}</Badge>
              <span className="text-xs text-gray-500">{detail.channel}</span>
              <span className={`text-xs font-medium ${sentColor}`}>Sentiment: {sentText}</span>
              <span className="text-xs text-gray-400">Bot: {detail.chatbot.name}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {detail.status !== 'CLOSED' && (
              <Button size="sm" variant="secondary" onClick={() => updateStatus('CLOSED')} loading={updating}>Close</Button>
            )}
            {detail.status === 'CLOSED' && (
              <Button size="sm" variant="secondary" onClick={() => updateStatus('OPEN')} loading={updating}>Reopen</Button>
            )}
            {detail.status === 'OPEN' && (
              <Button size="sm" variant="danger" onClick={() => updateStatus('ESCALATED')} loading={updating}>Escalate</Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {detail.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'USER'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <div className={`text-xs mt-1 ${msg.role === 'USER' ? 'text-indigo-200' : 'text-gray-400'}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.isEscalated && <span className="ml-2 text-red-400">⚠ Escalated</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterChatbot, setFilterChatbot] = useState<string>('');
  const [search, setSearch] = useState('');

  const LIMIT = 25;

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filterStatus) params.set('status', filterStatus);
      if (filterChatbot) params.set('chatbotId', filterChatbot);
      const res = await api.get(`/api/v1/analytics/conversations?${params}`);
      const payload = res.data.data as { data: Conversation[]; total: number };
      setConversations(payload.data ?? []);
      setTotal(payload.total ?? 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, filterStatus, filterChatbot]);

  useEffect(() => {
    api.get('/api/v1/chatbots').then(r => setChatbots((r.data.data as Chatbot[]) ?? [])).catch(() => {});
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    api.get(`/api/v1/analytics/conversations/${selectedId}`)
      .then(r => setDetail(r.data.data as ConvDetail))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleStatusChange = (status: ConvStatus) => {
    if (detail) setDetail({ ...detail, status });
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, status } : c));
  };

  const filtered = search
    ? conversations.filter(c =>
        (c.endUserName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.endUserId ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.endUserPhone ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Left panel: list */}
      <div className="w-full max-w-md flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Conversations</h1>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{total.toLocaleString()} total</span>
          </div>
          <input
            type="text"
            placeholder="Search by user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="ESCALATED">Escalated</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={filterChatbot}
              onChange={e => { setFilterChatbot(e.target.value); setPage(1); }}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All chatbots</option>
              {chatbots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="space-y-1 p-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {search ? 'No results match your search.' : 'No conversations yet.'}
            </div>
          ) : (
            filtered.map(c => {
              const isSelected = c.id === selectedId;
              const { color } = sentimentLabel(c.sentiment);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50 border-r-2 border-indigo-600' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {c.endUserName ?? c.endUserPhone ?? (c.endUserId ? c.endUserId.slice(0, 14) + '...' : 'Anonymous')}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${sentimentDot(c.sentiment)}`} />
                      <Badge variant={STATUS_COLOR[c.status]} className="text-xs py-0">{c.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{c.channel} · {c.messageCount} msgs</span>
                    <span>{new Date(c.lastMessageAt ?? c.startedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        )}
      </div>

      {/* Right panel: thread */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : detail ? (
          <ConversationThread detail={detail} onStatusChange={handleStatusChange} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium text-gray-500">Select a conversation</p>
            <p className="text-sm mt-1">Click any conversation on the left to view the full thread.</p>
          </div>
        )}
      </div>
    </div>
  );
}
