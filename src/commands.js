
import { InlineKeyboard } from "grammy"
import {
  mkdir,
  readFile,
  writeFile,
  rename,
} from "node:fs/promises"

// ==========================================
// GOLD TRADE ACCESS v6.0
// ==========================================

const ADMIN_ID = 8207612971
const BOT_VERSION = "GOLD TRADE ACCESS v6.0"

const MAIN_CHANNEL_URL = "https://t.me/goldtrade_evgen"
const SUPPORT_URL = "https://t.me/GT_EVGEN"

const REFERRAL_URL = "https://po-ru4.click/smart/bvdTV2aDJ48lYW"

const BONUS_URL =
  "https://po-ru4.click/register?utm_campaign=873587&utm_source=affiliate&utm_medium=sr&a=bvdTV2aDJ48lYW&al=1810953&ac=goldtrade&cid=991310&code=WELCOME50"

const VIP_CHAT_ID = -1004332935139
const CHAT_ID = -1003738170914
const ACADEMY_CHAT_ID = -1003726976169

const STORAGE_DIR = "/data/storage"

const USERS_FILE = `${STORAGE_DIR}/users.json`
const APPLICATIONS_FILE = `${STORAGE_DIR}/applications.json`
const REMINDERS_FILE = `${STORAGE_DIR}/reminders.json`
const BROADCAST_FILE = `${STORAGE_DIR}/broadcast-draft.json`

const REMINDER_STAGES = [
  { day: 1, delay: 24 * 60 * 60 * 1000 },
  { day: 3, delay: 3 * 24 * 60 * 60 * 1000 },
  { day: 7, delay: 7 * 24 * 60 * 60 * 1000 },
]

const userStates = new Map()
const adminStates = new Map()
const storeQueues = new Map()

let reminderTimerStarted = false

// ==========================================
// STORAGE
// ==========================================

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true })
}

async function readStore(file, fallback = {}) {
  await ensureStorage()

  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch (error) {
    if (error.code === "ENOENT") return fallback
    throw error
  }
}

async function writeStore(file, data) {
  await ensureStorage()

  const temp = `${file}.tmp`
  await writeFile(temp, JSON.stringify(data, null, 2), "utf8")
  await rename(temp, file)
}

async function updateStore(file, fallback, updater) {
  const previous = storeQueues.get(file) || Promise.resolve()

  const operation = previous
    .catch(() => {})
    .then(async () => {
      const data = await readStore(file, fallback)
      const result = await updater(data)
      await writeStore(file, data)
      return result
    })

  storeQueues.set(file, operation)

  try {
    return await operation
  } finally {
    if (storeQueues.get(file) === operation) {
      storeQueues.delete(file)
    }
  }
}

const loadUsers = () => readStore(USERS_FILE, {})
const loadApplications = () => readStore(APPLICATIONS_FILE, {})
const loadReminders = () => readStore(REMINDERS_FILE, {})

const saveUsers = (data) => writeStore(USERS_FILE, data)
const saveApplications = (data) => writeStore(APPLICATIONS_FILE, data)
const saveReminders = (data) => writeStore(REMINDERS_FILE, data)

// ==========================================
// HELPERS
// ==========================================

function isAdmin(userId) {
  return Number(userId) === ADMIN_ID
}

function buildReferralUrl(userId, useBonus = false) {
  const url = new URL(useBonus ? BONUS_URL : REFERRAL_URL)
  url.searchParams.set("sub_id1", String(userId))
  return url.toString()
}

function mainKeyboard() {
  return new InlineKeyboard()
    .text("👑 ПОЛУЧИТЬ ДОСТУП", "menu:join")
    .row()
    .text("📊 МОЙ СТАТУС", "menu:status")
    .text("🎓 ACADEMY", "menu:academy")
    .row()
    .text("ℹ️ О ПРОЕКТЕ", "menu:about")
    .text("⚠️ ПРАВИЛА", "menu:rules")
    .row()
    .url("💬 ПОДДЕРЖКА", SUPPORT_URL)
    .url("📢 КАНАЛ", MAIN_CHANNEL_URL)
}

function joinKeyboard(userId) {
  return new InlineKeyboard()
    .url("🟡 РЕГИСТРАЦИЯ", buildReferralUrl(userId))
    .row()
    .url("🎁 РЕГИСТРАЦИЯ С БОНУСОМ", buildReferralUrl(userId, true))
    .row()
    .text("✅ Я УЖЕ ЗАРЕГИСТРИРОВАЛСЯ", "join:registered")
    .row()
    .text("📝 ПОДАТЬ ЗАЯВКУ", "join:apply")
    .row()
    .text("❓ НУЖНА ПОМОЩЬ", "join:help")
    .row()
    .text("🔕 НЕ ПОЛУЧАТЬ НАПОМИНАНИЯ", "reminders:stop")
    .row()
    .text("⬅️ ГЛАВНОЕ МЕНЮ", "menu:home")
}

function reminderKeyboard(userId) {
  return new InlineKeyboard()
    .url("🟡 ПЕРЕЙТИ К РЕГИСТРАЦИИ", buildReferralUrl(userId))
    .row()
    .text("📝 ПОДАТЬ ЗАЯВКУ", "join:apply")
    .row()
    .text("❓ ЗАДАТЬ ВОПРОС", "join:help")
    .row()
    .text("🔕 БОЛЬШЕ НЕ НАПОМИНАТЬ", "reminders:stop")
}

