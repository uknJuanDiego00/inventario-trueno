<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title"><Wallet :size="24" /> Deudas</h1>
        <p class="page-subtitle">Gestión de créditos y cobros pendientes</p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid-4" style="margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-icon"><ClipboardList :size="26" /></div>
        <div class="stat-value">{{ store.debts.length }}</div>
        <div class="stat-label">Total Deudas</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Clock :size="26" /></div>
        <div class="stat-value text-warning">{{ pendingDebts.length }}</div>
        <div class="stat-label">Pendientes</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><AlertOctagon :size="26" /></div>
        <div class="stat-value text-danger">{{ overdueDebts.length }}</div>
        <div class="stat-label">Vencidas</div>
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
        <input v-model="searchQuery" placeholder="Buscar por cliente..." />
      </div>
      <select class="form-control filter-select" v-model="filterStatus">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="vencida">Vencida</option>
        <option value="pagada">Pagada</option>
      </select>
    </div>

    <!-- Debts List -->
    <div v-if="filteredDebts.length === 0" class="card">
      <div class="empty-state">
        <div class="empty-state-icon"><Wallet :size="40" /></div>
        <div class="empty-state-text">No hay deudas registradas</div>
      </div>
    </div>

    <div class="debts-list">
      <div v-for="debt in filteredDebts" :key="debt.id" class="debt-card card">
        <div class="debt-header">
          <div class="debt-client-info">
            <div class="debt-avatar">{{ initials(debt.clientName) }}</div>
            <div>
              <div class="debt-client-name">{{ debt.clientName }}</div>
              <div class="text-muted debt-meta">Venta #{{ debt.saleId }} — {{ formatDateShort(debt.createdAt) }}</div>
            </div>
          </div>
          <div class="debt-status-area">
            <span :class="['badge', getDebtStatus(debt).badge]">{{ getDebtStatus(debt).label }}</span>
          </div>
        </div>

        <div class="debt-amounts">
          <div class="da-item">
            <span class="da-label">Total deuda</span>
            <span class="da-value fw-bold">{{ formatCurrency(debt.total) }}</span>
          </div>
          <div class="da-item">
            <span class="da-label">Pagado</span>
            <span class="da-value text-success">{{ formatCurrency(debt.paid) }}</span>
          </div>
          <div class="da-item da-item-highlight">
            <span class="da-label">Saldo pendiente</span>
            <span class="da-value text-danger fw-bold">{{ formatCurrency(debt.balance) }}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="debt-progress">
          <div class="debt-progress-label">
            <span class="text-muted" style="font-size:12px">Progreso de pago</span>
            <span class="text-muted" style="font-size:12px">{{ getProgressPct(debt) }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="`width:${getProgressPct(debt)}%; background:var(--success)`"></div>
          </div>
        </div>

        <div class="debt-due" :class="isOverdue(debt) && debt.status !== 'pagada' ? 'text-danger' : 'text-muted'">
          <Calendar :size="13" style="vertical-align:middle;margin-right:4px" /> Vence: {{ formatDateShort(debt.dueDate) }}
          <span v-if="isOverdue(debt) && debt.status !== 'pagada'"> <AlertTriangle :size="13" style="vertical-align:middle" /> VENCIDA</span>
        </div>

        <!-- Products -->
        <div class="debt-products" v-if="debt.items && debt.items.length">
          <div class="dp-label text-muted">Productos:</div>
          <div v-for="item in debt.items" :key="item.productId" class="dp-item">
            <span>{{ item.name }}</span>
            <span class="text-muted">{{ item.qty }}x {{ formatCurrency(item.price) }}</span>
          </div>
        </div>

        <!-- Payment History -->
        <div class="payment-history" v-if="debt.payments && debt.payments.length">
          <div class="ph-label text-muted">Historial de abonos ({{ debt.payments.length }}):</div>
          <div v-for="p in debt.payments" :key="p.id" class="ph-item">
            <span class="text-success ph-amount">+{{ formatCurrency(p.amount) }}</span>
            <span class="text-muted ph-date">{{ formatDate(p.date) }}</span>
            <span v-if="p.note" class="text-muted ph-note">{{ p.note }}</span>
          </div>
        </div>

        <!-- Add Payment Button -->
        <div v-if="debt.status !== 'pagada'" class="add-payment-section">
          <button class="btn btn-primary" style="width:100%" @click="openPaymentModal(debt)">
            <CreditCard :size="15" /> Registrar Abono
          </button>
        </div>
        <div v-else class="paid-badge-row">
          <span class="badge badge-success"><CheckCircle2 :size="14" /> Deuda Saldada</span>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <div v-if="paymentModal.open" class="modal-overlay" @click.self="closePaymentModal">
      <div class="modal payment-modal">
        <div class="modal-header">
          <h3 class="modal-title"><CreditCard :size="18" /> Registrar Abono</h3>
          <button class="modal-close" @click="closePaymentModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <!-- Debt Summary -->
          <div class="pm-summary">
            <div class="pm-client">
              <div class="debt-avatar pm-avatar">{{ initials(paymentModal.debt?.clientName || '') }}</div>
              <div>
                <div class="fw-bold" style="font-size:15px">{{ paymentModal.debt?.clientName }}</div>
                <div class="text-muted" style="font-size:12px">Venta #{{ paymentModal.debt?.saleId }}</div>
              </div>
            </div>
            <div class="pm-amounts">
              <div class="pm-amount-item">
                <span class="pm-amount-label">Total deuda</span>
                <span class="pm-amount-value">{{ formatCurrency(paymentModal.debt?.total) }}</span>
              </div>
              <div class="pm-amount-item">
                <span class="pm-amount-label">Ya pagado</span>
                <span class="pm-amount-value text-success">{{ formatCurrency(paymentModal.debt?.paid) }}</span>
              </div>
              <div class="pm-amount-item pm-balance">
                <span class="pm-amount-label">Saldo pendiente</span>
                <span class="pm-amount-value text-danger fw-bold">{{ formatCurrency(paymentModal.debt?.balance) }}</span>
              </div>
            </div>
          </div>

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
                :max="paymentModal.debt?.balance"
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
          <div v-if="paymentModal.amount > 0 && paymentModal.amount <= (paymentModal.debt?.balance || 0)" class="pm-preview">
            <div class="pm-preview-row">
              <span class="text-muted">Abono a registrar</span>
              <span class="text-success fw-bold">+{{ formatCurrency(paymentModal.amount) }}</span>
            </div>
            <div class="pm-preview-row">
              <span class="text-muted">Nuevo saldo</span>
              <span class="fw-bold" :class="(paymentModal.debt?.balance - paymentModal.amount) <= 0 ? 'text-success' : 'text-warning'">
                {{ formatCurrency(Math.max(0, (paymentModal.debt?.balance || 0) - paymentModal.amount)) }}
              </span>
            </div>
            <div v-if="(paymentModal.debt?.balance - paymentModal.amount) <= 0" class="pm-paid-label">
              <CheckCircle2 :size="14" /> Esta deuda quedará completamente saldada
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
import { Wallet, ClipboardList, Clock, AlertOctagon, BadgeDollarSign, Search, Calendar, AlertTriangle, CheckCircle2, CreditCard, X } from '@lucide/vue'

const searchQuery = ref('')
const filterStatus = ref('')

const paymentModal = reactive({
  open: false,
  debt: null,
  amount: 0,
  note: '',
  amountError: '',
})

const pendingDebts = computed(() => store.debts.filter(d => d.status === 'pendiente'))
const overdueDebts = computed(() => store.debts.filter(d => d.status === 'vencida'))

const filteredDebts = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return store.debts.filter(d => {
    const matchSearch = !q || d.clientName.toLowerCase().includes(q)
    const matchStatus = !filterStatus.value || d.status === filterStatus.value
    return matchSearch && matchStatus
  }).sort((a, b) => {
    const order = { vencida: 0, pendiente: 1, pagada: 2 }
    return order[a.status] - order[b.status]
  })
})

