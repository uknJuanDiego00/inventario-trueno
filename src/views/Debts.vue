<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title"><Wallet :size="24" /> Deudas</h1>
        <p class="page-subtitle">Gestión de créditos y cobros pendientes, agrupados por cliente</p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid-4" style="margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-icon"><ClipboardList :size="26" /></div>
        <div class="stat-value">{{ store.debts.length }}</div>
        <div class="stat-label">Total Ventas a Crédito</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Users :size="26" /></div>
        <div class="stat-value text-warning">{{ clientsWithDebtCount }}</div>
        <div class="stat-label">Clientes con Deuda</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><AlertOctagon :size="26" /></div>
        <div class="stat-value text-danger">{{ overdueGroupsCount }}</div>
        <div class="stat-label">Clientes con Vencidas</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><BadgeDollarSign :size="26" /></div>
        <div class="stat-value text-danger">{{ formatCurrency(store.totalPendingDebt) }}</div>
        <div class="stat-label">Total por Cobrar</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-row">
      <div class="search-bar">
        <Search :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          placeholder="Buscar por cédula o nombre de deudor..."
          aria-label="Buscar deudores por cédula o nombre"
        />
        <span v-if="detectedSearchBadge" class="search-type-badge">
          {{ detectedSearchBadge }}
        </span>
        <button
          v-if="searchQuery"
          type="button"
          class="search-clear-btn"
          @click="searchQuery = ''"
          title="Limpiar búsqueda"
        >
          <X :size="14" />
        </button>
      </div>
      <select class="form-control filter-select" v-model="filterStatus">
        <option value="">Todos los estados</option>
        <option value="pendiente">Activas (Pendientes)</option>
        <option value="vencida">Activas (Vencidas)</option>
        <option value="pagada">Pagadas (Saldadas)</option>
      </select>
    </div>

    <!-- Debts List agrupado por cliente -->
    <div v-if="filteredGroups.length === 0" class="card">
      <div class="empty-state">
        <div class="empty-state-icon">
          <Search :size="40" v-if="searchQuery.trim()" />
          <Wallet :size="40" v-else />
        </div>
        <div class="empty-state-text">
          <template v-if="searchQuery.trim()">
            No se encontraron deudas para la {{ isNumericSearch ? 'cédula' : 'persona' }} "{{ searchQuery.trim() }}"
          </template>
          <template v-else-if="filterStatus">
            No hay deudas con el estado seleccionado
          </template>
          <template v-else>
            No hay deudas registradas
          </template>
        </div>
        <p v-if="searchQuery.trim()" class="text-muted empty-state-subtext">
          {{ isNumericSearch ? 'Verifica que el número de cédula esté escrito correctamente y que el cliente tenga créditos registrados.' : 'Verifica que el nombre o apellido esté escrito correctamente y que el cliente tenga créditos registrados.' }}
        </p>
      </div>
    </div>

    <div class="debts-list">
      <div v-for="group in filteredGroups" :key="group.key" class="debt-card card">
        <div class="debt-header">
          <div class="debt-client-info">
            <div class="debt-avatar">{{ initials(group.clientName) }}</div>
            <div>
              <div class="debt-client-name">
                {{ group.clientName }}
                <span v-if="group.clientDocument" class="client-id-tag">C.C. {{ group.clientDocument }}</span>
                <span v-if="group.clientId" class="client-id-tag" style="opacity:0.75">ID: {{ group.clientId }}</span>
              </div>
              <div class="text-muted debt-meta">
                {{ group.debts.length }} venta{{ group.debts.length === 1 ? '' : 's' }} a crédito
                <span v-if="group.clientPhone"> · Tel: {{ group.clientPhone }}</span>
              </div>
            </div>
          </div>
          <div class="debt-status-area">
            <span :class="['badge', getGroupStatus(group).badge]">{{ getGroupStatus(group).label }}</span>
          </div>
        </div>

        <!-- Totales del cliente -->
        <div class="debt-amounts">
          <div class="da-item">
            <span class="da-label">Total deuda</span>
            <span class="da-value fw-bold">{{ formatCurrency(group.total) }}</span>
          </div>
          <div class="da-item">
            <span class="da-label">Pagado</span>
            <span class="da-value text-success">{{ formatCurrency(group.paid) }}</span>
          </div>
          <div class="da-item da-item-highlight">
            <span class="da-label">Saldo pendiente</span>
            <span class="da-value text-danger fw-bold">{{ formatCurrency(group.balance) }}</span>
          </div>
        </div>

        <!-- Progress Bar del cliente -->
        <div class="debt-progress">
          <div class="debt-progress-label">
            <span class="text-muted" style="font-size:12px">Progreso de pago total</span>
            <span class="text-muted" style="font-size:12px">{{ getGroupProgressPct(group) }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="`width:${getGroupProgressPct(group)}%; background:var(--success)`"></div>
          </div>
        </div>

        <div v-if="group.nearestDueDate" class="debt-due" :class="group.hasOverdue ? 'text-danger' : 'text-muted'">
          <Calendar :size="13" style="vertical-align:middle;margin-right:4px" /> Próximo vencimiento: {{ formatDateShort(group.nearestDueDate) }}
          <span v-if="group.hasOverdue"> <AlertTriangle :size="13" style="vertical-align:middle" /> TIENE VENCIDAS</span>
        </div>

        <!-- Desglose de ventas asociadas al cliente -->
        <div class="client-sales-list">
          <button class="sales-toggle" @click="toggleExpanded(group.key)">
            <ChevronDown v-if="isExpanded(group.key)" :size="14" />
            <ChevronRight v-else :size="14" />
            Ver detalle de las {{ group.debts.length }} venta{{ group.debts.length === 1 ? '' : 's' }}
          </button>

          <div v-if="isExpanded(group.key)" class="client-sales-body">
            <div v-for="debt in sortedGroupDebts(group)" :key="debt.id" class="client-sale-item">
              <div class="csi-header">
                <span class="csi-sale-id">Venta #{{ debt.saleId }} — {{ formatDateShort(debt.createdAt) }}</span>
                <span :class="['badge', getDebtDisplayStatus(debt).badge]">{{ getDebtDisplayStatus(debt).label }}</span>
              </div>
              <div v-if="debt.updatedAt" class="csi-updated">
                ✏️ Modificado: {{ formatDate(debt.updatedAt) }}
              </div>

              <div class="csi-amounts">
                <span>Total: <strong>{{ formatCurrency(debt.total) }}</strong></span>
                <span class="text-success">Pagado: <strong>{{ formatCurrency(debt.paid) }}</strong></span>
                <span class="text-danger">Saldo: <strong>{{ formatCurrency(debt.balance) }}</strong></span>
              </div>

              <div class="csi-due" :class="isOverdue(debt) && debt.status !== 'pagada' ? 'text-danger' : 'text-muted'">
                Vence: {{ formatDateShort(debt.dueDate) }}
                <span v-if="isOverdue(debt) && debt.status !== 'pagada'">
                  <AlertTriangle :size="12" style="vertical-align:middle" /> VENCIDA
                </span>
              </div>

              <!-- Productos de esta venta -->
              <div class="debt-products" v-if="debt.items && debt.items.length">
                <div class="dp-label text-muted">Productos:</div>
                <div v-for="(item, iIdx) in debt.items" :key="item.productId" class="dp-item">
                  <span class="dp-name">{{ item.name }}</span>
                  <div v-if="debt.status !== 'pagada'" class="dp-stepper">
                    <button class="dp-step-btn" @click="decrementDebtItem(debt, iIdx)" title="Quitar una unidad">
                      <Minus :size="11" />
                    </button>
                    <span class="dp-qty">{{ item.qty }}</span>
                    <button class="dp-step-btn" @click="incrementDebtItem(debt, iIdx)" title="Agregar una unidad">
                      <Plus :size="11" />
                    </button>
                  </div>
                  <span v-else class="text-muted dp-qty-static">{{ item.qty }}x</span>
                  <span class="dp-subtotal">{{ formatCurrency(item.subtotal || item.price * item.qty) }}</span>
                </div>
              </div>

              <!-- Historial de abonos de esta venta -->
              <div class="payment-history" v-if="debt.payments && debt.payments.length">
                <div class="ph-label text-muted">Historial de abonos ({{ debt.payments.length }}):</div>
                <div v-for="p in debt.payments" :key="p.id" class="ph-item">
                  <span class="text-success ph-amount">+{{ formatCurrency(p.amount) }}</span>
                  <span class="text-muted ph-date">{{ formatDate(p.date) }}</span>
                  <span v-if="p.note" class="text-muted ph-note">{{ p.note }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Registrar Abono a nivel de cliente -->
        <div v-if="!group.allPaid" class="add-payment-section">
          <button class="btn btn-primary" style="width:100%" @click="openPaymentModal(group)">
            <CreditCard :size="15" /> Registrar Abono del Cliente
          </button>
        </div>
        <div v-else class="paid-badge-row">
          <span class="badge badge-success"><CheckCircle2 :size="14" /> Todas sus deudas están saldadas</span>
        </div>
      </div>
    </div>

    <!-- Payment Modal a nivel de cliente -->
    <div v-if="paymentModal.open" class="modal-overlay" @click.self="closePaymentModal">
      <div class="modal payment-modal">
        <div class="modal-header">
          <h3 class="modal-title"><CreditCard :size="18" /> Registrar Abono</h3>
          <button class="modal-close" @click="closePaymentModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <!-- Client Summary -->
          <div class="pm-summary">
            <div class="pm-client">
              <div class="debt-avatar pm-avatar">{{ initials(paymentModal.group?.clientName || '') }}</div>
              <div>
                <div class="fw-bold" style="font-size:15px">{{ paymentModal.group?.clientName }}</div>
                <div class="text-muted" style="font-size:12px">
                  {{ paymentModal.group?.debts?.length }} venta{{ paymentModal.group?.debts?.length === 1 ? '' : 's' }} a crédito
                  <span v-if="paymentModal.group?.clientDocument"> · C.C. {{ paymentModal.group?.clientDocument }}</span>
                  <span v-else-if="paymentModal.group?.clientId"> · ID: {{ paymentModal.group?.clientId }}</span>
                </div>
              </div>
            </div>
            <div class="pm-amounts">
              <div class="pm-amount-item">
                <span class="pm-amount-label">Total deuda</span>
                <span class="pm-amount-value">{{ formatCurrency(paymentModal.group?.total) }}</span>
              </div>
              <div class="pm-amount-item">
                <span class="pm-amount-label">Ya pagado</span>
                <span class="pm-amount-value text-success">{{ formatCurrency(paymentModal.group?.paid) }}</span>
              </div>
              <div class="pm-amount-item pm-balance">
                <span class="pm-amount-label">Saldo pendiente</span>
                <span class="pm-amount-value text-danger fw-bold">{{ formatCurrency(paymentModal.group?.balance) }}</span>
              </div>
            </div>
          </div>

          <p class="pm-note-text text-muted">
            El abono se aplicará automáticamente a las ventas pendientes del cliente, empezando por la más próxima a vencer.
          </p>

          <hr class="divider" />

          <!-- Payment Form -->
          <div class="form-group">
            <label class="form-label">Monto del abono *</label>
            <div class="amount-input-wrapper">
              <span class="amount-prefix">$</span>
              <input
                v-model.number="paymentModal.amount"
                type="number"
                min="1"
                :max="paymentModal.group?.balance"
                class="form-control amount-input"
                placeholder="0"
                @keyup.enter="submitPayment"
              />
            </div>
            <div class="quick-amounts">
              <button
                v-for="pct in [25, 50, 75, 100]"
                :key="pct"
                class="quick-btn"
                @click="setQuickAmount(pct)"
              >{{ pct === 100 ? 'Total' : pct + '%' }}</button>
            </div>
            <span v-if="paymentModal.amountError" class="form-error">{{ paymentModal.amountError }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Nota (opcional)</label>
            <input
              v-model="paymentModal.note"
              class="form-control"
              placeholder="Ej: Transferencia Nequi, efectivo en tienda..."
            />
          </div>

          <!-- Preview of new balance -->
          <div v-if="paymentModal.amount > 0 && paymentModal.amount <= (paymentModal.group?.balance || 0)" class="pm-preview">
            <div class="pm-preview-row">
              <span class="text-muted">Abono a registrar</span>
              <span class="text-success fw-bold">+{{ formatCurrency(paymentModal.amount) }}</span>
            </div>
            <div class="pm-preview-row">
              <span class="text-muted">Nuevo saldo del cliente</span>
              <span class="fw-bold" :class="(paymentModal.group?.balance - paymentModal.amount) <= 0 ? 'text-success' : 'text-warning'">
                {{ formatCurrency(Math.max(0, (paymentModal.group?.balance || 0) - paymentModal.amount)) }}
              </span>
            </div>
            <div v-if="(paymentModal.group?.balance - paymentModal.amount) <= 0" class="pm-paid-label">
              <CheckCircle2 :size="14" /> Todas las deudas de este cliente quedarán saldadas
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closePaymentModal">Cancelar</button>
          <button class="btn btn-success" @click="submitPayment" :disabled="!paymentModal.amount || paymentModal.amount <= 0">
            <CheckCircle2 :size="15" /> Confirmar Abono
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import store from '../stores/store.js'
import { formatCurrency, formatDate, formatDateShort, getDebtStatus } from '../utils/calculations.js'
import {
  Wallet, ClipboardList, AlertOctagon, BadgeDollarSign, Search, Calendar,
  AlertTriangle, CheckCircle2, CreditCard, X, Users, ChevronDown, ChevronRight, Trash2, Minus, Plus
} from '@lucide/vue'

const searchQuery = ref('')
const filterStatus = ref('')
const expandedKeys = ref(new Set())
const collapsedKeys = ref(new Set())

const paymentModal = reactive({
  open: false,
  group: null,
  amount: 0,
  note: '',
  amountError: '',
})

// ================= UTILIDADES DE BÚSQUEDA Y NORMALIZACIÓN =================
// Normaliza texto: elimina tildes/acentos, minúsculas, espacios adicionales al inicio/final y colapsa espacios intermedios
function normalizeText(str) {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// Extrae exclusivamente dígitos numéricos (para cédulas y números de documento)
function extractDigits(str) {
  if (!str) return ''
  return String(str).replace(/\D/g, '')
}

// Resuelve la información completa del cliente vinculada a una deuda
function resolveClientInfo(debt) {
  let matchedClient = null

  // 1. Buscar en store.clients por ID numérico de cliente
  if (debt.clientId) {
    matchedClient = store.clients?.find(c => Number(c.id) === Number(debt.clientId))
  }

  // 2. Si no se encontró, buscar por número de documento / cédula exacta o por dígitos
  if (!matchedClient && debt.clientDocument) {
    const rawDoc = String(debt.clientDocument).trim()
    const docDigits = extractDigits(rawDoc)
    matchedClient = store.clients?.find(c => {
      const cDoc = String(c.document || '').trim()
      return cDoc === rawDoc || (docDigits.length > 0 && extractDigits(cDoc) === docDigits)
    })
  }

  // 3. Si no se encontró y el nombre no es genérico, intentar por nombre normalizado
  if (!matchedClient && debt.clientName && debt.clientName.trim() && debt.clientName !== 'Cliente General') {
    const normDebtName = normalizeText(debt.clientName)
    matchedClient = store.clients?.find(c => normalizeText(c.name) === normDebtName)
  }

  const clientId = matchedClient?.id ?? (debt.clientId ? Number(debt.clientId) : null)
  const clientDocument = String(matchedClient?.document || debt.clientDocument || '').trim()
  const clientName = matchedClient?.name || debt.clientName || 'Cliente General'
  const clientPhone = matchedClient?.phone || ''

  return { matchedClient, clientId, clientDocument, clientName, clientPhone }
}

// ================= DETECCIÓN AUTOMÁTICA (NÚMEROS VS TEXTO) =================
// Detecta automáticamente si la consulta corresponde a una búsqueda numérica (cédula) o de texto (nombre)
const isNumericSearch = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return false
  const digitsOnly = extractDigits(q)
  const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(q)
  // Prefijos típicos de documento: cc, c.c., cedula, nit, etc.
  const isExplicitDoc = /^(cc|c\.c\.|c\.c|ti|t\.i\.|nit|pas|ce|c\.e\.)\s*[\d\s.\-]+$/i.test(q)
  return (!hasLetters && digitsOnly.length > 0) || isExplicitDoc
})

const detectedSearchBadge = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return null
  return isNumericSearch.value ? 'Cédula' : 'Nombre'
})

