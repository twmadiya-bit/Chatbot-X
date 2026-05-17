import { useQuery } from '@tanstack/react-query';
import { analyticsApi, dashboardApi, getTenantId } from '@/lib/api';
import { format, subDays } from 'date-fns';

export function useDashboardMetrics() {
  const tenantId = getTenantId() ?? '';

  return useQuery({
    queryKey: ['dashboard-metrics', tenantId],
    queryFn: async () => {
      const res = await dashboardApi.getMetrics(tenantId);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useAnalytics(from?: string, to?: string) {
  const tenantId = getTenantId() ?? '';
  const defaultFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const defaultTo = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['analytics', tenantId, from ?? defaultFrom, to ?? defaultTo],
    queryFn: async () => {
      const res = await analyticsApi.getOverview(tenantId, from ?? defaultFrom, to ?? defaultTo);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useConversations(chatbotId?: string, page = 1) {
  const tenantId = getTenantId() ?? '';

  return useQuery({
    queryKey: ['conversations', tenantId, chatbotId, page],
    queryFn: async () => {
      const res = await analyticsApi.getConversations(tenantId, chatbotId, page);
      return res.data;
    },
    enabled: !!tenantId,
  });
}

export function useTopQuestions(from?: string, to?: string) {
  const tenantId = getTenantId() ?? '';
  const defaultFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const defaultTo = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['top-questions', tenantId, from ?? defaultFrom, to ?? defaultTo],
    queryFn: async () => {
      const res = await analyticsApi.getTopQuestions(tenantId, from ?? defaultFrom, to ?? defaultTo);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}
