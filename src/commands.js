import { InlineKeyboard } from "grammy"
import {
  mkdir,
  readFile,
  writeFile,
  rename,
} from "node:fs/promises"
import path from "node:path"

// ======================================================
// GOLD TRADE ACCESS v6.0
// Node.js 20+ | grammY
// ======================================================

const BOT_VERSION = "6.0.0"

const ADMIN_ID = 8207612971

const STORAGE_DIR = "/data/storage"

const FILES = {
  users: path.join(STORAGE_DIR, "users.json"),
  applications: path.join(STORAGE_DIR, "applications.json"),
  reminders: path.join(STORAGE_DIR, "reminders.json"),
  events: path.join(STORAGE_DIR, "pocket-option-events.json"),
  broadcast: path.join(STORAGE_DIR, "broadcast-draft.json"),
}

const CHANNELS = {
  VIP: "-1004332935139",
  CHAT: "-1003738170914",
  ACADEMY: "-1003726976169",
}

const LINKS = {
  bonus10:
    "https://po-ru4.click/register?utm_campaign=873587&utm_source=affiliate&utm_medium=sr&a=bvdTV2aDJ48lYW&al=1810953&ac=goldtrade&cid=991310&code=WELCOME50",

  bonus50:
    "https://po-ru4.click/register?utm_campaign=873587&utm_source=affiliate&utm_medium=sr&a=bvdTV2aDJ48lYW&al=1811777&ac=goldtrade50&cid=991998&code=50START",

  noBonus:
    "https://po-ru4.click/smart/bvdTV2aDJ48lYW",
}

const SUPPORT_URL = "https://t.me/GT_EVGEN"
const MAIN_CHANNEL_URL = "https://t.me/goldtrade_evgen"

const REMINDER_DELAYS = [
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
]

const REMINDER_TEXTS = [
  "Вы начали знакомство с GOLD TRADE, но ещё не отправили заявку.\n\nЕсли хотите продолжить, нажмите кнопку ниже. Решение о предоставлении доступа принимает администратор.",

  "Напоминаем о GOLD TRADE ACCESS.\n\nЕсли вы всё ещё заинтересованы в закрытом сообществе, можете продолжить оформление заявки.",

  "Это последнее автоматическое напоминание о GOLD TRADE ACCESS.\n\nЕсли предложение вам больше не актуально, просто проигнорируйте это сообщение или отключите напоминания.",
]

const userStates = new Map()
const adminStates = new Map()

let reminderWorkerRunning = false
let broadcastRunning = false

const fileQueues = new Map()

// ======================================================
// STORAGE
// ======================================================

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true })

  for (const file of Object.values(FILES)) {
    try {
      await readFile(file, "utf8")
    } catch {
      await writeFile(file, "{}", "utf8")
    }
  }
}

async function readStore(name) {
  try {
    const raw = await readFile(FILES[name], "utf8")
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    return parsed
  } catch {
    return {}
  }
}

async function writeStore(name, data) {
  const file = FILES[name]
  const temporaryFile = `${file}.tmp`

  await writeFile(
    temporaryFile,
    JSON.stringify(data, null, 2),
    "utf8",
  )

  await rename(temporaryFile, file)
}

async function updateStore(name, updater) {
  const previous = fileQueues.get(name) || Promise.resolve()

  const current = previous.then(async () => {
    const data = await readStore(name)
    const result = await updater(data)
    await writeStore(name, data)
    return result
  })

  fileQueues.set(name, current.catch(() => {}))

  return current
}

function now() {
  return Date.now()
}

function isAdmin(ctx) {
  return Number(ctx.from?.id) === ADMIN_ID
}

function userId(ctx) {
  return String(ctx.from.id)
}

function escapeText(value) {
  return String(value ?? "").slice(0, 3500)
}

function mainKeyboard() {
  return new InlineKeyboard()
    .text("🚀 Подать заявку", "apply")
    .row()
    .text("🎁 Регистрация", "registration")
    .row()
    .text("📊 Мой статус", "status")
    .row()
    .text("📚 Академия", "academy")
    .row()
    .text("📢 Наш канал", "channel")
    .text("🆘 Поддержка", "support")
    .row()
    .text("ℹ️ О проекте", "about")
    .text("⚠️ Риски", "risks")
}

