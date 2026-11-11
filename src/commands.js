import { InlineKeyboard } from "grammy"
import { mkdir, readFile, writeFile, rename } from "node:fs/promises"

// ===============================
// GOLD TRADE CONFIGURATION
// ===============================

const ADMIN_ID = 8207612971

const BOT_VERSION = "GOLD TRADE ACCESS v4.0"

const REFERRAL_URL = "https://po-ru4.click/smart/bvdTV2aDJ48lYW"

const MAIN_CHANNEL_URL = "https://t.me/goldtrade_evgen"

const VIP_CHANNEL_ID = "-1004332935139"
const CHAT_GROUP_ID = "-1003738170914"
const ACADEMY_CHANNEL_ID = "-1003726976169"

const STORAGE_DIR = "/data/storage"
const STORAGE_FILE = `${STORAGE_DIR}/applications.json`

await mkdir(STORAGE_DIR, { recursive: true })

// ===============================
// APPLICATION STORAGE
// ===============================

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
  const operation = saveQueue.catch(() => {}).then(async () => {
    const tempFile = `${STORAGE_FILE}.tmp`

    await writeFile(tempFile, JSON.stringify(data, null, 2))
    await rename(tempFile, STORAGE_FILE)
  })

  saveQueue = operation
  return operation
}

// ===============================
// MAIN MENU
// ===============================

function mainMenu() {
  return new InlineKeyboard()
    .text("👑 Вступить в команду", "join")
    .row()
    .text("📊 О проекте", "about")
    .row()
    .text("📌 Моя заявка", "status")
    .row()
    .text("🎓 Академия", "academy")
    .row()
    .text("💬 Помощь", "help")
    .row()
    .url("📢 Основной канал", MAIN_CHANNEL_URL)
}

function backMenu() {
  return new InlineKeyboard()
    .text("⬅️ Главное меню", "home")
}

function aboutMenu() {
  return new InlineKeyboard()
    .url("📢 GOLD TRADE", MAIN_CHANNEL_URL)
    .row()
    .text("⬅️ Главное меню", "home")
}

// ===============================
// WELCOME
// ===============================

async function showWelcome(ctx) {
  await ctx.reply(
    `👑 GOLD TRADE | EVGEN

Добро пожаловать в нашу команду!

Это пространство для тех, кто интересуется торговлей, изучает рынок и хочет развиваться вместе с сообществом.

Выбирай направление, знакомься с проектом и присоединяйся к GOLD TRADE.

━━━━━━━━━━━━━━━━━━

📊 Торговые сессии
🎓 Обучающие материалы
💬 Общение участников
📈 Разборы торговых ситуаций

━━━━━━━━━━━━━━━━━━

Выбери нужный раздел ниже:`,
    { reply_markup: mainMenu() }
  )
}

// ===============================
// ABOUT PROJECT
// ===============================

async function showAbout(ctx) {
  await ctx.reply(
    `📊 О ПРОЕКТЕ GOLD TRADE

👑 GOLD TRADE
Основной канал проекта. Новости, объявления, публикации и важная информация.

━━━━━━━━━━━━━━━━━━

🔥 VIP GOLD TRADE
Закрытое пространство для совместных торговых сессий, сигналов и прямых эфиров.

━━━━━━━━━━━━━━━━━━

💬 CHAT GOLD TRADE
Общение участников, обсуждение рынка, обмен опытом и взаимная поддержка.

━━━━━━━━━━━━━━━━━━

🎓 ACADEMY GOLD TRADE
Обучающие материалы, основы торговли, разборы и развитие навыков.

━━━━━━━━━━━━━━━━━━

Наша цель — создать сообщество, в котором участники могут учиться, обмениваться опытом и вместе изучать рынок.

⚠️ Торговля бинарными опционами связана с высоким риском. Можно потерять весь депозит. Прибыль не гарантируется.`,
    { reply_markup: aboutMenu() }
  )
}

// ===============================
// JOIN INSTRUCTIONS
// ===============================

async function sendJoinInstructions(ctx) {
  await ctx.reply(
    `👑 ВСТУПЛЕНИЕ В GOLD TRADE

Чтобы подать заявку:

1️⃣ Зарегистрируйся в Pocket Option по ссылке:

${REFERRAL_URL}

2️⃣ Пополни счёт минимум на 10$.

3️⃣ Отправь свой числовой Pocket Option ID сюда, в бот.

━━━━━━━━━━━━━━━━━━

После отправки ID администратор вручную проверит регистрацию и пополнение.

Торговать для получения доступа не обязательно.

Регистрация осуществляется по партнёрской ссылке проекта.

⚠️ Бинарные опционы связаны с высоким риском. Можно потерять весь депозит. Прибыль не гарантируется.`,
    {
      reply_markup: new InlineKeyboard()
        .text("📢 Основной канал", "main_channel_info")
        .row()
        .text("⬅️ Главное меню", "home")
    }
  )
}

// ===============================
// STATUS
// ===============================

