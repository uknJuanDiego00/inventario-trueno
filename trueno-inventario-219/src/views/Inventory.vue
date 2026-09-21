<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title"><Package :size="24" /> Inventario</h1>
        <p class="page-subtitle">{{ store.products.length }} productos registrados</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal"><Plus :size="16" /> Agregar Producto</button>
    </div>

    <!-- Filters -->
    <div class="inv-filters">
      <div class="search-bar inv-search">
        <Search :size="16" class="search-icon" />
        <input v-model="searchQuery" placeholder="Buscar por nombre, SKU o categoría..." />
      </div>
      <select class="form-control inv-select" v-model="filterCategory">
        <option value="">Todas las categorías</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select class="form-control inv-select" v-model="filterStatus">
        <option value="">Todos los estados</option>
        <option value="available">Disponible</option>
        <option value="low">Stock bajo</option>
        <option value="out">Agotado</option>
      </select>
    </div>

    <!-- Stats row -->
    <div class="inv-stats">
      <div class="inv-stat">
        <span class="inv-stat-icon"><Package :size="20" /></span>
        <div>
          <div class="inv-stat-val">{{ store.products.length }}</div>
          <div class="inv-stat-lbl">Total</div>
        </div>
      </div>
      <div class="inv-stat">
        <span class="inv-stat-icon text-success"><CheckCircle :size="20" /></span>
        <div>
          <div class="inv-stat-val text-success">{{ availableCount }}</div>
          <div class="inv-stat-lbl">Disponibles</div>
        </div>
      </div>
      <div class="inv-stat">
        <span class="inv-stat-icon text-warning"><AlertTriangle :size="20" /></span>
        <div>
          <div class="inv-stat-val text-warning">{{ store.lowStockProducts.length }}</div>
          <div class="inv-stat-lbl">Stock bajo</div>
        </div>
      </div>
      <div class="inv-stat">
        <span class="inv-stat-icon text-danger"><XCircle :size="20" /></span>
        <div>
          <div class="inv-stat-val text-danger">{{ store.outOfStockProducts.length }}</div>
          <div class="inv-stat-lbl">Agotados</div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card" style="padding:0; overflow:hidden;">
      <div class="table-wrapper" style="border:none;">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio Venta</th>
              <th>Precio Compra</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredProducts.length === 0">
              <td colspan="7">
                <div class="empty-state">
                  <div class="empty-state-icon"><Package :size="40" /></div>
                  <div class="empty-state-text">No se encontraron productos</div>
                </div>
              </td>
            </tr>
            <tr v-for="product in filteredProducts" :key="product.id">
              <td>
                <div class="prod-cell">
                  <div class="prod-image-thumb" :style="product.image ? `background-image:url(${product.image})` : ''">
                    <span v-if="!product.image">{{ product.name.charAt(0) }}</span>
                  </div>
                  <div>
                    <div class="prod-name">{{ product.name }}</div>
                    <div class="prod-sku text-muted">{{ product.sku || 'Sin SKU' }}</div>
                  </div>
                </div>
              </td>
              <td><span class="badge badge-secondary">{{ product.category }}</span></td>
              <td class="fw-600 text-success">{{ formatCurrency(product.sellPrice) }}</td>
              <td class="text-muted">{{ formatCurrency(product.buyPrice) }}</td>
              <td>
                <div class="stock-cell">
                  <button class="qty-btn" @click="adjustStock(product, -1)" :disabled="product.stock <= 0">−</button>
                  <span class="stock-value" :class="getStockClass(product)">{{ product.stock }}</span>
                  <button class="qty-btn" @click="adjustStock(product, 1)">+</button>
                </div>
              </td>
              <td>
                <span :class="['badge', getStatus(product).badge]">
                  {{ getStatus(product).dot }} {{ getStatus(product).label }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn-icon" title="Editar" @click="openEditModal(product)"><Pencil :size="15" /></button>
                  <button class="btn-icon btn-icon-danger" title="Eliminar" @click="confirmDelete(product)"><Trash2 :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingProduct ? 'Editar Producto' : 'Nuevo Producto' }}</h3>
          <button class="modal-close" @click="closeModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input v-model="form.name" class="form-control" placeholder="Ej: Espejos Deportivos" />
              <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Categoría *</label>
              <select v-model="form.category" class="form-control">
                <option value="">Seleccionar categoría</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
              <span v-if="errors.category" class="form-error">{{ errors.category }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Precio de Compra *</label>
              <input v-model.number="form.buyPrice" type="number" min="0" class="form-control" placeholder="0" />
              <span v-if="errors.buyPrice" class="form-error">{{ errors.buyPrice }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Precio de Venta *</label>
              <input v-model.number="form.sellPrice" type="number" min="0" class="form-control" placeholder="0" />
              <span v-if="errors.sellPrice" class="form-error">{{ errors.sellPrice }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Stock Actual *</label>
              <input v-model.number="form.stock" type="number" min="0" class="form-control" placeholder="0" />
              <span v-if="errors.stock" class="form-error">{{ errors.stock }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Stock Mínimo</label>
              <input v-model.number="form.minStock" type="number" min="0" class="form-control" placeholder="5" />
            </div>
            <div class="form-group">
              <label class="form-label">SKU / Código</label>
              <input v-model="form.sku" class="form-control" placeholder="Ej: ESP-001" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea v-model="form.description" class="form-control" placeholder="Descripción del producto..."></textarea>
          </div>
          <!-- Margin preview -->
          <div v-if="form.buyPrice > 0 && form.sellPrice > 0" class="margin-preview">
            <span>Margen: <strong class="text-success">{{ formatCurrency(form.sellPrice - form.buyPrice) }}</strong></span>
            <span>Margen %: <strong class="text-accent">{{ marginPct }}%</strong></span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveProduct">{{ editingProduct ? 'Actualizar' : 'Agregar Producto' }}</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal" style="max-width:400px">
        <div class="modal-body" style="text-align:center; padding:40px 24px">
          <div style="font-size:48px; margin-bottom:16px; display:flex; justify-content:center"><Trash2 :size="48" class="text-danger" /></div>
          <h3 class="modal-title" style="margin-bottom:8px">Eliminar producto</h3>
          <p class="text-secondary">¿Estás seguro de eliminar <strong>{{ deleteTarget.name }}</strong>?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="deleteTarget = null">Cancelar</button>
          <button class="btn btn-danger" @click="doDelete">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import store from '../stores/store.js'
import { formatCurrency, getStockStatus } from '../utils/calculations.js'
import { Package, Plus, Search, CheckCircle, AlertTriangle, XCircle, Pencil, Trash2, X } from '@lucide/vue'

const searchQuery = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingProduct = ref(null)
const deleteTarget = ref(null)

const categories = ['Accesorios', 'Luces', 'Espejos', 'Maniguetas', 'Direccionales', 'Frenos', 'Protección', 'Estética', 'Electrónica', 'Otros']

const emptyForm = () => ({ name: '', category: '', description: '', buyPrice: 0, sellPrice: 0, stock: 0, minStock: 5, sku: '', image: null })
const form = reactive(emptyForm())
const errors = reactive({})

const marginPct = computed(() => {
  const sell = Number(form.sellPrice) || 0
  const buy = Number(form.buyPrice) || 0
  if (sell <= 0) return 0
  return Math.round(((sell - buy) / sell) * 100)
})

const availableCount = computed(() => store.products.filter(p => p.stock > (p.minStock || store.config.lowStockThreshold)).length)

const filteredProducts = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const threshold = store.config.lowStockThreshold
  return store.products.filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchCat = !filterCategory.value || p.category === filterCategory.value
    let matchStatus = true
    if (filterStatus.value === 'available') matchStatus = p.stock > (p.minStock || threshold)
    if (filterStatus.value === 'low') matchStatus = p.stock > 0 && p.stock <= (p.minStock || threshold)
    if (filterStatus.value === 'out') matchStatus = p.stock <= 0
    return matchSearch && matchCat && matchStatus
  })
})