function adminKeyboard() {
  return new InlineKeyboard()
    .text("📊 СТАТИСТИКА", "admin:stats")
    .row()
    .text("📋 ЗАЯВКИ", "admin:applications")
    .row()
    .text("📨 РАССЫЛКА", "admin:broadcast")
    .row()
    .text("🔄 ОБНОВИТЬ", "admin:home")
}

function applicationKeyboard(userId) {
  return new InlineKeyboard()
    .text("✅ ОДОБРИТЬ", `application:approve:${userId}`)
    .text("❌ ОТКЛОНИТЬ", `application:reject:${userId}`)
}

function formatDate(value) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString("ru-RU", {
    timeZone: "Asia/Almaty",
  })
}

async function safeEdit(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options)
  } catch (error) {
    const description = String(error.description || error.message)

    if (!description.includes("message is not modified")) {
      throw error
    }
  }
}

async function answerCallback(ctx, text = "") {
  try {
    await ctx.answerCallbackQuery({ text })
  } catch {}
}

async function notifyAdmin(bot, text, keyboard) {
  try {
    await bot.api.sendMessage(ADMIN_ID, text, {
      reply_markup: keyboard,
    })
  } catch (error) {
    console.error("[ADMIN NOTIFICATION]", error.message)
  }
}

// ==========================================
// USER REGISTRATION
// ==========================================

async function registerUser(ctx) {
  if (!ctx.from) return

  const id = String(ctx.from.id)

  await updateStore(USERS_FILE, {}, (users) => {
    const old = users[id] || {}

    users[id] = {
      ...old,
      userId: id,
      username: ctx.from.username || old.username || null,
      firstName: ctx.from.first_name || old.firstName || null,
      lastName: ctx.from.last_name || old.lastName || null,
      firstSeenAt: old.firstSeenAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    }
  })
}

// ==========================================
// REMINDERS
// ==========================================

async function startReminder(userId) {
  const id = String(userId)

  await updateStore(REMINDERS_FILE, {}, (reminders) => {
    const old = reminders[id]

    // Не отменяем постоянный отказ пользователя.
    if (old?.optOut) return

    if (old?.active) return

    reminders[id] = {
      userId: id,
      startedAt: new Date().toISOString(),
      sentStages: old?.sentStages || [],
      skippedStages: old?.skippedStages || [],
      active: true,
      optOut: false,
    }
  })
}

async function stopReminder(userId, optOut = false) {
  const id = String(userId)

  await updateStore(REMINDERS_FILE, {}, (reminders) => {
    const old = reminders[id] || {
      userId: id,
      startedAt: new Date().toISOString(),
      sentStages: [],
      skippedStages: [],
    }

    reminders[id] = {
      ...old,
      active: false,
      optOut: optOut ? true : Boolean(old.optOut),
      stoppedAt: new Date().toISOString(),
    }
  })
}

async function enableReminders(userId) {
  const id = String(userId)

  await updateStore(REMINDERS_FILE, {}, (reminders) => {
    reminders[id] = {
      userId: id,
      startedAt: new Date().toISOString(),
      sentStages: [],
      skippedStages: [],
      active: true,
      optOut: false,
    }
  })
}

async function processDueReminders(bot) {
  const [reminders, applications] = await Promise.all([
    loadReminders(),
    loadApplications(),
  ])

  const now = Date.now()

  for (const [id, reminder] of Object.entries(reminders)) {
    if (!reminder?.active || reminder.optOut) continue

    const application = applications[id]

    if (
      application &&
      ["pending", "approved", "rejected"].includes(application.status)
    ) {
      await stopReminder(id)
      continue
    }

    const startedAt = new Date(reminder.startedAt).getTime()
    if (!Number.isFinite(startedAt)) {
      await stopReminder(id)
      continue
    }

    const sent = reminder.sentStages || []
    const skipped = reminder.skippedStages || []

    const due = REMINDER_STAGES.filter((stage) => {
      return (
        now - startedAt >= stage.delay &&
        !sent.includes(stage.day) &&
        !skipped.includes(stage.day)
      )
    })

    if (!due.length) continue

    // Если бот был выключен несколько дней,
    // не отправляем пользователю все пропущенные сообщения подряд.
    const selected = due[due.length - 1]

    for (const stage of due) {
      if (stage.day !== selected.day) skipped.push(stage.day)
    }

    const messages = {
      1:
        "👋 Вы недавно интересовались GOLD TRADE ACCESS.\n\n" +
        "Если остались вопросы по регистрации или доступу, мы готовы помочь.\n\n" +
        "Продолжить можно в меню ниже.",

      3:
        "🟡 Напоминаем о GOLD TRADE ACCESS.\n\n" +
        "Если вы ещё не определились, можете ознакомиться с условиями проекта и задать вопросы поддержке.\n\n" +
        "Решение остаётся за вами.",

      7:
        "👑 Это последнее напоминание от GOLD TRADE ACCESS.\n\n" +
        "Если проект вам интересен, вы можете вернуться к оформлению заявки. Если нет — ничего делать не нужно.",
    }

    try {
      await bot.api.sendMessage(id, messages[selected.day], {
        reply_markup: reminderKeyboard(id),
      })

      await updateStore(REMINDERS_FILE, {}, (data) => {
        const current = data[id]
        if (!current?.active || current.optOut) return

        current.sentStages = [
          ...(current.sentStages || []),
          selected.day,
        ]

        current.skippedStages = skipped

        if (selected.day === 7) {
          current.active = false
          current.completedAt = new Date().toISOString()
        }
      })
    } catch (error) {
      console.error(`[REMINDER ${id}]`, error.message)
    }
  }
}

