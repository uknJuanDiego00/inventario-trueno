import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Views
import Dashboard from './views/Dashboard.vue'
import Inventory from './views/Inventory.vue'
import Sales from './views/Sales.vue'
import Clients from './views/Clients.vue'
import Debts from './views/Debts.vue'
import SalesHistory from './views/SalesHistory.vue'
import Settings from './views/Settings.vue'

const routes = [
  { path: '/', component: Dashboard, meta: { title: 'Dashboard' } },
  { path: '/inventario', component: Inventory, meta: { title: 'Inventario' } },
  { path: '/ventas', component: Sales, meta: { title: 'Nueva Venta' } },
  { path: '/clientes', component: Clients, meta: { title: 'Clientes' } },
  { path: '/deudas', component: Debts, meta: { title: 'Deudas' } },
  { path: '/historial', component: SalesHistory, meta: { title: 'Historial de Ventas' } },
  { path: '/configuracion', component: Settings, meta: { title: 'Configuración' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
