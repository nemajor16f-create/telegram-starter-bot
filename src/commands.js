import { InlineKeyboard } from "grammy"
import { mkdir, readFile, writeFile, rename } from "node:fs/promises"

// ==========================================
// GOLD TRADE ACCESS v5.0
// ==========================================

const ADMIN_ID = 8207612971
const BOT_VERSION = "GOLD TRADE ACCESS v5.0"

const MAIN_CHANNEL_URL = "https://t.me/goldtrade_evgen"
const SUPPORT_URL = "https://t.me/GT_EVGEN"
const REFERRAL_URL = "https://po-ru4.click/smart/bvdTV2aDJ48lYW"
const BONUS_URL = "https://po-ru4.click/register?utm_campaign=873587&utm_source=affiliate&utm_medium=sr&a=bvdTV2aDJ48lYW&al=1810953&ac=goldtrade&cid=991310&code=WELCOME50"

const VIP_CHANNEL_ID = "-1004332935139"
const CHAT_GROUP_ID = "-1003738170914"
const ACADEMY_CHANNEL_ID = "-1003726976169"

const STORAGE_DIR = "/data/storage"
const APPLICATIONS_FILE = `${STORAGE_DIR}/applications.json`
const USERS_FILE = `${STORAGE_DIR}/users.json`
const REMINDERS_FILE = `${STORAGE_DIR}/reminders.json`

await mkdir(STORAGE_DIR, { recursive: true })

// ==========================================
// STORAGE
// ==========================================

async function loadJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    await writeFile(file, "{}", "utf8")
    return {}
  }
}

const saveQueues = new Map()

function saveJson(file, data) {
  const previous = saveQueues.get(file) || Promise.resolve()
  const operation = previous.catch(() => {}).then(async () => {
    const temp = `${file}.tmp`
    await writeFile(temp, JSON.stringify(data, null, 2), "utf8")
    await rename(temp, file)
  })
  saveQueues.set(file, operation)
  return operation
}

const loadApplications = () => loadJson(APPLICATIONS_FILE)
const saveApplications = (data) => saveJson(APPLICATIONS_FILE, data)
const loadUsers = () => loadJson(USERS_FILE)
const saveUsers = (data) => saveJson(USERS_FILE, data)
const loadReminders = () => loadJson(REMINDERS_FILE)
const saveReminders = (data) => saveJson(REMINDERS_FILE, data)

async function registerUser(from) {
  if (!from?.id) return
  const users = await loadUsers()
  const id = String(from.id)
  const now = new Date().toISOString()

  users[id] = {
    ...(users[id] || {}),
    userId: id,
    username: from.username || users[id]?.username || null,
    firstName: from.first_name || users[id]?.firstName || null,
    firstSeenAt: users[id]?.firstSeenAt || now,
    lastSeenAt: now
  }

  await saveUsers(users)
}

async function stopReminder(userId, reason = "completed") {
  const reminders = await loadReminders()
  const id = String(userId)

  if (!reminders[id]) return

  reminders[id].active = false
  reminders[id].stoppedAt = new Date().toISOString()
  reminders[id].stopReason = reason

  await saveReminders(reminders)
}

async function startReminder(userId) {
  const id = String(userId)
  const reminders = await loadReminders()
  const existing = reminders[id]

  if (existing?.active) return

  reminders[id] = {
    userId: id,
    startedAt: new Date().toISOString(),
    sentStages: [],
    active: true,
    optOut: false
  }

  await saveReminders(reminders)
}

// ==========================================
// KEYBOARDS
// ==========================================

function mainMenu() {
  return new InlineKeyboard()
    .text("👑 ВСТУПИТЬ В КОМАНДУ", "join")
    .row()
    .text("📊 О ПРОЕКТЕ", "about")
    .row()
    .text("📌 МОЯ ЗАЯВКА", "status")
    .row()
    .text("🎓 ACADEMY GOLD TRADE", "academy")
    .row()
    .text("📜 ПРАВИЛА И РИСКИ", "rules")
    .row()
    .text("💬 ПОДДЕРЖКА", "support")
    .row()
    .url("📢 ОСНОВНОЙ КАНАЛ", MAIN_CHANNEL_URL)
}