function startReminderTimer(bot) {
  if (reminderTimerStarted) return

  reminderTimerStarted = true

  setInterval(() => {
    processDueReminders(bot).catch((error) => {
      console.error("[REMINDER WORKER]", error)
    })
  }, 60 * 1000)

  processDueReminders(bot).catch((error) => {
    console.error("[REMINDER START]", error)
  })
}

// ==========================================
// USER SCREENS
// ==========================================

async function showHome(ctx) {
  await safeEdit(
    ctx,
    "👑 GOLD TRADE ACCESS\n\n" +
      "Добро пожаловать в закрытое пространство GOLD TRADE.\n\n" +
      "Здесь собраны материалы, сообщество и информация о доступе.\n\n" +
      "Выберите нужный раздел:",
    { reply_markup: mainKeyboard() },
  )
}

async function showJoin(ctx) {
  const id = String(ctx.from.id)

  await startReminder(id)

  await safeEdit(
    ctx,
    "👑 ПОЛУЧЕНИЕ ДОСТУПА\n\n" +
      "Чтобы подать заявку на рассмотрение:\n\n" +
      "1. Ознакомьтесь с регистрацией.\n" +
      "2. Зарегистрируйтесь на платформе, если ещё не сделали этого.\n" +
      "3. Нажмите «Подать заявку».\n" +
      "4. Укажите свой Pocket Option ID.\n\n" +
      "После этого заявка поступит администратору на ручную проверку.\n\n" +
      "⚠️ Регистрация сама по себе не гарантирует одобрение.",
    { reply_markup: joinKeyboard(id) },
  )
}

async function showStatus(ctx) {
  const id = String(ctx.from.id)
  const applications = await loadApplications()
  const app = applications[id]

  if (!app) {
    await safeEdit(
      ctx,
      "📊 ВАШ СТАТУС\n\n" +
        "Заявка пока не найдена.\n\n" +
        "Вы можете перейти к оформлению доступа.",
      {
        reply_markup: new InlineKeyboard()
          .text("👑 ПОЛУЧИТЬ ДОСТУП", "menu:join")
          .row()
          .text("⬅️ НАЗАД", "menu:home"),
      },
    )
    return
  }

  if (app.status === "pending") {
    await safeEdit(
      ctx,
      "⏳ ЗАЯВКА НА РАССМОТРЕНИИ\n\n" +
        "Ваша заявка получена и ожидает ручной проверки администратором.\n\n" +
        `Дата подачи: ${formatDate(app.createdAt)}`,
      {
        reply_markup: new InlineKeyboard()
          .url("💬 ПОДДЕРЖКА", SUPPORT_URL)
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "menu:home"),
      },
    )
    return
  }

  if (app.status === "approved") {
    await safeEdit(
      ctx,
      "✅ ВАША ЗАЯВКА ОДОБРЕНА\n\n" +
        "Доступ был одобрен администратором.\n\n" +
        "Если приглашения не пришли или срок их действия закончился, обратитесь в поддержку.",
      {
        reply_markup: new InlineKeyboard()
          .text("🔄 ПОЛУЧИТЬ ПРИГЛАШЕНИЯ", "application:resend")
          .row()
          .url("💬 ПОДДЕРЖКА", SUPPORT_URL)
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "menu:home"),
      },
    )
    return
  }

  if (app.status === "rejected") {
    await safeEdit(
      ctx,
      "❌ ЗАЯВКА НЕ ОДОБРЕНА\n\n" +
        "По результатам проверки доступ не был предоставлен.\n\n" +
        "Если вы считаете, что произошла ошибка, обратитесь в поддержку.",
      {
        reply_markup: new InlineKeyboard()
          .url("💬 ПОДДЕРЖКА", SUPPORT_URL)
          .row()
          .text("⬅️ ГЛАВНОЕ МЕНЮ", "menu:home"),
      },
    )
    return
  }

  await safeEdit(
    ctx,
    "📊 СТАТУС ЗАЯВКИ\n\n" +
      `Статус: ${app.status || "неизвестен"}`,
    { reply_markup: mainKeyboard() },
  )
}

async function showAbout(ctx) {
  await safeEdit(
    ctx,
    "ℹ️ О GOLD TRADE\n\n" +
      "GOLD TRADE — закрытое сообщество для участников, интересующихся торговлей и аналитическими материалами.\n\n" +
      "В проекте доступны информационные материалы, сообщество и обучающий раздел.\n\n" +
      "Доступ предоставляется после ручного рассмотрения заявки.\n\n" +
      "⚠️ Торговля связана с финансовыми рисками.",
    { reply_markup: mainKeyboard() },
  )
}

async function showRules(ctx) {
  await safeEdit(
    ctx,
    "⚠️ ПРАВИЛА И РИСКИ\n\n" +
      "1. Торговля бинарными опционами сопряжена с высоким риском.\n\n" +
      "2. Вы можете потерять весь внесённый депозит.\n\n" +
      "3. Сигналы, алгоритмы и обучающие материалы не гарантируют прибыль.\n\n" +
      "4. Не используйте заёмные деньги и средства, потерю которых не можете себе позволить.\n\n" +
      "5. Самостоятельно оценивайте риски и принимайте решения.\n\n" +
      "6. Не передавайте третьим лицам пароли, коды подтверждения и доступ к аккаунту.",
    { reply_markup: mainKeyboard() },
  )
}

