import type { WidgetConfig } from '../api.js';

const CHAT_ICON_SVG = `
  <svg class="cbx-launcher__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.25 2 11.5c0 2.185.78 4.196 2.07 5.774L2.5 21.5l4.583-1.49A10.12 10.12 0 0 0 12 21c5.523 0 10-4.25 10-9.5S17.523 2 12 2Z"
      fill="currentColor" fill-opacity="0.2"/>
    <path d="M12 2C6.477 2 2 6.25 2 11.5c0 2.185.78 4.196 2.07 5.774L2.5 21.5l4.583-1.49A10.12 10.12 0 0 0 12 21c5.523 0 10-4.25 10-9.5S17.523 2 12 2Z"
      stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 10.5h8M8 14h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const CLOSE_ICON_SVG = `
  <svg class="cbx-launcher__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

export function createLauncher(
  config: WidgetConfig,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `cbx-launcher${config.position === 'bottom-left' ? ' cbx-launcher--left' : ''}`;
  btn.setAttribute('aria-label', `Open ${config.name} chat`);
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = `
    ${CHAT_ICON_SVG}
    <span class="cbx-launcher__text">${escapeHtml(config.launcherText)}</span>
  `;

  btn.addEventListener('click', onClick);

  // Store close icon for toggling
  (btn as HTMLButtonElement & { _chatIcon: string; _closeIcon: string })._chatIcon = CHAT_ICON_SVG;
  (btn as HTMLButtonElement & { _chatIcon: string; _closeIcon: string })._closeIcon = CLOSE_ICON_SVG;

  return btn;
}

export function setLauncherOpen(btn: HTMLButtonElement, open: boolean): void {
  const b = btn as HTMLButtonElement & { _chatIcon: string; _closeIcon: string };
  if (open) {
    btn.classList.add('cbx-launcher--open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close chat');
    const iconEl = btn.querySelector('.cbx-launcher__icon')?.parentElement;
    btn.innerHTML = `${b._closeIcon}<span class="cbx-launcher__text"></span>`;
  } else {
    btn.classList.remove('cbx-launcher--open');
    btn.setAttribute('aria-expanded', 'false');
    const textContent = btn.getAttribute('data-text') ?? '';
    btn.innerHTML = `${b._chatIcon}<span class="cbx-launcher__text">${escapeHtml(textContent)}</span>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
