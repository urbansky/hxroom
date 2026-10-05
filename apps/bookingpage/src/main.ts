import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import { router } from './router';
import { initMonitoring } from './monitoring';
import '@hxroom/ui/theme';

const app = createApp(App);
initMonitoring(app, router);
app.use(router);
app.use(ui);
app.mount('#app');