async function showAcademy(ctx) {
  const applications = await loadApplications()
  const app = applications[String(ctx.from.id)]

  let message =
    "🎓 GOLD TRADE ACADEMY\n\n" +
    "Обучающий раздел проекта.\n\n" +
    "Материалы предназначены для ознакомления с основами торговли и управления рисками."

  if (app?.status === "approved") {
    message += "\n\n✅ Ваша заявка одобрена. Используйте приглашение, которое было отправлено вам ранее."
  } else {
    message += "\n\n🔒 Для получения доступа сначала необходимо подать заявку и дождаться решения администратора."
  }

  await safeEdit(ctx, message, {
    reply_markup: new InlineKeyboard()
      .text("👑 ПОЛУЧИТЬ ДОСТУП", "menu:join")
      .row()
      .text("⬅️ ГЛАВНОЕ МЕНЮ", "menu:home"),
  })
}

// ==========================================
// APPLICATIONS
// ==========================================

async function submitApplication(ctx) {
  const id = String(ctx.from.id)

  const applications = await loadApplications()
  const existing = applications[id]

  if (existing?.status === "pending") {
    userStates.delete(id)

    await ctx.reply(
      "⏳ Ваша заявка уже находится на рассмотрении.",
      { reply_markup: mainKeyboard() },
    )
    return
  }

  if (existing?.status === "approved") {
    userStates.delete(id)

    await ctx.reply(
      "✅ Ваша заявка уже одобрена.",
      { reply_markup: mainKeyboard() },
    )
    return
  }

  if (existing?.status === "rejected") {
    userStates.delete(id)

    await ctx.reply(
      "❌ Ваша заявка ранее была отклонена. Если вы хотите уточнить причину, обратитесь в поддержку.",
      { reply_markup: mainKeyboard() },
    )
    return
  }

  userStates.set(id, { step: "pocket_id" })

  await ctx.reply(
    "📝 ОФОРМЛЕНИЕ ЗАЯВКИ\n\n" +
      "Отправьте ваш Pocket Option ID.\n\n" +
      "Это числовой идентификатор аккаунта.\n\n" +
      "⚠️ Не отправляйте пароль, код подтверждения или платёжные данные.\n\n" +
      "Для отмены напишите /cancel",
  )
}

async function createInvitations(bot) {
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  const targets = [
    { name: "VIP", chatId: VIP_CHAT_ID },
    { name: "CHAT", chatId: CHAT_ID },
    { name: "ACADEMY", chatId: ACADEMY_CHAT_ID },
  ]

  const created = []

  try {
    for (const target of targets) {
      const invite = await bot.api.createChatInviteLink(target.chatId, {
        name: `GOLD TRADE ${target.name}`,
        expire_date: expiresAt,
        member_limit: 1,
      })

      created.push({
        name: target.name,
        url: invite.invite_link,
        chatId: target.chatId,
      })
    }

    return created
  } catch (error) {
    // Если создание одного приглашения не удалось,
    // пробуем отозвать уже созданные ссылки.
    for (const item of created) {
      try {
        await bot.api.revokeChatInviteLink(item.chatId, item.url)
      } catch {}
    }

    throw error
  }
}

function invitationKeyboard(invites) {
  const keyboard = new InlineKeyboard()

  for (const invite of invites) {
    keyboard.url(`🔗 ${invite.name}`, invite.url).row()
  }

  keyboard.url("💬 ПОДДЕРЖКА", SUPPORT_URL)

  return keyboard
}

async function sendInvitations(bot, userId, invites) {
  await bot.api.sendMessage(
    userId,
    "👑 GOLD TRADE ACCESS\n\n" +
      "Ваша заявка одобрена!\n\n" +
      "Ниже находятся персональные приглашения в разделы проекта.\n\n" +
      "⏳ Ссылки действуют 24 часа и рассчитаны на одно вступление.\n\n" +
      "Не пересылайте их другим пользователям.",
    { reply_markup: invitationKeyboard(invites) },
  )
}

// ==========================================
// ADMIN PANEL
// ==========================================

async function showAdmin(ctx) {
  if (!isAdmin(ctx.from.id)) {
    await answerCallback(ctx, "Нет доступа")
    return
  }

  const [users, applications, reminders] = await Promise.all([
    loadUsers(),
    loadApplications(),
    loadReminders(),
  ])

  const userCount = Object.keys(users).length
  const allApps = Object.values(applications)

  const pending = allApps.filter((a) => a.status === "pending").length
  const approved = allApps.filter((a) => a.status === "approved").length
  const rejected = allApps.filter((a) => a.status === "rejected").length

  const activeReminders = Object.values(reminders).filter(
    (r) => r.active && !r.optOut,
  ).length

  const text =
    "👑 GOLD TRADE — ADMIN PANEL\n\n" +
    `Версия: ${BOT_VERSION}\n\n` +
    `👥 Пользователей: ${userCount}\n` +
    `⏳ На рассмотрении: ${pending}\n` +
    `✅ Одобрено: ${approved}\n` +
    `❌ Отклонено: ${rejected}\n` +
    `🔔 Активные напоминания: ${activeReminders}\n\n` +
    "Выберите действие:"

  if (ctx.callbackQuery) {
    await safeEdit(ctx, text, { reply_markup: adminKeyboard() })
  } else {
    await ctx.reply(text, { reply_markup: adminKeyboard() })
  }
}

