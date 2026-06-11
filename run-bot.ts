import { getBot } from "./lib/bot"
import { Bot } from "grammy"

async function main() {
  const bot: Bot = getBot()
  await bot.api.deleteWebhook({ drop_pending_updates: true })
  console.log("🤖 Бот запущено в режимі long-polling...")
  bot.start({
    onStart: (info) => console.log(`✅ Бот @${info.username} активний`),
  })
}

main().catch(console.error)