function adminKeyboard() {
  return new InlineKeyboard()
    .text("📥 Заявки", "admin:applications")
    .row()
    .text("📊 Статистика", "admin:stats")
    .row()
    .text("📨 Рассылка", "admin:broadcast")
    .row()
    .text("🏠 Главное меню", "home")
}

function registrationKeyboard() {
  return new InlineKeyboard()
    .url("🎁 Бонус 50% — депозит 10", LINKS.bonus10)
    .row()
    .url("🎁 Бонус 50% — депозит $50", LINKS.bonus50)
    .row()
    .url("Регистрация без бонуса", LINKS.noBonus)
    .row()
    .text("⬅️ Назад", "home")
}

function applicationKeyboard() {
  return new InlineKeyboard()
    .text("📝 Отправить заявку", "apply")
    .row()
    .text("⬅️ Главное меню", "home")
}

function adminApplicationKeyboard(id) {
  return new InlineKeyboard()
    .text("✅ Одобрить", `approve:${id}`)
    .text("❌ Отклонить", `reject:${id}`)
    .row()
    .text("🔄 Обновить", `application:${id}`)
}

function inviteKeyboard(invites) {
  const keyboard = new InlineKeyboard()

  if (invites.VIP) keyboard.url("👑 VIP", invites.VIP)
  if (invites.CHAT) keyboard.url("💬 CHAT", invites.CHAT)
  if (invites.ACADEMY) keyboard.url("🎓 ACADEMY", invites.ACADEMY)

  return keyboard
}

async function registerUser(ctx) {
  const id = userId(ctx)

  await updateStore("users", (users) => {
    const previous = users[id] || {}

    users[id] = {
      id,
      username: ctx.from.username || previous.username || "",
      firstName: ctx.from.first_name || previous.firstName || "",
      lastName: ctx.from.last_name || previous.lastName || "",
      createdAt: previous.createdAt || now(),
      lastSeenAt: now(),
      ...previous,
    }
  })
}

// ======================================================
// REMINDERS
// ======================================================

async function startReminder(id) {
  await updateStore("reminders", (reminders) => {
    const previous = reminders[id] || {}

    if (previous.optOut) return

    reminders[id] = {
      startedAt: now(),
      stage: 0,
      active: true,
      optOut: false,
      ...previous,
      active: true,
      startedAt: previous.startedAt || now(),
    }
  })
}

async function stopReminder(id) {
  await updateStore("reminders", (reminders) => {
    const previous = reminders[id] || {}

    reminders[id] = {
      ...previous,
      active: false,
      stoppedAt: now(),
    }
  })
}

async function optOutReminder(id) {
  await updateStore("reminders", (reminders) => {
    reminders[id] = {
      ...(reminders[id] || {}),
      active: false,
      optOut: true,
      optedOutAt: now(),
    }
  })
}

async function optInReminder(id) {
  await updateStore("reminders", (reminders) => {
    reminders[id] = {
      ...(reminders[id] || {}),
      active: false,
      optOut: false,
      stage: 0,
      startedAt: now(),
    }
  })
}

async function processDueReminders(bot) {
  if (reminderWorkerRunning) return

  reminderWorkerRunning = true

  try {
    const reminders = await readStore("reminders")
    const applications = await readStore("applications")

    for (const [id, reminder] of Object.entries(reminders)) {
      if (!reminder.active || reminder.optOut) continue

      const application = applications[id]

      if (
        application &&
        ["pending", "approving", "approved", "rejected"].includes(
          application.status,
        )
      ) {
        await stopReminder(id)
        continue
      }

      const elapsed = now() - Number(reminder.startedAt || now())

      let dueStage = -1

      for (let index = 0; index < REMINDER_DELAYS.length; index++) {
        if (elapsed >= REMINDER_DELAYS[index]) {
          dueStage = index + 1
        }
      }

      if (dueStage <= Number(reminder.stage || 0)) continue

      const message = REMINDER_TEXTS[dueStage - 1]

      const keyboard = new InlineKeyboard()
        .text("🚀 Продолжить", "apply")
        .row()
        .text("🔕 Отключить напоминания", "reminder:off")

      try {
        await bot.api.sendMessage(id, message, {
          reply_markup: keyboard,
        })

        await updateStore("reminders", (data) => {
          if (!data[id]) return
          data[id].stage = dueStage

          if (dueStage >= 3) {
            data[id].active = false
          }
        })
      } catch (error) {
        console.error(`Reminder error for ${id}:`, error.message)
      }
    }
  } catch (error) {
    console.error("Reminder worker error:", error)
  } finally {
    reminderWorkerRunning = false
  }
}

