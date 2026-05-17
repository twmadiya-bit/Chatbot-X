'use client';

import { useEffect, useRef } from 'react';

export interface ChatPreviewBranding {
  primaryColor?: string;
  backgroundColor?: string;
  botBubbleColor?: string;
  userBubbleColor?: string;
  textColor?: string;
  borderRadius?: number;
  headerTitle?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  launcherText?: string;
  position?: 'bottom-right' | 'bottom-left';
  fontFamily?: string;
}

interface ChatPreviewProps {
  branding: ChatPreviewBranding;
  chatbotId?: string;
  className?: string;
}

export function ChatPreview({ branding, chatbotId, className }: ChatPreviewProps) {
  const cdnUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL || 'http://localhost:3002';

  const {
    primaryColor = '#6366f1',
    backgroundColor = '#ffffff',
    botBubbleColor = '#f1f5f9',
    userBubbleColor = '#6366f1',
    textColor = '#0f172a',
    borderRadius = 12,
    headerTitle = 'Chat with us',
    welcomeMessage = 'Hi there! How can I help you today?',
    placeholderText = 'Type a message...',
  } = branding;

  // Build an inline HTML preview without needing an actual widget CDN
  const previewHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${branding.fontFamily ?? 'Inter, system-ui, sans-serif'};
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 12px;
  }
  .widget {
    width: 320px;
    height: 440px;
    background: ${backgroundColor};
    border-radius: ${borderRadius}px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.08);
  }
  .header {
    background: ${primaryColor};
    color: white;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .header-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .header-title {
    font-size: 14px;
    font-weight: 600;
  }
  .header-status {
    font-size: 11px;
    opacity: 0.85;
    margin-top: 1px;
  }
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: ${backgroundColor};
  }
  .bubble {
    max-width: 80%;
    padding: 8px 12px;
    border-radius: ${Math.max(borderRadius - 4, 6)}px;
    font-size: 13px;
    line-height: 1.45;
    word-break: break-word;
  }
  .bot-bubble {
    background: ${botBubbleColor};
    color: ${textColor};
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }
  .user-bubble {
    background: ${userBubbleColor};
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }
  .input-row {
    border-top: 1px solid #e2e8f0;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${backgroundColor};
  }
  .input-field {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: ${Math.max(borderRadius - 4, 6)}px;
    padding: 8px 12px;
    font-size: 12px;
    color: #94a3b8;
    background: #f8fafc;
    outline: none;
    font-family: inherit;
  }
  .send-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${primaryColor};
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  .send-btn svg { fill: white; }
</style>
</head>
<body>
<div class="widget">
  <div class="header">
    <div class="header-avatar">AI</div>
    <div>
      <div class="header-title">${headerTitle}</div>
      <div class="header-status">● Online</div>
    </div>
  </div>
  <div class="messages">
    <div class="bubble bot-bubble">${welcomeMessage}</div>
    <div class="bubble user-bubble">Hello! I have a question.</div>
    <div class="bubble bot-bubble">Of course! I'm here to help. What would you like to know?</div>
  </div>
  <div class="input-row">
    <input class="input-field" type="text" placeholder="${placeholderText}" readonly />
    <button class="send-btn">
      <svg width="14" height="14" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
</div>
</body>
</html>
  `.trim();

  const src = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`;

  return (
    <div className={className}>
      <iframe
        src={src}
        title="Widget Preview"
        className="w-full h-full border-0 rounded-lg"
        sandbox="allow-scripts"
      />
    </div>
  );
}
