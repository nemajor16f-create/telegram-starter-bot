
import { InlineKeyboard } from "grammy"
import {
  mkdir,
  readFile,
  writeFile,
  rename,
} from "node:fs/promises"

// ======================================================
// GOLD TRADE ACCESS v6.0
// ======================================================

const ADMIN_ID = 8207612971
const BOT_VERSION = "GOLD TRADE ACCESS v6.0"

const MAIN_CHANNEL_URL = "https://t.me/goldtrade_evgen"
const SUPPORT_URL = "https://t.me/GT_EVGEN"

const REFERRAL_URL =
  "https://po-ru4.click/smart/bvdTV2aDJ48lYW"

const BONUS_URL =
  "https://po-ru4.click/register?utm_campaign=873587&utm_source=affiliate&utm_medium=sr&a=bvdTV2aDJ48lYW&al=1810953&ac=goldtrade&cid=991310&code=WELCOME50"

const STORAGE_DIR = "/data/storage"

const FILES = {
  users: `${STORAGE_DIR}/users.json`,
  applications: `${STORAGE_DIR}/applications.json`,
  reminders: `${STORAGE_DIR}/reminders.json`,
}

const GROUPS = {
  VIP: "-1004332935139",
  CHAT: "-1003738170914",
  ACADEMY: "-1003726976169",
}

const REMINDER_STAGES = [
  { day: 1, delay: 24 * 60 * 60 * 1000 },
  { day: 3, delay: 3 * 24 * 60 * 60 * 1000 },
  { day: 7, delay: 7 * 24 * 60 * 60 * 1000 },
]

const pendingInputs = new Map()
const broadcastDrafts = new Map()

// ======================================================
// STORAGE
// ======================================================

const storeQueues = new Map()

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true })
}

async function loadJson(file, fallback = {}) {
  try {
    const content = await readFile(file, "utf8")
    return JSON.parse(content)
  } catch (error) {
    if (error.code === "ENOENT") return fallback
    console.error("[STORAGE READ]", file, error)
    throw error
  }
}

async function saveJson(file, data) {
  const previous = storeQueues.get(file) || Promise.resolve()

  const operation = previous.catch(() => {}).then(async () => {
    await ensureStorage()

    const tempFile = `${file}.${process.pid}.tmp`

    await writeFile(
      tempFile,
      JSON.stringify(data, null, 2),
      "utf8"
    )

    await rename(tempFile, file)
  })

  storeQueues.set(file, operation)

  try {
    await operation
  } finally {
    if (storeQueues.get(file) === operation) {
      storeQueues.delete(file)
    }
  }
}

