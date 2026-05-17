export function getStyles(): string {
  return `
    :host {
      --cbx-primary: #6366f1;
      --cbx-primary-hover: #4f46e5;
      --cbx-primary-text: #ffffff;
      --cbx-bg: #ffffff;
      --cbx-text: #111827;
      --cbx-text-muted: #6b7280;
      --cbx-border: #e5e7eb;
      --cbx-user-bubble: #6366f1;
      --cbx-user-bubble-text: #ffffff;
      --cbx-bot-bubble: #f3f4f6;
      --cbx-bot-bubble-text: #111827;
      --cbx-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1);
      --cbx-launcher-shadow: 0 4px 20px rgba(99,102,241,0.4);
      --cbx-radius: 16px;
      --cbx-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      all: initial;
      display: block;
      font-family: var(--cbx-font);
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .cbx-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--cbx-primary);
      color: var(--cbx-primary-text);
      border: none;
      border-radius: 50px;
      padding: 14px 20px 14px 16px;
      cursor: pointer;
      font-family: var(--cbx-font);
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      box-shadow: var(--cbx-launcher-shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      outline: none;
      user-select: none;
      white-space: nowrap;
    }

    .cbx-launcher:hover {
      background: var(--cbx-primary-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(99,102,241,0.5);
    }

    .cbx-launcher:active {
      transform: translateY(0);
    }

    .cbx-launcher--left {
      right: auto;
      left: 24px;
    }

    .cbx-launcher__icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .cbx-launcher__text {
      transition: opacity 0.2s ease, max-width 0.3s ease;
      max-width: 200px;
      overflow: hidden;
    }

    .cbx-launcher--open .cbx-launcher__text {
      max-width: 0;
      opacity: 0;
      padding: 0;
    }

    .cbx-launcher--icon-only {
      padding: 14px;
    }

    .cbx-panel {
      position: fixed;
      bottom: 88px;
      right: 24px;
      z-index: 2147483646;
      width: 380px;
      height: 580px;
      max-height: calc(100vh - 120px);
      max-width: calc(100vw - 32px);
      background: var(--cbx-bg);
      border-radius: var(--cbx-radius);
      box-shadow: var(--cbx-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform-origin: bottom right;
      transform: scale(0.85) translateY(20px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.2s ease;
      font-family: var(--cbx-font);
    }

    .cbx-panel--left {
      right: auto;
      left: 24px;
      transform-origin: bottom left;
    }

    .cbx-panel--open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    .cbx-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--cbx-primary);
      color: var(--cbx-primary-text);
      flex-shrink: 0;
    }

    .cbx-header__avatar {
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cbx-header__info {
      flex: 1;
      min-width: 0;
    }

    .cbx-header__name {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cbx-header__status {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .cbx-header__status-dot {
      width: 7px;
      height: 7px;
      background: #4ade80;
      border-radius: 50%;
      display: inline-block;
    }

    .cbx-header__close {
      background: rgba(255,255,255,0.15);
      border: none;
      color: var(--cbx-primary-text);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s ease;
      outline: none;
    }

    .cbx-header__close:hover {
      background: rgba(255,255,255,0.25);
    }

    .cbx-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    .cbx-messages::-webkit-scrollbar {
      width: 4px;
    }

    .cbx-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .cbx-messages::-webkit-scrollbar-thumb {
      background: var(--cbx-border);
      border-radius: 2px;
    }

    .cbx-message {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      animation: cbx-fade-in 0.2s ease forwards;
    }

    @keyframes cbx-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .cbx-message--user {
      align-self: flex-end;
      align-items: flex-end;
    }

    .cbx-message--bot {
      align-self: flex-start;
      align-items: flex-start;
    }

    .cbx-message__bubble {
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.55;
      word-break: break-word;
    }

    .cbx-message--user .cbx-message__bubble {
      background: var(--cbx-user-bubble);
      color: var(--cbx-user-bubble-text);
      border-bottom-right-radius: 4px;
    }

    .cbx-message--bot .cbx-message__bubble {
      background: var(--cbx-bot-bubble);
      color: var(--cbx-bot-bubble-text);
      border-bottom-left-radius: 4px;
    }

    .cbx-message__bubble strong {
      font-weight: 700;
    }

    .cbx-message__time {
      font-size: 11px;
      color: var(--cbx-text-muted);
      margin-top: 4px;
      padding: 0 4px;
    }

    .cbx-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 14px;
      background: var(--cbx-bot-bubble);
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      animation: cbx-fade-in 0.2s ease forwards;
    }

    .cbx-typing__dot {
      width: 7px;
      height: 7px;
      background: var(--cbx-text-muted);
      border-radius: 50%;
      animation: cbx-bounce 1.3s ease-in-out infinite;
    }

    .cbx-typing__dot:nth-child(2) {
      animation-delay: 0.15s;
    }

    .cbx-typing__dot:nth-child(3) {
      animation-delay: 0.3s;
    }

    @keyframes cbx-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    .cbx-input-area {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px 16px 16px;
      border-top: 1px solid var(--cbx-border);
      background: var(--cbx-bg);
      flex-shrink: 0;
    }

    .cbx-input {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      padding: 10px 14px;
      border: 1.5px solid var(--cbx-border);
      border-radius: 22px;
      font-family: var(--cbx-font);
      font-size: 14px;
      color: var(--cbx-text);
      background: var(--cbx-bg);
      outline: none;
      resize: none;
      line-height: 1.4;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      overflow-y: auto;
    }

    .cbx-input::placeholder {
      color: var(--cbx-text-muted);
    }

    .cbx-input:focus {
      border-color: var(--cbx-primary);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }

    .cbx-send-btn {
      width: 40px;
      height: 40px;
      background: var(--cbx-primary);
      color: var(--cbx-primary-text);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
      outline: none;
    }

    .cbx-send-btn:hover:not(:disabled) {
      background: var(--cbx-primary-hover);
      transform: scale(1.05);
    }

    .cbx-send-btn:active:not(:disabled) {
      transform: scale(0.95);
    }

    .cbx-send-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .cbx-powered {
      text-align: center;
      padding: 6px 0 10px;
      font-size: 11px;
      color: var(--cbx-text-muted);
    }

    .cbx-powered a {
      color: var(--cbx-primary);
      text-decoration: none;
    }

    .cbx-powered a:hover {
      text-decoration: underline;
    }

    .cbx-error-msg {
      font-size: 13px;
      color: #ef4444;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 8px 12px;
      align-self: center;
      text-align: center;
      animation: cbx-fade-in 0.2s ease forwards;
    }
  `;
}
