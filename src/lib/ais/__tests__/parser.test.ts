import { describe, it, expect, vi } from "vitest";
import { parsePositionReport, parseShipStaticData } from "@/lib/ais/parser";
import type {
  AISStreamEnvelope,
  AISStreamMetaData,
  PositionReport,
  ShipStaticData,
  ShipStaticDataDimension,
  ShipStaticDataEta,
} from "@/lib/ais/types";

// ─── Test Fixture Factories ──────────────────────────────────────────────────

function makePositionEnvelope(overrides?: {
  report?: Partial<PositionReport>;
  meta?: Partial<AISStreamMetaData>;
  messageType?: string;
}): AISStreamEnvelope {
  return {
    MessageType: (overrides?.messageType as AISStreamEnvelope["MessageType"]) ?? "PositionReport",
    Message: {
      PositionReport: {
        Cog: 2150, // 215.0 degrees
        CommunicationState: 0,
        Latitude: 35.6895,
        Longitude: 139.6917,
        MessageID: 1,
        NavigationalStatus: 0,
        PositionAccuracy: true,
        Raim: false,
        RateOfTurn: 0,
        RepeatIndicator: 0,
        Sog: 145, // 14.5 knots
        Spare: 0,
        SpecialManoeuvreIndicator: 0,
        Timestamp: 30,
        TrueHeading: 215,
        UserID: 123456789,
        Valid: true,
        ...overrides?.report,
      },
    },
    MetaData: {
      MMSI: 123456789,
      MMSI_String: "123456789",
      ShipName: "EVER GIVEN",
      latitude: 35.6895,
      longitude: 139.6917,
      time_utc: "2025-01-15T12:30:00Z",
      ...overrides?.meta,
    },
  };
}

function makeStaticEnvelope(overrides?: {
  data?: Partial<ShipStaticData>;
  dimension?: Partial<ShipStaticDataDimension>;
  eta?: Partial<ShipStaticDataEta>;
  meta?: Partial<AISStreamMetaData>;
  messageType?: string;
}): AISStreamEnvelope {
  return {
    MessageType: (overrides?.messageType as AISStreamEnvelope["MessageType"]) ?? "ShipStaticData",
    Message: {
      ShipStaticData: {
        AisVersion: 2,
        CallSign: "H3RC",
        Destination: "ROTTERDAM@@@@@@@@@@",
        Dimension: {
          A: 200,
          B: 100,
          C: 30,
          D: 30,
          ...overrides?.dimension,
        },
        Dte: 0,
        Eta: {
          Month: 3,
          Day: 15,
          Hour: 14,
          Minute: 30,
          ...overrides?.eta,
        },
        FixType: 1,
        ImoNumber: 9811000,
        MaximumStaticDraught: 145, // 14.5 meters
        MessageID: 5,
        Name: "EVER GIVEN@@@@@@@@@@",
        RepeatIndicator: 0,
        Spare: false,
        Type: 70,
        UserID: 123456789,
        Valid: true,
        ...overrides?.data,
      },
    },
    MetaData: {
      MMSI: 123456789,
      MMSI_String: "123456789",
      ShipName: "EVER GIVEN",
      latitude: 35.6895,
      longitude: 139.6917,
      time_utc: "2025-01-15T12:30:00Z",
      ...overrides?.meta,
    },
  };
}

// ─── parsePositionReport Tests ───────────────────────────────────────────────

