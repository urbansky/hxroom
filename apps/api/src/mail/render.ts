import { render } from 'react-email';
import type { ReactElement } from 'react';

export function renderEmail(element: ReactElement): Promise<string> {
  return render(element);
}