// Read-modify-write operations are serialized together.
async function updateJson(file, fallback, updater) {
  const previous = storeQueues.get(file) || Promise.resolve()

  const operation = previous.catch(() => {}).then(async () => {
    await ensureStorage()

    let data

    try {
      data = JSON.parse(await readFile(file, "utf8"))
    } catch (error) {
      if (error.code === "ENOENT") {
        data = structuredClone(fallback)
      } else {
        throw error
      }
    }

    const result = await updater(data)

    const tempFile = `${file}.${process.pid}.tmp`

    await writeFile(
      tempFile,
      JSON.stringify(data, null, 2),
      "utf8"
    )

    await rename(tempFile, file)

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

async function readStore(file, fallback = {}) {
  const pending = storeQueues.get(file)
  if (pending) await pending.catch(() => {})
  return loadJson(file, fallback)
}

const loadUsers = () => readStore(FILES.users, {})
const loadApplications = () => readStore(FILES.applications, {})
const loadReminders = () => readStore(FILES.reminders, {})

const updateUsers = (fn) =>
  updateJson(FILES.users, {}, fn)

const updateApplications = (fn) =>
  updateJson(FILES.applications, {}, fn)

const updateReminders = (fn) =>
  updateJson(FILES.reminders, {}, fn)

// ======================================================
// HELPERS
// ======================================================

function isAdmin(ctx) {
  return Number(ctx.from?.id) === ADMIN_ID
}

function mainKeyboard() {
  return new InlineKeyboard()
    .text("👑 ПОЛУЧИТЬ ДОСТУП", "join")
    .row()
    .text("📊 МОЙ СТАТУС", "status")
    .text("🎓 ACADEMY", "academy")
    .row()
    .text("ℹ️ О ПРОЕКТЕ", "about")
    .text("⚠️ РИСКИ И ПРАВИЛА", "rules")
    .row()
    .text("📢 TELEGRAM-КАНАЛ", "channel")
    .text("🛟 ПОДДЕРЖКА", "support")
}

function joinKeyboard(userId) {
  return new InlineKeyboard()
    .url("🚀 РЕГИСТРАЦИЯ", buildReferralUrl(userId))
    .row()
    .url("🎁 РЕГИСТРАЦИЯ С WELCOME50", buildReferralUrl(userId, true))
    .row()
    .text("✅ Я УЖЕ ЗАРЕГИСТРИРОВАН", "registered")
    .row()
    .text("📝 ПОДАТЬ ЗАЯВКУ", "apply")
    .row()
    .text("❓ НУЖНА ПОМОЩЬ", "support")
    .row()
    .text("🔕 ОТКЛЮЧИТЬ НАПОМИНАНИЯ", "stop_reminders")
    .row()
    .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
}

function buildReferralUrl(userId, useBonus = false) {
  const url = new URL(useBonus ? BONUS_URL : REFERRAL_URL)
  url.searchParams.set("sub_id1", String(userId))
  return url.toString()
}

function formatDate(value) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Almaty",
  })
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function applicationKeyboard(userId) {
  return new InlineKeyboard()
    .text("✅ ОДОБРИТЬ", `approve:${userId}`)
    .text("❌ ОТКЛОНИТЬ", `reject:${userId}`)
}

function adminKeyboard() {
  return new InlineKeyboard()
    .text("📊 СТАТИСТИКА", "admin:stats")
    .row()
    .text("📥 ЗАЯВКИ", "admin:apps")
    .row()
    .text("📨 РАССЫЛКА", "admin:broadcast")
    .row()
    .text("🔔 НАПОМИНАНИЯ", "admin:reminders")
    .row()
    .text("ℹ️ ВЕРСИЯ", "admin:version")
    .row()
    .text("⬅️ ГЛАВНОЕ МЕНЮ", "home")
}

// ======================================================
// USER REGISTRATION
// ======================================================

async function registerUser(ctx) {
  const userId = String(ctx.from.id)

  await updateUsers((users) => {
    const old = users[userId] || {}

    users[userId] = {
      ...old,
      userId,
      username: ctx.from.username || old.username || null,
      firstName: ctx.from.first_name || old.firstName || null,
      lastName: ctx.from.last_name || old.lastName || null,
      firstSeenAt: old.firstSeenAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    }
  })
}

// ======================================================
// REMINDERS
// ======================================================

async function startReminder(userId) {
  const id = String(userId)
  const applications = await loadApplications()
  const application = applications[id]

  if (
    application &&
    ["pending", "approved", "rejected"].includes(application.status)
  ) {
    return
  }

  await updateReminders((reminders) => {
    const current = reminders[id]

    // An explicit opt-out is persistent.
    if (current?.optOut === true) return

    if (current?.active) return

    reminders[id] = {
      userId: id,
      startedAt: new Date().toISOString(),
      sentStages: current?.sentStages || [],
      skippedStages: current?.skippedStages || [],
      active: true,
      optOut: false,
    }
  })
}

async function stopReminder(userId, optOut = false) {
  const id = String(userId)

  await updateReminders((reminders) => {
    const current = reminders[id] || {
      userId: id,
      sentStages: [],
      skippedStages: [],
    }

    reminders[id] = {
      ...current,
      active: false,
      optOut: optOut || current.optOut === true,
      stoppedAt: new Date().toISOString(),
    }
  })
}

async function enableReminders(userId) {
  const id = String(userId)

  await updateReminders((reminders) => {
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

function reminderKeyboard(userId) {
  return new InlineKeyboard()
    .url("🚀 ОТКРЫТЬ РЕГИСТРАЦИЮ", buildReferralUrl(userId))
    .row()
    .text("📝 ПОДАТЬ ЗАЯВКУ", "apply")
    .row()
    .text("❓ ЗАДАТЬ ВОПРОС", "support")
    .row()
    .text("🔕 БОЛЬШЕ НЕ НАПОМИНАТЬ", "stop_reminders")
}

async function processDueReminders(bot) {
  const [reminders, applications] = await Promise.all([
    loadReminders(),
    loadApplications(),
  ])

  const now = Date.now()

  for (const [userId, reminder] of Object.entries(reminders)) {
    if (!reminder?.active || reminder.optOut) continue

    const application = applications[userId]

    if (
      application &&
      ["pending", "approved", "rejected"].includes(application.status)
    ) {
      await stopReminder(userId)
      continue
    }

    const startedAt = new Date(reminder.startedAt).getTime()

    if (!Number.isFinite(startedAt)) {
      await stopReminder(userId)
      continue
    }

    const sent = reminder.sentStages || []
    const skipped = reminder.skippedStages || []

    const dueStages = REMINDER_STAGES.filter((stage) => {
      return (
        now - startedAt >= stage.delay &&
        !sent.includes(stage.day) &&
        !skipped.includes(stage.day)
      )
    })

    if (!dueStages.length) continue

    // If the bot was offline, send only the latest due reminder.
    // Older missed stages are marked skipped to prevent a burst.
    const selected = dueStages[dueStages.length - 1]

    const skippedNow = dueStages
      .filter((stage) => stage.day < selected.day)
      .map((stage) => stage.day)

    const messages = {
      1: "👋 Вы начали знакомство с GOLD TRADE, но ещё не подали заявку.\n\nЕсли остались вопросы по регистрации или доступу — мы поможем разобраться.\n\nНапоминаем: торговля связана с высоким риском, прибыль не гарантируется.",
      3: "📌 Напоминаем о GOLD TRADE.\n\nЕсли вы всё ещё рассматриваете участие, можете открыть регистрацию или задать вопрос поддержке.\n\nРешение остаётся за вами. Не торгуйте на средства, потерю которых не можете себе позволить.",
      7: "🔔 Последнее напоминание от GOLD TRADE.\n\nЕсли тема вам больше не актуальна, просто отключите уведомления. Если нужна помощь — мы на связи.\n\nТорговля бинарными опционами сопряжена с высоким риском.",
    }

    try {
      await bot.api.sendMessage(
        userId,
        messages[selected.day],
        {
          reply_markup: reminderKeyboard(userId),
        }
      )

      await updateReminders((data) => {
        const current = data[userId]
        if (!current || !current.active || current.optOut) return

        current.sentStages = [
          ...new Set([...(current.sentStages || []), selected.day]),
        ]

        current.skippedStages = [
          ...new Set([...(current.skippedStages || []), ...skippedNow]),
        ]

        current.lastSentAt = new Date().toISOString()

        if (selected.day === 7) {
          current.active = false
        }
      })
    } catch (error) {
      console.error("[REMINDER SEND]", userId, error.message)
    }
  }
}

// ======================================================
// INVITATIONS
// ======================================================

async function createInvitations(ctx) {
  const links = {}

  const targets = [
    ["VIP", GROUPS.VIP],
    ["CHAT", GROUPS.CHAT],
    ["ACADEMY", GROUPS.ACADEMY],
  ]

  for (const [name, chatId] of targets) {
    const invite = await ctx.api.createChatInviteLink(chatId, {
      name: `GOLD TRADE ${name}`,
      expire_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      member_limit: 1,
    })

    links[name] = invite.invite_link
  }

  return links
}

async function sendInvitations(ctx, links) {
  await ctx.reply(
    "👑 <b>GOLD TRADE ACCESS АКТИВИРОВАН</b>\n\n" +
    "Ваша заявка одобрена. Ниже находятся персональные ссылки для вступления.\n\n" +
    "⚠️ Ссылки одноразовые и действуют 24 часа. Не передавайте их другим людям.",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .url("👑 VIP CHANNEL", links.VIP)
        .row()
        .url("💬 PRIVATE CHAT", links.CHAT)
        .row()
        .url("🎓 ACADEMY", links.ACADEMY)
        .row()
        .text("🏠 ГЛАВНОЕ МЕНЮ", "home"),
    }
  )
}

// ======================================================
// USER SCREENS
// ======================================================

async function showHome(ctx) {
  await ctx.reply(
    "🟡 <b>GOLD TRADE ACCESS</b>\n" +
    "<i>Private trading community</i>\n\n" +
    "Доступ к закрытым материалам, сообществу и обучающим разделам GOLD TRADE.\n\n" +
    "Выберите нужный раздел:",
    {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(),
    }
  )
}

async function showJoin(ctx) {
  await startReminder(ctx.from.id)

  await ctx.reply(
    "👑 <b>GOLD TRADE ACCESS</b>\n\n" +
    "Для рассмотрения заявки выполните следующие шаги:\n\n" +
    "1. Ознакомьтесь с условиями платформы.\n" +
    "2. При необходимости зарегистрируйтесь по одной из ссылок.\n" +
    "3. Подайте заявку и укажите свой Pocket Option ID.\n" +
    "4. Дождитесь решения администратора.\n\n" +
    "Доступ предоставляется только после ручной проверки.",
    {
      parse_mode: "HTML",
      reply_markup: joinKeyboard(ctx.from.id),
    }
  )
}

async function showAbout(ctx) {
  await ctx.reply(
    "🟡 <b>О GOLD TRADE</b>\n\n" +
    "GOLD TRADE — закрытый проект, объединяющий торговое сообщество, аналитические материалы и обучающий раздел.\n\n" +
    "Доступ предоставляется после рассмотрения заявки администратором.\n\n" +
    "Мы не обещаем доходность и не гарантируем результат торговли.\n\n" +
    "ℹ️ Проект может получать партнёрское вознаграждение, если пользователь регистрируется по нашей ссылке.",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("👑 ПОЛУЧИТЬ ДОСТУП", "join")
        .row()
        .text("⬅️ НАЗАД", "home"),
    }
  )
}

async function showRules(ctx) {
  await ctx.reply(
    "⚠️ <b>РИСКИ И ПРАВИЛА</b>\n\n" +
    "• Торговля бинарными опционами связана с высоким риском.\n" +
    "• Вы можете потерять весь депозит.\n" +
    "• Прошлые результаты не гарантируют будущих.\n" +
    "• Сигналы и аналитика не являются гарантией сделки.\n" +
    "• Не используйте заёмные средства.\n" +
    "• Не вкладывайте деньги, потерю которых не можете себе позволить.\n\n" +
    "<b>GOLD TRADE не гарантирует прибыль и не несёт ответственности за торговые решения пользователя.</b>",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("👑 ПОЛУЧИТЬ ДОСТУП", "join")
        .row()
        .text("⬅️ НАЗАД", "home"),
    }
  )
}

async function showStatus(ctx) {
  const userId = String(ctx.from.id)
  const applications = await loadApplications()
  const application = applications[userId]

  let message = "📊 <b>ВАШ СТАТУС</b>\n\n"

  if (!application) {
    message += "Статус заявки: <b>заявка не подана</b>\n\n"
    message += "Вы можете ознакомиться с условиями и отправить заявку."
  } else if (application.status === "pending") {
    message += "Статус заявки: <b>на рассмотрении</b>\n"
    message += `Дата подачи: ${formatDate(application.createdAt)}`
  } else if (application.status === "approved") {
    message += "Статус заявки: <b>одобрена</b>\n"
    message += "Если ссылки на вступление истекли, запросите их повторно."
  } else if (application.status === "rejected") {
    message += "Статус заявки: <b>отклонена</b>\n"
    message += `Дата решения: ${formatDate(application.reviewedAt)}`
  } else {
    message += "Статус заявки: <b>не активна</b>"
  }

  const keyboard = new InlineKeyboard()

  if (application?.status === "approved") {
    keyboard.text("🔗 ПОЛУЧИТЬ ССЫЛКИ ПОВТОРНО", "resend")
      .row()
  } else if (!application || application.status === "cancelled") {
    keyboard.text("📝 ПОДАТЬ ЗАЯВКУ", "apply")
      .row()
  }

  keyboard.text("⬅️ ГЛАВНОЕ МЕНЮ", "home")

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  })
}