function backMenu() {
  return new InlineKeyboard()
    .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
}

function joinMenu() {
  return new InlineKeyboard()
    .url("🚀 РЕГИСТРАЦИЯ", REFERRAL_URL)
    .row()
    .url("🎁 ПОЛУЧИТЬ БОНУС", BONUS_URL)
    .row()
    .text("✅ УЖЕ ЗАРЕГИСТРИРОВАЛСЯ", "already_registered")
    .row()
    .text("📌 ПОДАТЬ ЗАЯВКУ", "submit_application")
    .row()
    .text("🆘 НУЖНА ПОМОЩЬ", "support")
    .row()
    .text("🔕 БОЛЬШЕ НЕ НАПОМИНАТЬ", "stop_reminders")
    .row()
    .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
}

function reminderKeyboard() {
  return new InlineKeyboard()
    .url("🚀 ПЕРЕЙТИ К РЕГИСТРАЦИИ", REFERRAL_URL)
    .row()
    .text("✅ УЖЕ ЗАРЕГИСТРИРОВАЛСЯ", "already_registered")
    .row()
    .text("🆘 НУЖНА ПОМОЩЬ", "support")
    .row()
    .text("🔕 БОЛЬШЕ НЕ НАПОМИНАТЬ", "stop_reminders")
}

// ==========================================
// USER-FACING PAGES
// ==========================================

async function showWelcome(ctx) {
  await ctx.reply(
    `👑 GOLD TRADE | EVGEN

Добро пожаловать в GOLD TRADE!

Мы объединяем людей, которым интересны торговля, обучение и развитие в едином сообществе.

━━━━━━━━━━━━━━━━━━

🔥 ОДНА КОМАНДА. ЧЕТЫРЕ НАПРАВЛЕНИЯ.

👑 VIP — совместные торговые сессии, сигналы и LIVE.
💬 CHAT — общение участников и обмен опытом.
🎓 ACADEMY — обучающие материалы и разборы.
📢 GOLD TRADE — новости, публикации и анонсы.

━━━━━━━━━━━━━━━━━━

Выбери интересующий раздел и познакомься с проектом.

Добро пожаловать!`,
    { reply_markup: mainMenu() }
  )
}

async function showAbout(ctx) {
  await ctx.reply(
    `📊 GOLD TRADE | EVGEN
О НАШЕМ ПРОЕКТЕ

Мы объединяем несколько направлений в единую экосистему, где участники могут получать информацию, изучать торговлю и общаться друг с другом.

━━━━━━━━━━━━━━━━━━

📢 GOLD TRADE — основной канал проекта: новости, публикации и объявления.

👑 VIP GOLD TRADE — закрытое сообщество: совместные торговые сессии, сигналы и LIVE.

💬 CHAT GOLD TRADE — общение участников, обсуждение ситуаций и обмен опытом.

🎓 ACADEMY GOLD TRADE — обучающие материалы, основы торговли и разборы.

━━━━━━━━━━━━━━━━━━

🤝 ПАРТНЁРСТВО

GOLD TRADE является партнёром Pocket Option и сотрудничает с платформой в рамках партнёрской программы. При регистрации по нашим ссылкам проект может получать партнёрское вознаграждение. Для новых пользователей предусмотрена отдельная ссылка с приветственным бонусом. Доступность и условия бонуса определяет платформа.

━━━━━━━━━━━━━━━━━━

⚠️ Торговля бинарными опционами сопряжена с высоким риском. Возможна потеря всего внесённого депозита. Доходность не гарантируется.`,
    {
      reply_markup: new InlineKeyboard()
        .url("📢 ОТКРЫТЬ ОСНОВНОЙ КАНАЛ", MAIN_CHANNEL_URL)
        .row()
        .text("👑 ПРИСОЕДИНИТЬСЯ", "join")
        .row()
        .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
    }
  )
}