// ================= AGRUPACIÓN POR CLIENTE (EVITA DUPLICADOS) =================
// Agrupa todas las deudas de la misma persona bajo una sola tarjeta unificada.
// Prioriza la cédula como identificador único natural, seguido por clientId o nombre.
const groupedDebts = computed(() => {
  const map = new Map()

  for (const d of store.debts) {
    const clientInfo = resolveClientInfo(d)
    const docDigits = extractDigits(clientInfo.clientDocument)

    // Clave de agrupación unificada para evitar registros duplicados
    let key = ''
    if (docDigits) {
      key = `doc-${docDigits}`
    } else if (clientInfo.clientId) {
      key = `id-${clientInfo.clientId}`
    } else if (clientInfo.clientName && clientInfo.clientName !== 'Cliente General') {
      key = `name-${normalizeText(clientInfo.clientName)}`
    } else {
      key = `debt-${d.id}`
    }

    if (!map.has(key)) {
      map.set(key, {
        key,
        clientId: clientInfo.clientId,
        clientDocument: clientInfo.clientDocument,
        clientName: clientInfo.clientName,
        clientPhone: clientInfo.clientPhone,
        debts: [],
        total: 0,
        paid: 0,
        balance: 0,
        hasOverdue: false,
        allPaid: true,
        nearestDueDate: null,
      })
    }

    const group = map.get(key)

    // Enriquecer datos del grupo si este registro contiene más información
    if (!group.clientDocument && clientInfo.clientDocument) {
      group.clientDocument = clientInfo.clientDocument
    }
    if (!group.clientPhone && clientInfo.clientPhone) {
      group.clientPhone = clientInfo.clientPhone
    }
    if (group.clientName === 'Cliente General' && clientInfo.clientName !== 'Cliente General') {
      group.clientName = clientInfo.clientName
    }

    // Evitar añadir deudas duplicadas por id
    if (!group.debts.some(existing => existing.id === d.id)) {
      group.debts.push(d)
      group.total += Number(d.total) || 0
      group.paid += Number(d.paid) || 0
      group.balance += Number(d.balance) || 0

      const isDebtPaid = d.status === 'pagada' || (Number(d.balance) || 0) <= 0
      if (!isDebtPaid) {
        group.allPaid = false
        if (isOverdue(d)) group.hasOverdue = true
        if (!group.nearestDueDate || new Date(d.dueDate) < new Date(group.nearestDueDate)) {
          group.nearestDueDate = d.dueDate
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const rank = (g) => (g.hasOverdue ? 0 : !g.allPaid ? 1 : 2)
    return rank(a) - rank(b)
  })
})

const clientsWithDebtCount = computed(() => groupedDebts.value.filter(g => !g.allPaid).length)
const overdueGroupsCount = computed(() => groupedDebts.value.filter(g => g.hasOverdue).length)

// ================= FILTRADO POR BÚSQUEDA Y ESTADO =================
const filteredGroups = computed(() => {
  const rawQ = searchQuery.value.trim()
  const isNum = isNumericSearch.value
  const queryDigits = extractDigits(rawQ)
  const normQuery = normalizeText(rawQ)
  const queryTokens = normQuery.split(' ').filter(Boolean)

  return groupedDebts.value.filter(group => {
    // 1. Filtrado de búsqueda
    let matchSearch = true

    if (rawQ) {
      if (isNum) {
        // Búsqueda por número de cédula / documento
        const groupDocDigits = extractDigits(group.clientDocument)
        const matchDocDigits = queryDigits.length > 0 && groupDocDigits.includes(queryDigits)
        const matchDocNorm = group.clientDocument && normalizeText(group.clientDocument).includes(normQuery)
        const matchClientId = group.clientId && String(group.clientId) === queryDigits

        // Buscar también en los documentos de las ventas/deudas del grupo
        const matchDebtsDoc = group.debts.some(d => {
          const dDigits = extractDigits(d.clientDocument)
          return queryDigits.length > 0 && dDigits.includes(queryDigits)
        })

        // Respaldo en caso de números en el nombre
        const matchNameFallback = normalizeText(group.clientName).includes(normQuery)

        matchSearch = matchDocDigits || matchDocNorm || matchClientId || matchDebtsDoc || matchNameFallback
      } else {
        // Búsqueda por nombres y apellidos (completos o parciales, sin importar mayúsculas, minúsculas o tildes)
        const normName = normalizeText(group.clientName)
        const normDoc = normalizeText(group.clientDocument)

        // Cada palabra ingresada debe encontrarse en el nombre del deudor (permite buscar "Juan Perez", "perez juan", etc.)
        const matchesAllTokens = queryTokens.length > 0 && queryTokens.every(token => normName.includes(token))
        const matchesDoc = normDoc.includes(normQuery)
        const matchDebtsName = group.debts.some(d => {
          const dName = normalizeText(d.clientName)
          return queryTokens.length > 0 && queryTokens.every(token => dName.includes(token))
        })

        matchSearch = matchesAllTokens || matchesDoc || matchDebtsName
      }
    }

    // 2. Filtrado por estado (pendiente, vencida, pagada)
    let matchStatus = true
    if (filterStatus.value === 'vencida') matchStatus = group.hasOverdue
    else if (filterStatus.value === 'pendiente') matchStatus = !group.allPaid
    else if (filterStatus.value === 'pagada') matchStatus = group.allPaid

    return matchSearch && matchStatus
  })
})

const initials = (name) => (name || 'X').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
const isOverdue = (debt) => debt.status !== 'pagada' && new Date(debt.dueDate) < new Date()

function getGroupProgressPct(group) {
  if (!group || !group.total || group.total <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((group.paid / group.total) * 100)))
}

// Estados claros a nivel de grupo: Activa (Pendiente/Con Vencidas) o Pagada (Saldada)
function getGroupStatus(group) {
  if (group.allPaid) return { badge: 'badge-success', label: 'Pagada (Saldada)' }
  if (group.hasOverdue) return { badge: 'badge-danger', label: 'Activa (Con Vencidas)' }
  return { badge: 'badge-warning', label: 'Activa (Pendiente)' }
}

// Estados claros a nivel de deuda individual: Activa (Pendiente/Vencida) o Pagada
function getDebtDisplayStatus(debt) {
  if (!debt) return { label: 'Desconocido', badge: 'badge-secondary' }
  const isPaid = debt.status === 'pagada' || (Number(debt.balance) || 0) <= 0
  if (isPaid) return { label: 'Pagada', badge: 'badge-success' }
  if (isOverdue(debt) || debt.status === 'vencida') return { label: 'Activa (Vencida)', badge: 'badge-danger' }
  return { label: 'Activa (Pendiente)', badge: 'badge-warning' }
}

function sortedGroupDebts(group) {
  return [...group.debts].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
}

function toggleExpanded(key) {
  if (searchQuery.value.trim() && filteredGroups.value.length === 1 && !collapsedKeys.value.has(key) && !expandedKeys.value.has(key)) {
    collapsedKeys.value.add(key)
    return
  }
  if (collapsedKeys.value.has(key)) {
    collapsedKeys.value.delete(key)
  }
  const next = new Set(expandedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedKeys.value = next
}

function isExpanded(key) {
  // Al buscar y encontrar un único cliente, auto-expandir sus ventas para ver de inmediato el detalle
  if (searchQuery.value.trim() && filteredGroups.value.length === 1 && !collapsedKeys.value.has(key)) {
    return true
  }
  return expandedKeys.value.has(key)
}

// ================= MODAL DE ABONO (a nivel de cliente) =================
function openPaymentModal(group) {
  paymentModal.open = true
  paymentModal.group = group
  paymentModal.amount = group.balance
  paymentModal.note = ''
  paymentModal.amountError = ''
}

function closePaymentModal() {
  paymentModal.open = false
  paymentModal.group = null
  paymentModal.amount = 0
  paymentModal.note = ''
  paymentModal.amountError = ''
}

function setQuickAmount(pct) {
  if (!paymentModal.group) return
  paymentModal.amount = pct === 100
    ? paymentModal.group.balance
    : Math.round((paymentModal.group.balance * pct) / 100)
}

// El abono se reparte entre las ventas pendientes del cliente,
// empezando por la que vence mas pronto, hasta agotar el monto ingresado.
function submitPayment() {
  paymentModal.amountError = ''
  const amt = Number(paymentModal.amount) || 0

  if (amt <= 0) {
    paymentModal.amountError = 'Ingresa un monto valido mayor a 0'
    return
  }
  if (amt > (paymentModal.group?.balance || 0)) {
    paymentModal.amountError = 'El abono supera el saldo pendiente del cliente'
    return
  }

  const pendingDebtsOfClient = sortedGroupDebts(paymentModal.group)
    .filter(d => d.status !== 'pagada' && (Number(d.balance) || 0) > 0)

  let remaining = amt
  for (const debt of pendingDebtsOfClient) {
    if (remaining <= 0) break
    const toApply = Math.min(remaining, Number(debt.balance) || 0)
    if (toApply > 0) {
      store.addPayment(debt.id, toApply, paymentModal.note.trim())
      remaining -= toApply
    }
  }

  closePaymentModal()
}

function removeDebtItem(debt, itemIndex) {
  const item = debt.items[itemIndex]
  if (!item) return
  const itemTotal = Number(item.subtotal) || (Number(item.price) * Number(item.qty))
  if (debt.items.length <= 1) {
    store.notify('No puedes eliminar el único producto. Registra un abono completo para saldar la deuda.', 'warning')
    return
  }
  // Actualizar la deuda
  debt.items.splice(itemIndex, 1)
  const newTotal = Math.max(0, Number(debt.total) - itemTotal)
  const newBalance = Math.max(0, newTotal - Number(debt.paid))
  debt.total = newTotal
  debt.balance = newBalance
  if (newBalance <= 0) debt.status = 'pagada'
  // Actualizar la venta asociada
  const sale = store.sales.find(s => s.id === debt.saleId)
  if (sale) {
    const saleItemIdx = sale.items.findIndex(i => i.productId === item.productId)
    if (saleItemIdx !== -1) sale.items.splice(saleItemIdx, 1)
    sale.total = Math.max(0, Number(sale.total) - itemTotal)
    sale.subtotal = sale.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
  }
  store.saveDebts()
  store.saveSales()
  store.notify(`Producto "${item.name}" eliminado de la deuda`, 'info')
}

function decrementDebtItem(debt, itemIndex) {
  const item = debt.items[itemIndex]
  if (!item) return
  const unitPrice = Number(item.price) || 0
  if (item.qty <= 1) {
    if (debt.items.length <= 1) {
      store.notify('No puedes quitar el único producto. Registra un abono completo para saldar la deuda.', 'warning')
      return
    }
    debt.items.splice(itemIndex, 1)
  } else {
    item.qty -= 1
    item.subtotal = item.qty * unitPrice
  }
  const now = new Date().toISOString()
  const newTotal = Math.max(0, Number(debt.total) - unitPrice)
  const newBalance = Math.max(0, newTotal - Number(debt.paid))
  debt.total = newTotal
  debt.balance = newBalance
  debt.updatedAt = now
  if (newBalance <= 0) debt.status = 'pagada'
  const sale = store.sales.find(s => s.id === debt.saleId)
  if (sale) {
    const si = sale.items.find(i => i.productId === item.productId)
    if (si) {
      if (si.qty <= 1) sale.items.splice(sale.items.indexOf(si), 1)
      else { si.qty -= 1; si.subtotal = si.qty * unitPrice }
    }
    sale.total = Math.max(0, Number(sale.total) - unitPrice)
    sale.subtotal = sale.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
    sale.updatedAt = now
  }
  store.saveDebts()
  store.saveSales()
  store.notify('Unidad quitada y deuda actualizada', 'info')
}

function incrementDebtItem(debt, itemIndex) {
  const item = debt.items[itemIndex]
  if (!item) return
  const unitPrice = Number(item.price) || 0
  item.qty += 1
  item.subtotal = item.qty * unitPrice
  const now = new Date().toISOString()
  const newTotal = Number(debt.total) + unitPrice
  const newBalance = Math.max(0, newTotal - Number(debt.paid))
  debt.total = newTotal
  debt.balance = newBalance
  debt.updatedAt = now
  if (debt.status === 'pagada' && newBalance > 0) debt.status = 'pendiente'
  const sale = store.sales.find(s => s.id === debt.saleId)
  if (sale) {
    const si = sale.items.find(i => i.productId === item.productId)
    if (si) { si.qty += 1; si.subtotal = si.qty * unitPrice }
    else sale.items.push({ ...item })
    sale.total = Number(sale.total) + unitPrice
    sale.subtotal = sale.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
    sale.updatedAt = now
  }
  store.saveDebts()
  store.saveSales()
  store.notify('Unidad agregada y deuda actualizada', 'info')
}
</script>

<style scoped>
.filter-select { width: auto; min-width: 160px; }

.debts-list { display: flex; flex-direction: column; gap: 16px; }

.debt-card { transition: var(--transition); }
.debt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 8px;
}
.debt-client-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.debt-avatar {
  width: 42px; height: 42px;
  background: linear-gradient(135deg, var(--accent), #ff6030);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-brand); font-size: 14px; font-weight: 700; color: white;
  flex-shrink: 0;
}
.debt-client-name { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.client-id-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.debt-meta { font-size: 12px; }

.debt-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}
.da-item {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px;
  text-align: center;
}
.da-item-highlight {
  border: 1px solid rgba(255, 59, 92, 0.25);
  background: var(--danger-bg);
}
.da-label { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
.da-value { font-family: var(--font-brand); font-size: 16px; font-weight: 700; }

.debt-progress-label { display: flex; justify-content: space-between; margin-bottom: 4px; }
.debt-progress { margin-bottom: 10px; }

.debt-due { font-size: 13px; margin-bottom: 10px; }

/* Desglose de ventas del cliente */
.client-sales-list { margin-bottom: 10px; }
.sales-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
}
.sales-toggle:hover { text-decoration: underline; }

.client-sales-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}
.client-sale-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}
.csi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.csi-sale-id { font-size: 13px; font-weight: 600; }
.csi-updated {
  font-size: 11px;
  color: var(--accent);
  background: rgba(216,235,52,0.06);
  border: 1px solid rgba(216,235,52,0.18);
  border-radius: 4px;
  padding: 2px 7px;
  margin-bottom: 6px;
  display: inline-block;
}
.csi-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.csi-due { font-size: 12px; margin-bottom: 8px; }

