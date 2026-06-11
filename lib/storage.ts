import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase storage layer for the «Хто ти, любове?» bot.
 *
 * Two tables are used:
 *   1. "orders"    - finished orders
 *   2. "fsm_state" - per-user conversation state (so the bot is stateless / serverless friendly)
 *
 * This module runs entirely server-side (Telegram webhook) and uses the
 * service-role key, which bypasses RLS. It must never be imported into
 * client-side code.
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

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
  city: string
  postOffice: string
  screenshotFileId: string
  status?: string
}

/**
 * Append a finished order to the "orders" table. Returns the order id.
 */
export async function appendOrder(order: OrderRecord): Promise<string> {
  const { data, error } = await getClient()
    .from("orders")
    .insert({
      telegram_id: order.telegramId,
      username: order.username,
      full_name: order.fullName,
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
  city: string
  postOffice: string
}

/**
 * Read the FSM state for a single user. Returns null if none exists.
 */
export async function getState(telegramId: number): Promise<FsmState | null> {
  const { data, error } = await getClient()
    .from("fsm_state")
    .select("telegram_id, username, state, full_name, city, post_office")
    .eq("telegram_id", telegramId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    telegramId: Number(data.telegram_id),
    username: (data.username as string) ?? "",
    state: (data.state as string) ?? "",
    fullName: (data.full_name as string) ?? "",
    city: (data.city as string) ?? "",
    postOffice: (data.post_office as string) ?? "",
  }
}

/**
 * Insert or update the FSM state for a user.
 */
export async function setState(state: FsmState): Promise<void> {
  const { error } = await getClient().from("fsm_state").upsert(
    {
      telegram_id: state.telegramId,
      username: state.username,
      state: state.state,
      full_name: state.fullName,
      city: state.city,
      post_office: state.postOffice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  )

  if (error) throw error
}

/**
 * Remove the FSM state for a user (called after an order completes or resets).
 */
export async function clearState(telegramId: number): Promise<void> {
  const { error } = await getClient().from("fsm_state").delete().eq("telegram_id", telegramId)
  if (error) throw error
}

/**
 * Count all stored orders (used by the status dashboard).
 */
export async function countOrders(): Promise<number> {
  const { count, error } = await getClient().from("orders").select("*", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}