async function showJoin(ctx) {
  await startReminder(ctx.from.id)

  await ctx.reply(
    `👑 ВСТУПЛЕНИЕ В GOLD TRADE

Чтобы подать заявку на вступление, пройди несколько шагов.

━━━━━━━━━━━━━━━━━━

1️⃣ РЕГИСТРАЦИЯ
Создай аккаунт Pocket Option по ссылке проекта.

2️⃣ ПРИВЕТСТВЕННЫЙ БОНУС
Для новых пользователей доступно отдельное бонусное предложение. Его условия и доступность уточняй на платформе.

3️⃣ ПОПОЛНЕНИЕ
Для подачи заявки необходимо пополнить счёт минимум на 10$.

4️⃣ ПОДТВЕРЖДЕНИЕ
Отправь сюда свой числовой Pocket Option ID.

━━━━━━━━━━━━━━━━━━

Администратор вручную проверит регистрацию и пополнение. Торговать для получения доступа не требуется.

🤝 GOLD TRADE является партнёром Pocket Option. При регистрации по ссылкам проекта мы можем получать партнёрское вознаграждение.

⚠️ Бинарные опционы связаны с высоким риском. Можно потерять весь депозит. Прибыль не гарантируется.`,
    { reply_markup: joinMenu() }
  )
}

async function showRules(ctx) {
  await ctx.reply(
    `📜 ПРАВИЛА GOLD TRADE

1. Уважительно относись к другим участникам сообщества.
2. Не размещай спам, рекламу и посторонние ссылки без разрешения администрации.
3. Не выдавай чужие торговые решения или результаты за собственные.
4. Не передавай другим людям пароли, коды подтверждения и доступ к аккаунту.
5. Вопросы по регистрации и доступу направляй администратору.

━━━━━━━━━━━━━━━━━━

⚠️ ВАЖНО О РИСКАХ

Торговля бинарными опционами является высокорискованной деятельностью. Ты можешь потерять весь внесённый депозит. Сигналы, материалы и эфиры не являются гарантией результата или обещанием дохода. Принимай решения самостоятельно и используй только те средства, потерю которых можешь себе позволить.

━━━━━━━━━━━━━━━━━━

Подавая заявку, ты подтверждаешь, что ознакомился с условиями доступа и понимаешь связанные с торговлей риски.`,
    { reply_markup: backMenu() }
  )
}

async function showSupport(ctx) {
  await ctx.reply(
    `💬 ПОДДЕРЖКА GOLD TRADE

Есть вопросы по регистрации, заявке или доступу?

Свяжись с администратором проекта — поможем разобраться.`,
    {
      reply_markup: new InlineKeyboard()
        .url("✉️ НАПИСАТЬ @GT_EVGEN", SUPPORT_URL)
        .row()
        .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
    }
  )
}

async function showStatus(ctx) {
  const applications = await loadApplications()
  const application = applications[String(ctx.from.id)]

  if (!application) {
    return ctx.reply(
      `📌 МОЯ ЗАЯВКА

Ты пока не подавал заявку на вступление. Нажми кнопку ниже, чтобы ознакомиться с условиями.`,
      {
        reply_markup: new InlineKeyboard()
          .text("👑 ВСТУПИТЬ В КОМАНДУ", "join")
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
      }
    )
  }

  if (application.status === "pending") {
    return ctx.reply(
      `⏳ ЗАЯВКА НА РАССМОТРЕНИИ

Pocket Option ID: ${application.poId}

Заявка получена и ожидает ручной проверки администратором. После принятия решения ты получишь уведомление.`,
      { reply_markup: backMenu() }
    )
  }

  if (application.status === "rejected") {
    return ctx.reply(
      `❌ ЗАЯВКА ОТКЛОНЕНА

Если считаешь, что произошла ошибка, свяжись с администратором. После уточнения обстоятельств можно будет подать новую заявку.`,
      {
        reply_markup: new InlineKeyboard()
          .url("💬 СВЯЗАТЬСЯ С АДМИНИСТРАТОРОМ", SUPPORT_URL)
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
      }
    )
  }

  if (application.status === "approved") {
    return ctx.reply(
      `✅ ДОСТУП ОДОБРЕН

Добро пожаловать в GOLD TRADE! Твоя заявка прошла проверку.

Тебе доступны VIP, CHAT и ACADEMY. Если приглашения потерялись или истекли, воспользуйся кнопкой ниже.`,
      {
        reply_markup: new InlineKeyboard()
          .text("🔄 ПОЛУЧИТЬ ПРИГЛАШЕНИЯ", "resend_invites")
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
      }
    )
  }

  if (application.status === "cancelled") {
    return ctx.reply(
      `📌 ПОСЛЕДНЯЯ ЗАЯВКА ОТМЕНЕНА

Ты можешь подать новую заявку через главное меню.`,
      {
        reply_markup: new InlineKeyboard()
          .text("👑 ПОДАТЬ НОВУЮ ЗАЯВКУ", "join")
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
      }
    )
  }

  await ctx.reply("Не удалось определить статус заявки.", {
    reply_markup: backMenu()
  })
}

