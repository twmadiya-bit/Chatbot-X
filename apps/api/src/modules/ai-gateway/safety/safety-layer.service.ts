import { Injectable, Logger } from '@nestjs/common';
import type { ChatRequest } from '@chatbot-x/shared';
import { SENTIMENT_ESCALATION_THRESHOLD } from '@chatbot-x/shared';

export interface SafetyCheckResult {
  passed: boolean;
  flagged: string[];
  shouldEscalate: boolean;
  sanitizedInput?: string;
}

const JAILBREAK_PATTERNS = [
  /ignore (previous|all|your) instructions/i,
  /you are now (a|an) (different|new|unrestricted)/i,
  /pretend you (have no|don't have|are without) (restrictions|guidelines)/i,
  /developer mode/i,
  /act as (dan|dude|aim|evil)/i,
  /prompt injection/i,
];

const PII_PATTERNS = [
  { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD-REDACTED]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN-REDACTED]' },
];

@Injectable()
export class SafetyLayerService {
  private readonly logger = new Logger(SafetyLayerService.name);

  checkInput(input: string, chatbotConfig?: { scopeKeywords?: string[] }): SafetyCheckResult {
    const flagged: string[] = [];
    let sanitizedInput = input;

    for (const pattern of JAILBREAK_PATTERNS) {
      if (pattern.test(input)) {
        flagged.push('jailbreak_attempt');
        this.logger.warn(`Jailbreak attempt detected: ${input.substring(0, 100)}`);
        break;
      }
    }

    for (const { pattern, replacement } of PII_PATTERNS) {
      sanitizedInput = sanitizedInput.replace(pattern, replacement);
    }

    const passed = !flagged.includes('jailbreak_attempt');

    return { passed, flagged, shouldEscalate: false, sanitizedInput };
  }

  async filterResponse(content: string, request: ChatRequest): Promise<string> {
    return content;
  }

  redactPii(text: string): string {
    let redacted = text;
    for (const { pattern, replacement } of PII_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
  }

  analyzeSentiment(messages: Array<{ role: string; content: string }>): number {
    const userMessages = messages
      .filter((m) => m.role === 'user')
      .slice(-5)
      .map((m) => m.content.toLowerCase());

    const negativeIndicators = [
      'frustrated', 'angry', 'terrible', 'awful', 'useless', 'broken',
      'worst', 'hate', 'disgusting', 'unacceptable', 'ridiculous', '!!!',
    ];

    const positiveIndicators = [
      'thanks', 'thank you', 'great', 'perfect', 'excellent', 'helpful',
      'wonderful', 'amazing', 'love', 'appreciate',
    ];

    let score = 0;
    for (const msg of userMessages) {
      for (const neg of negativeIndicators) {
        if (msg.includes(neg)) score -= 0.2;
      }
      for (const pos of positiveIndicators) {
        if (msg.includes(pos)) score += 0.1;
      }
    }

    return Math.max(-1, Math.min(1, score));
  }

  shouldEscalate(
    sentimentScore: number,
    confidenceScore: number,
    unansweredTurns: number,
    thresholds: { sentiment: number; confidence: number; maxUnanswered: number },
  ): boolean {
    return (
      sentimentScore < thresholds.sentiment ||
      confidenceScore < thresholds.confidence ||
      unansweredTurns >= thresholds.maxUnanswered
    );
  }
}