.debt-products { margin-bottom: 10px; }
.dp-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.dp-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border-color);
  gap: 8px;
}
.dp-item:last-child { border-bottom: none; }
.dp-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-stepper {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.dp-step-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s, color 0.15s;
  padding: 0;
}
.dp-step-btn:hover { background: var(--accent-subtle); color: var(--accent); border-color: var(--accent); }
.dp-qty {
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 700;
  min-width: 22px;
  text-align: center;
  color: var(--text-primary);
}
.dp-qty-static { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
.dp-subtotal {
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  flex-shrink: 0;
}
.dp-remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}
.dp-remove-btn:hover { color: var(--danger, #ff3b5c); background: rgba(255,59,92,0.1); }

.payment-history { margin-bottom: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); padding: 10px 12px; }
.ph-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600; }
.ph-item { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; padding: 5px 0; border-bottom: 1px solid var(--border-color); }
.ph-item:last-child { border-bottom: none; }
.ph-amount { font-weight: 700; font-family: var(--font-brand); }
.ph-date { margin-left: auto; }
.ph-note { color: var(--text-muted); font-style: italic; }

.add-payment-section { margin-top: 12px; }
.paid-badge-row { margin-top: 12px; display: flex; justify-content: center; }

/* ---- Payment Modal ---- */
.payment-modal { max-width: 480px; }