// ==========================================
// INVITATIONS
// ==========================================

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

Твоя заявка одобрена. Доступ открыт!

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

Каждая ссылка рассчитана на одно вступление и действует 24 часа. Сохрани приглашения и присоединяйся к сообществам!`
  )
}

// ==========================================
// REMINDER ENGINE
// ==========================================

const REMINDER_STAGES = [
  { day: 1, delay: 24 * 60 * 60 * 1000 },
  { day: 3, delay: 3 * 24 * 60 * 60 * 1000 },
  { day: 7, delay: 7 * 24 * 60 * 60 * 1000 }
]

const reminderTexts = {
  1: `👋 Привет! Ты начинал знакомство с GOLD TRADE, но, похоже, ещё не завершил вступление.

Если проект тебе интересен, можешь продолжить регистрацию и затем отправить свой Pocket Option ID.

Если нужна помощь — мы на связи.`,
  3: `📌 Напоминаем о GOLD TRADE!

Если ты планировал присоединиться к команде, заявку всё ещё можно подать. После регистрации и пополнения отправь свой числовой Pocket Option ID боту.

Условия и риски торговли обязательно оцени самостоятельно.`,
  7: `👑 Последнее напоминание от GOLD TRADE.

Если тебе по-прежнему интересно наше сообщество, возвращайся к оформлению заявки. Если планы изменились — просто отключи напоминания кнопкой ниже.`
}

async function processDueReminders(bot) {
  const reminders = await loadReminders()
  const applications = await loadApplications()
  const now = Date.now()
  let changed = false

  for (const [userId, reminder] of Object.entries(reminders)) {
    if (!reminder?.active || reminder.optOut) continue

    const application = applications[userId]

    if (application && ["pending", "approved", "rejected"].includes(application.status)) {
      reminder.active = false
      reminder.stoppedAt = new Date().toISOString()
      reminder.stopReason = "application_submitted_or_processed"
      changed = true
      continue
    }

    const startedAt = Date.parse(reminder.startedAt)

    if (!Number.isFinite(startedAt)) {
      reminder.active = false
      changed = true
      continue
    }

    for (const stage of REMINDER_STAGES) {
      if ((reminder.sentStages || []).includes(stage.day)) continue
      if (now < startedAt + stage.delay) continue

      try {
        await bot.api.sendMessage(
          Number(userId),
          reminderTexts[stage.day],
          { reply_markup: reminderKeyboard() }
        )

        reminder.sentStages = [
          ...(reminder.sentStages || []),
          stage.day
        ]

        reminder.lastSentAt = new Date().toISOString()
        changed = true
        break
      } catch (error) {
        console.error(
          `[GOLD TRADE] Не удалось отправить напоминание ${stage.day} дн. пользователю ${userId}:`,
          error?.description || error
        )

        if (error?.error_code === 403) {
          reminder.active = false
          reminder.stopReason = "blocked_by_user"
          changed = true
        }

        break
      }
    }

    if (
      REMINDER_STAGES.every((stage) =>
        (reminder.sentStages || []).includes(stage.day)
      )
    ) {
      reminder.active = false
      reminder.completedAt = new Date().toISOString()
      changed = true
    }
  }

  if (changed) {
    await saveReminders(reminders)
  }
}

// ==========================================
// ADMIN TOOLS
// ==========================================

async function showAdmin(ctx) {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("Нет доступа.")
  }

  const [users, applications, reminders] = await Promise.all([
    loadUsers(),
    loadApplications(),
    loadReminders()
  ])

  const records = Object.values(applications)
  const count = (status) =>
    records.filter((item) => item?.status === status).length

  const optOuts = Object.values(reminders)
    .filter((item) => item?.optOut).length

  const activeReminders = Object.values(reminders)
    .filter((item) => item?.active).length

  await ctx.reply(
    `🛠 АДМИН-ПАНЕЛЬ GOLD TRADE