async function showAdminStats(ctx) {
  if (!isAdmin(ctx.from.id)) return

  const [users, applications, reminders] = await Promise.all([
    loadUsers(),
    loadApplications(),
    loadReminders(),
  ])

  const apps = Object.values(applications)

  const count = (status) =>
    apps.filter((app) => app.status === status).length

  const text =
    "📊 ПОЛНАЯ СТАТИСТИКА\n\n" +
    `Всего пользователей: ${Object.keys(users).length}\n\n` +
    `Заявок всего: ${apps.length}\n` +
    `⏳ Ожидают: ${count("pending")}\n` +
    `✅ Одобрено: ${count("approved")}\n` +
    `❌ Отклонено: ${count("rejected")}\n\n` +
    `🔔 Активные напоминания: ${
      Object.values(reminders).filter((r) => r.active && !r.optOut).length
    }\n` +
    `🔕 Отказались от напоминаний: ${
      Object.values(reminders).filter((r) => r.optOut).length
    }`

  await safeEdit(ctx, text, {
    reply_markup: new InlineKeyboard().text("⬅️ АДМИН-ПАНЕЛЬ", "admin:home"),
  })
}

async function showPendingApplications(ctx) {
  if (!isAdmin(ctx.from.id)) return

  const applications = await loadApplications()

  const pending = Object.entries(applications)
    .filter(([, app]) => app.status === "pending")
    .slice(0, 20)

  await safeEdit(
    ctx,
    `📋 ЗАЯВКИ НА РАССМОТРЕНИИ\n\nОжидают проверки: ${pending.length}`,
    {
      reply_markup: new InlineKeyboard()
        .text("⬅️ АДМИН-ПАНЕЛЬ", "admin:home"),
    },
  )

  for (const [userId, app] of pending) {
    await ctx.api.sendMessage(
      ADMIN_ID,
      "📝 ЗАЯВКА\n\n" +
        `Telegram ID: ${userId}\n` +
        `Pocket Option ID: ${app.pocketOptionId || "—"}\n` +
        `Имя: ${app.firstName || "—"}\n` +
        `Username: ${app.username ? "@" + app.username : "—"}\n` +
        `Дата: ${formatDate(app.createdAt)}`,
      { reply_markup: applicationKeyboard(userId) },
    )
  }
}

// ==========================================
// APPLICATION DECISIONS
// ==========================================

async function approveApplication(ctx, bot, userId) {
  if (!isAdmin(ctx.from.id)) return

  const applications = await loadApplications()
  const app = applications[userId]

  if (!app || app.status !== "pending") {
    await answerCallback(ctx, "Заявка уже обработана или не найдена.")
    return
  }

  let invites

  try {
    invites = await createInvitations(bot)
  } catch (error) {
    console.error("[INVITE CREATION]", error)
    await answerCallback(ctx, "Не удалось создать приглашения.")
    return
  }

  // Сначала сохраняем решение администратора.
  await updateStore(APPLICATIONS_FILE, {}, (data) => {
    if (!data[userId] || data[userId].status !== "pending") return

    data[userId] = {
      ...data[userId],
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: String(ADMIN_ID),
      invitations: invites,
    }
  })

  const updated = await loadApplications()

  if (updated[userId]?.status !== "approved") {
    await answerCallback(ctx, "Не удалось сохранить одобрение.")
    return
  }

  await stopReminder(userId)

  try {
    await sendInvitations(bot, userId, invites)
  } catch (error) {
    console.error("[SEND INVITATIONS]", error)

    await ctx.api.sendMessage(
      ADMIN_ID,
      `⚠️ Заявка ${userId} одобрена, но отправить приглашения пользователю не удалось. Используйте повторную отправку.`,
    )
  }

  await safeEdit(
    ctx,
    `✅ ЗАЯВКА ОДОБРЕНА\n\nTelegram ID: ${userId}`,
  )

  await answerCallback(ctx, "Заявка одобрена")

  await notifyAdmin(
    bot,
    `✅ Заявка ${userId} одобрена администратором.`,
  )
}

async function rejectApplication(ctx, userId) {
  if (!isAdmin(ctx.from.id)) return

  const result = await updateStore(
    APPLICATIONS_FILE,
    {},
    (applications) => {
      const app = applications[userId]

      if (!app || app.status !== "pending") return false

      applications[userId] = {
        ...app,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedBy: String(ADMIN_ID),
      }

      return true
    },
  )

  if (!result) {
    await answerCallback(ctx, "Заявка уже обработана.")
    return
  }

  await stopReminder(userId)

  try {
    await ctx.api.sendMessage(
      userId,
      "❌ Ваша заявка не была одобрена.\n\n" +
        "Если вы хотите уточнить информацию, обратитесь в поддержку.",
      {
        reply_markup: new InlineKeyboard().url(
          "💬 ПОДДЕРЖКА",
          SUPPORT_URL,
        ),
      },
    )
  } catch (error) {
    console.error("[REJECT NOTIFICATION]", error.message)
  }

  await safeEdit(
    ctx,
    `❌ ЗАЯВКА ОТКЛОНЕНА\n\nTelegram ID: ${userId}`,
  )

  await answerCallback(ctx, "Заявка отклонена")
}

// ==========================================
// RESEND INVITATIONS
// ==========================================