// ======================================================
// APPLICATIONS
// ======================================================

async function askForApplication(ctx) {
  const id = userId(ctx)

  await startReminder(id)

  userStates.set(id, "waiting_pocket_id")

  await ctx.reply(
    "📝 *Заявка GOLD TRADE ACCESS*\n\nОтправьте ваш ID аккаунта Pocket Option.\n\nПосле отправки заявка поступит администратору на ручную проверку.",
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("❌ Отмена", "cancel_application"),
    },
  )
}

async function submitApplication(ctx, pocketId) {
  const id = userId(ctx)
  const cleanPocketId = String(pocketId).trim()

  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(cleanPocketId)) {
    await ctx.reply(
      "Не удалось распознать ID. Проверьте его и отправьте ещё раз.",
    )
    return
  }

  const result = await updateStore("applications", (applications) => {
    const existing = applications[id]

    if (
      existing &&
      ["pending", "approving", "approved"].includes(existing.status)
    ) {
      return { saved: false, existing }
    }

    applications[id] = {
      userId: id,
      pocketId: cleanPocketId,
      username: ctx.from.username || "",
      firstName: ctx.from.first_name || "",
      status: "pending",
      createdAt: now(),
      updatedAt: now(),
    }

    return { saved: true, application: applications[id] }
  })

  userStates.delete(id)
  await stopReminder(id)

  if (!result.saved) {
    const status = result.existing?.status

    await ctx.reply(
      status === "approved"
        ? "✅ Ваша заявка уже одобрена."
        : "⏳ Ваша заявка уже находится на рассмотрении.",
      { reply_markup: mainKeyboard() },
    )
    return
  }

  await ctx.reply(
    "✅ Заявка отправлена администратору.\n\nОжидайте решения. Доступ предоставляется только после ручного одобрения.",
    { reply_markup: mainKeyboard() },
  )

  const adminText =
    `📥 НОВАЯ ЗАЯВКА GOLD TRADE\n\n` +
    `👤 Имя: ${escapeText(ctx.from.first_name)}\n` +
    `🔗 Username: ${ctx.from.username ? "@" + ctx.from.username : "нет"}\n` +
    `🆔 Telegram ID: ${id}\n` +
    `💳 Pocket Option ID: ${cleanPocketId}\n` +
    `📅 Дата: ${new Date().toLocaleString("ru-RU")}\n\n` +
    `Статус: ОЖИДАЕТ РЕШЕНИЯ`

  try {
    await ctx.api.sendMessage(ADMIN_ID, adminText, {
      reply_markup: adminApplicationKeyboard(id),
    })
  } catch (error) {
    console.error("Cannot notify admin:", error)
  }
}

async function createInvitations(ctx) {
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  const invites = {}

  for (const [name, chatId] of Object.entries(CHANNELS)) {
    const invite = await ctx.api.createChatInviteLink(chatId, {
      name: `GOLD TRADE ${name}`,
      expire_date: expiresAt,
      member_limit: 1,
    })

    invites[name] = invite.invite_link
  }

  return invites
}

async function approveApplication(ctx, id) {
  if (!isAdmin(ctx)) return

  const reservation = await updateStore("applications", (applications) => {
    const application = applications[id]

    if (!application || application.status !== "pending") {
      return false
    }

    application.status = "approving"
    application.updatedAt = now()

    return true
  })

  if (!reservation) {
    await ctx.answerCallbackQuery({
      text: "Заявка уже обработана или не найдена.",
      show_alert: true,
    })
    return
  }

  try {
    const invites = await createInvitations(ctx)

    await updateStore("applications", (applications) => {
      const application = applications[id]

      if (!application || application.status !== "approving") return

      application.status = "approved"
      application.approvedAt = now()
      application.invites = invites
      application.updatedAt = now()
    })

    await stopReminder(id)

    await ctx.api.sendMessage(
      id,
      "🎉 Ваша заявка GOLD TRADE ACCESS одобрена!\n\nНиже находятся персональные приглашения. Ссылки действуют 24 часа и рассчитаны на одно вступление каждая.",
      { reply_markup: inviteKeyboard(invites) },
    )

    await ctx.answerCallbackQuery({ text: "Заявка одобрена." })

    await ctx.reply(
      `✅ Заявка ${id} одобрена. Приглашения отправлены пользователю.`,
    )
  } catch (error) {
    console.error("Approval error:", error)

    await updateStore("applications", (applications) => {
      const application = applications[id]

      if (application?.status === "approving") {
        application.status = "pending"
        application.updatedAt = now()
      }
    })

    await ctx.answerCallbackQuery({
      text: "Не удалось создать или отправить приглашения. Заявка возвращена в ожидание.",
      show_alert: true,
    })
  }
}

