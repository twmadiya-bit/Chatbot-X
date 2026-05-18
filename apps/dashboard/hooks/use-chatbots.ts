import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatbotsApi, type Chatbot, type CreateChatbotPayload } from '@/lib/api';

export function useChatbots() {
  return useQuery({
    queryKey: ['chatbots'],
    queryFn: async () => {
      const res = await chatbotsApi.list();
      return res.data.data;
    },
  });
}

export function useChatbot(chatbotId: string) {
  return useQuery({
    queryKey: ['chatbot', chatbotId],
    queryFn: async () => {
      const res = await chatbotsApi.get(chatbotId);
      return res.data.data;
    },
    enabled: !!chatbotId,
  });
}

export function useCreateChatbot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateChatbotPayload) =>
      chatbotsApi.create(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });
}

export function useUpdateChatbot(chatbotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Chatbot>) =>
      chatbotsApi.update(chatbotId, payload).then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['chatbot', chatbotId], updated);
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });
}

export function useDeleteChatbot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatbotId: string) => chatbotsApi.delete(chatbotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });
}