👥 Пользователей запустили бота: ${Object.keys(users).length}
📨 Начали оформление вступления: ${Object.keys(reminders).length}
⏳ Заявок на проверке: ${count("pending")}
✅ Одобрено: ${count("approved")}
❌ Отклонено: ${count("rejected")}
🔔 Активные напоминания: ${activeReminders}
🔕 Отключили напоминания: ${optOuts}

Версия: ${BOT_VERSION}

Рассылка: /broadcast текст сообщения`,
    { reply_markup: backMenu() }
  )
}

let pendingBroadcast = null

// ==========================================
// COMMAND REGISTRATION
// ==========================================

let reminderTimerStarted = false

export function registerCommands(bot) {
  console.log(`[GOLD TRADE] Запущена версия ${BOT_VERSION}`)

  bot.command("start", async (ctx) => {
    await registerUser(ctx.from)
    await showWelcome(ctx)
  })

  bot.command("join", async (ctx) => {
    await registerUser(ctx.from)
    await showJoin(ctx)
  })

  bot.command("about", showAbout)
  bot.command("status", showStatus)
  bot.command("rules", showRules)
  bot.command("help", showSupport)
  bot.command("admin", showAdmin)

  bot.command("version", async (ctx) => {
    await ctx.reply(`GOLD TRADE ACCESS\n${BOT_VERSION}`)
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

  bot.command("stopreminders", async (ctx) => {
    const reminders = await loadReminders()
    const id = String(ctx.from.id)

    reminders[id] = {
      ...(reminders[id] || { userId: id }),
      active: false,
      optOut: true,
      stoppedAt: new Date().toISOString(),
      stopReason: "user_opt_out"
    }

    await saveReminders(reminders)

    await ctx.reply(
      "🔕 Хорошо, больше не будем отправлять напоминания о вступлении в GOLD TRADE.",
      { reply_markup: backMenu() }
    )
  })

  bot.command("cancel", async (ctx) => {
    const applications = await loadApplications()
    const userId = String(ctx.from.id)
    const application = applications[userId]

    if (!application || application.status !== "pending") {
      return ctx.reply("Нет ожидающей заявки, которую можно отменить.")
    }

    application.status = "cancelled"
    application.cancelledAt = new Date().toISOString()

    await saveApplications(applications)
    await stopReminder(userId, "application_cancelled")

    await ctx.reply(
      "Заявка отменена. Если захочешь вступить, сможешь подать её снова через главное меню."
    )
  })

  bot.command("resend", async (ctx) => {
    await resendInvitations(ctx)
  })

  bot.command("broadcast", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.reply("Нет доступа.")
    }

    const message = ctx.match?.trim()

    if (!message) {
      return ctx.reply("Использование: /broadcast текст сообщения")
    }

    pendingBroadcast = message

    await ctx.reply(
      `📣 ПРЕДПРОСМОТР РАССЫЛКИ

${message}

