import { InlineKeyboard } from "grammy"
import { mkdir, readFile, writeFile, rename } from "node:fs/promises"

const ADMIN_ID = 8207612971

const REFERRAL_URL = "https://po-ru4.click/smart/bvdTV2aDJ48lYW"

const VIP_CHANNEL_ID = "-1004332935139"
const ACADEMY_CHANNEL_ID = "-1003726976169"

const STORAGE_DIR = "/data/storage"
const STORAGE_FILE = `${STORAGE_DIR}/applications.json`

const BOT_VERSION = "GOLD TRADE ACCESS v3.0"

await mkdir(STORAGE_DIR, { recursive: true })

async function loadApplications() {
  try {
    const content = await readFile(STORAGE_FILE, "utf8")
    return JSON.parse(content)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    await writeFile(STORAGE_FILE, "{}")
    return {}
  }
}

let saveQueue = Promise.resolve()

function saveApplications(data) {
  saveQueue = saveQueue.then(async () => {
    const tempFile = `${STORAGE_FILE}.tmp`
    await writeFile(tempFile, JSON.stringify(data, null, 2))
    await rename(tempFile, STORAGE_FILE)
  })
  return saveQueue
}

function mainMenu() {
  return new InlineKeyboard()
    .text("👑 Вступить в команду", "join")
    .row()
    .text("📊 О проекте", "about")
    .row()
    .text("📌 Проверить заявку", "status")
    .row()
    .text("❓ Помощь", "help")
}

async function sendJoinInstructions(ctx) {
  await ctx.reply(
    `👑 ВСТУПЛЕНИЕ В GOLD TRADE

1. Зарегистрируйся по ссылке:
${REFERRAL_URL}

2. Пополни счёт минимум на 10$.

3. Отправь свой Pocket Option ID сюда, в бот.

После ручной проверки администратор рассмотрит заявку.

Торговать для получения доступа не обязательно.

Ссылка может быть партнёрской.

⚠️ Бинарные опционы связаны с высоким риском. Можно потерять весь депозит. Прибыль не гарантируется.`
  )
}

