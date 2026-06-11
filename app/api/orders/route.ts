import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function checkAuth(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? ""
  const [, token] = auth.split(" ")
  return token === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await getClient()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, status } = await request.json()
  const allowed = ["pending", "paid", "shipped", "done", "cancelled"]
  if (!allowed.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })

  const { error } = await getClient().from("orders").update({ status }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
