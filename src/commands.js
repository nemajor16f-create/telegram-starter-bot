import { InlineKeyboard } from "grammy"

const ADMIN_ID = 8207612971

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
    await ctx.reply(
      `👑 GOLD TRADE | EVGEN

Добро пожаловать!

Выбери нужный раздел:`,
      { reply_markup: mainMenu() }
    )
  })

  bot.command("join", async (ctx) => {
    await ctx.reply(
      `Для вступления зарегистрируйся по ссылке:

${REFERRAL_URL}

Минимальное пополнение — 10$.
Торговать для получения доступа не обязательно.

Бинарные опционы связаны с высоким риском потери всего депозита.`,
      { reply_markup: mainMenu() }
    )
  })

  bot.command("about", async (ctx) => {
    await ctx.reply(
      "📊 GOLD TRADE | EVGEN\n\n👑 VIP GOLD TRADE\n💬 CHAT GOLD TRADE\n🎓 ACADEMY GOLD TRADE"
    )
  })

  bot.command("status", async (ctx) => {
    await ctx.reply("📌 Проверка заявок выполняется администратором.")
  })

  bot.command("help", async (ctx) => {
    await ctx.reply("Используй /start для главного меню.")
  })

bot.command("chatid", async (ctx) => {
await ctx.reply(Твой Telegram ID: ${ctx.from.id})

if (ctx.from?.id !== ADMIN_ID) {
await ctx.reply("Ты не распознан как администратор.")
return
}

await ctx.reply("Перешли мне сообщение из нужного канала.")
})

  bot.on("message", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return

    const origin = ctx.message.forward_origin

    if (origin?.type === "channel") {
      await ctx.reply(
        `📌 Канал: ${origin.chat.title || "Без названия"}\nID: ${origin.chat.id}`
      )
    }
  })

  bot.callbackQuery("join", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(`Регистрация: ${REFERRAL_URL}`)
  })

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(
      "GOLD TRADE | VIP GOLD TRADE | CHAT GOLD TRADE | ACADEMY GOLD TRADE"
    )
  })

  bot.callbackQuery("status", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("Заявки проверяются администратором.")
  })

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply("Для начала нажми /start.")
  })
}