async function showStatus(ctx) {
  const applications = await loadApplications()
  const application = applications[String(ctx.from.id)]

  if (!application) {
    return ctx.reply(
      `📌 ТВОЯ ЗАЯВКА

Заявка пока не найдена.

Чтобы присоединиться к команде, нажми «Вступить в команду».`,
      { reply_markup: mainMenu() }
    )
  }

  if (application.status === "pending") {
    return ctx.reply(
      `⏳ ЗАЯВКА НА ПРОВЕРКЕ

Pocket Option ID: ${application.poId}

Администратор проверяет твою регистрацию и пополнение.

После проверки ты получишь уведомление.`,
      { reply_markup: backMenu() }
    )
  }

  if (application.status === "rejected") {
    return ctx.reply(
      `❌ ЗАЯВКА ОТКЛОНЕНА

Если считаешь, что произошла ошибка, обратись к администратору.`,
      { reply_markup: backMenu() }
    )
  }

  if (application.status === "approved") {
    return ctx.reply(
      `✅ ТВОЯ ЗАЯВКА ОДОБРЕНА!

Ты получил доступ к GOLD TRADE.

👑 VIP GOLD TRADE
💬 CHAT GOLD TRADE
🎓 ACADEMY GOLD TRADE

Если приглашения истекли или потерялись, воспользуйся кнопкой ниже.`,
      {
        reply_markup: new InlineKeyboard()
          .text("🔄 Получить новые приглашения", "resend_invites")
          .row()
          .text("⬅️ Главное меню", "home")
      }
    )
  }
}

// ===============================
// CREATE INVITATIONS
// ===============================

async function createInvitations(api) {
  const expireDate = Math.floor(Date.now() / 1000) + 86400

  const vip = await api.createChatInviteLink(VIP_CHANNEL_ID, {
    member_limit: 1,
    expire_date: expireDate,
    name: "GOLD TRADE VIP"
  })

  const chat = await api.createChatInviteLink(CHAT_GROUP_ID, {
    member_limit: 1,
    expire_date: expireDate,
    name: "GOLD TRADE CHAT"
  })

  const academy = await api.createChatInviteLink(ACADEMY_CHANNEL_ID, {
    member_limit: 1,
    expire_date: expireDate,
    name: "GOLD TRADE ACADEMY"
  })

  return {
    vipInvite: vip.invite_link,
    chatInvite: chat.invite_link,
    academyInvite: academy.invite_link
  }
}

async function sendInvitations(api, userId, invitations) {
  await api.sendMessage(
    Number(userId),
    `🎉 ДОБРО ПОЖАЛОВАТЬ В GOLD TRADE!

Твоя заявка одобрена!

━━━━━━━━━━━━━━━━━━

👑 VIP GOLD TRADE
${invitations.vipInvite}

━━━━━━━━━━━━━━━━━━

💬 CHAT GOLD TRADE
${invitations.chatInvite}

━━━━━━━━━━━━━━━━━━

🎓 ACADEMY GOLD TRADE
${invitations.academyInvite}

━━━━━━━━━━━━━━━━━━

⚠️ Каждая ссылка рассчитана на одно вступление и действует 24 часа.

Сохрани приглашения и присоединяйся к сообществам!`
  )
}

// ===============================
// COMMAND REGISTRATION
// ===============================

