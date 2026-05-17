'use client';

import { useDashboardMetrics } from '@/hooks/use-analytics';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatNumber, formatDateShort } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Bot,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

function MetricCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  subtext,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtext?: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={`h-12 w-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: metrics, isLoading, error } = useDashboardMetrics();

  // Fallback demo data for when API is unavailable
  const demoMetrics = {
    totalChatbots: 3,
    conversationsThisMonth: 1_248,
    messagesThisMonth: 8_932,
    aiCostThisMonth: 14.72,
    last7DaysConversations: [
      { date: '2025-05-11', count: 142 },
      { date: '2025-05-12', count: 198 },
      { date: '2025-05-13', count: 167 },
      { date: '2025-05-14', count: 220 },
      { date: '2025-05-15', count: 185 },
      { date: '2025-05-16', count: 241 },
      { date: '2025-05-17', count: 95 },
    ],
    chatbots: [
      {
        id: 'bot-1',
        name: 'Support Bot',
        industry: 'ecommerce',
        status: 'ACTIVE' as const,
        channels: ['WIDGET' as const],
        monthlyMessages: 4200,
        tenantId: '',
        systemPrompt: '',
        model: '',
        branding: {
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          userBubbleColor: '#6366f1',
          botBubbleColor: '#f1f5f9',
          fontFamily: 'Inter',
          borderRadius: 12,
          position: 'bottom-right' as const,
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
        name: 'Sales Assistant',
        industry: 'ecommerce',
        status: 'ACTIVE' as const,
        channels: ['WIDGET' as const, 'WHATSAPP' as const],
        monthlyMessages: 2900,
        tenantId: '',
        systemPrompt: '',
        model: '',
        branding: {
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          userBubbleColor: '#6366f1',
          botBubbleColor: '#f1f5f9',
          fontFamily: 'Inter',
          borderRadius: 12,
          position: 'bottom-right' as const,
          launcherText: 'Chat with us',
          welcomeMessage: 'Hi! How can I help?',
          placeholderText: 'Type a message...',
          widgetWidth: 380,
          widgetHeight: 600,
        },
        createdAt: '2025-04-15',
        updatedAt: '2025-05-17',
      },
      {
        id: 'bot-3',
        name: 'HR Helper',
        industry: 'professional-services',
        status: 'DRAFT' as const,
        channels: ['WIDGET' as const],
        monthlyMessages: 0,
        tenantId: '',
        systemPrompt: '',
        model: '',
        branding: {
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          userBubbleColor: '#6366f1',
          botBubbleColor: '#f1f5f9',
          fontFamily: 'Inter',
          borderRadius: 12,
          position: 'bottom-right' as const,
          launcherText: 'Chat with us',
          welcomeMessage: 'Hi! How can I help?',
          placeholderText: 'Type a message...',
          widgetWidth: 380,
          widgetHeight: 600,
        },
        createdAt: '2025-05-10',
        updatedAt: '2025-05-17',
      },
    ],
  };

  const data = metrics ?? (error ? demoMetrics : null);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="h-64 bg-slate-200 rounded-xl" />
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const d = data ?? demoMetrics;
  const chartData = d.last7DaysConversations.map((item) => ({
    ...item,
    date: formatDateShort(item.date),
  }));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <Link href="/chatbots/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Chatbot
          </Button>
        </Link>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Chatbots"
          value={String(d.totalChatbots)}
          icon={Bot}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <MetricCard
          title="Conversations"
          value={formatNumber(d.conversationsThisMonth)}
          icon={MessageSquare}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          subtext="This month"
        />
        <MetricCard
          title="Messages"
          value={formatNumber(d.messagesThisMonth)}
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          subtext="This month"
        />
        <MetricCard
          title="AI Cost"
          value={formatCurrency(d.aiCostThisMonth)}
          icon={DollarSign}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subtext="This month"
        />
      </div>

      {/* Charts + chatbot list */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Conversations chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Conversations — Last 7 Days</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
                name="Conversations"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Chatbot status list */}
        <Card className="lg:col-span-2" padding="none">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Your Chatbots</h3>
            <Link href="/chatbots" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {d.chatbots.slice(0, 5).map((bot) => (
              <Link
                key={bot.id}
                href={`/chatbots/${bot.id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{bot.name}</p>
                    <p className="text-xs text-slate-400">{formatNumber(bot.monthlyMessages)} msgs/mo</p>
                  </div>
                </div>
                <Badge variant={statusToBadgeVariant(bot.status)} dot>
                  {bot.status}
                </Badge>
              </Link>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-slate-100">
            <Link href="/chatbots/new">
              <Button variant="ghost" size="sm" className="w-full justify-center text-indigo-600">
                <Plus className="h-4 w-4" />
                Add chatbot
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