const getStatus = (p) => getStockStatus(p, store.config.lowStockThreshold)
const getStockClass = (p) => {
  if (p.stock <= 0) return 'text-danger'
  if (p.stock <= (p.minStock || store.config.lowStockThreshold)) return 'text-warning'
  return 'text-success'
}

function adjustStock(product, delta) {
  if (!store.adjustStock(product.id, delta)) {
    store.notify('No se puede reducir más el stock', 'warning')
  }
}

function openAddModal() {
  editingProduct.value = null
  Object.assign(form, emptyForm())
  Object.keys(errors).forEach(k => delete errors[k])
  showModal.value = true
}

function openEditModal(product) {
  editingProduct.value = product
  Object.assign(form, { ...product })
  Object.keys(errors).forEach(k => delete errors[k])
  showModal.value = true
}

function closeModal() { showModal.value = false; editingProduct.value = null }

function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.name || !form.name.trim()) errors.name = 'El nombre es requerido'
  if (!form.category) errors.category = 'La categoría es requerida'
  if (form.buyPrice < 0 || isNaN(form.buyPrice)) errors.buyPrice = 'El precio de compra no puede ser negativo'
  if (form.sellPrice <= 0 || isNaN(form.sellPrice)) errors.sellPrice = 'El precio de venta debe ser mayor a 0'
  if (form.stock < 0 || isNaN(form.stock)) errors.stock = 'El stock no puede ser negativo'
  return Object.keys(errors).length === 0
}

function saveProduct() {
  if (!validate()) return
  if (editingProduct.value) {
    store.updateProduct(editingProduct.value.id, { ...form })
  } else {
    store.addProduct({ ...form })
  }
  closeModal()
}

function confirmDelete(product) { deleteTarget.value = product }
function doDelete() {
  store.deleteProduct(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<style scoped>
/* Filters */
.inv-filters {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}
.inv-search { min-width: 0; }
.inv-select { width: auto; min-width: 140px; }

.inv-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.inv-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  flex: 1;
  min-width: 100px;
}
.inv-stat-icon { font-size: 22px; }
.inv-stat-val { font-family: var(--font-brand); font-size: 22px; font-weight: 700; }
.inv-stat-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }

.prod-cell { display: flex; align-items: center; gap: 10px; }
.prod-image-thumb {
  width: 38px; height: 38px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: var(--accent);
  background-size: cover; background-position: center;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}
.prod-name { font-size: 14px; font-weight: 600; }
.prod-sku { font-size: 11px; }

.stock-cell { display: flex; align-items: center; gap: 6px; }
.stock-value { font-family: var(--font-brand); font-size: 18px; font-weight: 700; min-width: 36px; text-align: center; }

.action-btns { display: flex; gap: 6px; }

.margin-preview {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .inv-filters {
    grid-template-columns: 1fr 1fr;
  }
  .inv-search {
    grid-column: 1 / -1;
  }
  .inv-select { width: 100%; }
  .inv-stat-val { font-size: 18px; }
  .page-header { align-items: flex-start; }
  .page-header .btn { white-space: nowrap; }
}

@media (max-width: 480px) {
  .inv-filters {
    grid-template-columns: 1fr;
  }
  .inv-search { grid-column: 1; }
  .inv-stats { gap: 8px; }
  .inv-stat { padding: 10px 12px; }
  .inv-stat-val { font-size: 16px; }
}
</style>