async function rejectApplication(ctx, id) {
  if (!isAdmin(ctx)) return

  const changed = await updateStore("applications", (applications) => {
    const application = applications[id]

    if (!application || !["pending", "approving"].includes(application.status)) {
      return false
    }

    application.status = "rejected"
    application.rejectedAt = now()
    application.updatedAt = now()

    return true
  })

  if (!changed) {
    await ctx.answerCallbackQuery({
      text: "Заявка уже обработана.",
      show_alert: true,
    })
    return
  }

  await stopReminder(id)

  try {
    await ctx.api.sendMessage(
      id,
      "❌ Ваша заявка GOLD TRADE ACCESS отклонена.\n\nЕсли у вас есть вопросы, обратитесь в поддержку.",
      {
        reply_markup: new InlineKeyboard().url(
          "🆘 Поддержка",
          SUPPORT_URL,
        ),
      },
    )
  } catch (error) {
    console.error("Cannot notify rejected user:", error)
  }

  await ctx.answerCallbackQuery({ text: "Заявка отклонена." })
  await ctx.reply(`❌ Заявка ${id} отклонена.`)
}

async function resendInvitations(ctx, id) {
  if (!isAdmin(ctx)) return

  const applications = await readStore("applications")
  const application = applications[id]

  if (!application || application.status !== "approved") {
    await ctx.reply("Одобренная заявка не найдена.")
    return
  }

  try {
    const invites = await createInvitations(ctx)

    await updateStore("applications", (data) => {
      if (!data[id] || data[id].status !== "approved") return

      data[id].invites = invites
      data[id].updatedAt = now()
      data[id].lastInviteResentAt = now()
    })

    await ctx.api.sendMessage(
      id,
      "🔄 Администратор обновил ваши приглашения GOLD TRADE ACCESS.\n\nИспользуйте новые ссылки в течение 24 часов.",
      { reply_markup: inviteKeyboard(invites) },
    )

    await ctx.reply("✅ Новые приглашения созданы и отправлены.")
  } catch (error) {
    console.error("Resend invitation error:", error)
    await ctx.reply("Не удалось создать или отправить новые приглашения.")
  }
}

// ======================================================
// ADMIN: APPLICATIONS AND STATISTICS
// ======================================================

async function showPendingApplications(ctx) {
  if (!isAdmin(ctx)) return

  const applications = await readStore("applications")

  const pending = Object.values(applications)
    .filter((item) => item.status === "pending")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 30)

  if (!pending.length) {
    await ctx.reply("📭 Ожидающих заявок нет.")
    return
  }

  await ctx.reply(`📥 Ожидают решения: ${pending.length}`)

  for (const app of pending) {
    const text =
      `👤 ${escapeText(app.firstName)}\n` +
      `Username: ${app.username ? "@" + app.username : "нет"}\n` +
      `Telegram ID: ${app.userId}\n` +
      `Pocket Option ID: ${app.pocketId}\n` +
      `Дата: ${new Date(app.createdAt).toLocaleString("ru-RU")}`

    await ctx.reply(text, {
      reply_markup: adminApplicationKeyboard(app.userId),
    })
  }
}

async function showAdminStats(ctx) {
  if (!isAdmin(ctx)) return

  const [users, applications, reminders, events] = await Promise.all([
    readStore("users"),
    readStore("applications"),
    readStore("reminders"),
    readStore("events"),
  ])

  const apps = Object.values(applications)
  const eventList = Object.values(events)

  const count = (status) =>
    apps.filter((item) => item.status === status).length

  const activeReminders = Object.values(reminders).filter(
    (item) => item.active && !item.optOut,
  ).length

  await ctx.reply(
    `📊 GOLD TRADE — СТАТИСТИКА\n\n` +
    `👥 Пользователей: ${Object.keys(users).length}\n` +
    `📥 Всего заявок: ${apps.length}\n` +
    `⏳ На рассмотрении: ${count("pending")}\n` +
    `🔄 В процессе одобрения: ${count("approving")}\n` +
    `✅ Одобрено: ${count("approved")}\n` +
    `❌ Отклонено: ${count("rejected")}\n` +
    `🔔 Активные напоминания: ${activeReminders}\n` +
    `📡 События Pocket Option: ${eventList.length}`,
  )
}

