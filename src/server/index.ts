import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { VesselStore } from "@/lib/ais";
import { UpstreamManager } from "./upstream";
import { DownstreamManager } from "./downstream";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);
const upstreamUrl = process.env.AIS_UPSTREAM_URL ?? "ws://localhost:9090";
const apiKey = process.env.AISSTREAM_API_KEY ?? "mock";

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const store = new VesselStore();
  const downstream = new DownstreamManager(store);

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url ?? "/", true);

    if (pathname === "/ws/ais") {
      downstream.handleUpgrade(request, socket, head);
    } else {
      socket.destroy();
    }
  });

  const upstream = new UpstreamManager({
    store,
    url: upstreamUrl,
    apiKey,
    events: {
      onPositionUpdate: (position) => downstream.broadcastPosition(position),
      onStaticUpdate: (staticData) => downstream.broadcastStatic(staticData),
    },
  });

  server.listen(port, () => {
    console.log(`> Server listening on http://${hostname}:${port}`);
    console.log(`> WebSocket endpoint: ws://${hostname}:${port}/ws/ais`);
    console.log(`> Upstream AIS: ${upstreamUrl}`);
    if (apiKey === "mock") {
      console.log(`> WARNING: No AISSTREAM_API_KEY set — using mock key`);
    }
  });

  upstream.connect();

  const shutdown = () => {
    console.log("Shutting down...");
    upstream.close();
    downstream.close().then(() => {
      server.close(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
