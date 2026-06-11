import { BookOpen, CheckCircle2, Circle, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

type EnvCheck = { key: string; label: string; set: boolean }

function envChecks(): EnvCheck[] {
  return [
    { key: "TELEGRAM_BOT_TOKEN", label: "Токен Telegram-бота", set: Boolean(process.env.TELEGRAM_BOT_TOKEN) },
    { key: "MONOBANK_JAR_URL", label: "Посилання на банку Monobank", set: Boolean(process.env.MONOBANK_JAR_URL) },
    { key: "ADMIN_TELEGRAM_ID", label: "Telegram ID адміністратора", set: Boolean(process.env.ADMIN_TELEGRAM_ID) },
    { key: "SUPABASE_URL", label: "URL проєкту Supabase", set: Boolean(process.env.SUPABASE_URL) },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      label: "Service-role ключ Supabase",
      set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  ]
}

export default function Page() {
  const checks = envChecks()
  const allSet = checks.every((c) => c.set)

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="size-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-pretty text-3xl font-semibold tracking-tight">
              Бот «Хто ти, любове?»
            </h1>
            <p className="text-pretty leading-relaxed text-muted-foreground">
              Telegram-бот для замовлення поетичної збірки. Дані замовлень зберігаються в Supabase,
              бот працює через webhook на Vercel.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Налаштування середовища</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                allSet ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {allSet ? "Готово" : "Потрібні змінні"}
            </span>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {checks.map((c) => (
              <li key={c.key} className="flex items-center gap-3">
                {c.set ? (
                  <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{c.label}</span>
                  <code className="text-xs text-muted-foreground">{c.key}</code>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-lg font-medium">Кроки запуску</h2>
          <ol className="mt-4 flex flex-col gap-4">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                1
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Додайте всі змінні середовища вище в налаштуваннях проєкту на Vercel.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                2
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Supabase вже підключено, а таблиці <code className="text-foreground">orders</code> та{" "}
                <code className="text-foreground">fsm_state</code> створено автоматично.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                3
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Після деплою відкрийте <code className="text-foreground">/api/setup</code>, щоб
                зареєструвати webhook у Telegram.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                4
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Напишіть боту <code className="text-foreground">/start</code> у Telegram, щоб
                перевірити роботу.
              </p>
            </li>
          </ol>

          <a
            href="/api/setup"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Зареєструвати webhook
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </section>
      </div>
    </main>
  )
}
