"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

process.env.FRONTEND_URL = "https://agenda.exemplo.com";
process.env.EVOLUTION_API_URL = "https://evolution.exemplo.com";
process.env.EVOLUTION_API_KEY = "test-key";
process.env.EVOLUTION_INSTANCE = "barbearia";
process.env.WHATSAPP_BARBEIRO = "5511888888888";

const nativeFetch = global.fetch;
const { createApp } = require("../server");

const booking = {
  bookingId: "booking-123",
  clientName: "Cliente Teste",
  clientPhone: "11999999999",
  service: "Corte + barba",
  date: "2026-10-08",
  time: "14:00",
  value: 60,
  professional: "Emanuel Sousa",
  address: "Rua Teste, 123",
  notes: "Máquina 2",
  businessName: "Barbearia Teste",
  target: "both"
};

async function withServer(run) {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); global.fetch = nativeFetch; }
}

test("envia cliente e barbeiro concorrentemente", async () => {
  await withServer(async baseUrl => {
    const calls = [];
    let inFlight = 0, maxInFlight = 0;
    global.fetch = async (url, options) => {
      if (String(url).startsWith(process.env.EVOLUTION_API_URL)) {
        inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
        calls.push({ url: String(url), options, body: JSON.parse(options.body) });
        await new Promise(resolve => setTimeout(resolve, 25));
        inFlight -= 1;
        return new Response(JSON.stringify({ key: { id: `msg-${calls.length}` }, status: "PENDING" }), { status: 200 });
      }
      return nativeFetch(url, options);
    };
    const response = await nativeFetch(`${baseUrl}/api/whatsapp/send-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: process.env.FRONTEND_URL },
      body: JSON.stringify(booking)
    });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.status, "sent");
    assert.equal(result.deliveries.client.sent, true);
    assert.equal(result.deliveries.owner.sent, true);
    assert.equal(calls.length, 2);
    assert.equal(maxInFlight, 2);
    assert.ok(calls.every(call => call.url.endsWith("/message/sendText/barbearia")));
    assert.ok(calls.every(call => call.options.headers.apikey === "test-key"));
  });
});

test("preserva sucesso parcial quando o envio ao barbeiro falha", async () => {
  await withServer(async baseUrl => {
    global.fetch = async (url, options) => {
      if (String(url).startsWith(process.env.EVOLUTION_API_URL)) {
        const { number } = JSON.parse(options.body);
        if (number === process.env.WHATSAPP_BARBEIRO) return new Response("offline", { status: 503 });
        return new Response(JSON.stringify({ key: { id: "client-ok" }, status: "PENDING" }), { status: 200 });
      }
      return nativeFetch(url, options);
    };
    const response = await nativeFetch(`${baseUrl}/api/whatsapp/send-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: process.env.FRONTEND_URL },
      body: JSON.stringify(booking)
    });
    const result = await response.json();
    assert.equal(response.status, 207);
    assert.equal(result.status, "partial");
    assert.equal(result.deliveries.client.sent, true);
    assert.equal(result.deliveries.owner.sent, false);
  });
});

test("rejeita origem fora do domínio configurado", async () => {
  await withServer(async baseUrl => {
    const response = await nativeFetch(`${baseUrl}/api/whatsapp/send-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://site-invalido.example" },
      body: JSON.stringify(booking)
    });
    assert.equal(response.status, 403);
  });
});
