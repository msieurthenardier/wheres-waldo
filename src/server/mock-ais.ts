import { WebSocketServer, WebSocket } from "ws";
import { fileURLToPath } from "url";
import path from "path";
import { TEST_PORTS } from "@/data/test-markers";
import type {
  AISStreamEnvelope,
  PositionReport,
  ShipStaticData,
  AISStreamMetaData,
} from "@/lib/ais/types";

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = parseInt(process.env.MOCK_AIS_PORT ?? "9090", 10);
const MESSAGE_RATE = parseInt(process.env.MOCK_MESSAGE_RATE ?? "10", 10);
const VESSEL_COUNT = parseInt(process.env.MOCK_VESSEL_COUNT ?? "25", 10);
const TIME_SCALE = parseInt(process.env.MOCK_TIME_SCALE ?? "100", 10);

// ─── Mock Vessel Model ──────────────────────────────────────────────────────

interface MockVessel {
  mmsi: string;
  name: string;
  shipType: number;
  callSign: string;
  imo: number;
  originIndex: number;
  destIndex: number;
  progress: number;
  speed: number;
}

// ─── Great-Circle Math (pure, no Three.js) ──────────────────────────────────

function greatCircleInterpolate(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  t: number
): [number, number] {
  const phi1 = (lat1 * Math.PI) / 180;
  const lam1 = (lon1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lam2 = (lon2 * Math.PI) / 180;

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((phi2 - phi1) / 2) ** 2 +
          Math.cos(phi1) *
            Math.cos(phi2) *
            Math.sin((lam2 - lam1) / 2) ** 2
      )
    );

  if (d < 1e-10) return [lat1, lon1];

  const a = Math.sin((1 - t) * d) / Math.sin(d);
  const b = Math.sin(t * d) / Math.sin(d);

  const x =
    a * Math.cos(phi1) * Math.cos(lam1) +
    b * Math.cos(phi2) * Math.cos(lam2);
  const y =
    a * Math.cos(phi1) * Math.sin(lam1) +
    b * Math.cos(phi2) * Math.sin(lam2);
  const z = a * Math.sin(phi1) + b * Math.sin(phi2);

  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
  const lon = (Math.atan2(y, x) * 180) / Math.PI;

  return [lat, lon];
}

function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLam = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function centralAngle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLam = ((lon2 - lon1) * Math.PI) / 180;

  return (
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((phi2 - phi1) / 2) ** 2 +
          Math.cos(phi1) *
            Math.cos(phi2) *
            Math.sin(dLam / 2) ** 2
      )
    )
  );
}

// ─── Vessel Generation ──────────────────────────────────────────────────────

function generateVessels(count: number): MockVessel[] {
  const vessels: MockVessel[] = [];
  for (let i = 0; i < count; i++) {
    let originIndex = Math.floor(Math.random() * TEST_PORTS.length);
    let destIndex = Math.floor(Math.random() * TEST_PORTS.length);
    while (destIndex === originIndex && TEST_PORTS.length > 1) {
      destIndex = Math.floor(Math.random() * TEST_PORTS.length);
    }

    const isCargo = Math.random() < 0.6;
    vessels.push({
      mmsi: String(200000001 + i),
      name: `MOCK VESSEL ${String(i + 1).padStart(2, "0")}`,
      shipType: isCargo
        ? 70 + Math.floor(Math.random() * 10)
        : 80 + Math.floor(Math.random() * 10),
      callSign: `MV${String(i + 1).padStart(2, "0")}`,
      imo: 1000001 + i,
      originIndex,
      destIndex,
      progress: Math.random(),
      speed: 8 + Math.random() * 12,
    });
  }
  return vessels;
}

// ─── Vessel Update ──────────────────────────────────────────────────────────

function updateVessel(vessel: MockVessel, messageRate: number, timeScale: number): void {
  const origin = TEST_PORTS[vessel.originIndex];
  const dest = TEST_PORTS[vessel.destIndex];
  const routeDistRad = centralAngle(origin.lat, origin.lon, dest.lat, dest.lon);
  const routeDistNm = routeDistRad * (180 / Math.PI) * 60;

  const tickIntervalMs = 1000 / messageRate;
  const hoursPerTick = tickIntervalMs / 3_600_000;
  const progressPerTick =
    routeDistNm > 0
      ? (vessel.speed * hoursPerTick * timeScale) / routeDistNm
      : 0;

  vessel.progress += progressPerTick;

  if (vessel.progress >= 1.0) {
    vessel.originIndex = vessel.destIndex;
    let newDest = Math.floor(Math.random() * TEST_PORTS.length);
    while (newDest === vessel.destIndex && TEST_PORTS.length > 1) {
      newDest = Math.floor(Math.random() * TEST_PORTS.length);
    }
    vessel.destIndex = newDest;
    vessel.progress = 0;
  }
}

// ─── Message Builders ───────────────────────────────────────────────────────

function getVesselPosition(vessel: MockVessel): [number, number] {
  const origin = TEST_PORTS[vessel.originIndex];
  const dest = TEST_PORTS[vessel.destIndex];
  return greatCircleInterpolate(
    origin.lat,
    origin.lon,
    dest.lat,
    dest.lon,
    vessel.progress
  );
}

