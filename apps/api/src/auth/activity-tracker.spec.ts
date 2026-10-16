import { describe, expect, it, vi } from 'vitest';
import { ACTIVITY_WRITE_INTERVAL_MS, ActivityTracker } from './activity-tracker';
import type { DrizzleDb } from '../db/db.module';

function fakeDb(result: Promise<unknown> = Promise.resolve()) {
  const where = vi.fn(() => result);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { db: { update } as unknown as DrizzleDb, update, set };
}

describe('ActivityTracker', () => {
  it('schreibt höchstens einmal pro Stunde und Coach', () => {
    const { db, update } = fakeDb();
    const tracker = new ActivityTracker(db);
    const t0 = Date.UTC(2026, 9, 16, 8, 0);

    tracker.touch('u1', null, t0);
    tracker.touch('u1', null, t0 + 10 * 60 * 1000);
    tracker.touch('u2', null, t0 + 10 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);

    tracker.touch('u1', null, t0 + ACTIVITY_WRITE_INTERVAL_MS);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it('übergeht übernommene Sitzungen des Betreibers', () => {
    const { db, update } = fakeDb();
    new ActivityTracker(db).touch('u1', 'admin-1');
    expect(update).not.toHaveBeenCalled();
  });

  it('versucht es nach einem Fehler bei der nächsten Anfrage erneut', async () => {
    const { db, update } = fakeDb(Promise.reject(new Error('db down')));
    const tracker = new ActivityTracker(db);
    const t0 = Date.UTC(2026, 9, 16, 8, 0);

    tracker.touch('u1', null, t0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    tracker.touch('u1', null, t0 + 1000);
    expect(update).toHaveBeenCalledTimes(2);
  });
});
