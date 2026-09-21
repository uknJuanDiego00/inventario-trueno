// Utility functions for Trueno 219

export function formatCurrency(value, currency = 'COP') {
  const num = Number.isFinite(Number(value)) ? Number(value) : 0
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `$ ${Math.round(num).toLocaleString('es-CO')}`
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function getStockStatus(product, threshold = 5) {
  const min = product.minStock || threshold
  if (product.stock <= 0) return { label: 'Agotado', badge: 'badge-danger' }
  if (product.stock <= min) return { label: 'Stock bajo', badge: 'badge-warning' }
  return { label: 'Disponible', badge: 'badge-success' }
}

export function getDebtStatus(debt) {
  if (!debt) return { label: 'Desconocido', badge: 'badge-secondary' }
  if (debt.status === 'pagada') return { label: 'Pagada', badge: 'badge-success' }
  if (debt.status === 'vencida') return { label: 'Vencida', badge: 'badge-danger' }
  return { label: 'Pendiente', badge: 'badge-warning' }
}

export function getWeeklySalesData(sales) {
  const days = []
  const labels = []
  const now = new Date()
  const safeSales = Array.isArray(sales) ? sales.filter(s => s && s.date && !isNaN(new Date(s.date).getTime())) : []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dayStr = d.toDateString()
    labels.push(d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit' }))
    const total = safeSales
      .filter(s => new Date(s.date).toDateString() === dayStr)
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0)
    days.push(total)
  }
  return { labels, data: days }
}

export function getMonthlySalesData(sales) {
  const now = new Date()
  const monthsMap = {}
  const safeSales = Array.isArray(sales) ? sales.filter(s => s && s.date && !isNaN(new Date(s.date).getTime())) : []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    monthsMap[key] = { label: d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }), total: 0 }
  }
  safeSales.forEach(s => {
    const d = new Date(s.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (monthsMap[key]) monthsMap[key].total += (Number(s.total) || 0)
  })
  const entries = Object.values(monthsMap)
  return { labels: entries.map(e => e.label), data: entries.map(e => e.total) }
}