async function resendInvitations(ctx, bot) {
  const id = String(ctx.from.id)
  const applications = await loadApplications()
  const app = applications[id]

  if (app?.status !== "approved") {
    await answerCallback(ctx, "Заявка не одобрена.")
    return
  }

  try {
    // Используем сохранённые ссылки, если они ещё действуют.
    const invites = app.invitations || []

    if (invites.length === 3) {
      await sendInvitations(bot, id, invites)
    } else {
      const fresh = await createInvitations(bot)

      await updateStore(APPLICATIONS_FILE, {}, (data) => {
        if (data[id]?.status !== "approved") return
        data[id].invitations = fresh
      })

      await sendInvitations(bot, id, fresh)
    }

    await answerCallback(ctx, "Приглашения отправлены.")
  } catch (error) {
    console.error("[RESEND INVITES]", error)
    await answerCallback(ctx, "Не удалось отправить приглашения.")
  }
}

// ==========================================
// BROADCAST
// ==========================================

function broadcastPreviewKeyboard() {
  return new InlineKeyboard()
    .text("✅ ПОДТВЕРДИТЬ РАССЫЛКУ", "broadcast:confirm")
    .row()
    .text("❌ ОТМЕНИТЬ", "broadcast:cancel")
}

async function beginBroadcast(ctx) {
  if (!isAdmin(ctx.from.id)) return

  adminStates.set(String(ADMIN_ID), {
    step: "broadcast_content",
    buttons: [],
  })

  await safeEdit(
    ctx,
    "📨 СОЗДАНИЕ РАССЫЛКИ\n\n" +
      "Отправьте следующим сообщением текст или фотографию с подписью.\n\n" +
      "Чтобы добавить URL-кнопку, отправьте команду:\n" +
      "/broadcast_button Название | https://example.com\n\n" +
      "Можно добавить до 3 кнопок.\n\n" +
      "После получения сообщения я покажу предварительный просмотр. Рассылка начнётся только после вашего подтверждения.",
    {
      reply_markup: new InlineKeyboard().text(
        "❌ ОТМЕНА",
        "broadcast:cancel",
      ),
    },
  )
}

async function addBroadcastButton(ctx) {
  if (!isAdmin(ctx.from.id)) return

  const state = adminStates.get(String(ADMIN_ID))

  if (!state || state.step !== "broadcast_content") {
    await ctx.reply("Сначала нажмите «Рассылка» в админ-панели.")
    return
  }

  const raw = ctx.message.text.replace("/broadcast_button", "").trim()
  const parts = raw.split("|")

  if (parts.length !== 2) {
    await ctx.reply(
      "Формат команды:\n/broadcast_button Название | https://example.com",
    )
    return
  }

  const label = parts[0].trim()
  const url = parts[1].trim()

  if (!label || label.length > 60 || state.buttons.length >= 3) {
    await ctx.reply("Название слишком длинное или уже добавлено 3 кнопки.")
    return
  }

  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error()
  } catch {
    await ctx.reply("Укажите корректную ссылку, начинающуюся с https:// или http://")
    return
  }

  state.buttons.push({ label, url })

  await ctx.reply(`✅ Кнопка добавлена: ${label}`)
}

async function prepareBroadcast(ctx) {
  if (!isAdmin(ctx.from.id)) return false

  const state = adminStates.get(String(ADMIN_ID))

  if (!state || state.step !== "broadcast_content") return false

  if (!ctx.message.text && !ctx.message.photo) {
    await ctx.reply("Отправьте текстовое сообщение или фотографию с подписью.")
    return true
  }

  state.step = "broadcast_preview"
  state.messageId = ctx.message.message_id
  state.chatId = ctx.chat.id

  await writeStore(BROADCAST_FILE, {
    messageId: state.messageId,
    chatId: state.chatId,
    buttons: state.buttons,
    createdAt: new Date().toISOString(),
  })

  const keyboard = new InlineKeyboard()

  for (const button of state.buttons) {
    keyboard.url(button.label, button.url).row()
  }

  keyboard.text("✅ ПОДТВЕРДИТЬ", "broadcast:confirm")
  keyboard.row().text("❌ ОТМЕНИТЬ", "broadcast:cancel")

  await ctx.api.copyMessage(
    ADMIN_ID,
    ctx.chat.id,
    ctx.message.message_id,
    { reply_markup: keyboard },
  )

  await ctx.reply(
    "👆 Выше находится предварительный просмотр.\n\n" +
      "Проверьте содержание и кнопки. Для отправки нажмите «Подтвердить».",
  )

  return true
}

async function cancelBroadcast(ctx) {
  if (!isAdmin(ctx.from.id)) return

  adminStates.delete(String(ADMIN_ID))

  await writeStore(BROADCAST_FILE, {})

  if (ctx.callbackQuery) {
    await safeEdit(ctx, "❌ Рассылка отменена.")
    await answerCallback(ctx, "Рассылка отменена")
  } else {
    await ctx.reply("❌ Рассылка отменена.")
  }
}

async function confirmBroadcast(ctx, bot) {
  if (!isAdmin(ctx.from.id)) return

  const draft = await readStore(BROADCAST_FILE, {})

  if (!draft.messageId || !draft.chatId) {
    await answerCallback(ctx, "Черновик рассылки не найден.")
    return
  }

  const users = await loadUsers()
  const userIds = Object.keys(users)

  const keyboard = new InlineKeyboard()

  for (const button of draft.buttons || []) {
    keyboard.url(button.label, button.url).row()
  }

  let sent = 0
  let failed = 0

  await answerCallback(ctx, "Рассылка началась.")

  await safeEdit(
    ctx,
    "📨 РАССЫЛКА ВЫПОЛНЯЕТСЯ\n\n" +
      `Получателей: ${userIds.length}\n\n` +
      "Пожалуйста, дождитесь отчёта.",
  )

  for (const userId of userIds) {
    try {
      const options = (draft.buttons || []).length
        ? { reply_markup: keyboard }
        : {}

      await bot.api.copyMessage(
        userId,
        draft.chatId,
        draft.messageId,
        options,
      )

      sent++
    } catch (error) {
      failed++
      console.error(`[BROADCAST ${userId}]`, error.message)
    }

    // Ограничиваем скорость отправки.
    await new Promise((resolve) => setTimeout(resolve, 40))
  }

  adminStates.delete(String(ADMIN_ID))
  await writeStore(BROADCAST_FILE, {})

  await ctx.api.sendMessage(
    ADMIN_ID,
    "✅ РАССЫЛКА ЗАВЕРШЕНА\n\n" +
      `👥 Всего получателей: ${userIds.length}\n` +
      `✅ Отправлено: ${sent}\n` +
      `❌ Ошибок: ${failed}`,
    { reply_markup: adminKeyboard() },
  )
}

