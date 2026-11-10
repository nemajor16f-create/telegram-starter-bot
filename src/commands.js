
import { InlineKeyboard } from "grammy"

const REFERRAL_URL = "https://po-ru4.click/smart/bvdTV2aDJ48lYW"

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

export function registerCommands(bot) {
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name || "друг"

    await ctx.reply(
      `👑 GOLD TRADE | EVGEN

Привет, ${name}!

Добро пожаловать в нашу торговую команду.

Здесь тебя ждут:
📊 Торговые сессии
🔥 LIVE-эфиры
🎓 Обучающие материалы
💬 Общение участников

Выбери нужный раздел в меню ниже.`,
      { reply_markup: mainMenu() }
    )
  })

  bot.command("join", async (ctx) => {
    await ctx.reply(
      `👑 ВСТУПЛЕНИЕ В GOLD TRADE

Для получения доступа необходимо:

1. Зарегистрироваться в Pocket Option по нашей партнёрской ссылке.
2. Пополнить счёт минимум на 10$.
3. Отправить свой ID Pocket Option администратору для проверки.

Торговать для получения доступа НЕ обязательно.

Важно: мы участвуем в партнёрской программе Pocket Option. Торговля бинарными опционами связана с высоким риском потери средств. Можно потерять весь депозит. Принимай решение самостоятельно.

Ссылка для регистрации:
${REFERRAL_URL}`,
      { reply_markup: mainMenu() }
    )
  })

  bot.command("about", async (ctx) => {
    await ctx.reply(
      `📊 GOLD TRADE | EVGEN

Наша экосистема состоит из трёх направлений:

👑 VIP GOLD TRADE
Совместные торговые сессии, сигналы и LIVE.

💬 CHAT GOLD TRADE
Общение участников и модерация.

🎓 ACADEMY GOLD TRADE
Обучающие материалы и развитие навыков.

Наша цель — создать активное сообщество трейдеров.`,
      { reply_markup: mainMenu() }
    )
  })

  bot.command("status", async (ctx) => {
    await ctx.reply(
      `📌 ПРОВЕРКА ЗАЯВКИ

Проверка регистрации и пополнения пока выполняется администратором вручную.

Для проверки подготовь свой ID Pocket Option и обратись к администратору.

Никому не отправляй пароль или коды подтверждения.`,
      { reply_markup: mainMenu() }
    )
  })

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `❓ ПОМОЩЬ

/start — главное меню
/join — вступление в команду
/about — информация о проекте
/status — проверка заявки
/help — помощь

Если возникли вопросы, обратись к администратору.`,
      { reply_markup: mainMenu() }
    )
  })

  bot.callbackQuery("join", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      `👑 ВСТУПЛЕНИЕ В GOLD TRADE

1. Регистрация по партнёрской ссылке.
2. Пополнение минимум на 10$.
3. Отправка ID Pocket Option администратору.

Торговать не обязательно.

Мы участвуем в партнёрской программе Pocket Option. Бинарные опционы связаны с высоким риском потери всего депозита.

${REFERRAL_URL}`
    )
  })

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      `📊 GOLD TRADE | EVGEN

👑 VIP GOLD TRADE — совместные сессии, сигналы и LIVE.
💬 CHAT GOLD TRADE — общение участников.
🎓 ACADEMY GOLD TRADE — обучающие материалы.`,
      { reply_markup: mainMenu() }
    )
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "📌 Проверка пока выполняется администратором вручную. Подготовь свой ID Pocket Option."
    )
  })

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "❓ Используй /start для главного меню или /join для вступления."
    )
  })
}
