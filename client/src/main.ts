import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router/index.js';
import App from './App.vue';

/* 设计系统样式 */
import './styles/variables.css';
import './styles/base.css';
import './styles/glass.css';
import './styles/animations.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