export function registerCommands(bot) {
  console.log(`[GOLD TRADE] Загружена версия ${BOT_VERSION}`)

  bot.command("start", showWelcome)

  bot.command("version", async (ctx) => {
    await ctx.reply(`GOLD TRADE ACCESS\nВерсия: ${BOT_VERSION}`)
  })

  bot.command("join", sendJoinInstructions)

  bot.command("about", showAbout)

  bot.command("status", showStatus)

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `💬 ПОМОЩЬ GOLD TRADE

/start — главное меню
/join — вступление в команду
/about — о проекте
/status — статус заявки
/resend — повторная выдача приглашений
/chatid — твой Telegram ID
/groupid — ID группы
/version — версия бота

Если возникли вопросы по заявке, обратись к администратору.`,
      { reply_markup: backMenu() }
    )
  })

  bot.command("chatid", async (ctx) => {
    await ctx.reply("Твой Telegram ID: " + ctx.from.id)
  })

  bot.command("groupid", async (ctx) => {
    await ctx.reply(
      "Название группы: " + (ctx.chat.title || "Без названия") +
      "\nID группы: " + ctx.chat.id
    )
  })

  // Повторная выдача приглашений
  bot.command("resend", async (ctx) => {
    const applications = await loadApplications()
    const userId = String(ctx.from.id)
    const application = applications[userId]

    if (!application || application.status !== "approved") {
      return ctx.reply("Повторная выдача доступна только после одобрения заявки.")
    }

    try {
      const invitations = await createInvitations(ctx.api)

      application.vipInvite = invitations.vipInvite
      application.chatInvite = invitations.chatInvite
      application.academyInvite = invitations.academyInvite

      await saveApplications(applications)
      await sendInvitations(ctx.api, userId, invitations)

    } catch (error) {
      console.error("[GOLD TRADE] Ошибка повторной выдачи:", error)
      await ctx.reply("Не удалось создать приглашения. Обратись к администратору.")
    }
  })

  // =============================
  // RECEIVE POCKET OPTION ID
  // =============================

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim()

    if (text.startsWith("/")) return
    if (ctx.from.id === ADMIN_ID) return

    if (!/^\d{4,20}$/.test(text)) {
      return ctx.reply(
        "Отправь только числовой Pocket Option ID. Пароли и другие личные данные не нужны."
      )
    }

    const userId = String(ctx.from.id)
    const applications = await loadApplications()
    const existing = applications[userId]

    if (existing?.status === "pending") {
      return ctx.reply("⏳ Твоя заявка уже ожидает проверки.")
    }

    if (existing?.status === "approved") {
      return ctx.reply("✅ Твоя заявка уже одобрена. Используй /status.")
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

    try {
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
        "✅ Заявка принята!\n\nАдминистратор проверит регистрацию и пополнение вручную."
      )
    } catch (error) {
      console.error("[GOLD TRADE] Ошибка отправки заявки:", error)
      await ctx.reply(
        "Заявка сохранена, но уведомление администратору не отправлено. Попробуй позже или обратись к администратору."
      )
    }
  })

  // =============================
  // APPROVE APPLICATION
  // =============================

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
      const invitations = await createInvitations(ctx.api)

      application.status = "approved"
      application.approvedAt = new Date().toISOString()
      Object.assign(application, invitations)

      await saveApplications(applications)

      await sendInvitations(ctx.api, userId, invitations)

      await ctx.answerCallbackQuery({
        text: "Заявка одобрена!"
      })

      await ctx.editMessageText(
        `✅ ЗАЯВКА ОДОБРЕНА

Telegram ID: ${userId}
Pocket Option ID: ${application.poId}

Выданы приглашения в VIP, CHAT и ACADEMY.`
      )
    } catch (error) {
      console.error("[GOLD TRADE] Ошибка одобрения:", error)

      await ctx.answerCallbackQuery({
        text: "Ошибка. Проверь права бота и попробуй снова.",
        show_alert: true
      })
    }
  })

  // =============================
  // REJECT APPLICATION
  // =============================

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

    try {
      await ctx.api.sendMessage(
        Number(userId),
        "❌ Твоя заявка отклонена.\n\nЕсли считаешь, что произошла ошибка, обратись к администратору."
      )
    } catch (error) {
      console.error("[GOLD TRADE] Не удалось уведомить пользователя:", error)
    }

    await ctx.answerCallbackQuery({
      text: "Заявка отклонена."
    })

    await ctx.editMessageText(
      `❌ ЗАЯВКА ОТКЛОНЕНА

Telegram ID: ${userId}
Pocket Option ID: ${application.poId}`
    )
  })

  // =============================
  // MENU BUTTONS
  // =============================

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showWelcome(ctx)
  })

  bot.callbackQuery("join", async (ctx) => {
    await ctx.answerCallbackQuery()
    await sendJoinInstructions(ctx)
  })

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showAbout(ctx)
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showStatus(ctx)
  })

  bot.callbackQuery("academy", async (ctx) => {
    await ctx.answerCallbackQuery()

    const applications = await loadApplications()
    const application = applications[String(ctx.from.id)]

    if (application?.status === "approved") {
      return ctx.reply(
        "🎓 Ты одобрен для доступа в ACADEMY GOLD TRADE.\n\nЕсли ссылка потерялась, нажми «Моя заявка» и запроси новые приглашения.",
        { reply_markup: backMenu() }
      )
    }

    await ctx.reply(
      "🎓 ACADEMY GOLD TRADE

Обучающие материалы, основы торговли и разборы торговых ситуаций доступны участникам после одобрения заявки.",
      {
        reply_markup: new InlineKeyboard()
          .text("👑 Вступить в команду", "join")
          .row()
          .text("⬅️ Главное меню", "home")
      }
    )
  })

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "💬 Нужна помощь?\n\nПо вопросам регистрации и доступа обратись к администратору проекта.",
      { reply_markup: backMenu() }
    )
  })

  bot.callbackQuery("main_channel_info", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "📢 Основной канал GOLD TRADE:\n" + MAIN_CHANNEL_URL,
      { reply_markup: backMenu() }
    )
  })

  bot.callbackQuery("resend_invites", async (ctx) => {
    await ctx.answerCallbackQuery()
    const applications = await loadApplications()
    const userId = String(ctx.from.id)
    const application = applications[userId]

    if (!application || application.status !== "approved") {
      return ctx.reply("Повторная выдача приглашений пока недоступна.")
    }

    try {
      const invitations = await createInvitations(ctx.api)

      application.vipInvite = invitations.vipInvite
      application.chatInvite = invitations.chatInvite
      application.academyInvite = invitations.academyInvite

      await saveApplications(applications)
      await sendInvitations(ctx.api, userId, invitations)
    } catch (error) {
      console.error("[GOLD TRADE] Ошибка повторной выдачи:", error)
      await ctx.reply("Не удалось создать приглашения. Обратись к администратору.")
    }
  })
}