// ======================================================
// BROADCAST
// ======================================================

function broadcastKeyboard() {
  return new InlineKeyboard()
    .text("✅ Подтвердить рассылку", "broadcast:confirm")
    .row()
    .text("❌ Отменить", "broadcast:cancel")
}

function buildBroadcastMarkup(buttons = []) {
  if (!buttons.length) return undefined

  const keyboard = new InlineKeyboard()

  for (const button of buttons) {
    keyboard.url(button.label, button.url).row()
  }

  return keyboard
}

async function beginBroadcast(ctx) {
  if (!isAdmin(ctx)) return

  adminStates.set(String(ADMIN_ID), {
    mode: "broadcast_message",
    buttons: [],
  })

  await ctx.reply(
    "📨 РАССЫЛКА GOLD TRADE\n\nОтправьте текст или фотографию с подписью.\n\nДля добавления URL-кнопки используйте команду:\n/broadcast_button Название | https://example.com\n\nПосле подготовки появится предпросмотр и кнопка подтверждения.",
  )
}

async function addBroadcastButton(ctx) {
  if (!isAdmin(ctx)) return

  const state = adminStates.get(String(ADMIN_ID))

  if (!state || state.mode !== "broadcast_message") {
    await ctx.reply("Сначала запустите /broadcast.")
    return
  }

  const value = ctx.message.text.replace("/broadcast_button", "").trim()
  const separator = value.indexOf("|")

  if (separator < 1) {
    await ctx.reply(
      "Формат:\n/broadcast_button Название | https://example.com",
    )
    return
  }

  const label = value.slice(0, separator).trim()
  const url = value.slice(separator + 1).trim()

  if (!label || label.length > 50) {
    await ctx.reply("Название кнопки должно содержать от 1 до 50 символов.")
    return
  }

  try {
    const parsed = new URL(url)

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Invalid protocol")
    }
  } catch {
    await ctx.reply("Некорректная ссылка. Используйте http:// или https://.")
    return
  }

  if (state.buttons.length >= 5) {
    await ctx.reply("Можно добавить не более 5 URL-кнопок.")
    return
  }

  state.buttons.push({ label, url })

  await ctx.reply(`✅ Кнопка добавлена: ${label}`)
}

async function prepareBroadcast(ctx) {
  if (!isAdmin(ctx)) return

  const state = adminStates.get(String(ADMIN_ID))

  if (!state || state.mode !== "broadcast_message") return

  const message = ctx.message

  let draft

  if (message.photo?.length) {
    draft = {
      type: "photo",
      fileId: message.photo.at(-1).file_id,
      caption: message.caption || "",
      buttons: state.buttons,
      createdAt: now(),
    }
  } else if (message.text && !message.text.startsWith("/")) {
    draft = {
      type: "text",
      text: message.text,
      buttons: state.buttons,
      createdAt: now(),
    }
  } else {
    return
  }

  await writeStore("broadcast", draft)
  adminStates.delete(String(ADMIN_ID))

  const previewMarkup = buildBroadcastMarkup(draft.buttons)

  if (draft.type === "photo") {
    await ctx.replyWithPhoto(draft.fileId, {
      caption: `ПРЕДПРОСМОТР РАССЫЛКИ\n\n${draft.caption}`,
      reply_markup: broadcastKeyboard(),
    })
  } else {
    await ctx.reply(
      `ПРЕДПРОСМОТР РАССЫЛКИ\n\n${draft.text}`,
      {
        reply_markup: broadcastKeyboard(),
      },
    )
  }

  if (previewMarkup) {
    await ctx.reply("Добавленные URL-кнопки:", {
      reply_markup: previewMarkup,
    })
  }

  await ctx.reply("Проверьте содержание. Отправка начнётся только после подтверждения.")
}

async function cancelBroadcast(ctx) {
  if (!isAdmin(ctx)) return

  if (broadcastRunning) {
    await ctx.answerCallbackQuery({
      text: "Рассылка уже выполняется.",
      show_alert: true,
    })
    return
  }

  await writeStore("broadcast", {})
  adminStates.delete(String(ADMIN_ID))

  await ctx.answerCallbackQuery({ text: "Рассылка отменена." })
  await ctx.reply("❌ Черновик рассылки удалён.")
}