// ==========================================
// CALLBACKS
// ==========================================

function registerCallbacks(bot) {
  bot.callbackQuery(/^menu:/, async (ctx) => {
    await answerCallback(ctx)

    const action = ctx.callbackQuery.data.split(":")[1]

    if (action === "home") return showHome(ctx)
    if (action === "join") return showJoin(ctx)
    if (action === "status") return showStatus(ctx)
    if (action === "about") return showAbout(ctx)
    if (action === "rules") return showRules(ctx)
    if (action === "academy") return showAcademy(ctx)
  })

  bot.callbackQuery("join:registered", async (ctx) => {
    await answerCallback(ctx)

    await safeEdit(
      ctx,
      "✅ ЕСЛИ ВЫ УЖЕ ЗАРЕГИСТРИРОВАЛИСЬ\n\n" +
        "Следующий шаг — подать заявку на ручное рассмотрение.",
      {
        reply_markup: new InlineKeyboard()
          .text("📝 ПОДАТЬ ЗАЯВКУ", "join:apply")
          .row()
          .text("⬅️ НАЗАД", "menu:join"),
      },
    )
  })

  bot.callbackQuery("join:apply", async (ctx) => {
    await answerCallback(ctx)
    await submitApplication(ctx)
  })

  bot.callbackQuery("join:help", async (ctx) => {
    await answerCallback(ctx)

    await safeEdit(
      ctx,
      "❓ НУЖНА ПОМОЩЬ?\n\n" +
        "Напишите в поддержку. Вам помогут разобраться с регистрацией и оформлением заявки.",
      {
        reply_markup: new InlineKeyboard()
          .url("💬 НАПИСАТЬ В ПОДДЕРЖКУ", SUPPORT_URL)
          .row()
          .text("⬅️ НАЗАД", "menu:join"),
      },
    )
  })

  bot.callbackQuery("reminders:stop", async (ctx) => {
    await stopReminder(ctx.from.id, true)
    await answerCallback(ctx, "Напоминания отключены.")

    await safeEdit(
      ctx,
      "🔕 НАПОМИНАНИЯ ОТКЛЮЧЕНЫ\n\n" +
        "Мы больше не будем отправлять вам автоматические напоминания.\n\n" +
        "Вы можете самостоятельно вернуться в проект в любое время.",
      {
        reply_markup: new InlineKeyboard().text(
          "⬅️ ГЛАВНОЕ МЕНЮ",
          "menu:home",
        ),
      },
    )
  })

  bot.callbackQuery("reminders:enable", async (ctx) => {
    await enableReminders(ctx.from.id)
    await answerCallback(ctx, "Напоминания включены.")
    await showJoin(ctx)
  })

  bot.callbackQuery("admin:home", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return answerCallback(ctx, "Нет доступа")
    await answerCallback(ctx)
    await showAdmin(ctx)
  })

  bot.callbackQuery("admin:stats", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return answerCallback(ctx, "Нет доступа")
    await answerCallback(ctx)
    await showAdminStats(ctx)
  })

  bot.callbackQuery("admin:applications", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return answerCallback(ctx, "Нет доступа")
    await answerCallback(ctx)
    await showPendingApplications(ctx)
  })

  bot.callbackQuery("admin:broadcast", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return answerCallback(ctx, "Нет доступа")
    await answerCallback(ctx)
    await beginBroadcast(ctx)
  })

  bot.callbackQuery("broadcast:cancel", cancelBroadcast)

  bot.callbackQuery("broadcast:confirm", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return answerCallback(ctx, "Нет доступа")
    await confirmBroadcast(ctx, bot)
  })

  bot.callbackQuery(/^application:approve:/, async (ctx) => {
    const userId = ctx.callbackQuery.data.split(":")[2]
    await approveApplication(ctx, bot, userId)
  })

  bot.callbackQuery(/^application:reject:/, async (ctx) => {
    const userId = ctx.callbackQuery.data.split(":")[2]
    await rejectApplication(ctx, userId)
  })

  bot.callbackQuery("application:resend", async (ctx) => {
    await resendInvitations(ctx, bot)
  })
}

// ==========================================
// COMMANDS
// ==========================================