async function showAcademy(ctx) {
  const applications = await loadApplications()
  const application = applications[String(ctx.from.id)]

  let message =
    "🎓 <b>GOLD TRADE ACADEMY</b>\n\n" +
    "Обучающий раздел проекта. Здесь размещаются материалы и информация для участников."

  if (application?.status === "approved") {
    message += "\n\nВаш доступ одобрен. Если приглашение истекло, запросите ссылки повторно."
  } else {
    message += "\n\nДля доступа к закрытому разделу необходимо подать заявку и дождаться одобрения."
  }

  const keyboard = new InlineKeyboard()

  if (application?.status === "approved") {
    keyboard.text("🔗 ПОЛУЧИТЬ ССЫЛКИ", "resend").row()
  } else {
    keyboard.text("👑 ПОЛУЧИТЬ ДОСТУП", "join").row()
  }

  keyboard.text("⬅️ НАЗАД", "home")

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  })
}

async function showSupport(ctx) {
  await ctx.reply(
    "🛟 <b>ПОДДЕРЖКА GOLD TRADE</b>\n\n" +
    "Если у вас возникли вопросы по регистрации, заявке или доступу — напишите администратору.",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .url("НАПИСАТЬ В ПОДДЕРЖКУ", SUPPORT_URL)
        .row()
        .text("⬅️ ГЛАВНОЕ МЕНЮ", "home"),
    }
  )
}

