import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscribeDto } from '@hxroom/shared';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly apiUrl = 'https://api.brevo.com/v3';

  constructor(private readonly config: ConfigService) {}

  async subscribe(dto: SubscribeDto, ipAddress: string): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    const listId = Number(this.config.getOrThrow<string>('BREVO_LIST_ID'));
    const templateId = Number(this.config.getOrThrow<string>('BREVO_DOI_TEMPLATE_ID'));
    const redirectUrl = this.config.getOrThrow<string>('BREVO_REDIRECT_URL');

    const [firstName = '', ...rest] = (dto.name ?? '').split(' ');
    const lastName = rest.join(' ');

    const response = await fetch(`${this.apiUrl}/contacts/doubleOptinConfirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: dto.email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          SOURCE: dto.source,
          SIGNUP_IP: ipAddress,
          SIGNUP_AT: new Date().toISOString(),
        },
        includeListIds: [listId],
        templateId,
        redirectionUrl: redirectUrl,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      // Keine personenbezogenen Daten loggen – nur Status
      this.logger.error(`Brevo DOI failed: ${response.status} ${body.slice(0, 120)}`);
      throw new BadRequestException('Anmeldung fehlgeschlagen, bitte später erneut versuchen.');
    }
    // 201 = neue Anmeldung, 204 = bereits bestätigt → in beiden Fällen UI = Erfolg
  }
}
