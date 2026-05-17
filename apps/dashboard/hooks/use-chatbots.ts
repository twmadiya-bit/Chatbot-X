import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatbotsApi, getTenantId, type Chatbot, type CreateChatbotPayload } from '@/lib/api';

export function useChatbots() {
  const tenantId = getTenantId() ?? '';

  return useQuery({
    queryKey: ['chatbots', tenantId],
    queryFn: async () => {
      const res = await chatbotsApi.list(tenantId);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useChatbot(chatbotId: string) {
  const tenantId = getTenantId() ?? '';

  return useQuery({
    queryKey: ['chatbot', tenantId, chatbotId],
    queryFn: async () => {
      const res = await chatbotsApi.get(tenantId, chatbotId);
      return res.data.data;
    },
    enabled: !!tenantId && !!chatbotId,
  });
}

export function useCreateChatbot() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId() ?? '';

  return useMutation({
    mutationFn: (payload: CreateChatbotPayload) =>
      chatbotsApi.create(tenantId, payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots', tenantId] });
    },
  });
}

export function useUpdateChatbot(chatbotId: string) {
  const queryClient = useQueryClient();
  const tenantId = getTenantId() ?? '';

  return useMutation({
    mutationFn: (payload: Partial<Chatbot>) =>
      chatbotsApi.update(tenantId, chatbotId, payload).then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['chatbot', tenantId, chatbotId], updated);
      queryClient.invalidateQueries({ queryKey: ['chatbots', tenantId] });
    },
  });
}

export function useDeleteChatbot() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId() ?? '';

  return useMutation({
    mutationFn: (chatbotId: string) => chatbotsApi.delete(tenantId, chatbotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots', tenantId] });
    },
  });
}