function getVesselBearing(vessel: MockVessel): number {
  const origin = TEST_PORTS[vessel.originIndex];
  const dest = TEST_PORTS[vessel.destIndex];
  return bearing(origin.lat, origin.lon, dest.lat, dest.lon);
}

function buildPositionEnvelope(vessel: MockVessel): AISStreamEnvelope {
  const [lat, lon] = getVesselPosition(vessel);
  const bearingDeg = getVesselBearing(vessel);
  const mmsiNum = parseInt(vessel.mmsi, 10);

  const report: PositionReport = {
    Cog: Math.round(bearingDeg * 10),
    CommunicationState: 0,
    Latitude: lat,
    Longitude: lon,
    MessageID: 1,
    NavigationalStatus: 0,
    PositionAccuracy: true,
    Raim: false,
    RateOfTurn: 0,
    RepeatIndicator: 0,
    Sog: Math.round(vessel.speed * 10),
    Spare: 0,
    SpecialManoeuvreIndicator: 0,
    Timestamp: new Date().getUTCSeconds(),
    TrueHeading: Math.round(bearingDeg),
    UserID: mmsiNum,
    Valid: true,
  };

  const meta: AISStreamMetaData = {
    MMSI: mmsiNum,
    MMSI_String: vessel.mmsi,
    ShipName: vessel.name,
    latitude: lat,
    longitude: lon,
    time_utc: new Date().toISOString(),
  };

  return { MessageType: "PositionReport", Message: { PositionReport: report }, MetaData: meta };
}

function buildStaticEnvelope(vessel: MockVessel): AISStreamEnvelope {
  const mmsiNum = parseInt(vessel.mmsi, 10);
  const destPort = TEST_PORTS[vessel.destIndex];

  const staticData: ShipStaticData = {
    AisVersion: 2,
    CallSign: vessel.callSign,
    Destination: destPort.name.toUpperCase(),
    Dimension: { A: 200, B: 50, C: 20, D: 20 },
    Dte: 0,
    Eta: { Month: 3, Day: 15, Hour: 14, Minute: 0 },
    FixType: 1,
    ImoNumber: vessel.imo,
    MaximumStaticDraught: 120,
    MessageID: 5,
    Name: vessel.name,
    RepeatIndicator: 0,
    Spare: false,
    Type: vessel.shipType,
    UserID: mmsiNum,
    Valid: true,
  };

  const meta: AISStreamMetaData = {
    MMSI: mmsiNum,
    MMSI_String: vessel.mmsi,
    ShipName: vessel.name,
    latitude: 0,
    longitude: 0,
    time_utc: new Date().toISOString(),
  };

  return { MessageType: "ShipStaticData", Message: { ShipStaticData: staticData }, MetaData: meta };
}

// ─── Server ─────────────────────────────────────────────────────────────────

export interface MockServerHandle {
  port: number;
  close: () => Promise<void>;
}

export function startMockServer(options?: {
  port?: number;
  messageRate?: number;
  vesselCount?: number;
  timeScale?: number;
}): MockServerHandle {
  const port = options?.port ?? PORT;
  const messageRate = options?.messageRate ?? MESSAGE_RATE;
  const vesselCount = options?.vesselCount ?? VESSEL_COUNT;
  const timeScale = options?.timeScale ?? TIME_SCALE;

  const vessels = generateVessels(vesselCount);
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket) => {
    let subscribed = false;
    let messageInterval: ReturnType<typeof setInterval> | null = null;
    let vesselIndex = 0;

    ws.on("message", (data: Buffer) => {
      if (!subscribed) {
        try {
          const sub = JSON.parse(data.toString());
          if (sub.APIKey !== undefined || sub.BoundingBoxes !== undefined) {
            subscribed = true;

            messageInterval = setInterval(() => {
              if (ws.readyState !== WebSocket.OPEN) return;

              updateVessel(vessels[vesselIndex], messageRate, timeScale);

              const envelope =
                Math.random() < 0.8
                  ? buildPositionEnvelope(vessels[vesselIndex])
                  : buildStaticEnvelope(vessels[vesselIndex]);

              ws.send(JSON.stringify(envelope));
              vesselIndex = (vesselIndex + 1) % vessels.length;
            }, 1000 / messageRate);
          }
        } catch {
          // Invalid JSON — ignore
        }
      }
    });

    ws.on("close", () => {
      if (messageInterval) clearInterval(messageInterval);
    });

    ws.on("error", () => {
      if (messageInterval) clearInterval(messageInterval);
    });
  });

  return {
    port,
    close: () =>
      new Promise<void>((resolve) => {
        wss.clients.forEach((client) => client.terminate());
        wss.close(() => resolve());
      }),
  };
}

// ─── Main Module Detection ──────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
  const handle = startMockServer({
    port: PORT,
    messageRate: MESSAGE_RATE,
    vesselCount: VESSEL_COUNT,
    timeScale: TIME_SCALE,
  });
  console.log(`Mock AIS server listening on ws://localhost:${handle.port}`);
  console.log(
    `  Vessels: ${VESSEL_COUNT}, Rate: ${MESSAGE_RATE} msg/s, Time scale: ${TIME_SCALE}x`
  );

  const shutdown = () => {
    console.log("Shutting down mock AIS server...");
    handle.close().then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
