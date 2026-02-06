import { describe, it, expect } from "vitest";
import { classifyVessel, classifyByProximity } from "@/lib/commodity/classifier";
import type { VesselStatic } from "@/lib/ais";

function makeStatic(overrides: Partial<VesselStatic> = {}): VesselStatic {
  return {
    mmsi: "123456789",
    name: "TEST VESSEL",
    callSign: "TV01",
    imo: 1000001,
    shipType: 70, // General cargo
    destination: "",
    dimBow: 150,
    dimStern: 50,
    dimPort: 15,
    dimStarboard: 15,
    draught: 10,
    eta: null,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("classifyVessel", () => {
  it("classifies cargo ship heading to Kaohsiung as semiconductors", () => {
    const vessel = makeStatic({ shipType: 70, destination: "KAOHSIUNG" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(result!.commodity).toBe("semiconductors");
    expect(result!.confidence).toBeGreaterThan(0.5);
  });

  it("classifies vessel heading to Rotterdam (import hub) with commodity match", () => {
    const vessel = makeStatic({ shipType: 70, destination: "ROTTERDAM" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    // Rotterdam imports semiconductors, lithium, cobalt, rare_earths, nickel, copper
    // Cargo vessel should prefer semiconductors or rare_earths
    expect(["semiconductors", "rare_earths"]).toContain(result!.commodity);
  });

  it("classifies tanker heading to Antofagasta as copper or lithium", () => {
    const vessel = makeStatic({ shipType: 80, destination: "ANTOFAGASTA" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(["copper", "lithium"]).toContain(result!.commodity);
  });

  it("matches AIS abbreviation RTM to Rotterdam", () => {
    const vessel = makeStatic({ shipType: 70, destination: "RTM" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(result!.reason).toContain("Rotterdam");
  });

  it("matches abbreviated destination SINGAPO to Singapore", () => {
    const vessel = makeStatic({ shipType: 70, destination: "SINGAPO" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(result!.reason).toContain("Singapore");
  });

  it("classifies vessel heading to Durban as cobalt or copper", () => {
    const vessel = makeStatic({ shipType: 70, destination: "DURBAN" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(["cobalt", "copper"]).toContain(result!.commodity);
  });

  it("classifies vessel heading to Sulawesi/Morowali as nickel", () => {
    const vessel = makeStatic({ shipType: 70, destination: "MOROWALI" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(result!.commodity).toBe("nickel");
  });

  it("falls back to ship-type classification for unknown destination", () => {
    const vessel = makeStatic({ shipType: 70, destination: "UNKNOWN PORT" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeLessThan(0.3);
  });

  it("returns null for non-cargo/tanker ship types", () => {
    // Ship type 30 = fishing
    const vessel = makeStatic({ shipType: 30, destination: "KAOHSIUNG" });
    const result = classifyVessel(vessel);
    expect(result).toBeNull();
  });

  it("returns null for passenger ships", () => {
    // Ship type 60 = passenger
    const vessel = makeStatic({ shipType: 60, destination: "ROTTERDAM" });
    const result = classifyVessel(vessel);
    expect(result).toBeNull();
  });

  it("handles empty destination", () => {
    const vessel = makeStatic({ shipType: 70, destination: "" });
    const result = classifyVessel(vessel);
    // Should still return something (ship-type fallback)
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeLessThan(0.3);
  });

  it("classifies cargo vessel to Busan as semiconductors", () => {
    const vessel = makeStatic({ shipType: 70, destination: "BUSAN" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(["semiconductors", "rare_earths", "copper"]).toContain(result!.commodity);
  });

  it("classifies vessel to Port Hedland as lithium", () => {
    const vessel = makeStatic({ shipType: 70, destination: "PORT HEDLAND" });
    const result = classifyVessel(vessel);
    expect(result).not.toBeNull();
    expect(result!.commodity).toBe("lithium");
  });
});

describe("classifyByProximity", () => {
  it("classifies cargo vessel near Kaohsiung as semiconductors", () => {
    // Kaohsiung: lat 22.6, lon 120.3
    const result = classifyByProximity(22.65, 120.35, 70);
    expect(result).not.toBeNull();
    expect(result!.commodity).toBe("semiconductors");
    expect(result!.confidence).toBe(0.3);
  });

  it("returns null for vessel far from any known port", () => {
    // Middle of Pacific
    const result = classifyByProximity(0, -170, 70);
    expect(result).toBeNull();
  });

  it("classifies vessel near Antofagasta", () => {
    // Antofagasta: lat -23.65, lon -70.4
    const result = classifyByProximity(-23.5, -70.5, 70);
    expect(result).not.toBeNull();
    expect(["copper", "lithium"]).toContain(result!.commodity);
  });
});