// ======================================================
// APPLICATIONS
// ======================================================

async function askPocketId(ctx) {
  const applications = await loadApplications()
  const existing = applications[String(ctx.from.id)]

  if (existing?.status === "pending") {
    await ctx.reply("⏳ Ваша заявка уже находится на рассмотрении.")
    return
  }

  if (existing?.status === "approved") {
    await ctx.reply("✅ Ваша заявка уже одобрена. Используйте раздел «Мой статус».")
    return
  }

  if (existing?.status === "rejected") {
    await ctx.reply("❌ Ваша предыдущая заявка была отклонена. Обратитесь в поддержку.")
    return
  }

  pendingInputs.set(String(ctx.from.id), "pocket_id")

  await ctx.reply(
    "📝 <b>ПОДАЧА ЗАЯВКИ</b>\n\n" +
    "Отправьте ваш Pocket Option ID — числовой идентификатор аккаунта.\n\n" +
    "Не отправляйте пароль, коды подтверждения или платёжные данные.\n\n" +
    "Для отмены отправьте /cancel",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("❌ ОТМЕНА", "cancel_application")
        .row()
        .text("⬅️ ГЛАВНОЕ МЕНЮ", "home"),
    }
  )
}

async function submitApplication(ctx, pocketId) {
  const userId = String(ctx.from.id)

  const result = await updateApplications((applications) => {
    const existing = applications[userId]

    if (
      existing &&
      ["pending", "approved", "rejected"].includes(existing.status)
    ) {
      return { ok: false, status: existing.status }
    }

    applications[userId] = {
      userId,
      pocketId,
      status: "pending",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      inviteLinks: null,
    }

    return { ok: true }
  })

  if (!result.ok) {
    await ctx.reply(`У вас уже есть заявка со статусом: ${result.status}`)
    return
  }

  await stopReminder(userId)

  const username = ctx.from.username
    ? `@${escapeHtml(ctx.from.username)}`
    : "не указан"

  const adminMessage =
    "📥 <b>НОВАЯ ЗАЯВКА GOLD TRADE</b>\n\n" +
    `Имя: ${escapeHtml(ctx.from.first_name || "—")}\n` +
    `Username: ${username}\n` +
    `Telegram ID: <code>${userId}</code>\n` +
    `Pocket Option ID: <code>${escapeHtml(pocketId)}</code>\n` +
    `Дата: ${formatDate(new Date().toISOString())}\n\n` +
    "Статус: <b>ОЖИДАЕТ РЕШЕНИЯ</b>"

  try {
    await ctx.api.sendMessage(ADMIN_ID, adminMessage, {
      parse_mode: "HTML",
      reply_markup: applicationKeyboard(userId),
    })
  } catch (error) {
    console.error("[ADMIN APPLICATION NOTICE]", error)
  }

  await ctx.reply(
    "✅ <b>ЗАЯВКА ОТПРАВЛЕНА</b>\n\n" +
    "Ваша заявка передана администратору.\n" +
    "Дождитесь уведомления о решении.\n\n" +
    "Повторно отправлять заявку не нужно.",
    {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(),
    }
  )
}

