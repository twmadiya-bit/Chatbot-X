export interface WidgetConfig {
  chatbotId: string;
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  launcherText: string;
  launcherIcon?: string;
  position: 'bottom-right' | 'bottom-left';
  placeholder: string;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error' | 'metadata';
  content?: string;
  conversationId?: string;
  error?: string;
}

const DEFAULT_CONFIG: WidgetConfig = {
  chatbotId: 'default',
  name: 'Support',
  welcomeMessage: 'Hi! How can I help you today?',
  primaryColor: '#6366f1',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  launcherText: 'Chat with us',
  position: 'bottom-right',
  placeholder: 'Type a message...',
};

export class ApiClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async fetchConfig(): Promise<WidgetConfig> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/v1/widget/v1/config?key=${encodeURIComponent(this.apiKey)}`,
        {
          headers: {
            Origin: window.location.origin,
          },
        },
      );
      if (!res.ok) {
        console.warn(`[ChatbotX] Config fetch returned ${res.status}, using defaults`);
        return { ...DEFAULT_CONFIG };
      }
      const data = await res.json() as Partial<WidgetConfig>;
      return { ...DEFAULT_CONFIG, ...data };
    } catch {
      console.warn('[ChatbotX] Failed to fetch config, using defaults');
      return { ...DEFAULT_CONFIG };
    }
  }

  async createConversation(visitorId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/v1/widget/v1/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        Origin: window.location.origin,
      },
      body: JSON.stringify({ visitorId }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create conversation: ${res.status}`);
    }
    const data = await res.json() as { conversationId: string };
    return data.conversationId;
  }

  async sendMessage(
    visitorId: string,
    conversationId: string,
    message: string,
  ): Promise<{ reply: string; conversationId: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/widget/v1/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        Origin: window.location.origin,
      },
      body: JSON.stringify({ visitorId, conversationId, message }),
    });
    if (!res.ok) {
      throw new Error(`Failed to send message: ${res.status}`);
    }
    return res.json() as Promise<{ reply: string; conversationId: string }>;
  }

  async *streamMessage(
    visitorId: string,
    conversationId: string,
    message: string,
  ): AsyncIterable<StreamChunk> {
    const res = await fetch(`${this.baseUrl}/api/v1/widget/v1/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        Accept: 'text/event-stream',
        Origin: window.location.origin,
      },
      body: JSON.stringify({ visitorId, conversationId, message, stream: true }),
    });

    if (!res.ok) {
      yield { type: 'error', error: `Request failed: ${res.status}` };
      return;
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/event-stream')) {
      // Fallback: treat as plain JSON
      const data = await res.json() as { reply?: string; conversationId?: string };
      if (data.reply) {
        yield { type: 'text', content: data.reply };
      }
      if (data.conversationId) {
        yield { type: 'metadata', conversationId: data.conversationId };
      }
      yield { type: 'done' };
      return;
    }

    const body = res.body;
    if (!body) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') {
              yield { type: 'done' };
              return;
            }
            try {
              const chunk = JSON.parse(payload) as StreamChunk;
              yield chunk;
            } catch {
              // Raw text chunk
              yield { type: 'text', content: payload };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'done' };
  }
}
