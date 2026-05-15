import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailAddress {
  email: string;
  name?: string;
}

export interface SendMailOptions {
  to: MailAddress | MailAddress[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  params?: Record<string, unknown>;
  sender?: MailAddress;
  replyTo?: MailAddress;
  cc?: MailAddress[];
  bcc?: MailAddress[];
  tags?: string[];
}

/**
 * Versendet Transaktionsmails über Brevos `POST /smtp/email`.
 * Default-Absender kommt aus BREVO_SENDER_EMAIL / BREVO_SENDER_NAME und kann pro Aufruf
 * über `options.sender` überschrieben werden.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiUrl = 'https://api.brevo.com/v3';

  constructor(private readonly config: ConfigService) {}

  async send(options: SendMailOptions): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    const sender: MailAddress = options.sender ?? {
      email: this.config.getOrThrow<string>('BREVO_SENDER_EMAIL'),
      name: this.config.get<string>('BREVO_SENDER_NAME') ?? undefined,
    };

    const payload: Record<string, unknown> = {
      sender,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    };
    if (options.htmlContent) payload.htmlContent = options.htmlContent;
    if (options.textContent) payload.textContent = options.textContent;
    if (options.templateId !== undefined) payload.templateId = options.templateId;
    if (options.params) payload.params = options.params;
    if (options.replyTo) payload.replyTo = options.replyTo;
    if (options.cc) payload.cc = options.cc;
    if (options.bcc) payload.bcc = options.bcc;
    if (options.tags) payload.tags = options.tags;

    const response = await fetch(`${this.apiUrl}/smtp/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      // Keine personenbezogenen Daten loggen – nur Status + Brevo-Fehlertext
      this.logger.error(`Brevo mail send failed: ${response.status} ${body.slice(0, 200)}`);
      throw new InternalServerErrorException('E-Mail-Versand fehlgeschlagen.');
    }
  }
}