export function registerCommands(bot) {
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type === "private" && ctx.from) {
      try {
        await registerUser(ctx)
      } catch (error) {
        console.error("[USER REGISTER]", error)
      }
    }

    await next()
  })

  bot.command("start", async (ctx) => {
    userStates.delete(String(ctx.from.id))

    const payload = ctx.match?.trim() || ""

    await registerUser(ctx)

    if (payload === "join") {
      await startReminder(ctx.from.id)
      await ctx.reply(
        "👑 GOLD TRADE ACCESS\n\nДобро пожаловать!",
        { reply_markup: mainKeyboard() },
      )
      return
    }

    await ctx.reply(
      "👑 GOLD TRADE ACCESS\n\n" +
        "Добро пожаловать в закрытое пространство GOLD TRADE.\n\n" +
        "Выберите нужный раздел:",
      { reply_markup: mainKeyboard() },
    )
  })

  bot.command("join", showJoin)
  bot.command("about", showAbout)
  bot.command("status", showStatus)
  bot.command("rules", showRules)
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "💬 Поддержка: " + SUPPORT_URL,
      { reply_markup: mainKeyboard() },
    )
  })

  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return
    await showAdmin(ctx)
  })

  bot.command("version", async (ctx) => {
    await ctx.reply(BOT_VERSION)
  })

  bot.command("chatid", async (ctx) => {
    await ctx.reply(`Chat ID: ${ctx.chat.id}`)
  })

  bot.command("groupid", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return
    await ctx.reply(`Group ID: ${ctx.chat.id}`)
  })

  bot.command("stopreminders", async (ctx) => {
    await stopReminder(ctx.from.id, true)
    await ctx.reply("🔕 Напоминания отключены.")
  })

  bot.command("enable_reminders", async (ctx) => {
    await enableReminders(ctx.from.id)
    await ctx.reply("🔔 Напоминания включены.")
  })

  bot.command("cancel", async (ctx) => {
    const id = String(ctx.from.id)
    userStates.delete(id)
    await stopReminder(id, false)

    await ctx.reply(
      "Оформление заявки отменено.",
      { reply_markup: mainKeyboard() },
    )
  })

  bot.command("resend", async (ctx) => {
    const id = String(ctx.from.id)
    const applications = await loadApplications()
    const app = applications[id]

    if (app?.status !== "approved") {
      await ctx.reply("Ваша заявка ещё не одобрена.")
      return
    }

    try {
      const invites = await createInvitations(bot)

      await updateStore(APPLICATIONS_FILE, {}, (data) => {
        if (data[id]?.status !== "approved") return
        data[id].invitations = invites
      })

      await sendInvitations(bot, id, invites)
    } catch (error) {
      console.error("[RESEND]", error)
      await ctx.reply("Не удалось создать приглашения. Напишите в поддержку.")
    }
  })

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return

    if (ctx.message.text.trim() !== "/broadcast") {
      await ctx.reply(
        "Для создания рассылки используйте кнопку «Рассылка» в админ-панели.",
      )
      return
    }

    await beginBroadcast(ctx)
  })

  bot.command("broadcast_button", addBroadcastButton)

  registerCallbacks(bot)

  // ========================================
  // TEXT / PHOTO MESSAGE HANDLER
  // ========================================

  bot.on("message", async (ctx) => {
    if (ctx.chat.type !== "private") return

    const id = String(ctx.from.id)

    if (isAdmin(ctx.from.id)) {
      const adminState = adminStates.get(id)

      if (adminState?.step === "broadcast_content") {
        await prepareBroadcast(ctx)
      }

      return
    }

    const state = userStates.get(id)

    if (!state || state.step !== "pocket_id") return

    if (!ctx.message.text) {
      await ctx.reply("Отправьте Pocket Option ID обычным текстом.")
      return
    }

    const pocketOptionId = ctx.message.text.trim()

    if (!/^\d{4,20}$/.test(pocketOptionId)) {
      await ctx.reply(
        "❌ Неверный формат ID.\n\n" +
          "Отправьте числовой Pocket Option ID длиной от 4 до 20 цифр.\n\n" +
          "Пароли и коды подтверждения не нужны.",
      )
      return
    }

    const applications = await loadApplications()

    if (applications[id]?.status === "pending") {
      userStates.delete(id)
      await ctx.reply("Ваша заявка уже ожидает рассмотрения.")
      return
    }

    if (applications[id]?.status === "approved") {
      userStates.delete(id)
      await ctx.reply("Ваша заявка уже одобрена.")
      return
    }

    if (applications[id]?.status === "rejected") {
      userStates.delete(id)
      await ctx.reply("Ваша заявка ранее была отклонена.")
      return
    }

    const app = {
      userId: id,
      pocketOptionId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    await updateStore(APPLICATIONS_FILE, {}, (data) => {
      if (data[id]?.status === "pending") return
      data[id] = app
    })

    const saved = await loadApplications()

    userStates.delete(id)
    await stopReminder(id)

    if (saved[id]?.status !== "pending") {
      await ctx.reply("Заявка не была сохранена. Попробуйте ещё раз.")
      return
    }

    await ctx.reply(
      "✅ ЗАЯВКА ОТПРАВЛЕНА\n\n" +
        "Ваша заявка поступила администратору.\n\n" +
        "После ручной проверки вы получите уведомление о решении.",
      { reply_markup: mainKeyboard() },
    )

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : "не указан"

    await notifyAdmin(
      bot,
      "📝 НОВАЯ ЗАЯВКА GOLD TRADE\n\n" +
        `Имя: ${ctx.from.first_name || "—"}\n` +
        `Username: ${username}\n` +
        `Telegram ID: ${id}\n` +
        `Pocket Option ID: ${pocketOptionId}\n` +
        `Дата: ${formatDate(app.createdAt)}\n\n` +
        "Требуется ручное решение администратора.",
      applicationKeyboard(id),
    )
  })

  startReminderTimer(bot)

  console.log(`[${BOT_VERSION}] Commands registered`)
}
