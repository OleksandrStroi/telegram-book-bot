"use client"

import { useState, useEffect, useCallback } from "react"

const ADMIN_SECRET = "oleksandrstroi:oleksandrstroi1"

type Order = {
  id: number
  telegram_id: number
  username: string
  full_name: string
  phone: string
  city: string
  post_office: string
  screenshot_file_id: string
  status: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Нове",         color: "#f59e0b" },
  paid:      { label: "Оплачено",     color: "#3b82f6" },
  shipped:   { label: "Відправлено",  color: "#8b5cf6" },
  done:      { label: "Виконано",     color: "#22c55e" },
  cancelled: { label: "Скасовано",    color: "#ef4444" },
}

const ALL_STATUSES = Object.entries(STATUS_LABELS)

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ── Login screen ────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [login, setLogin] = useState("")
  const [pass, setPass] = useState("")
  const [err, setErr] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (`${login}:${pass}` === ADMIN_SECRET) {
      sessionStorage.setItem("admin_auth", "1")
      onLogin()
    } else {
      setErr("Невірний логін або пароль")
    }
  }

  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <div style={s.loginIcon}>📖</div>
        <h1 style={s.loginTitle}>Адмін-кабінет</h1>
        <p style={s.loginSub}>«Хто ти, любове?»</p>
        <form onSubmit={submit} style={s.form}>
          <input
            style={s.input}
            placeholder="Логін"
            value={login}
            onChange={e => setLogin(e.target.value)}
            autoComplete="username"
          />
          <input
            style={s.input}
            type="password"
            placeholder="Пароль"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoComplete="current-password"
          />
          {err && <p style={s.err}>{err}</p>}
          <button style={s.btn} type="submit">Увійти</button>
        </form>
      </div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [updating, setUpdating] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    })
    if (res.ok) setOrders(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function changeStatus(id: number, status: string) {
    setUpdating(id)
    await fetch("/api/orders", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ id, status }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    setUpdating(null)
  }

  const visible = filter === "all" ? orders : orders.filter(o => o.status === filter)
  const counts = Object.fromEntries(
    Object.keys(STATUS_LABELS).map(k => [k, orders.filter(o => o.status === k).length])
  )

  return (
    <div style={s.dashWrap}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerIcon}>📖</span>
          <div>
            <h1 style={s.headerTitle}>Замовлення</h1>
            <p style={s.headerSub}>«Хто ти, любове?»</p>
          </div>
        </div>
        <button style={s.logoutBtn} onClick={onLogout}>Вийти</button>
      </header>

      {/* Stats */}
      <div style={s.stats}>
        {ALL_STATUSES.map(([key, { label, color }]) => (
          <div key={key} style={s.statCard}>
            <span style={{ ...s.statDot, background: color }} />
            <span style={s.statCount}>{counts[key] ?? 0}</span>
            <span style={s.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(filter === "all" ? s.tabActive : {}) }}
          onClick={() => setFilter("all")}
        >
          Всі ({orders.length})
        </button>
        {ALL_STATUSES.map(([key, { label, color }]) => (
          <button
            key={key}
            style={{
              ...s.tab,
              ...(filter === key ? { ...s.tabActive, borderColor: color, color } : {}),
            }}
            onClick={() => setFilter(key)}
          >
            {label} ({counts[key] ?? 0})
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div style={s.empty}>Завантаження...</div>
      ) : visible.length === 0 ? (
        <div style={s.empty}>Замовлень немає</div>
      ) : (
        <div style={s.cards}>
          {visible.map(order => {
            const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "#888" }
            return (
              <div key={order.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={s.orderId}>ORD-{order.id}</div>
                  <span style={{ ...s.badge, background: st.color + "22", color: st.color }}>
                    {st.label}
                  </span>
                </div>

                <div style={s.cardBody}>
                  <Row icon="📝" label="ПІБ" value={order.full_name} />
                  <Row icon="📞" label="Телефон" value={order.phone || "—"} />
                  <Row icon="📍" label="Місто" value={order.city} />
                  <Row icon="🚚" label="Нова Пошта" value={order.post_office} />
                  {order.username && (
                    <Row icon="👤" label="Telegram" value={`@${order.username}`} />
                  )}
                  <Row icon="🕐" label="Дата" value={formatDate(order.created_at)} />
                </div>

                <div style={s.cardFooter}>
                  <span style={s.statusLabel}>Змінити статус:</span>
                  <div style={s.statusBtns}>
                    {ALL_STATUSES.map(([key, { label, color }]) => (
                      <button
                        key={key}
                        disabled={order.status === key || updating === order.id}
                        onClick={() => changeStatus(order.id, key)}
                        style={{
                          ...s.statusBtn,
                          ...(order.status === key
                            ? { background: color, color: "#fff", opacity: 1 }
                            : { borderColor: color, color }),
                        }}
                      >
                        {updating === order.id && order.status !== key ? "..." : label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={s.row}>
      <span style={s.rowIcon}>{icon}</span>
      <span style={s.rowLabel}>{label}:</span>
      <span style={s.rowValue}>{value}</span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "1") setAuthed(true)
  }, [])

  function logout() {
    sessionStorage.removeItem("admin_auth")
    setAuthed(false)
  }

  return authed
    ? <Dashboard onLogout={logout} />
    : <LoginScreen onLogin={() => setAuthed(true)} />
}

// ── Styles ────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  // Login
  loginWrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    padding: 16,
  },
  loginCard: {
    background: "#fff", borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 380,
    boxShadow: "0 24px 80px rgba(0,0,0,0.4)", textAlign: "center",
  },
  loginIcon: { fontSize: 48, marginBottom: 12 },
  loginTitle: { fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "#1a1a2e" },
  loginSub: { fontSize: 14, color: "#888", margin: "0 0 32px", fontStyle: "italic" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb",
    fontSize: 15, outline: "none", transition: "border .2s",
    fontFamily: "inherit",
  },
  err: { color: "#ef4444", fontSize: 13, margin: 0 },
  btn: {
    padding: "13px", borderRadius: 10, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg, #0f3460, #533483)",
    color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 4,
    fontFamily: "inherit",
  },

  // Dashboard
  dashWrap: {
    minHeight: "100vh", background: "#f8f9fc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #1a1a2e, #0f3460)",
    padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 10,
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerIcon: { fontSize: 32 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 },
  headerSub: { color: "rgba(255,255,255,.5)", fontSize: 12, margin: 0, fontStyle: "italic" },
  logoutBtn: {
    background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)",
    color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontFamily: "inherit",
  },

  // Stats
  stats: {
    display: "flex", gap: 12, padding: "20px 24px", overflowX: "auto",
    background: "#fff", borderBottom: "1px solid #e5e7eb",
  },
  statCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "12px 20px", borderRadius: 12, background: "#f8f9fc",
    border: "1px solid #e5e7eb", minWidth: 90,
  },
  statDot: { width: 10, height: 10, borderRadius: "50%" },
  statCount: { fontSize: 22, fontWeight: 700, color: "#1a1a2e" },
  statLabel: { fontSize: 11, color: "#888", textAlign: "center" as const },

  // Tabs
  tabs: {
    display: "flex", gap: 8, padding: "16px 24px", overflowX: "auto",
    background: "#fff", borderBottom: "1px solid #e5e7eb",
  },
  tab: {
    padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e7eb",
    background: "none", cursor: "pointer", fontSize: 13, color: "#666",
    whiteSpace: "nowrap" as const, fontFamily: "inherit", transition: "all .15s",
  },
  tabActive: {
    borderColor: "#0f3460", color: "#0f3460", background: "#0f346012",
    fontWeight: 600,
  },

  // Cards
  cards: { padding: 24, display: "flex", flexDirection: "column" as const, gap: 16, maxWidth: 900, margin: "0 auto" },
  empty: { padding: 60, textAlign: "center" as const, color: "#888", fontSize: 15 },
  card: {
    background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
    boxShadow: "0 2px 12px rgba(0,0,0,.04)", overflow: "hidden",
  },
  cardTop: {
    padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
    borderBottom: "1px solid #f3f4f6",
  },
  orderId: { fontWeight: 700, fontSize: 16, color: "#1a1a2e" },
  badge: {
    padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  cardBody: { padding: "16px 20px", display: "flex", flexDirection: "column" as const, gap: 8 },
  row: { display: "flex", alignItems: "center", gap: 8, fontSize: 14 },
  rowIcon: { fontSize: 16, width: 22, flexShrink: 0 },
  rowLabel: { color: "#888", minWidth: 90, flexShrink: 0 },
  rowValue: { color: "#1a1a2e", fontWeight: 500 },

  cardFooter: {
    padding: "14px 20px", background: "#f8f9fc", borderTop: "1px solid #f3f4f6",
  },
  statusLabel: { fontSize: 12, color: "#888", display: "block", marginBottom: 8 },
  statusBtns: { display: "flex", gap: 6, flexWrap: "wrap" as const },
  statusBtn: {
    padding: "5px 12px", borderRadius: 7, border: "1.5px solid", cursor: "pointer",
    fontSize: 12, fontWeight: 500, background: "transparent", transition: "all .15s",
    fontFamily: "inherit", opacity: 0.85,
  },
}