async function confirmBroadcast(ctx) {
  if (!isAdmin(ctx)) return

  if (broadcastRunning) {
    await ctx.answerCallbackQuery({
      text: "Рассылка уже выполняется.",
      show_alert: true,
    })
    return
  }

  broadcastRunning = true

  try {
    const draft = await readStore("broadcast")

    if (!draft.type || !["text", "photo"].includes(draft.type)) {
      await ctx.answerCallbackQuery({
        text: "Черновик не найден.",
        show_alert: true,
      })
      return
    }

    await ctx.answerCallbackQuery({ text: "Рассылка началась." })

    const users = await readStore("users")
    const ids = Object.keys(users).filter((id) => Number(id) !== ADMIN_ID)

    let sent = 0
    let failed = 0

    const markup = buildBroadcastMarkup(draft.buttons || [])

    await ctx.reply(`📨 Рассылка запущена. Получателей: ${ids.length}`)

    for (const id of ids) {
      try {
        if (draft.type === "photo") {
          await ctx.api.sendPhoto(id, draft.fileId, {
            caption: draft.caption || "",
            reply_markup: markup,
          })
        } else {
          await ctx.api.sendMessage(id, draft.text, {
            reply_markup: markup,
          })
        }

        sent++
      } catch (error) {
        failed++
        console.error(`Broadcast error for ${id}:`, error.message)
      }

      // Небольшая пауза между отправками
      await new Promise((resolve) => setTimeout(resolve, 40))
    }

    await writeStore("broadcast", {})

    await ctx.reply(
      `✅ РАССЫЛКА ЗАВЕРШЕНА\n\n` +
      `👥 Получателей: ${ids.length}\n` +
      `✅ Отправлено: ${sent}\n` +
      `❌ Ошибок: ${failed}`,
    )
  } catch (error) {
    console.error("Broadcast error:", error)

    await ctx.reply(
      "⚠️ Во время рассылки произошла ошибка. Проверьте журнал FadeHost.",
    )
  } finally {
    broadcastRunning = false
  }
}

// ======================================================
// USER INFORMATION
// ======================================================

async function showHome(ctx) {
  await ctx.reply(
    "✦ GOLD TRADE ACCESS ✦\n\nДобро пожаловать!\n\nВыберите нужный раздел:",
    { reply_markup: mainKeyboard() },
  )
}

async function showRegistration(ctx) {
  await ctx.reply(
    "🎁 ВЫБЕРИТЕ ВАРИАНТ РЕГИСТРАЦИИ\n\n" +
    "Доступны три варианта:\n\n" +
    "1. Бонус 50% — минимальный депозит 10, промокод WELCOME50.\n" +
    "2. Бонус 50% — минимальный депозит $50, промокод 50START.\n" +
    "3. Регистрация без бонуса.\n\n" +
    "Выберите подходящий вариант:",
    { reply_markup: registrationKeyboard() },
  )
}

async function showStatus(ctx) {
  const id = userId(ctx)
  const applications = await readStore("applications")
  const application = applications[id]

  if (!application) {
    await ctx.reply(
      "У вас пока нет заявки GOLD TRADE ACCESS.",
      { reply_markup: applicationKeyboard() },
    )
    return
  }

  const statusText = {
    pending: "⏳ Заявка ожидает решения администратора.",
    approving: "🔄 Ваша заявка обрабатывается.",
    approved: "✅ Ваша заявка одобрена.",
    rejected: "❌ Ваша заявка отклонена.",
  }

  await ctx.reply(
    `📊 СТАТУС ЗАЯВКИ\n\n` +
    `Pocket Option ID: ${application.pocketId}\n\n` +
    `${statusText[application.status] || "Статус неизвестен."}`,
    {
      reply_markup: new InlineKeyboard()
        .text("🔄 Обновить", "status")
        .row()
        .text("⬅️ Главное меню", "home"),
    },
  )

  if (application.status === "approved" && application.invites) {
    await ctx.reply(
      "Ваши приглашения:",
      { reply_markup: inviteKeyboard(application.invites) },
    )
  }
}

