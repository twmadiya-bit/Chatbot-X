import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly apiKey: string;
  private readonly fromAddress = 'Chatbot-X <noreply@chatbot-x.io>';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.resendApiKey') ?? '';
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`Resend API key not configured, skipping email to ${params.to}: "${params.subject}"`);
      return;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Resend email failed (${res.status}): ${body}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${params.to}`, err);
    }
  }

  async sendBillingInvoice(to: string, amount: number, period: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Your Chatbot-X invoice for ${period}`,
      html: `
        <h2>Your monthly invoice is ready</h2>
        <p>Total AI usage billed: <strong>$${amount.toFixed(2)}</strong></p>
        <p>Billing period: ${period}</p>
        <p>Log in to your dashboard to view the full breakdown and download your invoice.</p>
        <a href="https://app.chatbot-x.io/billing" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">View Invoice</a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">You're receiving this because you have billing notifications enabled. Manage preferences in Settings.</p>
      `,
      text: `Your Chatbot-X invoice for ${period}\n\nTotal AI usage billed: $${amount.toFixed(2)}\n\nLog in at https://app.chatbot-x.io/billing`,
    });
  }

  async sendHandoffAlert(to: string, chatbotName: string, conversationId: string, endUserId: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Human handoff requested — ${chatbotName}`,
      html: `
        <h2>A customer needs human support</h2>
        <p>Chatbot: <strong>${chatbotName}</strong></p>
        <p>User: ${endUserId}</p>
        <p>The AI has escalated this conversation and a human agent is needed.</p>
        <a href="https://app.chatbot-x.io/conversations/${conversationId}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">View Conversation</a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">Manage alert preferences in Settings → Email Notifications.</p>
      `,
      text: `Human handoff requested for ${chatbotName}. View conversation: https://app.chatbot-x.io/conversations/${conversationId}`,
    });
  }

  async sendSentimentAlert(to: string, chatbotName: string, conversationId: string, sentimentScore: number): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Frustrated customer detected — ${chatbotName}`,
      html: `
        <h2>Negative sentiment alert</h2>
        <p>Chatbot: <strong>${chatbotName}</strong></p>
        <p>Sentiment score: <strong style="color:#ef4444;">${sentimentScore.toFixed(2)}</strong> (strongly negative)</p>
        <p>A customer appears to be frustrated. Consider reviewing this conversation.</p>
        <a href="https://app.chatbot-x.io/conversations/${conversationId}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">View Conversation</a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">Manage alert preferences in Settings → Email Notifications.</p>
      `,
      text: `Negative sentiment alert for ${chatbotName} (score: ${sentimentScore.toFixed(2)}). View: https://app.chatbot-x.io/conversations/${conversationId}`,
    });
  }

  async sendUsageReport(to: string, period: string, messages: number, tokensUsed: number, billedUsd: number): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Your Chatbot-X usage report — ${period}`,
      html: `
        <h2>Monthly Usage Report</h2>
        <p>Period: <strong>${period}</strong></p>
        <table style="border-collapse:collapse;width:100%;max-width:400px;">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#374151;">Total Messages</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${messages.toLocaleString()}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#374151;">Tokens Used</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${tokensUsed.toLocaleString()}</td></tr>
          <tr><td style="padding:8px;color:#374151;">AI Cost Billed</td><td style="padding:8px;font-weight:600;color:#6366f1;">$${billedUsd.toFixed(2)}</td></tr>
        </table>
        <a href="https://app.chatbot-x.io/billing" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">View Full Report</a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">Manage report preferences in Settings → Email Notifications.</p>
      `,
      text: `Usage report for ${period}: ${messages.toLocaleString()} messages, ${tokensUsed.toLocaleString()} tokens, $${billedUsd.toFixed(2)} billed.`,
    });
  }
}
