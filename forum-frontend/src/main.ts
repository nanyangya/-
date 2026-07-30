import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './style.css'
import './styles/global.css'
import './styles/theme.css'
import App from './App.vue'
import router from './router'
import "./utils/socket";
const app = createApp(App)
const pinia = createPinia() // 🌟 创建 Pinia 实例

app.use(pinia) // 🌟 挂载 Pinia
app.use(router)
app.use(ElementPlus)

app.mount('#app')