async function approveApplication(ctx, userId) {
  if (!isAdmin(ctx)) return

  const applications = await loadApplications()
  const application = applications[userId]

  if (!application || application.status !== "pending") {
    await ctx.answerCallbackQuery({
      text: "Заявка уже обработана или не найдена.",
      show_alert: true,
    })
    return
  }

  await ctx.answerCallbackQuery({ text: "Создаю приглашения..." })

  let links

  try {
    links = await createInvitations(ctx)
  } catch (error) {
    console.error("[INVITE CREATE]", error)
    await ctx.reply(
      "❌ Не удалось создать все приглашения. Статус заявки не изменён. Попробуйте ещё раз."
    )
    return
  }

  const result = await updateApplications((data) => {
    const current = data[userId]

    if (!current || current.status !== "pending") {
      return false
    }

    current.status = "approved"
    current.reviewedAt = new Date().toISOString()
    current.reviewedBy = String(ADMIN_ID)
    current.inviteLinks = links

    return true
  })

  if (!result) {
    await ctx.reply("Заявка уже была обработана другим действием.")
    return
  }

  await stopReminder(userId)

  try {
    await ctx.api.sendMessage(
      userId,
      "👑 <b>ВАША ЗАЯВКА ОДОБРЕНА!</b>\n\n" +
      "Добро пожаловать в GOLD TRADE ACCESS.",
      { parse_mode: "HTML" }
    )

    await ctx.api.sendMessage(
      userId,
      "Ваши персональные приглашения:",
      {
        reply_markup: new InlineKeyboard()
          .url("👑 VIP CHANNEL", links.VIP)
          .row()
          .url("💬 PRIVATE CHAT", links.CHAT)
          .row()
          .url("🎓 ACADEMY", links.ACADEMY),
      }
    )
  } catch (error) {
    console.error("[APPROVAL NOTIFICATION]", error)
    await ctx.reply(
      "Заявка одобрена, но уведомление пользователю не доставлено. Используйте повторную отправку ссылок."
    )
  }

  await ctx.editMessageText(
    "✅ <b>ЗАЯВКА ОДОБРЕНА</b>\n\n" +
    `Telegram ID: <code>${escapeHtml(userId)}</code>\n` +
    `Pocket Option ID: <code>${escapeHtml(application.pocketId)}</code>\n` +
    `Дата: ${formatDate(new Date().toISOString())}`,
    { parse_mode: "HTML" }
  ).catch(() => {})
}

async function rejectApplication(ctx, userId) {
  if (!isAdmin(ctx)) return

  const result = await updateApplications((applications) => {
    const application = applications[userId]

    if (!application || application.status !== "pending") {
      return false
    }

    application.status = "rejected"
    application.reviewedAt = new Date().toISOString()
    application.reviewedBy = String(ADMIN_ID)

    return true
  })

  if (!result) {
    await ctx.answerCallbackQuery({
      text: "Заявка уже обработана или не найдена.",
      show_alert: true,
    })
    return
  }

  await stopReminder(userId)

  await ctx.answerCallbackQuery({ text: "Заявка отклонена." })

  await ctx.api.sendMessage(
    userId,
    "❌ <b>ЗАЯВКА НЕ ОДОБРЕНА</b>\n\n" +
    "По вопросам решения обратитесь в поддержку GOLD TRADE.",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .url("🛟 ПОДДЕРЖКА", SUPPORT_URL)
        .row()
        .text("🏠 ГЛАВНОЕ МЕНЮ", "home"),
    }
  ).catch(() => {})

  await ctx.editMessageText(
    "❌ <b>ЗАЯВКА ОТКЛОНЕНА</b>\n\n" +
    `Telegram ID: <code>${escapeHtml(userId)}</code>\n` +
    `Дата: ${formatDate(new Date().toISOString())}`,
    { parse_mode: "HTML" }
  ).catch(() => {})
}

async function resendInvitations(ctx) {
  const userId = String(ctx.from.id)
  const applications = await loadApplications()
  const application = applications[userId]

  if (application?.status !== "approved") {
    await ctx.reply("Ссылки доступны только после одобрения заявки.")
    return
  }

  await ctx.reply("Создаю новые персональные приглашения...")

  try {
    const links = await createInvitations(ctx)

    await updateApplications((data) => {
      if (data[userId]?.status === "approved") {
        data[userId].inviteLinks = links
        data[userId].lastInviteIssuedAt = new Date().toISOString()
      }
    })

    await sendInvitations(ctx, links)
  } catch (error) {
    console.error("[RESEND INVITES]", error)
    await ctx.reply("Не удалось создать приглашения. Обратитесь в поддержку.")
  }
}

// ======================================================
// ADMIN PANEL
// ======================================================

async function showAdmin(ctx) {
  if (!isAdmin(ctx)) return

  const [users, applications, reminders] = await Promise.all([
    loadUsers(),
    loadApplications(),
    loadReminders(),
  ])

  const allApps = Object.values(applications)

  const pending = allApps.filter((x) => x.status === "pending").length
  const approved = allApps.filter((x) => x.status === "approved").length
  const rejected = allApps.filter((x) => x.status === "rejected").length

  const activeReminders = Object.values(reminders)
    .filter((x) => x.active && !x.optOut).length

  await ctx.reply(
    "👑 <b>GOLD TRADE — ADMIN PANEL</b>\n\n" +
    `Версия: <b>${BOT_VERSION}</b>\n\n` +
    `👥 Пользователей: <b>${Object.keys(users).length}</b>\n` +
    `⏳ На рассмотрении: <b>${pending}</b>\n` +
    `✅ Одобрено: <b>${approved}</b>\n` +
    `❌ Отклонено: <b>${rejected}</b>\n` +
    `🔔 Активные напоминания: <b>${activeReminders}</b>`,
    {
      parse_mode: "HTML",
      reply_markup: adminKeyboard(),
    }
  )
}