const initials = (name) => (name || 'X').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
const isOverdue = (debt) => debt.status !== 'pagada' && new Date(debt.dueDate) < new Date()
const getProgressPct = (debt) => {
  if (!debt || !debt.total || debt.total <= 0) return 100
  const paid = Number(debt.paid) || 0
  return Math.min(100, Math.max(0, Math.round((paid / debt.total) * 100)))
}

function openPaymentModal(debt) {
  paymentModal.open = true
  paymentModal.debt = debt
  paymentModal.amount = debt.balance
  paymentModal.note = ''
  paymentModal.amountError = ''
}

function closePaymentModal() {
  paymentModal.open = false
  paymentModal.debt = null
  paymentModal.amount = 0
  paymentModal.note = ''
  paymentModal.amountError = ''
}

function setQuickAmount(pct) {
  if (!paymentModal.debt) return
  paymentModal.amount = pct === 100
    ? paymentModal.debt.balance
    : Math.round((paymentModal.debt.balance * pct) / 100)
}

function submitPayment() {
  paymentModal.amountError = ''
  const amt = Number(paymentModal.amount) || 0
  if (amt <= 0) {
    paymentModal.amountError = 'Ingresa un monto válido mayor a 0'
    return
  }
  if (amt > (paymentModal.debt?.balance || 0)) {
    paymentModal.amountError = 'El abono supera el saldo pendiente'
    return
  }
  store.addPayment(paymentModal.debt.id, amt, paymentModal.note.trim())
  closePaymentModal()
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
.debt-client-name { font-size: 16px; font-weight: 700; }
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

.debt-products { margin-bottom: 10px; }
.dp-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.dp-item { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--border-color); }
.dp-item:last-child { border-bottom: none; }

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
</style>
