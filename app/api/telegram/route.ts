import { webhookCallback } from "grammy"
import { getBot } from "@/lib/bot"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Telegram webhook endpoint.
 *
 * Set the webhook to: https://<your-domain>/api/telegram
 * Optionally protect it with a secret token (TELEGRAM_WEBHOOK_SECRET) — Telegram
 * sends it back in the X-Telegram-Bot-Api-Secret-Token header on every request.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const incoming = req.headers.get("x-telegram-bot-api-secret-token")
    if (incoming !== secret) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  const bot = getBot()
  const handle = webhookCallback(bot, "std/http")
  return handle(req)
}

export async function GET() {
  return new Response("Telegram webhook is alive. Use POST.", { status: 200 })
}