export function registerCommands(bot) {
  console.log(`[GOLD TRADE] Загружена версия ${BOT_VERSION}`)

  bot.command("version", async (ctx) => {
    await ctx.reply(`Бот работает.\nВерсия: ${BOT_VERSION}`)
  })

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `👑 GOLD TRADE | EVGEN

Добро пожаловать!

Выбери нужный раздел:`,
      { reply_markup: mainMenu() }
    )
  })

  bot.command("join", sendJoinInstructions)

  bot.command("about", async (ctx) => {
    await ctx.reply(
      `📊 GOLD TRADE | EVGEN

👑 VIP GOLD TRADE
Совместные торговые сессии, сигналы и LIVE.

💬 CHAT GOLD TRADE
Общение участников.

🎓 ACADEMY GOLD TRADE
Обучающие материалы.

📢 GOLD TRADE
Основной канал проекта.`
    )
  })

  bot.command("status", async (ctx) => {
    const applications = await loadApplications()
    const application = applications[String(ctx.from.id)]

    if (!application) {
      return ctx.reply(
        "📌 У тебя пока нет заявки.\nНажми /join, чтобы подать её."
      )
    }

    const statuses = {
      pending: "⏳ Заявка ожидает проверки администратором.",
      approved: "✅ Заявка одобрена. Доступ предоставлен.",
      rejected: "❌ Заявка отклонена. Обратись к администратору."
    }

    await ctx.reply(
      `📌 СТАТУС ЗАЯВКИ

Pocket Option ID: ${application.poId}

${statuses[application.status] || "Статус неизвестен."}`
    )
  })

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `❓ ПОМОЩЬ

/start — главное меню
/join — вступление
/about — о проекте
/status — статус заявки
/chatid — твой Telegram ID
/version — версия бота`
    )
  })

  bot.command("chatid", async (ctx) => {
    await ctx.reply(`Твой Telegram ID: ${ctx.from.id}`)
  })
  
  bot.command("groupid", async (ctx) => {
await ctx.reply(
Название группы: ${ctx.chat.title || "Без названия"}\nID группы: ${ctx.chat.id}
)
})

  // Приём Pocket Option ID от пользователей
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim()

    if (text.startsWith("/")) return
    if (ctx.from.id === ADMIN_ID) return

    if (!/^\d{4,20}$/.test(text)) {
      return ctx.reply(
        "Отправь свой числовой Pocket Option ID.\nДругие данные отправлять не нужно."
      )
    }

    const userId = String(ctx.from.id)
    const applications = await loadApplications()
    const existing = applications[userId]

    if (existing?.status === "pending") {
      return ctx.reply("⏳ Твоя заявка уже ожидает проверки.")
    }

    if (existing?.status === "approved") {
      return ctx.reply("✅ Твоя заявка уже одобрена.")
    }

    const application = {
      userId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      poId: text,
      status: "pending",
      createdAt: new Date().toISOString()
    }

    applications[userId] = application
    await saveApplications(applications)

    const keyboard = new InlineKeyboard()
      .text("✅ Одобрить", `approve:${userId}`)
      .text("❌ Отклонить", `reject:${userId}`)

    await ctx.api.sendMessage(
      ADMIN_ID,
      `📩 НОВАЯ ЗАЯВКА GOLD TRADE

👤 Имя: ${application.firstName || "Не указано"}
📱 Username: ${application.username ? "@" + application.username : "Нет"}
🆔 Telegram ID: ${userId}
💳 Pocket Option ID: ${text}

⏳ Ожидает ручной проверки.`,
      { reply_markup: keyboard }
    )

    await ctx.reply(
      "✅ Заявка принята!\n\nАдминистратор проверит регистрацию и пополнение вручную. После проверки ты получишь уведомление."
    )
  })

  // Одобрение заявки
  bot.callbackQuery(/^approve:(\d+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCallbackQuery({
        text: "Нет доступа.",
        show_alert: true
      })
    }

    const userId = ctx.match[1]
    const applications = await loadApplications()
    const application = applications[userId]

    if (!application || application.status !== "pending") {
      return ctx.answerCallbackQuery({
        text: "Заявка уже обработана или не найдена.",
        show_alert: true
      })
    }

    try {
      const expireDate = Math.floor(Date.now() / 1000) + 86400

      const vipInvite = await ctx.api.createChatInviteLink(
        VIP_CHANNEL_ID,
        {
          member_limit: 1,
          expire_date: expireDate,
          name: "GOLD TRADE VIP"
        }
      )

      const academyInvite = await ctx.api.createChatInviteLink(
        ACADEMY_CHANNEL_ID,
        {
          member_limit: 1,
          expire_date: expireDate,
          name: "GOLD TRADE ACADEMY"
        }
      )

      application.status = "approved"
      application.approvedAt = new Date().toISOString()
      application.vipInvite = vipInvite.invite_link
      application.academyInvite = academyInvite.invite_link

      await saveApplications(applications)

      await ctx.api.sendMessage(
        Number(userId),
        `🎉 ТВОЯ ЗАЯВКА ОДОБРЕНА!

Добро пожаловать в GOLD TRADE!

👑 VIP GOLD TRADE:
${vipInvite.invite_link}

🎓 ACADEMY GOLD TRADE:
${academyInvite.invite_link}

⚠️ Каждая ссылка действует 24 часа и рассчитана на одно вступление.

Сохрани ссылки и вступи в сообщества.`
      )

      await ctx.answerCallbackQuery({
        text: "Заявка одобрена!"
      })

      await ctx.editMessageText(
        `✅ ЗАЯВКА ОДОБРЕНА

Telegram ID: ${userId}
Pocket Option ID: ${application.poId}

Доступ выдан.`
      )
    } catch (error) {
      console.error("[GOLD TRADE] Ошибка одобрения:", error)

      await ctx.answerCallbackQuery({
        text: "Ошибка выдачи доступа. Проверь права бота.",
        show_alert: true
      })
    }
  })

  // Отклонение заявки
  bot.callbackQuery(/^reject:(\d+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCallbackQuery({
        text: "Нет доступа.",
        show_alert: true
      })
    }

    const userId = ctx.match[1]
    const applications = await loadApplications()
    const application = applications[userId]

    if (!application || application.status !== "pending") {
      return ctx.answerCallbackQuery({
        text: "Заявка уже обработана или не найдена.",
        show_alert: true
      })
    }

    application.status = "rejected"
    application.rejectedAt = new Date().toISOString()

    await saveApplications(applications)

    await ctx.api.sendMessage(
      Number(userId),
      "❌ Твоя заявка отклонена.\n\nЕсли считаешь, что произошла ошибка, обратись к администратору."
    )

    await ctx.answerCallbackQuery({
      text: "Заявка отклонена."
    })

    await ctx.editMessageText(
      `❌ ЗАЯВКА ОТКЛОНЕНА

Telegram ID: ${userId}
Pocket Option ID: ${application.poId}`
    )
  })

  // Кнопки главного меню
  bot.callbackQuery("join", async (ctx) => {
    await ctx.answerCallbackQuery()
    await sendJoinInstructions(ctx)
  })

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("GOLD TRADE | VIP GOLD TRADE | CHAT GOLD TRADE | ACADEMY GOLD TRADE")
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("Используй команду /status для проверки заявки.")
  })

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("Для начала работы нажми /start.")
  })
}