async function showAbout(ctx) {
  await ctx.reply(
    "✦ GOLD TRADE ACCESS ✦\n\n" +
    "Закрытое сообщество с материалами, общением и обучающими разделами.\n\n" +
    "Доступ предоставляется после ручной проверки заявки администратором.\n\n" +
    "Партнёрское раскрытие: GOLD TRADE может получать вознаграждение от Pocket Option при регистрации или активности пользователей по нашим ссылкам.",
    { reply_markup: mainKeyboard() },
  )
}

async function showRisks(ctx) {
  await ctx.reply(
    "⚠️ ПРЕДУПРЕЖДЕНИЕ О РИСКАХ\n\n" +
    "Торговля бинарными опционами связана с высоким риском и может привести к потере всего внесённого депозита.\n\n" +
    "Никакие сигналы, материалы, роботы или стратегии не гарантируют прибыль.\n\n" +
    "Не используйте заёмные деньги и не вкладывайте средства, потерю которых не можете себе позволить.\n\n" +
    "Решения о торговле вы принимаете самостоятельно.",
    { reply_markup: mainKeyboard() },
  )
}

async function showAcademy(ctx) {
  await ctx.reply(
    "🎓 GOLD TRADE ACADEMY\n\nДоступ к академии предоставляется после одобрения заявки.",
    { reply_markup: applicationKeyboard() },
  )
}

// ======================================================
// CALLBACKS
// ======================================================

async function handleCallback(ctx) {
  const data = ctx.callbackQuery.data || ""
  const id = userId(ctx)

  if (data === "home") {
    await ctx.answerCallbackQuery()
    await showHome(ctx)
    return
  }

  if (data === "apply") {
    await ctx.answerCallbackQuery()
    await askForApplication(ctx)
    return
  }

  if (data === "registration") {
    await ctx.answerCallbackQuery()
    await showRegistration(ctx)
    return
  }

  if (data === "status") {
    await ctx.answerCallbackQuery()
    await showStatus(ctx)
    return
  }

  if (data === "about") {
    await ctx.answerCallbackQuery()
    await showAbout(ctx)
    return
  }

  if (data === "risks") {
    await ctx.answerCallbackQuery()
    await showRisks(ctx)
    return
  }

  if (data === "academy") {
    await ctx.answerCallbackQuery()
    await showAcademy(ctx)
    return
  }

  if (data === "channel") {
    await ctx.answerCallbackQuery()
    await ctx.reply("📢 Наш канал GOLD TRADE:", {
      reply_markup: new InlineKeyboard().url(
        "Открыть канал",
        MAIN_CHANNEL_URL,
      ),
    })
    return
  }

  if (data === "support") {
    await ctx.answerCallbackQuery()
    await ctx.reply("🆘 Поддержка GOLD TRADE:", {
      reply_markup: new InlineKeyboard().url(
        "Написать в поддержку",
        SUPPORT_URL,
      ),
    })
    return
  }

  if (data === "cancel_application") {
    userStates.delete(id)
    await stopReminder(id)
    await ctx.answerCallbackQuery({ text: "Подача заявки отменена." })
    await ctx.reply("Подача заявки отменена.", {
      reply_markup: mainKeyboard(),
    })
    return
  }

  if (data === "reminder:off") {
    await optOutReminder(id)
    await ctx.answerCallbackQuery({
      text: "Напоминания отключены.",
      show_alert: true,
    })
    await ctx.reply(
      "🔕 Автоматические напоминания отключены. Вы можете вернуться в любое время через меню.",
      { reply_markup: mainKeyboard() },
    )
    return
  }

  if (data === "reminder:on") {
    await optInReminder(id)
    await ctx.answerCallbackQuery({ text: "Напоминания включены." })
    return
  }

  if (data === "admin:applications") {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Нет доступа.", show_alert: true })
      return
    }

    await ctx.answerCallbackQuery()
    await showPendingApplications(ctx)
    return
  }

  if (data === "admin:stats") {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Нет доступа.", show_alert: true })
      return
    }

    await ctx.answerCallbackQuery()
    await showAdminStats(ctx)
    return
  }

  if (data === "admin:broadcast") {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Нет доступа.", show_alert: true })
      return
    }

    await ctx.answerCallbackQuery()
    await beginBroadcast(ctx)
    return
  }

  if (data === "broadcast:confirm") {
    await confirmBroadcast(ctx)
    return
  }

  if (data === "broadcast:cancel") {
    await cancelBroadcast(ctx)
    return
  }

  if (data.startsWith("approve:")) {
    const applicationId = data.slice("approve:".length)
    await approveApplication(ctx, applicationId)
    return
  }

  if (data.startsWith("reject:")) {
    const applicationId = data.slice("reject:".length)
    await rejectApplication(ctx, applicationId)
    return
  }

  if (data.startsWith("application:")) {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Нет доступа.", show_alert: true })
      return
    }

    const applicationId = data.slice("application:".length)
    const applications = await readStore("applications")
    const application = applications[applicationId]

    await ctx.answerCallbackQuery()

    if (!application) {
      await ctx.reply("Заявка не найдена.")
      return
    }

    if (application.status === "approved") {
      await ctx.reply(
        `Заявка ${applicationId} уже одобрена.`,
        {
          reply_markup: new InlineKeyboard().text(
            "🔄 Создать новые приглашения",
            `resend:${applicationId}`,
          ),
        },
      )
    } else {
      await ctx.reply(`Статус заявки: ${application.status}`)
    }

    return
  }

  if (data.startsWith("resend:")) {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Нет доступа.", show_alert: true })
      return
    }

    const applicationId = data.slice("resend:".length)
    await ctx.answerCallbackQuery()
    await resendInvitations(ctx, applicationId)
    return
  }

  await ctx.answerCallbackQuery()
}

