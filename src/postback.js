
import {
  mkdir,
  readFile,
  writeFile,
  rename,
} from "node:fs/promises"

const STORAGE_DIR = "/data/storage"
const STORAGE = `${STORAGE_DIR}/pocket-option-events.json`

// Pocket Option event names
const EVENT_NAMES = {
  reg: "REG",
  registration: "REG",

  email: "EMAIL",
  email_confirm: "EMAIL",
  email_confirmation: "EMAIL",
  confirm_email: "EMAIL",

  ftd: "FTD",
  first_deposit: "FTD",

  redep: "REDEP",
  repeat_deposit: "REDEP",
}

let saveQueue = Promise.resolve()

async function readEvents() {
  try {
    return JSON.parse(await readFile(STORAGE, "utf8"))
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}

async function saveEvent(event) {
  const operation = saveQueue.catch(() => {}).then(async () => {
    await mkdir(STORAGE_DIR, { recursive: true })

    const events = await readEvents()

    if (events.some(item => item.event_id === event.event_id)) {
      return false
    }

    events.push(event)

    const temp = `${STORAGE}.tmp`

    await writeFile(
      temp,
      JSON.stringify(events, null, 2),
      "utf8"
    )

    await rename(temp, STORAGE)

    return true
  })

  saveQueue = operation
  return operation
}

function sendResponse(res, status, message) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
  })
  res.end(message)
}

export async function handlePocketOptionPostback(req, res) {
  const secret = process.env.PO_POSTBACK_SECRET

  if (!secret) {
    sendResponse(res, 503, "Postback is not configured")
    return true
  }

  const requestUrl = new URL(req.url, "http://localhost")
  const expectedPath =
    `/pocket-option/postback/${encodeURIComponent(secret)}`

  if (requestUrl.pathname !== expectedPath) {
    return false
  }

  if (req.method !== "GET" && req.method !== "POST") {
    sendResponse(res, 405, "Method not allowed")
    return true
  }

  try {
    let data = Object.fromEntries(requestUrl.searchParams)

    if (req.method === "POST") {
      let body = ""

      for await (const chunk of req) {
        body += chunk

        if (body.length > 65536) {
          sendResponse(res, 413, "Request too large")
          return true
        }
      }

      const contentType = req.headers["content-type"] || ""

      if (contentType.includes("application/json")) {
        data = {
          ...data,
          ...JSON.parse(body),
        }
      } else if (body) {
        data = {
          ...data,
          ...Object.fromEntries(new URLSearchParams(body)),
        }
      }
    }

    const rawEvent = String(
      data.event || data.type || data.action || ""
    ).toLowerCase().trim()

    const eventType = EVENT_NAMES[rawEvent]

    if (!eventType) {
      sendResponse(res, 400, "Unknown event type")
      return true
    }

    const traderId = String(data.trader_id || "").trim()
    const trackingId = String(data.sub_id1 || "").trim()

    if (!traderId || !trackingId) {
      sendResponse(res, 400, "Missing trader_id or sub_id1")
      return true
    }

    const clickId = String(data.click_id || "").trim()
    const dateTime = String(data.date_time || "").trim()

    const suppliedEventId = String(
      data.event_id || data.transaction_id || ""
    ).trim()

    const fallbackId = [
      eventType,
      traderId,
      trackingId,
      clickId,
      dateTime,
    ].join(":")

    const event = {
      event_id: suppliedEventId || fallbackId,
      event: eventType,

      trader_id: traderId,
      tracking_id: trackingId,

      click_id: clickId,
      country: String(data.country || ""),
      date_time: dateTime,
      sumdep: String(data.sumdep || ""),
      
      received_at: new Date().toISOString(),

      // Event is not trusted until Partner API verification.
      verified: false,
      processed: false,
    }

    const saved = await saveEvent(event)

    console.log(
      "[PO POSTBACK]",
      eventType,
      traderId,
      saved ? "saved" : "duplicate"
    )

    sendResponse(res, 200, saved ? "OK" : "Duplicate")
  } catch (error) {
    console.error(
      "[PO POSTBACK ERROR]",
      error?.message || error
    )

    sendResponse(res, 400, "Invalid postback")
  }

  return true
}
