const VISITOR_KEY = 'cbx_visitor_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

export function getConversationId(chatbotId: string): string | null {
  try {
    return sessionStorage.getItem(`cbx_conv_${chatbotId}`);
  } catch {
    return null;
  }
}

export function setConversationId(chatbotId: string, id: string): void {
  try {
    sessionStorage.setItem(`cbx_conv_${chatbotId}`, id);
  } catch {
    // storage unavailable, continue without persistence
  }
}

export function clearConversation(chatbotId: string): void {
  try {
    sessionStorage.removeItem(`cbx_conv_${chatbotId}`);
  } catch {
    // storage unavailable
  }
}