// ======================================================
// COMMAND REGISTRATION
// ======================================================

export async function registerCommands(bot) {
  await ensureStorage()

  bot.use(async (ctx, next) => {
    if (ctx.from) {
      try {
        await registerUser(ctx)
      } catch (error) {
        console.error("User registration error:", error)
      }
    }

    await next()
  })

  bot.command("start", async (ctx) => {
    const id = userId(ctx)
    const payload = ctx.match?.trim()

    if (payload === "join") {
      await startReminder(id)
    }

    await showHome(ctx)
  })

  bot.command("menu", showHome)

  bot.command("cancel", async (ctx) => {
    const id = userId(ctx)
    userStates.delete(id)
    await stopReminder(id)

    await ctx.reply("Текущий процесс отменён.", {
      reply_markup: mainKeyboard(),
    })
  })

  bot.command("status", showStatus)

  bot.command("about", showAbout)

  bot.command("risks", showRisks)

  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply("⛔ Нет доступа.")
      return
    }

    await ctx.reply(
      "✦ GOLD TRADE — АДМИНИСТРАТОР ✦\n\nВыберите действие:",
      { reply_markup: adminKeyboard() },
    )
  })

  bot.command("version", async (ctx) => {
    await ctx.reply(`GOLD TRADE ACCESS v${BOT_VERSION}`)
  })

  bot.command("resend", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply("⛔ Нет доступа.")
      return
    }

    const id = ctx.match?.trim()

    if (!id) {
      await ctx.reply("Использование: /resend TELEGRAM_ID")
      return
    }

    await resendInvitations(ctx, id)
  })

  bot.command("broadcast", beginBroadcast)

  bot.command("broadcast_button", addBroadcastButton)

  bot.command("reminders_on", async (ctx) => {
    await optInReminder(userId(ctx))
    await ctx.reply("🔔 Напоминания включены.")
  })

  bot.command("reminders_off", async (ctx) => {
    await optOutReminder(userId(ctx))
    await ctx.reply("🔕 Напоминания отключены.")
  })

  bot.command("backup", async (ctx) => {
    if (!isAdmin(ctx)) return
    await ctx.reply("Резервное копирование пока не включено.")
  })

  bot.callbackQuery(/.*/, handleCallback)

  bot.on("message", async (ctx) => {
    const id = userId(ctx)
    const text = ctx.message.text

    if (isAdmin(ctx)) {
      const adminState = adminStates.get(String(ADMIN_ID))

      if (adminState?.mode === "broadcast_message") {
        await prepareBroadcast(ctx)
        return
      }
    }

    if (userStates.get(id) === "waiting_pocket_id") {
      if (!text) {
        await ctx.reply("Пожалуйста, отправьте ID текстом.")
        return
      }

      await submitApplication(ctx, text)
      return
    }
  })

  // Worker checks reminders once per minute.
  const reminderInterval = setInterval(() => {
    processDueReminders(bot).catch((error) => {
      console.error("Reminder interval error:", error)
    })
  }, 60 * 1000)

  reminderInterval.unref?.()

  console.log(`GOLD TRADE ACCESS v${BOT_VERSION}: commands registered`)
}
