'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface EndUser {
  id: string;
  endUserId: string;
  chatbotId: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  language: string | null;
  timezone: string | null;
  lastSeenAt: string;
  createdAt: string;
  _count: { memories: number };
}

interface Memory {
  id: string;
  memoryType: string;
  topic: string;
  content: string;
  createdAt: string;
}

interface Chatbot {
  id: string;
  name: string;
}

function MemoryDrawer({ chatbotId, endUserId, userName, onClose }: {
  chatbotId: string;
  endUserId: string;
  userName: string;
  onClose: () => void;
}) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/api/v1/chatbots/${chatbotId}/users/${encodeURIComponent(endUserId)}/memory`)
      .then(r => setMemories((r.data.memories as Memory[]) ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chatbotId, endUserId]);

  const clearMemory = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/chatbots/${chatbotId}/users/${encodeURIComponent(endUserId)}/memory`);
      setMemories([]);
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  const MEMORY_COLOR: Record<string, 'success' | 'warning' | 'gray'> = {
    LONG_TERM: 'success',
    SHORT_TERM: 'warning',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{userName || endUserId.slice(0, 20)}</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{endUserId}</p>
          </div>
          <div className="flex items-center gap-2">
            {memories.length > 0 && (
              <Button size="sm" variant="danger" onClick={clearMemory} loading={deleting}>Clear Memory</Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Stored Memories ({memories.length})</h3>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : memories.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No memories stored for this user yet.</div>
          ) : (
            <div className="space-y-3">
              {memories.map(m => (
                <div key={m.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={MEMORY_COLOR[m.memoryType] ?? 'gray'} className="text-xs">{m.memoryType}</Badge>
                    <span className="text-xs font-medium text-gray-700">{m.topic}</span>
                  </div>
                  <p className="text-sm text-gray-600">{m.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<EndUser[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterChatbot, setFilterChatbot] = useState('');
  const [selected, setSelected] = useState<EndUser | null>(null);
  const LIMIT = 25;

  const load = useCallback(async () => {
    if (!filterChatbot) { setUsers([]); setTotal(0); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/chatbots/${filterChatbot}/users?page=${page}&limit=${LIMIT}`);
      const d = res.data as { data: EndUser[]; total: number };
      setUsers(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [filterChatbot, page]);

  useEffect(() => {
    api.get('/api/v1/chatbots').then(r => {
      const bots = (r.data.data as Chatbot[]) ?? [];
      setChatbots(bots);
      if (bots.length > 0) setFilterChatbot(bots[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);
  const botMap = new Map(chatbots.map(b => [b.id, b.name]));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">End Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage user profiles and AI-extracted memories.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterChatbot}
            onChange={e => { setFilterChatbot(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            {chatbots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Users</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-indigo-600">{users.filter(u => u._count.memories > 0).length}</div>
          <div className="text-xs text-gray-500 mt-0.5">With Memories</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-gray-900">{users.reduce((s, u) => s + u._count.memories, 0)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Memory Entries</div>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium text-gray-500">No users yet</p>
            <p className="text-sm mt-1">Users appear here once they interact with your chatbot.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  {['User', 'Chatbot', 'Contact', 'Memories', 'First Seen', 'Last Seen', ''].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-900">{u.name ?? 'Anonymous'}</div>
                      <div className="font-mono text-xs text-gray-400 mt-0.5">{u.endUserId.slice(0, 18)}…</div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-xs">{botMap.get(u.chatbotId) ?? u.chatbotId.slice(0, 8)}</td>
                    <td className="py-3 px-3">
                      {u.phone && <div className="text-xs text-gray-600">{u.phone}</div>}
                      {u.email && <div className="text-xs text-gray-600">{u.email}</div>}
                      {!u.phone && !u.email && <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      {u._count.memories > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{u._count.memories}</span>
                      ) : <span className="text-xs text-gray-400">0</span>}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-xs text-gray-400">{new Date(u.lastSeenAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(u)}>View Memory</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</Button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages} · {total.toLocaleString()} users</span>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        )}
      </Card>

      {selected && (
        <MemoryDrawer
          chatbotId={selected.chatbotId}
          endUserId={selected.endUserId}
          userName={selected.name ?? ''}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