describe("parsePositionReport", () => {
  it("parses a valid PositionReport envelope", () => {
    const envelope = makePositionEnvelope();
    const result = parsePositionReport(envelope);

    expect(result).not.toBeNull();
    expect(result!.mmsi).toBe("123456789");
    expect(result!.lat).toBe(35.6895);
    expect(result!.lon).toBe(139.6917);
    expect(result!.cog).toBeCloseTo(215.0);
    expect(result!.sog).toBeCloseTo(14.5);
    expect(result!.heading).toBe(215);
    expect(result!.navStatus).toBe(0);
    expect(result!.shipName).toBe("EVER GIVEN");
    expect(typeof result!.timestamp).toBe("number");
  });

  it("sets COG, SOG, heading to NaN for unavailable sentinel values", () => {
    const envelope = makePositionEnvelope({
      report: { Cog: 3600, Sog: 1023, TrueHeading: 511 },
    });
    const result = parsePositionReport(envelope);

    expect(result).not.toBeNull();
    expect(result!.cog).toBeNaN();
    expect(result!.sog).toBeNaN();
    expect(result!.heading).toBeNaN();
  });

  it("returns null for out-of-range latitude (91)", () => {
    const envelope = makePositionEnvelope({
      report: { Latitude: 91 },
    });
    expect(parsePositionReport(envelope)).toBeNull();
  });

  it("returns null for out-of-range longitude (181)", () => {
    const envelope = makePositionEnvelope({
      report: { Longitude: 181 },
    });
    expect(parsePositionReport(envelope)).toBeNull();
  });

  it("returns null when Valid is false", () => {
    const envelope = makePositionEnvelope({
      report: { Valid: false },
    });
    expect(parsePositionReport(envelope)).toBeNull();
  });

  it("returns null when PositionReport key is missing from Message", () => {
    const envelope = makePositionEnvelope();
    delete envelope.Message.PositionReport;
    expect(parsePositionReport(envelope)).toBeNull();
  });

  it("returns null for wrong MessageType", () => {
    const envelope = makePositionEnvelope({
      messageType: "ShipStaticData",
    });
    expect(parsePositionReport(envelope)).toBeNull();
  });

  it("uses MMSI_String from MetaData as mmsi", () => {
    const envelope = makePositionEnvelope({
      meta: { MMSI_String: "987654321" },
    });
    const result = parsePositionReport(envelope);
    expect(result!.mmsi).toBe("987654321");
  });

  it("defaults empty ship name to Unknown", () => {
    const envelope = makePositionEnvelope({
      meta: { ShipName: "" },
    });
    const result = parsePositionReport(envelope);
    expect(result!.shipName).toBe("Unknown");
  });

  it("strips trailing @ from ship name in MetaData", () => {
    const envelope = makePositionEnvelope({
      meta: { ShipName: "VESSEL@@@@" },
    });
    const result = parsePositionReport(envelope);
    expect(result!.shipName).toBe("VESSEL");
  });
});

// ─── parseShipStaticData Tests ───────────────────────────────────────────────

describe("parseShipStaticData", () => {
  it("parses a valid ShipStaticData envelope", () => {
    const envelope = makeStaticEnvelope();
    const result = parseShipStaticData(envelope);

    expect(result).not.toBeNull();
    expect(result!.mmsi).toBe("123456789");
    expect(result!.name).toBe("EVER GIVEN");
    expect(result!.callSign).toBe("H3RC");
    expect(result!.imo).toBe(9811000);
    expect(result!.shipType).toBe(70);
    expect(result!.destination).toBe("ROTTERDAM");
    expect(result!.dimBow).toBe(200);
    expect(result!.dimStern).toBe(100);
    expect(result!.dimPort).toBe(30);
    expect(result!.dimStarboard).toBe(30);
    expect(result!.draught).toBeCloseTo(14.5);
    expect(result!.eta).toMatch(/^\d{4}-03-15T14:30:00Z$/);
    expect(typeof result!.timestamp).toBe("number");
  });

  it("strips trailing @ from Name, CallSign, and Destination", () => {
    const envelope = makeStaticEnvelope({
      data: {
        Name: "MY SHIP@@@@@@@@",
        CallSign: "ABCD@@@@",
        Destination: "TOKYO@@@@@@@@@@@@@",
      },
    });
    const result = parseShipStaticData(envelope);

    expect(result!.name).toBe("MY SHIP");
    expect(result!.callSign).toBe("ABCD");
    expect(result!.destination).toBe("TOKYO");
  });

  it("returns null eta when Eta.Month is 0", () => {
    const envelope = makeStaticEnvelope({
      eta: { Month: 0 },
    });
    const result = parseShipStaticData(envelope);
    expect(result!.eta).toBeNull();
  });

  it("returns null eta when Eta.Day is 0", () => {
    const envelope = makeStaticEnvelope({
      eta: { Day: 0 },
    });
    const result = parseShipStaticData(envelope);
    expect(result!.eta).toBeNull();
  });

  it("returns null when Valid is false", () => {
    const envelope = makeStaticEnvelope({
      data: { Valid: false },
    });
    expect(parseShipStaticData(envelope)).toBeNull();
  });

  it("returns null when ShipStaticData key is missing from Message", () => {
    const envelope = makeStaticEnvelope();
    delete envelope.Message.ShipStaticData;
    expect(parseShipStaticData(envelope)).toBeNull();
  });

  it("returns null for wrong MessageType", () => {
    const envelope = makeStaticEnvelope({
      messageType: "PositionReport",
    });
    expect(parseShipStaticData(envelope)).toBeNull();
  });

  it("defaults empty Name to Unknown after stripping", () => {
    const envelope = makeStaticEnvelope({
      data: { Name: "@@@@@@@@@@@@@@@@@@@@" },
    });
    const result = parseShipStaticData(envelope);
    expect(result!.name).toBe("Unknown");
  });

  it("handles unavailable ETA hour (24) and minute (60)", () => {
    const envelope = makeStaticEnvelope({
      eta: { Hour: 24, Minute: 60 },
    });
    const result = parseShipStaticData(envelope);
    expect(result!.eta).toMatch(/^\d{4}-03-15T00:00:00Z$/);
  });
});
