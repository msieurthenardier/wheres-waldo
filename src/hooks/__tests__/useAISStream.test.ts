import { describe, it, expect } from "vitest";
import { processAISEnvelope } from "../useAISStream";
import { VesselStore } from "@/lib/ais";
import type { AISStreamEnvelope } from "@/lib/ais";

function makePositionEnvelope(
  overrides: Partial<{
    mmsi: number;
    lat: number;
    lon: number;
    cog: number;
    sog: number;
    heading: number;
    shipName: string;
  }> = {}
): AISStreamEnvelope {
  const mmsi = overrides.mmsi ?? 200000001;
  return {
    MessageType: "PositionReport",
    Message: {
      PositionReport: {
        Latitude: overrides.lat ?? 35.0,
        Longitude: overrides.lon ?? -160.0,
        Cog: overrides.cog ?? 2700, // 1/10 degree
        Sog: overrides.sog ?? 140, // 1/10 knot
        TrueHeading: overrides.heading ?? 268,
        NavigationalStatus: 0,
        MessageID: 1,
        UserID: mmsi,
        Valid: true,
        RateOfTurn: 0,
        PositionAccuracy: true,
        Raim: false,
        Timestamp: 30,
        Spare: 0,
        SpecialManoeuvreIndicator: 0,
        RepeatIndicator: 0,
        CommunicationState: 0,
      },
    },
    MetaData: {
      MMSI: mmsi,
      MMSI_String: String(mmsi),
      ShipName: overrides.shipName ?? "TEST VESSEL",
      latitude: overrides.lat ?? 35.0,
      longitude: overrides.lon ?? -160.0,
      time_utc: new Date().toISOString(),
    },
  };
}

function makeStaticEnvelope(
  overrides: Partial<{
    mmsi: number;
    name: string;
    shipType: number;
    destination: string;
  }> = {}
): AISStreamEnvelope {
  const mmsi = overrides.mmsi ?? 200000001;
  return {
    MessageType: "ShipStaticData",
    Message: {
      ShipStaticData: {
        AisVersion: 0,
        CallSign: "ABCD",
        Destination: overrides.destination ?? "SHANGHAI",
        Dimension: { A: 100, B: 100, C: 20, D: 20 },
        Dte: 0,
        Eta: { Month: 3, Day: 15, Hour: 12, Minute: 0 },
        FixType: 1,
        ImoNumber: 9000000,
        MaximumStaticDraught: 120, // 12.0m in 1/10 meter
        MessageID: 5,
        Name: overrides.name ?? "TEST VESSEL",
        RepeatIndicator: 0,
        Spare: false,
        Type: overrides.shipType ?? 70, // Cargo
        UserID: mmsi,
        Valid: true,
      },
    },
    MetaData: {
      MMSI: mmsi,
      MMSI_String: String(mmsi),
      ShipName: overrides.name ?? "TEST VESSEL",
      latitude: 35.0,
      longitude: -160.0,
      time_utc: new Date().toISOString(),
    },
  };
}

describe("processAISEnvelope", () => {
  it("processes PositionReport and adds to store", () => {
    const store = new VesselStore();
    const envelope = makePositionEnvelope({ mmsi: 200000001 });

    const changed = processAISEnvelope(store, envelope);

    expect(changed).toBe(true);
    expect(store.size).toBe(1);
    const record = store.get("200000001");
    expect(record).toBeDefined();
    expect(record!.position!.lat).toBe(35.0);
  });

  it("processes ShipStaticData and enriches vessel", () => {
    const store = new VesselStore();

    // First add a position
    processAISEnvelope(store, makePositionEnvelope({ mmsi: 200000001 }));

    // Then add static data (with destination that matches a commodity port)
    const changed = processAISEnvelope(
      store,
      makeStaticEnvelope({ mmsi: 200000001, destination: "SHANGHAI" })
    );

    expect(changed).toBe(true);
    const record = store.get("200000001");
    expect(record).toBeDefined();
    expect(record!.static).not.toBeNull();
    expect(record!.enrichment).not.toBeNull();
  });

  it("returns false for unknown message types", () => {
    const store = new VesselStore();
    const envelope: AISStreamEnvelope = {
      MessageType: "UnknownMessage",
      Message: {},
      MetaData: {
        MMSI: 200000001,
        MMSI_String: "200000001",
        ShipName: "TEST",
        latitude: 35.0,
        longitude: -160.0,
        time_utc: new Date().toISOString(),
      },
    };

    const changed = processAISEnvelope(store, envelope);
    expect(changed).toBe(false);
    expect(store.size).toBe(0);
  });

  it("updates existing vessel position", () => {
    const store = new VesselStore();

    processAISEnvelope(store, makePositionEnvelope({ mmsi: 200000001, lat: 35.0 }));
    processAISEnvelope(store, makePositionEnvelope({ mmsi: 200000001, lat: 36.0 }));

    expect(store.size).toBe(1);
    expect(store.get("200000001")!.position!.lat).toBe(36.0);
  });

  it("tracks multiple vessels independently", () => {
    const store = new VesselStore();

    processAISEnvelope(store, makePositionEnvelope({ mmsi: 200000001 }));
    processAISEnvelope(store, makePositionEnvelope({ mmsi: 200000002 }));

    expect(store.size).toBe(2);
  });

  it("re-enriches when static data arrives after position", () => {
    const store = new VesselStore();

    // Position first (gets low-confidence enrichment)
    processAISEnvelope(store, makePositionEnvelope({ mmsi: 200000001 }));
    const firstEnrichment = store.get("200000001")!.enrichment;

    // Static data with known destination (should re-enrich with higher confidence)
    processAISEnvelope(
      store,
      makeStaticEnvelope({
        mmsi: 200000001,
        shipType: 70,
        destination: "SHANGHAI",
      })
    );
    const secondEnrichment = store.get("200000001")!.enrichment;

    expect(secondEnrichment).not.toBeNull();
    // Static-based enrichment should have commodity classification
    expect(secondEnrichment!.commodity).not.toBeNull();
  });
});
