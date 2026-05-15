import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Validiert Request-Bodies gegen ein Zod-Schema.
 *
 * Bei Fehlschlag wird **nicht** die rohe Zod-Error-Struktur an den Client geleakt
 * (würde interne Validierungsdetails preisgeben), sondern eine reduzierte Form:
 *   {
 *     statusCode: 400,
 *     message: 'Validierung fehlgeschlagen',
 *     errors: [{ path: 'email', message: 'Ungültige E-Mail-Adresse' }, …]
 *   }
 *
 * Hinweis Fehlertexte: die `message`-Felder kommen direkt aus den Zod-Schemas
 * (`packages/shared`); dort müssen sie weiterhin deutschsprachig formuliert sein
 * (siehe Konvention in CLAUDE.md).
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validierung fehlgeschlagen',
        errors,
      });
    }
    return result.data;
  }
}
