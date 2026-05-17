import type { WidgetConfig } from '../api.js';

const CLOSE_SVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  </svg>
`;

const AVATAR_SVG = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.25 2 11.5c0 2.185.78 4.196 2.07 5.774L2.5 21.5l4.583-1.49A10.12 10.12 0 0 0 12 21c5.523 0 10-4.25 10-9.5S17.523 2 12 2Z"
      fill="currentColor"/>
    <path d="M8 10.5h8M8 14h5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const SEND_SVG = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

export interface PanelElements {
  panel: HTMLElement;
  messagesContainer: HTMLElement;
  input: HTMLTextAreaElement;
  sendBtn: HTMLButtonElement;
}

export function createPanel(
  config: WidgetConfig,
  onClose: () => void,
  onSend: (text: string) => void,
): PanelElements {
  const panel = document.createElement('div');
  panel.className = `cbx-panel${config.position === 'bottom-left' ? ' cbx-panel--left' : ''}`;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `${config.name} chat`);
  panel.setAttribute('aria-modal', 'true');

  // Header
  const header = document.createElement('div');
  header.className = 'cbx-header';
  header.innerHTML = `
    <div class="cbx-header__avatar">${AVATAR_SVG}</div>
    <div class="cbx-header__info">
      <div class="cbx-header__name">${escapeHtml(config.name)}</div>
      <div class="cbx-header__status">
        <span class="cbx-header__status-dot"></span>
        Online
      </div>
    </div>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'cbx-header__close';
  closeBtn.setAttribute('aria-label', 'Close chat');
  closeBtn.innerHTML = CLOSE_SVG;
  closeBtn.addEventListener('click', onClose);
  header.appendChild(closeBtn);

  // Messages container
  const messagesContainer = document.createElement('div');
  messagesContainer.className = 'cbx-messages';
  messagesContainer.setAttribute('aria-live', 'polite');
  messagesContainer.setAttribute('aria-label', 'Chat messages');

  // Input area
  const inputArea = document.createElement('div');
  inputArea.className = 'cbx-input-area';

  const input = document.createElement('textarea');
  input.className = 'cbx-input';
  input.placeholder = config.placeholder;
  input.setAttribute('aria-label', 'Message input');
  input.rows = 1;

  const sendBtn = document.createElement('button');
  sendBtn.className = 'cbx-send-btn';
  sendBtn.setAttribute('aria-label', 'Send message');
  sendBtn.innerHTML = SEND_SVG;
  sendBtn.disabled = true;

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    sendBtn.disabled = input.value.trim().length === 0;
  });

  // Send on Enter (Shift+Enter for newline)
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (text && !sendBtn.disabled) {
        onSend(text);
        input.value = '';
        input.style.height = 'auto';
        sendBtn.disabled = true;
      }
    }
  });

  sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (text && !sendBtn.disabled) {
      onSend(text);
      input.value = '';
      input.style.height = 'auto';
      sendBtn.disabled = true;
    }
  });

  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);

  // Powered by
  const powered = document.createElement('div');
  powered.className = 'cbx-powered';
  powered.innerHTML = `Powered by <a href="https://chatbot-x.com" target="_blank" rel="noopener">Chatbot-X</a>`;

  panel.appendChild(header);
  panel.appendChild(messagesContainer);
  panel.appendChild(inputArea);
  panel.appendChild(powered);

  return { panel, messagesContainer, input, sendBtn };
}

export function createTypingIndicator(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'cbx-typing';
  el.setAttribute('aria-label', 'Typing...');
  el.innerHTML = `
    <div class="cbx-typing__dot"></div>
    <div class="cbx-typing__dot"></div>
    <div class="cbx-typing__dot"></div>
  `;
  return el;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
