import { createApp } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import App from './App.vue';
import '@hxroom/ui/theme';

if (!localStorage.getItem('nuxt-ui-color-mode')) {
  document.documentElement.classList.add('dark');
}

const app = createApp(App);
app.use(ui);
app.mount('#app');
