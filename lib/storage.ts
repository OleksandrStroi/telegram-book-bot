import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cachedClient
}

export type OrderRecord = {
  telegramId: number
  username: string
  fullName: string
  phone: string
  city: string
  postOffice: string
  screenshotFileId: string
  status?: string
}

export async function appendOrder(order: OrderRecord): Promise<string> {
  const { data, error } = await getClient()
    .from("orders")
    .insert({
      telegram_id: order.telegramId,
      username: order.username,
      full_name: order.fullName,
      phone: order.phone,
      city: order.city,
      post_office: order.postOffice,
      screenshot_file_id: order.screenshotFileId,
      status: order.status ?? "pending",
    })
    .select("id")
    .single()

  if (error) throw error

  return `ORD-${data.id}`
}

export type FsmState = {
  telegramId: number
  username: string
  state: string
  fullName: string
  phone: string
  city: string
  postOffice: string
}

export async function getState(telegramId: number): Promise<FsmState | null> {
  const { data, error } = await getClient()
    .from("fsm_state")
    .select("telegram_id, username, state, full_name, phone, city, post_office")
    .eq("telegram_id", telegramId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    telegramId: Number(data.telegram_id),
    username: (data.username as string) ?? "",
    state: (data.state as string) ?? "",
    fullName: (data.full_name as string) ?? "",
    phone: (data.phone as string) ?? "",
    city: (data.city as string) ?? "",
    postOffice: (data.post_office as string) ?? "",
  }
}

export async function setState(state: FsmState): Promise<void> {
  const { error } = await getClient().from("fsm_state").upsert(
    {
      telegram_id: state.telegramId,
      username: state.username,
      state: state.state,
      full_name: state.fullName,
      phone: state.phone,
      city: state.city,
      post_office: state.postOffice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  )

  if (error) throw error
}

export async function clearState(telegramId: number): Promise<void> {
  const { error } = await getClient().from("fsm_state").delete().eq("telegram_id", telegramId)
  if (error) throw error
}

export async function countOrders(): Promise<number> {
  const { count, error } = await getClient().from("orders").select("*", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}
