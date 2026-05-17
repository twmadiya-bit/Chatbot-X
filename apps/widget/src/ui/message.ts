export function createMessage(
  role: 'user' | 'bot',
  content: string,
): { wrapper: HTMLElement; bubble: HTMLElement } {
  const wrapper = document.createElement('div');
  wrapper.className = `cbx-message cbx-message--${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'cbx-message__bubble';
  bubble.innerHTML = renderContent(content);

  const time = document.createElement('div');
  time.className = 'cbx-message__time';
  time.textContent = formatTime(new Date());
  time.setAttribute('aria-label', `Sent at ${formatTime(new Date())}`);

  wrapper.appendChild(bubble);
  wrapper.appendChild(time);

  return { wrapper, bubble };
}

export function appendToMessage(bubble: HTMLElement, chunk: string): void {
  // We accumulate raw text and re-render to preserve markdown correctness
  const raw = bubble.getAttribute('data-raw') ?? '';
  const updated = raw + chunk;
  bubble.setAttribute('data-raw', updated);
  bubble.innerHTML = renderContent(updated);
}

function renderContent(text: string): string {
  if (!text) return '';

  // Escape HTML first (except we'll add back our own tags)
  let html = escapeHtml(text);

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.07);padding:1px 5px;border-radius:4px;font-size:0.9em">$1</code>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