async function showAdminStats(ctx) {
  if (!isAdmin(ctx)) return

  const [users, applications, reminders] = await Promise.all([
    loadUsers(),
    loadApplications(),
    loadReminders(),
  ])

  const apps = Object.values(applications)

  const count = (status) =>
    apps.filter((item) => item.status === status).length

  await ctx.reply(
    "📊 <b>СТАТИСТИКА GOLD TRADE</b>\n\n" +
    `Всего пользователей: ${Object.keys(users).length}\n` +
    `Всего заявок: ${apps.length}\n\n` +
    `⏳ Ожидают: ${count("pending")}\n` +
    `✅ Одобрены: ${count("approved")}\n` +
    `❌ Отклонены: ${count("rejected")}\n\n` +
    `🔔 Активные напоминания: ${Object.values(reminders).filter((x) => x.active && !x.optOut).length}\n` +
    `🔕 Отказались от напоминаний: ${Object.values(reminders).filter((x) => x.optOut).length}`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("⬅️ АДМИН-ПАНЕЛЬ", "admin:home"),
    }
  )
}

async function showAdminApplications(ctx) {
  if (!isAdmin(ctx)) return

  const applications = await loadApplications()

  const pending = Object.entries(applications)
    .filter(([, app]) => app.status === "pending")
    .slice(0, 15)

  if (!pending.length) {
    await ctx.reply("📥 Новых заявок на рассмотрении нет.")
    return
  }

  const keyboard = new InlineKeyboard()

  for (const [userId, app] of pending) {
    keyboard.text(
      `Заявка ${userId} · PO ${app.pocketId}`,
      `admin:application:${userId}`
    ).row()
  }

  keyboard.text("⬅️ АДМИН-ПАНЕЛЬ", "admin:home")

  await ctx.reply(
    `📥 <b>ЗАЯВКИ НА РАССМОТРЕНИИ: ${pending.length}</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  )
}

async function showAdminApplication(ctx, userId) {
  if (!isAdmin(ctx)) return

  const applications = await loadApplications()
  const app = applications[userId]

  if (!app) {
    await ctx.reply("Заявка не найдена.")
    return
  }

  await ctx.reply(
    "📄 <b>ЗАЯВКА</b>\n\n" +
    `Telegram ID: <code>${escapeHtml(userId)}</code>\n` +
    `Pocket Option ID: <code>${escapeHtml(app.pocketId)}</code>\n` +
    `Статус: <b>${escapeHtml(app.status)}</b>\n` +
    `Дата: ${formatDate(app.createdAt)}`,
    {
      parse_mode: "HTML",
      reply_markup: app.status === "pending"
        ? applicationKeyboard(userId)
        : new InlineKeyboard().text("⬅️ ЗАЯВКИ", "admin:apps"),
    }
  )
}

// ======================================================
// BROADCAST
// ======================================================

async function beginBroadcast(ctx) {
  if (!isAdmin(ctx)) return

  broadcastDrafts.set(String(ADMIN_ID), {
    stage: "waiting_content",
    audience: "all",
    sourceChatId: null,
    sourceMessageId: null,
    previewMessageId: null,
  })

  await ctx.reply(
    "📨 <b>СОЗДАНИЕ РАССЫЛКИ</b>\n\n" +
    "Отправьте следующим сообщением текст или фото с подписью.\n\n" +
    "Сообщение будет скопировано пользователям от имени бота.\n" +
    "Перед отправкой вы увидите предварительный просмотр и подтверждение.\n\n" +
    "Для отмены нажмите кнопку ниже.",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("❌ ОТМЕНИТЬ", "bc:cancel"),
    }
  )
}

async function captureBroadcastContent(ctx) {
  if (!isAdmin(ctx)) return false

  const draft = broadcastDrafts.get(String(ADMIN_ID))

  if (!draft || draft.stage !== "waiting_content") return false

  const message = ctx.message

  if (!message || message.text?.startsWith("/")) {
    await ctx.reply("Отправьте текст или фото с подписью. Для отмены нажмите кнопку.")
    return true
  }

  draft.sourceChatId = message.chat.id
  draft.sourceMessageId = message.message_id
  draft.stage = "preview"

  const keyboard = new InlineKeyboard()
    .text("👥 ВСЕ ПОЛЬЗОВАТЕЛИ", "bc:aud:all")
    .row()
    .text("🟡 ТОЛЬКО БЕЗ ЗАЯВКИ", "bc:aud:undecided")
    .row()
    .text("⏳ ТОЛЬКО ОЖИДАЮЩИЕ", "bc:aud:pending")
    .row()
    .text("✅ ТОЛЬКО ОДОБРЕННЫЕ", "bc:aud:approved")
    .row()
    .text("🚀 ПОДТВЕРДИТЬ РАССЫЛКУ", "bc:confirm")
    .row()
    .text("❌ ОТМЕНА", "bc:cancel")

  try {
    const copied = await ctx.api.copyMessage(
      ADMIN_ID,
      message.chat.id,
      message.message_id,
      { reply_markup: keyboard }
    )

    draft.previewMessageId = copied.message_id
    broadcastDrafts.set(String(ADMIN_ID), draft)
  } catch (error) {
    console.error("[BROADCAST PREVIEW]", error)
    broadcastDrafts.delete(String(ADMIN_ID))
    await ctx.reply("Не удалось создать предварительный просмотр.")
  }

  return true
}

async function updateBroadcastAudience(ctx, audience) {
  if (!isAdmin(ctx)) return

  const draft = broadcastDrafts.get(String(ADMIN_ID))

  if (!draft || draft.stage !== "preview") {
    await ctx.answerCallbackQuery({ text: "Черновик не найден." })
    return
  }

  draft.audience = audience
  broadcastDrafts.set(String(ADMIN_ID), draft)

  await ctx.answerCallbackQuery({
    text: `Аудитория: ${audience}`,
  })

  await ctx.editMessageReplyMarkup({
    reply_markup: new InlineKeyboard()
      .text(audience === "all" ? "✓ ВСЕ ПОЛЬЗОВАТЕЛИ" : "👥 ВСЕ ПОЛЬЗОВАТЕЛИ", "bc:aud:all")
      .row()
      .text(audience === "undecided" ? "✓ БЕЗ ЗАЯВКИ" : "🟡 ТОЛЬКО БЕЗ ЗАЯВКИ", "bc:aud:undecided")
      .row()
      .text(audience === "pending" ? "✓ ОЖИДАЮЩИЕ" : "⏳ ТОЛЬКО ОЖИДАЮЩИЕ", "bc:aud:pending")
      .row()
      .text(audience === "approved" ? "✓ ОДОБРЕННЫЕ" : "✅ ТОЛЬКО ОДОБРЕННЫЕ", "bc:aud:approved")
      .row()
      .text("🚀 ПОДТВЕРДИТЬ РАССЫЛКУ", "bc:confirm")
      .row()
      .text("❌ ОТМЕНА", "bc:cancel"),
  }).catch(() => {})
}

async function confirmBroadcast(ctx) {
  if (!isAdmin(ctx)) return

  const draft = broadcastDrafts.get(String(ADMIN_ID))

  if (!draft || draft.stage !== "preview") {
    await ctx.answerCallbackQuery({
      text: "Черновик не найден.",
      show_alert: true,
    })
    return
  }

  draft.stage = "sending"
  broadcastDrafts.set(String(ADMIN_ID), draft)

  await ctx.answerCallbackQuery({ text: "Рассылка запускается." })

  const [users, applications] = await Promise.all([
    loadUsers(),
    loadApplications(),
  ])

  let targets = Object.keys(users)

  if (draft.audience === "undecided") {
    targets = targets.filter((id) => {
      const app = applications[id]
      return !app || app.status === "cancelled"
    })
  } else if (draft.audience === "pending") {
    targets = targets.filter((id) => applications[id]?.status === "pending")
  } else if (draft.audience === "approved") {
    targets = targets.filter((id) => applications[id]?.status === "approved")
  }

  let sent = 0
  let failed = 0

  await ctx.reply(
    `📨 Рассылка начата. Получателей: ${targets.length}.`
  )

  for (const userId of targets) {
    try {
      await ctx.api.copyMessage(
        userId,
        draft.sourceChatId,
        draft.sourceMessageId
      )
      sent++
    } catch (error) {
      failed++
      console.error("[BROADCAST DELIVERY]", userId, error.message)
    }

    // Conservative pacing to reduce Telegram rate-limit errors.
    await new Promise((resolve) => setTimeout(resolve, 40))
  }

  broadcastDrafts.delete(String(ADMIN_ID))

  await ctx.reply(
    "✅ <b>РАССЫЛКА ЗАВЕРШЕНА</b>\n\n" +
    `Аудитория: ${escapeHtml(draft.audience)}\n` +
    `Успешно отправлено: ${sent}\n` +
    `Ошибок отправки: ${failed}\n` +
    `Всего получателей: ${targets.length}`,
    {
      parse_mode: "HTML",
      reply_markup: adminKeyboard(),
    }
  )
}

async function cancelBroadcast(ctx) {
  if (!isAdmin(ctx)) return

  broadcastDrafts.delete(String(ADMIN_ID))

  await ctx.answerCallbackQuery({ text: "Рассылка отменена." })

  await ctx.reply(
    "❌ Черновик рассылки отменён.",
    { reply_markup: adminKeyboard() }
  )
}

// ======================================================
// CALLBACK ROUTER
// ======================================================

async function handleCallback(ctx) {
  const data = ctx.callbackQuery?.data || ""

  if (data.startsWith("approve:")) {
    await approveApplication(ctx, data.split(":")[1])
    return
  }

  if (data.startsWith("reject:")) {
    await rejectApplication(ctx, data.split(":")[1])
    return
  }

  if (data.startsWith("admin:")) {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({
        text: "Нет доступа.",
        show_alert: true,
      })
      return
    }

    if (data === "admin:home") {
      await ctx.answerCallbackQuery()
      await showAdmin(ctx)
      return
    }

    if (data === "admin:stats") {
      await ctx.answerCallbackQuery()
      await showAdminStats(ctx)
      return
    }

    if (data === "admin:apps") {
      await ctx.answerCallbackQuery()
      await showAdminApplications(ctx)
      return
    }

    if (data === "admin:broadcast") {
      await ctx.answerCallbackQuery()
      await beginBroadcast(ctx)
      return
    }

    if (data === "admin:reminders") {
      const reminders = await loadReminders()
      const active = Object.values(reminders)
        .filter((x) => x.active && !x.optOut).length
      const optedOut = Object.values(reminders)
        .filter((x) => x.optOut).length

      await ctx.answerCallbackQuery()
      await ctx.reply(
        `🔔 <b>НАПОМИНАНИЯ</b>\n\nАктивные: ${active}\nОтключили: ${optedOut}`,
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard()
            .text("⬅️ АДМИН-ПАНЕЛЬ", "admin:home"),
        }
      )
      return
    }

    if (data === "admin:version") {
      await ctx.answerCallbackQuery()
      await ctx.reply(BOT_VERSION)
      return
    }

    if (data.startsWith("admin:application:")) {
      await ctx.answerCallbackQuery()
      await showAdminApplication(ctx, data.split(":")[2])
      return
    }

    await ctx.answerCallbackQuery()
    return
  }

  if (data.startsWith("bc:")) {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({
        text: "Нет доступа.",
        show_alert: true,
      })
      return
    }

    if (data === "bc:cancel") {
      await cancelBroadcast(ctx)
      return
    }

    if (data === "bc:confirm") {
      await confirmBroadcast(ctx)
      return
    }

    if (data.startsWith("bc:aud:")) {
      await updateBroadcastAudience(ctx, data.split(":")[2])
      return
    }
  }

  await ctx.answerCallbackQuery().catch(() => {})

  switch (data) {
    case "home":
      await showHome(ctx)
      break

    case "join":
      await showJoin(ctx)
      break

    case "about":
      await showAbout(ctx)
      break

    case "status":
      await showStatus(ctx)
      break

    case "rules":
      await showRules(ctx)
      break

    case "academy":
      await showAcademy(ctx)
      break

    case "support":
      await showSupport(ctx)
      break

    case "channel":
      await ctx.reply(
        "📢 Официальный канал GOLD TRADE:",
        {
          reply_markup: new InlineKeyboard()
            .url("ОТКРЫТЬ КАНАЛ", MAIN_CHANNEL_URL)
            .row()
            .text("⬅️ НАЗАД", "home"),
        }
      )
      break

    case "registered":
      await ctx.reply(
        "Если вы уже зарегистрированы, отправьте заявку на проверку. Доступ предоставляется только после ручного одобрения.",
        {
          reply_markup: new InlineKeyboard()
            .text("📝 ПОДАТЬ ЗАЯВКУ", "apply")
            .row()
            .text("⬅️ НАЗАД", "join"),
        }
      )
      break

    case "apply":
      await askPocketId(ctx)
      break

    case "cancel_application":
      pendingInputs.delete(String(ctx.from.id))
      await ctx.answerCallbackQuery({ text: "Ввод отменён." })
      await ctx.reply("Подача заявки отменена.")
      break

    case "stop_reminders":
      await stopReminder(ctx.from.id, true)
      await ctx.reply(
        "🔕 Напоминания отключены. Мы больше не будем отправлять вам напоминания о заявке."
      )
      break

    case "enable_reminders":
      await enableReminders(ctx.from.id)
      await ctx.reply("🔔 Напоминания снова включены.")
      break

    case "resend":
      await resendInvitations(ctx)
      break

    default:
      break
  }
}

// ======================================================
// COMMAND REGISTRATION
// ======================================================

export function registerCommands(bot) {
  bot.use(async (ctx, next) => {
    if (ctx.from && ctx.chat?.type === "private") {
      try {
        await registerUser(ctx)
      } catch (error) {
        console.error("[REGISTER USER]", error)
      }
    }

    await next()
  })

  bot.command("start", async (ctx) => {
    pendingInputs.delete(String(ctx.from.id))
    await showHome(ctx)
  })

  bot.command("join", showJoin)
  bot.command("about", showAbout)
  bot.command("status", showStatus)
  bot.command("rules", showRules)
  bot.command("help", showSupport)
  bot.command("stopreminders", async (ctx) => {
    await stopReminder(ctx.from.id, true)
    await ctx.reply("🔕 Напоминания отключены.")
  })

  bot.command("cancel", async (ctx) => {
    pendingInputs.delete(String(ctx.from.id))
    await stopReminder(ctx.from.id)
    await ctx.reply("Действие отменено.")
  })

  bot.command("resend", resendInvitations)

  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) return
    await showAdmin(ctx)
  })

  bot.command("version", async (ctx) => {
    await ctx.reply(BOT_VERSION)
  })

  bot.command("chatid", async (ctx) => {
    if (!isAdmin(ctx)) return
    await ctx.reply(`Chat ID: ${ctx.chat.id}`)
  })

  bot.command("groupid", async (ctx) => {
    if (!isAdmin(ctx)) return
    await ctx.reply(`Group ID: ${ctx.chat.id}`)
  })

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx)) return
    await beginBroadcast(ctx)
  })

  bot.on("callback_query:data", handleCallback)

  // Admin broadcast content is captured before normal user input.
  bot.on("message", async (ctx, next) => {
    if (isAdmin(ctx) && ctx.chat?.type === "private") {
      const captured = await captureBroadcastContent(ctx)
      if (captured) return
    }

    await next()
  })

  bot.on("message:text", async (ctx) => {
    if (ctx.chat?.type !== "private") return

    const userId = String(ctx.from.id)
    const inputMode = pendingInputs.get(userId)

    if (inputMode !== "pocket_id") return

    const pocketId = ctx.message.text.trim()

    if (!/^\d{4,20}$/.test(pocketId)) {
      await ctx.reply(
        "❌ Неверный формат ID. Отправьте числовой Pocket Option ID длиной от 4 до 20 цифр.\n\nДля отмены: /cancel"
      )
      return
    }

    pendingInputs.delete(userId)
    await submitApplication(ctx, pocketId)
  })

  // Process reminders once per minute.
  let reminderTimerStarted = false

  if (!reminderTimerStarted) {
    reminderTimerStarted = true

    setInterval(() => {
      processDueReminders(bot).catch((error) => {
        console.error("[REMINDER WORKER]", error)
      })
    }, 60 * 1000)
  }

  console.log(`[BOT] ${BOT_VERSION} commands registered`)
}
