export { default as Logo } from './components/Logo.vue';

// Bausteine der öffentlichen Buchungsseite. Die Buchungsseite selbst und die Vorschau unter
// Einstellungen → Buchungsseite (Coach-App) rendern dieselben Komponenten.
export { default as BookingPageHero } from './components/booking-page/BookingPageHero.vue';
export { default as BookingPageCoachCard } from './components/booking-page/BookingPageCoachCard.vue';
export { default as BookingPageAbout } from './components/booking-page/BookingPageAbout.vue';
export { default as BookingPageOfferItem } from './components/booking-page/BookingPageOfferItem.vue';

// Rechtsseiten: Impressum des Betreibers für hxroom.de und als Block im Impressum jeder
// Buchungsseite (doc/legal.md §3). Stile in theme/legal.css.
export { default as LegalOperatorImprint } from './components/legal/LegalOperatorImprint.vue';
export { default as LegalPrivacyPolicy } from './components/legal/LegalPrivacyPolicy.vue';

// Die Call-Oberfläche. Rollenfrei gebaut: Was Coach und Klient unterscheidet, kommt beim
// Einbinden als Props und Slots herein (technisches-konzept.md §8). Beide Frontends
// importieren von hier – die Nuxt-App wie die Vite-SPA.
export { default as CallScreen } from './components/call/CallScreen.vue';
export { default as CallVideoArea } from './components/call/CallVideoArea.vue';
export { default as CallControls } from './components/call/CallControls.vue';
export { default as CallChatPanel } from './components/call/CallChatPanel.vue';
export { default as CallCameraView } from './components/call/CallCameraView.vue';
export { default as CallAudioOutput } from './components/call/CallAudioOutput.vue';
export { default as CallConnectionNotice } from './components/call/CallConnectionNotice.vue';
export { default as CallDeviceSetup } from './components/call/CallDeviceSetup.vue';
export { default as CallMicLevel } from './components/call/CallMicLevel.vue';
export { namedDevices } from './components/call/devices';

export type {
  CallChatFile,
  CallChatMessage,
  CallConnection,
  CallDevice,
  CallPanelDef,
  CallPeer,
  CallStats,
} from './components/call/types';
