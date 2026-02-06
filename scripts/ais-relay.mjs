#!/usr/bin/env node
/**
 * Lightweight AIS WebSocket relay.
 *
 * Browsers cannot connect directly to stream.aisstream.io because the server
 * silently drops WebSocket upgrades that include an Origin header (which
 * browsers always send). This relay strips the Origin by proxying through
 * Node.js.
 *
 * Usage:  node scripts/ais-relay.mjs
 * Client: ws://localhost:4001
 */

import { WebSocketServer, WebSocket } from "ws";

const PORT = parseInt(process.env.AIS_RELAY_PORT ?? "4001", 10);
const UPSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (client) => {
  console.log("[relay] Browser client connected");

  const upstream = new WebSocket(UPSTREAM_URL);
  let upstreamOpen = false;
  const pending = [];

  upstream.on("open", () => {
    upstreamOpen = true;
    console.log("[relay] Upstream connected");
    // Flush any messages queued before upstream was ready
    for (const msg of pending) {
      upstream.send(msg);
    }
    pending.length = 0;
  });

  // Client → upstream (subscription messages, etc.)
  // Convert to string to ensure text frames (AISStream.io rejects binary frames)
  client.on("message", (data) => {
    const text = data.toString();
    if (upstreamOpen) {
      upstream.send(text);
    } else {
      pending.push(text);
    }
  });

  // Upstream → client (AIS envelopes)
  upstream.on("message", (data) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data.toString());
    }
  });

  // Cleanup
  client.on("close", () => {
    console.log("[relay] Browser client disconnected");
    upstream.close();
  });
  upstream.on("close", () => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  upstream.on("error", (err) => {
    console.error("[relay] Upstream error:", err.message);
  });
  client.on("error", (err) => {
    console.error("[relay] Client error:", err.message);
  });
});

console.log(`[relay] AIS relay listening on ws://localhost:${PORT}`);
console.log(`[relay] Proxying to ${UPSTREAM_URL}`);
