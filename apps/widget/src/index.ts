import { ChatbotWidget } from './widget.js';

(function bootstrap() {
  // Find the script tag with data-key
  const scriptEl =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-key]');

  if (!scriptEl) {
    console.error('[ChatbotX] Could not find script tag. Add data-key attribute to your script tag.');
    return;
  }

  const apiKey = scriptEl.getAttribute('data-key');
  if (!apiKey) {
    console.error('[ChatbotX] Missing data-key attribute on script tag.');
    return;
  }

  const apiBaseUrl =
    scriptEl.getAttribute('data-api-url') ?? 'https://api.chatbot-x.com';

  function mount(): void {
    // Create shadow host — fixed, zero-size, overflow visible so the widget floats freely
    const host = document.createElement('div');
    host.id = 'chatbot-x-root';
    host.style.cssText =
      'position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none;';
    document.body.appendChild(host);

    // Attach Shadow DOM for CSS isolation
    const shadowRoot = host.attachShadow({ mode: 'open' });

    // Instantiate and initialize widget
    const widget = new ChatbotWidget(apiKey!, shadowRoot, apiBaseUrl);
    widget.init().catch((err: unknown) => {
      console.error('[ChatbotX] Widget initialization failed:', err);
    });

    // Expose widget API on global for advanced use
    (window as Window & { ChatbotX?: { widget: ChatbotWidget } }).ChatbotX = { widget };
  }

  // Mount after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