Отправить сообщение всем пользователям, которые запускали бота?`,
      {
        reply_markup: new InlineKeyboard()
          .text("✅ ПОДТВЕРДИТЬ РАССЫЛКУ", "broadcast_confirm")
          .row()
          .text("❌ ОТМЕНИТЬ", "broadcast_cancel")
      }
    )
  })

  // Save users who interact with the bot in private chat.
  bot.use(async (ctx, next) => {
    if (
      ctx.chat?.type === "private" &&
      ctx.from &&
      ctx.from.id !== ADMIN_ID
    ) {
      try {
        await registerUser(ctx.from)
      } catch (error) {
        console.error(
          "[GOLD TRADE] Ошибка сохранения пользователя:",
          error
        )
      }
    }

    await next()
  })

  // Receive Pocket Option ID.
  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type !== "private") return

    const text = ctx.message.text.trim()

    if (text.startsWith("/")) return
    if (ctx.from.id === ADMIN_ID) return

    if (!/^\d{4,20}$/.test(text)) {
      return ctx.reply(
        "Отправь только числовой Pocket Option ID. Пароли, коды подтверждения и другие личные данные не нужны."
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
    await stopReminder(userId, "application_submitted")

    const keyboard = new InlineKeyboard()
      .text("✅ ОДОБРИТЬ", `approve:${userId}`)
      .text("❌ ОТКЛОНИТЬ", `reject:${userId}`)

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
        `✅ ЗАЯВКА ПРИНЯТА!

Твой Pocket Option ID получен. Администратор вручную проверит регистрацию и пополнение.

Ожидай уведомления о результате.`,
        { reply_markup: backMenu() }
      )
    } catch (error) {
      console.error("[GOLD TRADE] Ошибка заявки:", error)

      await ctx.reply(
        "Заявка сохранена, но уведомление администратору не отправлено. Попробуй позже или свяжись с поддержкой."
      )
    }
  })

  // Approve application.
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
      await stopReminder(userId, "application_approved")
      await sendInvitations(ctx.api, userId, invitations)

      await ctx.answerCallbackQuery({
        text: "Заявка одобрена!"
      })

      await ctx.editMessageText(
        `✅ ЗАЯВКА ОДОБРЕНА

Telegram ID: ${userId}
Pocket Option ID: ${application.poId}

Приглашения созданы.`
      )
    } catch (error) {
      console.error("[GOLD TRADE] Ошибка одобрения:", error)

      await ctx.answerCallbackQuery({
        text: "Ошибка выдачи приглашений. Проверь права бота.",
        show_alert: true
      })
    }
  })

  // Reject application.
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
    await stopReminder(userId, "application_rejected")

    try {
      await ctx.api.sendMessage(
        Number(userId),
        "❌ Твоя заявка отклонена.\n\nЕсли считаешь, что произошла ошибка, свяжись с администратором проекта.",
        {
          reply_markup: new InlineKeyboard()
            .url("💬 СВЯЗАТЬСЯ С АДМИНИСТРАТОРОМ", SUPPORT_URL)
        }
      )
    } catch (error) {
      console.error(
        "[GOLD TRADE] Ошибка уведомления об отказе:",
        error
      )
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

  async function resendInvitations(ctx) {
    const applications = await loadApplications()
    const userId = String(ctx.from.id)
    const application = applications[userId]

    if (!application || application.status !== "approved") {
      return ctx.reply(
        "Повторная выдача доступна только после одобрения заявки."
      )
    }

    try {
      const invitations = await createInvitations(ctx.api)

      Object.assign(application, invitations)

      await saveApplications(applications)
      await sendInvitations(ctx.api, userId, invitations)
    } catch (error) {
      console.error(
        "[GOLD TRADE] Ошибка повторной выдачи:",
        error
      )

      await ctx.reply(
        "Не удалось создать приглашения. Обратись к администратору."
      )
    }
  }

  // Navigation callbacks.
  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showWelcome(ctx)
  })

  bot.callbackQuery("join", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showJoin(ctx)
  })

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showAbout(ctx)
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showStatus(ctx)
  })

  bot.callbackQuery("rules", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showRules(ctx)
  })

  bot.callbackQuery("support", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showSupport(ctx)
  })

  bot.callbackQuery("submit_application", async (ctx) => {
    await ctx.answerCallbackQuery()
    await startReminder(ctx.from.id)

    await ctx.reply(
      `📌 СЛЕДУЮЩИЙ ШАГ

После регистрации и пополнения отправь сюда свой числовой Pocket Option ID.

