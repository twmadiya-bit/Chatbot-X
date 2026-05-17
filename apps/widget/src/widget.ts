import { ApiClient, type WidgetConfig } from './api.js';
import { ChatSession } from './chat.js';
import { getStyles } from './ui/styles.js';
import { createLauncher, setLauncherOpen } from './ui/launcher.js';
import { createPanel } from './ui/panel.js';
import { createMessage } from './ui/message.js';

export class ChatbotWidget {
  private api: ApiClient;
  private config: WidgetConfig | null = null;
  private isOpen = false;
  private launcher: HTMLButtonElement | null = null;
  private panel: HTMLElement | null = null;
  private chat: ChatSession | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly shadowRoot: ShadowRoot,
    private readonly apiBaseUrl: string,
  ) {
    this.api = new ApiClient(apiKey, apiBaseUrl);
  }

  async init(): Promise<void> {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getStyles();
    this.shadowRoot.appendChild(styleEl);

    // Fetch config (with graceful fallback)
    this.config = await this.api.fetchConfig();

    // Apply branding CSS variables
    this.applyBranding(this.config);

    // Build UI
    this.buildUI(this.config);
  }

  private applyBranding(config: WidgetConfig): void {
    const host = this.shadowRoot.host as HTMLElement;
    host.style.setProperty('--cbx-primary', config.primaryColor);
    host.style.setProperty('--cbx-bg', config.backgroundColor);
    host.style.setProperty('--cbx-text', config.textColor);
    host.style.setProperty('--cbx-user-bubble', config.primaryColor);

    // Derive a hover shade (slightly darker)
    host.style.setProperty('--cbx-primary-hover', darkenColor(config.primaryColor, 15));
    host.style.setProperty(
      '--cbx-launcher-shadow',
      `0 4px 20px ${hexToRgba(config.primaryColor, 0.4)}`,
    );
  }

  private buildUI(config: WidgetConfig): void {
    // Create launcher
    this.launcher = createLauncher(config, () => this.toggle());
    this.launcher.setAttribute('data-text', config.launcherText);
    this.shadowRoot.appendChild(this.launcher);

    // Create panel
    const { panel, messagesContainer, input, sendBtn } = createPanel(
      config,
      () => this.close(),
      (text) => {
        if (this.chat) {
          sendBtn.disabled = true;
          input.disabled = true;
          this.chat.sendMessage(text).finally(() => {
            input.disabled = false;
            input.focus();
          });
        }
      },
    );
    this.panel = panel;
    this.shadowRoot.appendChild(panel);

    // Initialize chat session
    this.chat = new ChatSession(
      this.api,
      config.chatbotId,
      messagesContainer,
      (active) => {
        sendBtn.disabled = active;
        if (!active) input.disabled = false;
      },
    );

    // Show welcome message
    if (config.welcomeMessage) {
      const { wrapper } = createMessage('bot', config.welcomeMessage);
      messagesContainer.appendChild(wrapper);
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    if (this.panel) {
      this.panel.classList.add('cbx-panel--open');
      // Focus input when panel opens
      const input = this.panel.querySelector<HTMLTextAreaElement>('.cbx-input');
      requestAnimationFrame(() => input?.focus());
    }
    if (this.launcher) setLauncherOpen(this.launcher, true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.panel) this.panel.classList.remove('cbx-panel--open');
    if (this.launcher) setLauncherOpen(this.launcher, false);
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function darkenColor(hex: string, amount: number): string {
  const parsed = parseHex(hex);
  if (!parsed) return hex;
  const [r, g, b] = parsed.map((c) => Math.max(0, c - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const parsed = parseHex(hex);
  if (!parsed) return `rgba(99,102,241,${alpha})`;
  return `rgba(${parsed[0]}, ${parsed[1]}, ${parsed[2]}, ${alpha})`;
}

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}
