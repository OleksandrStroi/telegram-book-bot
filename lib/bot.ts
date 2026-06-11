import { Bot, InlineKeyboard, type Context } from "grammy"
import { appendOrder, clearState, getState, setState, type FsmState } from "./storage"

const BOOK_PRICE = "350 грн"

const STATE = {
  WAITING_FULL_NAME: "WAITING_FOR_FULL_NAME",
  WAITING_PHONE: "WAITING_FOR_PHONE",
  WAITING_CITY: "WAITING_FOR_CITY",
  WAITING_POST_OFFICE: "WAITING_FOR_POST_OFFICE",
  WAITING_PAYMENT: "WAITING_FOR_PAYMENT",
} as const

let botInstance: Bot | null = null

export function getBot(): Bot {
  if (botInstance) return botInstance
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN env var")
  const bot = new Bot(token)
  registerHandlers(bot)
  botInstance = bot
  return bot
}

function emptyState(ctx: Context, state: string): FsmState {
  return {
    telegramId: ctx.from?.id ?? 0,
    username: ctx.from?.username ?? "",
    state,
    fullName: "",
    phone: "",
    city: "",
    postOffice: "",
  }
}

function registerHandlers(bot: Bot) {
  bot.command("start", async (ctx) => {
    await clearState(ctx.from!.id)
    const keyboard = new InlineKeyboard().text("Замовити книгу", "order_start")
    await ctx.reply(
      [
        "Вітаю! 📖",
        "",
        "Це бот для замовлення поетичної збірки «Хто ти, любове?».",
        "",
        "Ніжна та щира книга про кохання, пошуки себе та людське тепло. " +
          "Кожен вірш — це маленька розмова з серцем.",
        "",
        `💰 Вартість: ${BOOK_PRICE}`,
        "🚚 Доставка: Нова Пошта (оплата доставки за тарифами перевізника)",
        "",
        "Натисніть кнопку нижче, щоб оформити замовлення 👇",
      ].join("\n"),
      { reply_markup: keyboard },
    )
  })

  bot.command("cancel", async (ctx) => {
    await clearState(ctx.from!.id)
    await ctx.reply("Замовлення скасовано. Щоб почати знову, натисніть /start")
  })

  bot.callbackQuery("order_start", async (ctx) => {
    await ctx.answerCallbackQuery()
    const state = emptyState(ctx, STATE.WAITING_FULL_NAME)
    await setState(state)
    await ctx.reply("Крок 1 з 5 ✍️\n\nВведіть, будь ласка, ПІБ отримувача (Прізвище, Ім'я та По батькові):")
  })

  bot.on("message:photo", async (ctx) => {
    const state = await getState(ctx.from.id)
    if (!state || state.state !== STATE.WAITING_PAYMENT) {
      await ctx.reply("Дякую за фото, але зараз воно не очікується. Щоб оформити замовлення, натисніть /start")
      return
    }
    const photos = ctx.message.photo
    const fileId = photos[photos.length - 1].file_id
    const orderId = await appendOrder({
      telegramId: state.telegramId,
      username: state.username,
      fullName: state.fullName,
      phone: state.phone,
      city: state.city,
      postOffice: state.postOffice,
      screenshotFileId: fileId,
      status: "pending",
    })
    await clearState(ctx.from.id)
    await notifyAdmin(ctx, state, fileId)
    await ctx.reply(
      [
        "Дякуємо за замовлення! 🙏",
        "",
        `Номер замовлення: ${orderId}`,
        "",
        "Ваш скріншот отримано. Замовлення прийнято в обробку — ми перевіримо оплату та надішлемо книгу Новою Поштою найближчим часом.",
        "",
        "Гарного дня! 💛",
      ].join("\n"),
    )
  })

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim()
    if (text.startsWith("/")) return
    const state = await getState(ctx.from.id)
    if (!state) {
      await ctx.reply("Щоб оформити замовлення книги, натисніть /start")
      return
    }
    switch (state.state) {
      case STATE.WAITING_FULL_NAME: {
        if (text.length < 5) {
          await ctx.reply("Будь ласка, введіть повне ПІБ (Прізвище, Ім'я та По батькові).")
          return
        }
        state.fullName = text
        state.state = STATE.WAITING_PHONE
        await setState(state)
        await ctx.reply("Крок 2 з 5 📞\n\nВведіть номер телефону отримувача (наприклад: +380671234567):")
        return
      }
      case STATE.WAITING_PHONE: {
        const phone = text.replace(/\s/g, "")
        if (!/^\+?[\d]{10,13}$/.test(phone)) {
          await ctx.reply("Будь ласка, введіть коректний номер телефону (наприклад: +380671234567).")
          return
        }
        state.phone = phone
        state.state = STATE.WAITING_CITY
        await setState(state)
        await ctx.reply("Крок 3 з 5 🏙\n\nВкажіть населений пункт (місто/село) для доставки:")
        return
      }
      case STATE.WAITING_CITY: {
        if (text.length < 2) {
          await ctx.reply("Будь ласка, вкажіть коректну назву населеного пункту.")
          return
        }
        state.city = text
        state.state = STATE.WAITING_POST_OFFICE
        await setState(state)
        await ctx.reply("Крок 4 з 5 🚚\n\nВкажіть номер або адресу відділення/поштомату Нової Пошти:")
        return
      }
      case STATE.WAITING_POST_OFFICE: {
        if (text.length < 1) {
          await ctx.reply("Будь ласка, вкажіть відділення Нової Пошти.")
          return
        }
        state.postOffice = text
        state.state = STATE.WAITING_PAYMENT
        await setState(state)
        const jarUrl = process.env.MONOBANK_JAR_URL ?? ""
        const summary = [
          "Крок 5 з 5 💳",
          "",
          "Перевірте, будь ласка, дані замовлення:",
          "",
          `📝 ПІБ: ${state.fullName}`,
          `📞 Телефон: ${state.phone}`,
          `📍 Місто: ${state.city}`,
          `🚚 Нова Пошта: ${state.postOffice}`,
          "",
          `💰 До оплати: ${BOOK_PRICE}`,
        ]
        if (jarUrl) summary.push("", `Оплатити можна за посиланням на банку:\n${jarUrl}`)
        summary.push("", "Після оплати, будь ласка, надішліть сюди скріншот квитанції 📸")
        await ctx.reply(summary.join("\n"), { link_preview_options: { is_disabled: true } })
        return
      }
      case STATE.WAITING_PAYMENT: {
        await ctx.reply("Очікую скріншот квитанції про оплату 📸. Будь ласка, надішліть фото.")
        return
      }
      default: {
        await ctx.reply("Щоб оформити замовлення, натисніть /start")
      }
    }
  })
}

async function notifyAdmin(ctx: Context, state: FsmState, fileId: string) {
  const adminId = process.env.ADMIN_TELEGRAM_ID
  if (!adminId) return
  const usernameLabel = state.username ? `@${state.username}` : `id:${state.telegramId}`
  const caption = [
    "📦 Нове замовлення книги!",
    "",
    `👤 Покупець: ${usernameLabel}`,
    `📝 ПІБ: ${state.fullName}`,
    `📞 Телефон: ${state.phone}`,
    `📍 Місто: ${state.city}`,
    `🚚 Нова Пошта: ${state.postOffice}`,
    "",
    "🖼 Скріншот оплати ⬆️",
  ].join("\n")
  try {
    await ctx.api.sendPhoto(adminId, fileId, { caption })
  } catch (err) {
    console.log("[bot] Failed to notify admin:", (err as Error).message)
  }
}
