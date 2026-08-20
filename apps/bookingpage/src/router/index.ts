import { createRouter, createWebHistory } from 'vue-router';

/**
 * Wartet, bis die Sprungmarke existiert und die Seitenhöhe sich nicht mehr ändert.
 *
 * Beides ist nötig, weil die Inhalte nacheinander eintreffen: die Views rendern erst nach
 * dem Coach-Fetch (App.vue), die Angebotsliste erst nach ihrem eigenen Fetch. Wer zu früh
 * misst, scrollt an eine Position, die kurz danach nicht mehr stimmt.
 */
async function waitForStableTarget(selector: string, timeoutMs = 2000): Promise<boolean> {
  // Die eigenen Schriften verschieben das Layout beim Swap – vor allem den großen
  // Serif-Hero über den Sprungmarken.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, timeoutMs))]);

  return new Promise((resolve) => {
    const start = performance.now();
    let lastHeight = -1;
    let stableFrames = 0;

    const check = () => {
      const found = document.querySelector(selector);
      const height = document.documentElement.scrollHeight;

      stableFrames = height === lastHeight ? stableFrames + 1 : 0;
      lastHeight = height;

      // Drei ruhige Frames: die Inhalte treffen nacheinander ein (Coach, dann Angebote),
      // und eine einzelne Pause dazwischen ist noch keine fertige Seite.
      if (found && stableFrames >= 3) return resolve(true);
      if (performance.now() - start > timeoutMs) return resolve(Boolean(found));

      requestAnimationFrame(check);
    };
    check();
  });
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/BookingPageView.vue'),
    },
    {
      path: '/offers/:id',
      component: () => import('../views/OfferDetailView.vue'),
      props: true,
    },
    {
      path: '/confirm/:bookingId',
      component: () => import('../views/ConfirmBookingView.vue'),
      props: true,
    },
    {
      path: '/cancel/:bookingId',
      component: () => import('../views/CancelBookingView.vue'),
      props: true,
    },
    // Warteraum, Gespräch und Abschluss liegen bewusst auf einer Route: Den Zustand kennt
    // der Server, ein Reload landet damit immer an der richtigen Stelle. Der Zugang ist
    // wie bei /confirm und /cancel der Token aus der Mail (?token=…).
    {
      path: '/call/:bookingId',
      component: () => import('../views/CallView.vue'),
      props: true,
    },
  ],
  scrollBehavior(to, from) {
    if (!to.hash) return { top: 0 };

    // Die Views rendern erst, wenn der Coach geladen ist (App.vue) – beim Direktaufruf
    // einer Sprungmarke existiert das Ziel also noch nicht, wenn der Router scrollen will.
    // Deshalb kurz auf das Element warten; `top` hält den Abstand zum sticky Header.
    // Sanft nur bei Sprüngen innerhalb der Seite: beim Erstaufruf würde die Seite sonst
    // sichtbar von oben herunterrollen.
    const isFirstLoad = from.matched.length === 0;
    return waitForStableTarget(to.hash).then((found) =>
      found ? { el: to.hash, top: 80, behavior: isFirstLoad ? 'auto' : 'smooth' } : false,
    );
  },
});
