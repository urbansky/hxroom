export { default as Logo } from './components/Logo.vue';

// Die Call-Oberfläche. Rollenfrei gebaut: Was Coach und Klient unterscheidet, kommt beim
// Einbinden als Props und Slots herein (technisches-konzept.md §8). Beide Frontends
// importieren von hier – die Nuxt-App wie die Vite-SPA.
export { default as CallScreen } from './components/call/CallScreen.vue';
export { default as CallVideoArea } from './components/call/CallVideoArea.vue';
export { default as CallControls } from './components/call/CallControls.vue';
export { default as CallChatPanel } from './components/call/CallChatPanel.vue';
export { default as CallCameraView } from './components/call/CallCameraView.vue';
export { default as CallAudioOutput } from './components/call/CallAudioOutput.vue';
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
} from './components/call/types';
