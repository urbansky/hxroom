import { z } from 'zod';

/** Höchstlänge des Namens eines Kontos – dieselbe wie bei Klientennamen. */
export const USER_NAME_MAX_LENGTH = 160;

/**
 * Der Name des Kontos, wie er bei der Registrierung und unter Einstellungen → Account
 * eingegeben wird. Er steht im Benutzermenü, in der Begrüßung und in den Mails an den Coach.
 */
export const userNameSchema = z
  .string()
  .trim()
  .min(2, 'Name muss mindestens 2 Zeichen haben')
  .max(USER_NAME_MAX_LENGTH, `Name darf höchstens ${USER_NAME_MAX_LENGTH} Zeichen haben`);
