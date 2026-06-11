import { getBot } from "@/lib/bot"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * One-time helper to register the Telegram webhook.
 *
 * Visit: https://<your-domain>/api/setup
 * It points Telegram at https://<your-domain>/api/telegram.
 *
 * Uses VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL when available, or you can pass
 * ?url=https://your-domain explicitly.
 */
export async function GET(req: NextRequest) {
  try {
    const bot = getBot()

    const explicit = req.nextUrl.searchParams.get("url")
    const base =
      explicit ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : null)

    if (!base) {
      return Response.json(
        { ok: false, error: "Could not determine base URL. Pass ?url=https://your-domain" },
        { status: 400 },
      )
    }

    const webhookUrl = `${base.replace(/\/$/, "")}/api/telegram`
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET

    await bot.api.setWebhook(webhookUrl, {
      secret_token: secret || undefined,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    })

    const info = await bot.api.getWebhookInfo()
    return Response.json({ ok: true, webhookUrl, info })
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