Администратор проверит заявку вручную. Не отправляй пароли, коды подтверждения или данные банковской карты.`,
      {
        reply_markup: new InlineKeyboard()
          .text("✅ УЖЕ ЗАРЕГИСТРИРОВАЛСЯ", "already_registered")
          .row()
          .text("🆘 НУЖНА ПОМОЩЬ", "support")
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
      }
    )
  })

  bot.callbackQuery("already_registered", async (ctx) => {
    await ctx.answerCallbackQuery()

    await ctx.reply(
      `✅ Отлично!

Отправь следующим сообщением свой числовой Pocket Option ID (4–20 цифр).

Не отправляй пароль, коды подтверждения или платёжные данные.`,
      { reply_markup: backMenu() }
    )
  })

  bot.callbackQuery("stop_reminders", async (ctx) => {
    await ctx.answerCallbackQuery({
      text: "Напоминания отключены."
    })

    const reminders = await loadReminders()
    const id = String(ctx.from.id)

    reminders[id] = {
      ...(reminders[id] || { userId: id }),
      active: false,
      optOut: true,
      stoppedAt: new Date().toISOString(),
      stopReason: "user_opt_out"
    }

    await saveReminders(reminders)

    await ctx.reply(
      "🔕 Готово. Больше не будем отправлять напоминания о вступлении.",
      { reply_markup: backMenu() }
    )
  })

  bot.callbackQuery("academy", async (ctx) => {
    await ctx.answerCallbackQuery()

    const applications = await loadApplications()
    const application = applications[String(ctx.from.id)]

    if (application?.status === "approved") {
      return ctx.reply(
        `🎓 ACADEMY GOLD TRADE

Твой доступ одобрен. Если приглашение потерялось или истекло, запроси новые ссылки через раздел «Моя заявка».`,
        {
          reply_markup: new InlineKeyboard()
            .text("📌 МОЯ ЗАЯВКА", "status")
            .row()
            .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
        }
      )
    }

    await ctx.reply(
      `🎓 ACADEMY GOLD TRADE

Обучающие материалы, основы торговли, разборы и развитие практических навыков.

Доступ к закрытой академии предоставляется после одобрения заявки.`,
      {
        reply_markup: new InlineKeyboard()
          .text("👑 ВСТУПИТЬ В КОМАНДУ", "join")
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
      }
    )
  })

  bot.callbackQuery("resend_invites", async (ctx) => {
    await ctx.answerCallbackQuery()
    await resendInvitations(ctx)
  })

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await showSupport(ctx)
  })

  // Admin broadcast confirmation.
  bot.callbackQuery("broadcast_confirm", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCallbackQuery({
        text: "Нет доступа.",
        show_alert: true
      })
    }

    if (!pendingBroadcast) {
      return ctx.answerCallbackQuery({
        text: "Нет подготовленной рассылки.",
        show_alert: true
      })
    }

    const message = pendingBroadcast
    pendingBroadcast = null

    await ctx.answerCallbackQuery({
      text: "Рассылка запущена."
    })

    const users = await loadUsers()
    let sent = 0
    let failed = 0

    for (const userId of Object.keys(users)) {
      try {
        await ctx.api.sendMessage(Number(userId), message)
        sent += 1

        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        failed += 1

        console.error(
          `[GOLD TRADE] Ошибка рассылки пользователю ${userId}:`,
          error?.description || error
        )
      }
    }

    await ctx.reply(
      `📣 РАССЫЛКА ЗАВЕРШЕНА

Успешно отправлено: ${sent}
Не доставлено: ${failed}`
    )
  })

  bot.callbackQuery("broadcast_cancel", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCallbackQuery({
        text: "Нет доступа.",
        show_alert: true
      })
    }

    pendingBroadcast = null

    await ctx.answerCallbackQuery({
      text: "Рассылка отменена."
    })

    await ctx.editMessageText("❌ Рассылка отменена.")
  })

  // One reminder worker per bot process.
  if (!reminderTimerStarted) {
    reminderTimerStarted = true

    processDueReminders(bot).catch((error) =>
      console.error(
        "[GOLD TRADE] Ошибка проверки напоминаний:",
        error
      )
    )

    setInterval(() => {
      processDueReminders(bot).catch((error) =>
        console.error(
          "[GOLD TRADE] Ошибка проверки напоминаний:",
          error
        )
      )
    }, 60_000)
  }
}
