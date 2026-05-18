import { useQuery } from '@tanstack/react-query';
import { analyticsApi, dashboardApi } from '@/lib/api';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await dashboardApi.getMetrics();
      return res.data.data;
    },
  });
}

export function useAnalytics(period = '30d', chatbotId?: string) {
  return useQuery({
    queryKey: ['analytics', period, chatbotId],
    queryFn: async () => {
      const res = await analyticsApi.getOverview(period, chatbotId);
      return res.data.data;
    },
  });
}

export function useConversations(chatbotId?: string, page = 1, status?: string) {
  return useQuery({
    queryKey: ['conversations', chatbotId, page, status],
    queryFn: async () => {
      const res = await analyticsApi.getConversations(chatbotId, page, 20, status);
      return res.data;
    },
  });
}

export function useTopQuestions(period = '30d', chatbotId?: string) {
  return useQuery({
    queryKey: ['top-questions', period, chatbotId],
    queryFn: async () => {
      const res = await analyticsApi.getTopQuestions(period, chatbotId);
      return res.data.data;
    },
  });
}
