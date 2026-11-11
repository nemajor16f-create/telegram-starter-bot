
import {
  mkdir,
  readFile,
  writeFile,
  rename,
} from "node:fs/promises"

const STORAGE = "/data/storage/pocket-option-events.json"

const EVENT_NAMES = {
  reg: "REG",
  registration: "REG",
  ftd: "FTD",
  first_deposit: "FTD",
  redep: "REDEP",
  repeat_deposit: "REDEP",
}

async function saveEvent(event) {
  await mkdir("/data/storage", { recursive: true })

  let events = []

  try {
    events = JSON.parse(await readFile(STORAGE, "utf8"))
  } catch {
    events = []
  }

  if (events.some(item => item.event_id === event.event_id)) {
    return false
  }

  events.push(event)

  const temp = `${STORAGE}.tmp`

  await writeFile(temp, JSON.stringify(events, null, 2))
  await rename(temp, STORAGE)

  return true
}

export async function handlePocketOptionPostback(req, res) {
  const secret = process.env.PO_POSTBACK_SECRET

  if (!secret) {
    res.writeHead(503)
    res.end("Postback is not configured")
    return true
  }

  const expectedPath = `/pocket-option/postback/${secret}`
  const requestUrl = new URL(req.url, "http://localhost")

  if (requestUrl.pathname !== expectedPath) {
    return false
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.writeHead(405)
    res.end("Method not allowed")
    return true
  }

  try {
    let data = Object.fromEntries(requestUrl.searchParams)

    if (req.method === "POST") {
      let body = ""
      for await (const chunk of req) {
        body += chunk
        if (body.length > 65536) {
          throw new Error("Request too large")
        }
      }

      const contentType = req.headers["content-type"] || ""

      if (contentType.includes("application/json")) {
        data = { ...data, ...JSON.parse(body) }
      } else if (body) {
        data = {
          ...data,
          ...Object.fromEntries(new URLSearchParams(body)),
        }
      }
    }

    const rawEvent = String(
      data.event || data.type || data.action || ""
    ).toLowerCase()

    const eventType = EVENT_NAMES[rawEvent]

    if (!eventType) {
      res.writeHead(400)
      res.end("Unknown event type")
      return true
    }

    const traderId = String(data.trader_id || "").trim()
    const telegramId = String(data.sub_id1 || "").trim()

    if (!traderId || !telegramId) {
      res.writeHead(400)
      res.end("Missing trader_id or sub_id1")
      return true
    }

    const event = {
      event_id: String(
        data.event_id ||
        data.transaction_id ||
        `${eventType}:${traderId}:${data.date_time || ""}:${data.sumdep || ""}`
      ),
      event: eventType,
      trader_id: traderId,
      telegram_id: telegramId,
      click_id: data.click_id || "",
      sumdep: data.sumdep || "",
      country: data.country || "",
      date_time: data.date_time || "",
      received_at: new Date().toISOString(),
      verified: false,
    }

    const saved = await saveEvent(event)

    res.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
    })

    res.end(saved ? "OK" : "Duplicate")
    console.log("[PO POSTBACK]", eventType, traderId, saved ? "saved" : "duplicate")
  } catch (error) {
    console.error("[PO POSTBACK ERROR]", error.message)
    res.writeHead(400)
    res.end("Invalid postback")
  }

  return true
}