.pm-summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 4px;
}
.pm-client { display: flex; align-items: center; gap: 12px; }
.pm-avatar { width: 36px; height: 36px; font-size: 12px; }

.pm-note-text {
  font-size: 12px;
  margin: 10px 0 0;
  line-height: 1.4;
}

.pm-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.pm-amount-item {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 10px;
  text-align: center;
}
.pm-balance {
  border: 1px solid rgba(255, 59, 92, 0.25);
  background: var(--danger-bg);
}
.pm-amount-label { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px; }
.pm-amount-value { font-family: var(--font-brand); font-size: 14px; font-weight: 700; }

.amount-input-wrapper { position: relative; display: flex; align-items: center; }
.amount-prefix {
  position: absolute; left: 14px;
  font-family: var(--font-brand); font-size: 18px; font-weight: 700;
  color: var(--text-secondary); pointer-events: none;
}
.amount-input { padding-left: 30px; font-family: var(--font-brand); font-size: 22px; font-weight: 700; height: 52px; }

.quick-amounts { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.quick-btn {
  flex: 1;
  min-width: 60px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  font-family: var(--font-body);
}
.quick-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }

.pm-preview {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pm-preview-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.pm-paid-label {
  display: flex; align-items: center; gap: 6px;
  color: var(--success); font-size: 13px; font-weight: 600;
  margin-top: 4px; padding-top: 6px;
  border-top: 1px solid var(--border-color);
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .filter-select { width: 100%; }

  .debt-amounts {
    grid-template-columns: 1fr 1fr;
  }
  .da-item-highlight {
    grid-column: 1 / -1;
  }
  .da-value { font-size: 14px; }

  .csi-amounts { flex-direction: column; gap: 4px; }

  .pm-amounts {
    grid-template-columns: 1fr 1fr;
  }
  .pm-balance {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .debt-amounts {
    grid-template-columns: 1fr;
  }
  .da-item-highlight { grid-column: 1; }

  .debt-client-name { font-size: 14px; }
  .da-value { font-size: 13px; }

  .pm-amounts { grid-template-columns: 1fr; }
  .pm-balance { grid-column: 1; }
  .quick-amounts { gap: 6px; }
}

.search-type-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-subtle);
  border: 1px solid rgba(216, 235, 52, 0.3);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.search-clear-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  transition: var(--transition);
}
.search-clear-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.empty-state-subtext {
  font-size: 13px;
  margin-top: 8px;
  max-width: 480px;
  line-height: 1.4;
}
</style>
