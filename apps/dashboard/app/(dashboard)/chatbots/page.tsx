'use client';

import { useChatbots } from '@/hooks/use-chatbots';
import { Card } from '@/components/ui/Card';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatNumber } from '@/lib/utils';
import { Bot, Plus, MessageSquare, Globe, MessageCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { Chatbot } from '@/lib/api';

const DEMO_CHATBOTS: Chatbot[] = [
  {
    id: 'bot-1',
    tenantId: 'demo',
    name: 'Support Bot',
    industry: 'ecommerce',
    status: 'ACTIVE',
    systemPrompt: '',
    model: 'claude-sonnet-4-6',
    channels: ['WIDGET'],
    monthlyMessages: 4200,
    branding: {
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      userBubbleColor: '#6366f1',
      botBubbleColor: '#f1f5f9',
      fontFamily: 'Inter',
      borderRadius: 12,
      position: 'bottom-right',
      launcherText: 'Chat with us',
      welcomeMessage: 'Hi! How can I help?',
      placeholderText: 'Type a message...',
      widgetWidth: 380,
      widgetHeight: 600,
    },
    createdAt: '2025-04-01',
    updatedAt: '2025-05-17',
  },
  {
    id: 'bot-2',
    tenantId: 'demo',
    name: 'Sales Assistant',
    industry: 'ecommerce',
    status: 'ACTIVE',
    systemPrompt: '',
    model: 'claude-sonnet-4-6',
    channels: ['WIDGET', 'WHATSAPP'],
    monthlyMessages: 2900,
    branding: {
      primaryColor: '#0ea5e9',
      secondaryColor: '#38bdf8',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      userBubbleColor: '#0ea5e9',
      botBubbleColor: '#f0f9ff',
      fontFamily: 'Inter',
      borderRadius: 16,
      position: 'bottom-right',
      launcherText: 'Talk to sales',
      welcomeMessage: 'Ready to find the perfect product?',
      placeholderText: 'Ask me anything...',
      widgetWidth: 380,
      widgetHeight: 600,
    },
    createdAt: '2025-04-15',
    updatedAt: '2025-05-17',
  },
  {
    id: 'bot-3',
    tenantId: 'demo',
    name: 'HR Helper',
    industry: 'professional-services',
    status: 'PAUSED',
    systemPrompt: '',
    model: 'claude-haiku-4-5-20251001',
    channels: ['WIDGET'],
    monthlyMessages: 580,
    branding: {
      primaryColor: '#8b5cf6',
      secondaryColor: '#a78bfa',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      userBubbleColor: '#8b5cf6',
      botBubbleColor: '#faf5ff',
      fontFamily: 'Inter',
      borderRadius: 12,
      position: 'bottom-left',
      launcherText: 'HR Support',
      welcomeMessage: 'How can I assist you today?',
      placeholderText: 'Type your question...',
      widgetWidth: 380,
      widgetHeight: 600,
    },
    createdAt: '2025-04-28',
    updatedAt: '2025-05-10',
  },
  {
    id: 'bot-4',
    tenantId: 'demo',
    name: 'Onboarding Guide',
    industry: 'education',
    status: 'DRAFT',
    systemPrompt: '',
    model: 'claude-sonnet-4-6',
    channels: ['WIDGET'],
    monthlyMessages: 0,
    branding: {
      primaryColor: '#22c55e',
      secondaryColor: '#4ade80',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      userBubbleColor: '#22c55e',
      botBubbleColor: '#f0fdf4',
      fontFamily: 'Inter',
      borderRadius: 12,
      position: 'bottom-right',
      launcherText: 'Get started',
      welcomeMessage: "Welcome! Let's get you set up.",
      placeholderText: 'Type here...',
      widgetWidth: 380,
      widgetHeight: 600,
    },
    createdAt: '2025-05-14',
    updatedAt: '2025-05-14',
  },
];

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
  return (
    <Link href={`/chatbots/${bot.id}`}>
      <Card className="hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${bot.branding.primaryColor}20` }}
          >
            <Bot className="h-5 w-5" style={{ color: bot.branding.primaryColor }} />
          </div>
          <Badge variant={statusToBadgeVariant(bot.status)} dot>
            {bot.status}
          </Badge>
        </div>

        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
          {bot.name}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 capitalize">{bot.industry.replace(/-/g, ' ')}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {bot.channels.map((ch) => (
            <ChannelBadge key={ch} channel={ch} />
          ))}
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-500">
          <MessageSquare className="h-4 w-4" />
          <span>{formatNumber(bot.monthlyMessages)} msgs/mo</span>
        </div>
      </Card>
    </Link>
  );
}

export default function ChatbotsPage() {
  const { data: chatbots, isLoading, error } = useChatbots();
  const [search, setSearch] = useState('');

  const displayBots = chatbots ?? (error ? DEMO_CHATBOTS : null);
  const filtered = displayBots?.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chatbots</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {displayBots?.length ?? 0} chatbot{(displayBots?.length ?? 0) !== 1 ? 's' : ''} in your workspace
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
