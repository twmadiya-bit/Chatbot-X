import type { ApiClient } from './api.js';
import { getVisitorId, getConversationId, setConversationId } from './storage.js';
import { createMessage, appendToMessage } from './ui/message.js';
import { createTypingIndicator } from './ui/panel.js';

export class ChatSession {
  private visitorId: string;
  private conversationId: string | null;
  private chatbotId: string;
  private sending = false;

  constructor(
    private readonly api: ApiClient,
    private readonly chatbotId_: string,
    private readonly messagesContainer: HTMLElement,
    private readonly onTyping: (active: boolean) => void,
  ) {
    this.chatbotId = chatbotId_;
    this.visitorId = getVisitorId();
    this.conversationId = getConversationId(this.chatbotId);
  }

  async sendMessage(text: string): Promise<void> {
    if (this.sending) return;
    this.sending = true;
    this.onTyping(true);

    // Add user bubble
    const { wrapper: userWrapper } = createMessage('user', text);
    this.messagesContainer.appendChild(userWrapper);
    this.scrollToBottom();

    // Show typing indicator
    const typingEl = createTypingIndicator();
    this.messagesContainer.appendChild(typingEl);
    this.scrollToBottom();

    // Create bot bubble (hidden until first chunk)
    const { wrapper: botWrapper, bubble: botBubble } = createMessage('bot', '');
    botBubble.setAttribute('data-raw', '');

    try {
      // Ensure we have a conversationId
      if (!this.conversationId) {
        try {
          this.conversationId = await this.api.createConversation(this.visitorId);
          setConversationId(this.chatbotId, this.conversationId);
        } catch {
          // Continue without pre-created conversation; server may create one on first message
        }
      }

      const conversationId = this.conversationId ?? '';
      let firstChunk = true;
      let hasError = false;

      for await (const chunk of this.api.streamMessage(
        this.visitorId,
        conversationId,
        text,
      )) {
        if (chunk.type === 'text' && chunk.content !== undefined) {
          if (firstChunk) {
            // Replace typing indicator with bot bubble on first chunk
            typingEl.remove();
            this.messagesContainer.appendChild(botWrapper);
            firstChunk = false;
          }
          appendToMessage(botBubble, chunk.content);
          this.scrollToBottom();
        } else if (chunk.type === 'metadata' && chunk.conversationId) {
          this.conversationId = chunk.conversationId;
          setConversationId(this.chatbotId, this.conversationId);
        } else if (chunk.type === 'error') {
          hasError = true;
          typingEl.remove();
          this.appendError(chunk.error ?? 'Something went wrong. Please try again.');
        } else if (chunk.type === 'done') {
          break;
        }
      }

      // If we never got any text chunks, remove typing and show empty bot bubble
      if (firstChunk && !hasError) {
        typingEl.remove();
        const raw = botBubble.getAttribute('data-raw') ?? '';
        if (!raw) {
          botBubble.setAttribute('data-raw', '...');
          botBubble.textContent = '...';
        }
        this.messagesContainer.appendChild(botWrapper);
      }
    } catch (err) {
      typingEl.remove();
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      this.appendError(msg);
    } finally {
      this.sending = false;
      this.onTyping(false);
      this.scrollToBottom();
    }
  }

  private appendError(message: string): void {
    const el = document.createElement('div');
    el.className = 'cbx-error-msg';
    el.textContent = message;
    this.messagesContainer.appendChild(el);
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }
}
