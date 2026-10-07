"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const MAX = Object.freeze({
  name: 120,
  phone: 20,
  service: 160,
  professional: 120,
  address: 300,
  notes: 500,
  bookingId: 160,
  date: 10,
  time: 5
});

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^\d{12,15}$/.test(normalized)) throw new Error("Telefone inválido; use DDI e DDD.");
  return normalized;
}

function parseTargets(value) {
  if (!value || value === "both") return ["client", "owner"];
  if (value === "client" || value === "owner") return [value];
  throw new Error("Destino inválido.");
}

function validateBooking(raw) {
  const booking = {
    bookingId: cleanText(raw.bookingId, MAX.bookingId),
    clientName: cleanText(raw.clientName, MAX.name),
    clientPhone: normalizePhone(raw.clientPhone),
    service: cleanText(raw.service, MAX.service),
    date: cleanText(raw.date, MAX.date),
    time: cleanText(raw.time, MAX.time),
    value: Number(raw.value),
    professional: cleanText(raw.professional, MAX.professional),
    address: cleanText(raw.address, MAX.address),
    notes: cleanText(raw.notes, MAX.notes),
    businessName: cleanText(raw.businessName, MAX.name)
  };
  if (!booking.bookingId || !booking.clientName || !booking.service || !booking.professional || !booking.address) {
    throw new Error("Dados obrigatórios do agendamento não foram informados.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^\d{2}:\d{2}$/.test(booking.time)) {
    throw new Error("Data ou horário inválido.");
  }
  if (!Number.isFinite(booking.value) || booking.value < 0 || booking.value > 100000) {
    throw new Error("Valor inválido.");
  }
  return booking;
}

function formatDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildBookingMessages(booking) {
  const observation = booking.notes ? `\n📝 Observações: ${booking.notes}\n` : "";
  return {
    client: `✂️ AGENDAMENTO CONFIRMADO\n\nOlá, ${booking.clientName}!\n\nSeu agendamento na ${booking.businessName || "barbearia"} foi confirmado.\n\n📅 Data: ${formatDate(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.service}\n💈 Profissional: ${booking.professional}\n💰 Valor: R$ ${formatMoney(booking.value)}\n\n📍 Endereço:\n${booking.address}\n${observation}\nSeu horário está reservado.\n\nObrigado pela preferência!`,
    owner: `🔔 NOVO AGENDAMENTO\n\nCliente: ${booking.clientName}\n📱 WhatsApp: ${booking.clientPhone}\n\n📅 Data: ${formatDate(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.service}\n💈 Profissional: ${booking.professional}\n💰 Valor: R$ ${formatMoney(booking.value)}\n\n📍 Endereço:\n${booking.address}\n${observation}\n🔔 Novo horário reservado pelo cliente.`
  };
}

function buildCancellationMessages(booking) {
  return {
    client: `AGENDAMENTO CANCELADO\n\nOlá, ${booking.clientName}.\n\nSeu agendamento na ${booking.businessName || "barbearia"} foi cancelado.\n\n📅 Data: ${formatDate(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.service}\n💈 Profissional: ${booking.professional}\n\nSe quiser marcar um novo horário, estamos à disposição.`,
    owner: `AGENDAMENTO CANCELADO\n\nCliente: ${booking.clientName}\n📱 WhatsApp: ${booking.clientPhone}\n📅 Data: ${formatDate(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.service}\n\nO horário foi liberado novamente na agenda.`
  };
}

// Função centralizada: somente este ponto conhece o contrato da Evolution API v2.
async function sendWhatsAppMessage(phone, message) {
  const baseUrl = String(process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!baseUrl || !apiKey || !instance) throw new Error("Evolution API não configurada no servidor.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number: normalizePhone(phone), text: message, linkPreview: false }),
      signal: controller.signal
    });
    const raw = await response.text();
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    if (!response.ok) throw new Error(`Evolution API respondeu HTTP ${response.status}.`);
    return {
      providerMessageId: body?.key?.id || null,
      providerStatus: body?.status || "accepted"
    };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Tempo limite excedido ao contatar a Evolution API.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function publicError(error) {
  const message = String(error?.message || "Falha desconhecida.");
  if (/Telefone inválido|Dados obrigatórios|Data ou horário|Valor inválido|Destino inválido/.test(message)) return message;
  if (/não configurada|Tempo limite|HTTP \d+/.test(message)) return message;
  return "Não foi possível enviar a mensagem pelo WhatsApp.";
}

async function deliver(booking, eventType, targets) {
  const messages = eventType === "cancellation" ? buildCancellationMessages(booking) : buildBookingMessages(booking);
  const ownerPhone = process.env.WHATSAPP_BARBEIRO;
  const jobs = targets.map(async recipient => {
    const phone = recipient === "client" ? booking.clientPhone : ownerPhone;
    if (!phone) throw new Error("WhatsApp do barbeiro não configurado no servidor.");
    const provider = await sendWhatsAppMessage(phone, messages[recipient]);
    return { recipient, attempted: true, sent: true, sentAt: new Date().toISOString(), ...provider };
  });

  const settled = await Promise.allSettled(jobs);
  const deliveries = {};
  settled.forEach((result, index) => {
    const recipient = targets[index];
    deliveries[recipient] = result.status === "fulfilled"
      ? result.value
      : { recipient, attempted: true, sent: false, error: publicError(result.reason) };
  });
  const sentCount = Object.values(deliveries).filter(item => item.sent).length;
  return {
    bookingId: booking.bookingId,
    eventType,
    status: sentCount === targets.length ? "sent" : sentCount ? "partial" : "failed",
    deliveries
  };
}

function createApp() {
  const app = express();
  const allowedOrigins = String(process.env.FRONTEND_URL || "").split(",").map(value => value.trim().replace(/\/$/, "")).filter(Boolean);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
      return callback(new Error("Origem não autorizada."));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400
  }));
  app.use(express.json({ limit: "32kb", strict: true }));
  app.use("/api/whatsapp", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "barbearia-whatsapp-api" }));

  async function handleDelivery(req, res, eventType) {
    try {
      const booking = validateBooking(req.body || {});
      const targets = parseTargets(req.body?.target);
      const result = await deliver(booking, eventType, targets);
      const statusCode = result.status === "sent" ? 200 : result.status === "partial" ? 207 : 502;
      return res.status(statusCode).json(result);
    } catch (error) {
      const message = publicError(error);
      const isValidation = /inválid|obrigatórios/.test(message);
      return res.status(isValidation ? 400 : 500).json({ status: "failed", error: message });
    }
  }

  app.post("/api/whatsapp/send-booking", (req, res) => handleDelivery(req, res, "booking"));
  app.post("/api/whatsapp/send-cancellation", (req, res) => handleDelivery(req, res, "cancellation"));

  app.use((error, _req, res, _next) => {
    if (error?.message === "Origem não autorizada.") return res.status(403).json({ status: "failed", error: error.message });
    if (error?.type === "entity.parse.failed") return res.status(400).json({ status: "failed", error: "JSON inválido." });
    return res.status(500).json({ status: "failed", error: "Erro interno do servidor." });
  });
  return app;
}

if (require.main === module) {
  const required = ["EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE", "WHATSAPP_BARBEIRO", "FRONTEND_URL"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) {
    console.error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
    process.exit(1);
  }
  const port = Number(process.env.PORT) || 10000;
  createApp().listen(port, "0.0.0.0", () => console.log(`WhatsApp API ativa na porta ${port}`));
}

module.exports = { createApp, sendWhatsAppMessage, validateBooking, buildBookingMessages, buildCancellationMessages };
