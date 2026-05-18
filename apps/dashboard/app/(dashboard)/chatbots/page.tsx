'use client';

import { useChatbots } from '@/hooks/use-chatbots';
import { Card } from '@/components/ui/Card';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Bot, Plus, Globe, MessageCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { Chatbot } from '@/lib/api';


function ChannelBadge({ channel }: { channel: 'WIDGET' | 'WHATSAPP' }) {
  return channel === 'WIDGET' ? (
    <Badge variant="info" className="text-xs">
      <Globe className="h-3 w-3" />
      Widget
    </Badge>
  ) : (
    <Badge variant="success" className="text-xs">
      <MessageCircle className="h-3 w-3" />
      WhatsApp
    </Badge>
  );
}

function ChatbotCard({ bot }: { bot: Chatbot }) {
  const color = bot.branding?.primaryColor ?? '#6366f1';
  return (
    <Link href={`/chatbots/${bot.id}`}>
      <Card className="hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Bot className="h-5 w-5" style={{ color }} />
          </div>
          <Badge variant={statusToBadgeVariant(bot.status)} dot>
            {bot.status}
          </Badge>
        </div>

        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
          {bot.name}
        </h3>
        {bot.industry && (
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{bot.industry.name}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {(bot.channel ?? []).map((ch) => (
            <ChannelBadge key={ch} channel={ch} />
          ))}
        </div>
      </Card>
    </Link>
  );
}

export default function ChatbotsPage() {
  const { data: chatbots, isLoading, error } = useChatbots();
  const [search, setSearch] = useState('');

  const filtered = (chatbots ?? []).filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.industry?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chatbots</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {chatbots?.length ?? 0} chatbot{(chatbots?.length ?? 0) !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <Link href="/chatbots/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Chatbot
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search chatbots..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* Grid */}
      {!isLoading && (
        <>
          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((bot) => (
                <ChatbotCard key={bot.id} bot={bot} />
              ))}
              {/* Add new card */}
              <Link href="/chatbots/new">
                <div className="h-full min-h-[160px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors cursor-pointer group">
                  <div className="h-10 w-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">New Chatbot</span>
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-900">No chatbots found</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                {search ? 'Try a different search term.' : 'Create your first chatbot to get started.'}
              </p>
              {!search && (
                <Link href="/chatbots/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Create chatbot
                  </Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
