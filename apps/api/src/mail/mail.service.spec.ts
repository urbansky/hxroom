import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MailService } from './mail.service';

/**
 * Stub-ConfigService:
 * - getOrThrow wirft, wenn der Key nicht im Map ist (verifiziert nebenbei, dass MailService die richtigen Keys liest)
 * - get gibt undefined für Unbekanntes zurück
 */
function mockConfig(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string | undefined> = {
    BREVO_API_KEY: 'test-key',
    BREVO_SENDER_EMAIL: 'noreply@hxroom.de',
    BREVO_SENDER_NAME: 'HxRoom',
    ...overrides,
  };
  return {
    getOrThrow: vi.fn((key: string) => {
      if (!(key in defaults) || defaults[key] === undefined) {
        throw new Error(`Missing required config: ${key}`);
      }
      return defaults[key];
    }),
    get: vi.fn((key: string) => defaults[key]),
  };
}

function parseSentBody(fetchSpy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
  if (!init?.body) throw new Error('fetch was not called with a body');
  return JSON.parse(init.body as string);
}

describe('MailService', () => {
  let service: MailService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  async function buildService(configOverrides: Record<string, string | undefined> = {}) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfig(configOverrides) },
      ],
    }).compile();
    return moduleRef.get(MailService);
  }

  beforeEach(async () => {
    service = await buildService();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 201 }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTP-Request-Form', () => {
    it('postet gegen /smtp/email mit API-Key-Header und JSON-Content-Type', async () => {
      await service.send({ to: { email: 'a@b.de' }, subject: 'Hi', textContent: 'Test' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'api-key': 'test-key',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('normalisiert Single-Empfänger zu einem Array', async () => {
      await service.send({ to: { email: 'a@b.de' }, subject: 'Hi' });
      expect(parseSentBody(fetchSpy).to).toEqual([{ email: 'a@b.de' }]);
    });

    it('reicht Array-Empfänger unverändert durch', async () => {
      await service.send({
        to: [{ email: 'a@b.de' }, { email: 'c@d.de', name: 'C' }],
        subject: 'Hi',
      });
      expect(parseSentBody(fetchSpy).to).toEqual([
        { email: 'a@b.de' },
        { email: 'c@d.de', name: 'C' },
      ]);
    });
  });

  describe('Sender-Handling', () => {
    it('nutzt Default-Sender aus der Config, wenn options.sender fehlt', async () => {
      await service.send({ to: { email: 'a@b.de' }, subject: 'Hi' });
      expect(parseSentBody(fetchSpy).sender).toEqual({
        email: 'noreply@hxroom.de',
        name: 'HxRoom',
      });
    });

    it('lässt den Default-Sender ohne BREVO_SENDER_NAME ohne `name`', async () => {
      service = await buildService({ BREVO_SENDER_NAME: undefined });
      await service.send({ to: { email: 'a@b.de' }, subject: 'Hi' });
      const sender = parseSentBody(fetchSpy).sender as Record<string, unknown>;
      expect(sender.email).toBe('noreply@hxroom.de');
      expect(sender).not.toHaveProperty('name');
    });

    it('lässt sich per options.sender pro Aufruf überschreiben', async () => {
      await service.send({
        to: { email: 'a@b.de' },
        subject: 'Hi',
        sender: { email: 'override@hxroom.de', name: 'Override' },
      });
      expect(parseSentBody(fetchSpy).sender).toEqual({
        email: 'override@hxroom.de',
        name: 'Override',
      });
    });
  });

  describe('Optionale Felder', () => {
    it('serialisiert htmlContent und textContent nur, wenn gesetzt', async () => {
      await service.send({ to: { email: 'a@b.de' }, subject: 'Hi' });
      const body = parseSentBody(fetchSpy);
      expect(body).not.toHaveProperty('htmlContent');
      expect(body).not.toHaveProperty('textContent');
    });

    it('reicht htmlContent und textContent durch, wenn gesetzt', async () => {
      await service.send({
        to: { email: 'a@b.de' },
        subject: 'Hi',
        htmlContent: '<p>Hi</p>',
        textContent: 'Hi',
      });
      const body = parseSentBody(fetchSpy);
      expect(body.htmlContent).toBe('<p>Hi</p>');
      expect(body.textContent).toBe('Hi');
    });

    it('serialisiert templateId + params im Template-Modus', async () => {
      await service.send({
        to: { email: 'a@b.de' },
        subject: 'Hi',
        templateId: 7,
        params: { firstName: 'Anna' },
      });
      const body = parseSentBody(fetchSpy);
      expect(body.templateId).toBe(7);
      expect(body.params).toEqual({ firstName: 'Anna' });
    });

    it('reicht replyTo, cc, bcc und tags durch', async () => {
      await service.send({
        to: { email: 'a@b.de' },
        subject: 'Hi',
        replyTo: { email: 'reply@hxroom.de' },
        cc: [{ email: 'cc@hxroom.de' }],
        bcc: [{ email: 'bcc@hxroom.de' }],
        tags: ['early-access', 'doi'],
      });
      const body = parseSentBody(fetchSpy);
      expect(body.replyTo).toEqual({ email: 'reply@hxroom.de' });
      expect(body.cc).toEqual([{ email: 'cc@hxroom.de' }]);
      expect(body.bcc).toEqual([{ email: 'bcc@hxroom.de' }]);
      expect(body.tags).toEqual(['early-access', 'doi']);
    });

    it('lässt optionale Felder weg, wenn nicht gesetzt', async () => {
      await service.send({ to: { email: 'a@b.de' }, subject: 'Hi' });
      const body = parseSentBody(fetchSpy);
      expect(body).not.toHaveProperty('cc');
      expect(body).not.toHaveProperty('bcc');
      expect(body).not.toHaveProperty('replyTo');
      expect(body).not.toHaveProperty('tags');
      expect(body).not.toHaveProperty('templateId');
      expect(body).not.toHaveProperty('params');
    });
  });

  describe('Fehler-Behandlung', () => {
    it('wirft InternalServerErrorException bei 4xx-Response', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('{"code":"invalid_parameter"}', { status: 400 }),
      );
      await expect(
        service.send({ to: { email: 'a@b.de' }, subject: 'Hi' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('wirft InternalServerErrorException bei 5xx-Response', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('boom', { status: 500 }));
      await expect(
        service.send({ to: { email: 'a@b.de' }, subject: 'Hi' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('wirft, wenn BREVO_API_KEY fehlt (getOrThrow-Sicherheitsnetz)', async () => {
      service = await buildService({ BREVO_API_KEY: undefined });
      await expect(
        service.send({ to: { email: 'a@b.de' }, subject: 'Hi' }),
      ).rejects.toThrow(/BREVO_API_KEY/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('wirft, wenn BREVO_SENDER_EMAIL fehlt und kein sender-Override gesetzt ist', async () => {
      service = await buildService({ BREVO_SENDER_EMAIL: undefined });
      await expect(
        service.send({ to: { email: 'a@b.de' }, subject: 'Hi' }),
      ).rejects.toThrow(/BREVO_SENDER_EMAIL/);
    });
  });

  describe('DSGVO – Logging-Hygiene', () => {
    it('loggt KEINE PII: weder Empfänger-Adresse noch Subject noch htmlContent', async () => {
      const errSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      fetchSpy.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

      await service
        .send({
          to: { email: 'pii@hxroom.de' },
          subject: 'Geheimes Subject',
          htmlContent: '<p>vertrauliche Daten</p>',
        })
        .catch(() => {});

      expect(errSpy).toHaveBeenCalledTimes(1);
      const logged = String(errSpy.mock.calls[0]?.[0] ?? '');
      expect(logged).not.toContain('pii@hxroom.de');
      expect(logged).not.toContain('Geheimes Subject');
      expect(logged).not.toContain('vertrauliche Daten');
      // Statuscode darf drin sein, das ist kein PII.
      expect(logged).toContain('500');
    });
  });
});
