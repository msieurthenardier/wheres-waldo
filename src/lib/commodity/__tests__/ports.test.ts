import { describe, it, expect } from "vitest";
import {
  COMMODITY_PORTS,
  findNearestPort,
  getExportPorts,
  getImportPorts,
} from "@/lib/commodity/ports";

describe("COMMODITY_PORTS", () => {
  it("has at least 25 ports", () => {
    expect(COMMODITY_PORTS.length).toBeGreaterThanOrEqual(25);
  });

  it("all ports have valid coordinates", () => {
    for (const port of COMMODITY_PORTS) {
      expect(port.lat).toBeGreaterThanOrEqual(-90);
      expect(port.lat).toBeLessThanOrEqual(90);
      expect(port.lon).toBeGreaterThanOrEqual(-180);
      expect(port.lon).toBeLessThanOrEqual(180);
    }
  });

  it("all ports have at least one commodity association", () => {
    for (const port of COMMODITY_PORTS) {
      expect(port.exports.length + port.imports.length).toBeGreaterThan(0);
    }
  });

  it("all ports have throughput between 0 and 1", () => {
    for (const port of COMMODITY_PORTS) {
      expect(port.throughput).toBeGreaterThan(0);
      expect(port.throughput).toBeLessThanOrEqual(1);
    }
  });
});

describe("findNearestPort", () => {
  it("finds Kaohsiung near its coordinates", () => {
    const port = findNearestPort(22.65, 120.35);
    expect(port).not.toBeNull();
    expect(port!.name).toBe("Kaohsiung");
  });

  it("finds Rotterdam near its coordinates", () => {
    const port = findNearestPort(51.85, 4.55);
    expect(port).not.toBeNull();
    expect(port!.name).toBe("Rotterdam");
  });

  it("returns null for mid-ocean positions", () => {
    const port = findNearestPort(0, -170);
    expect(port).toBeNull();
  });

  it("respects max distance parameter", () => {
    // 22.65, 120.35 is ~7km from Kaohsiung (22.6, 120.3)
    const port = findNearestPort(22.65, 120.35, 10);
    expect(port).not.toBeNull();
    // With a very tight radius, should not find it
    const noPort = findNearestPort(22.65, 120.35, 1);
    expect(noPort).toBeNull();
  });
});

describe("getExportPorts", () => {
  it("returns ports that export semiconductors", () => {
    const ports = getExportPorts("semiconductors");
    expect(ports.length).toBeGreaterThan(0);
    const names = ports.map((p) => p.name);
    expect(names).toContain("Kaohsiung");
    expect(names).toContain("Busan");
  });

  it("returns ports that export lithium", () => {
    const ports = getExportPorts("lithium");
    expect(ports.length).toBeGreaterThan(0);
    const names = ports.map((p) => p.name);
    expect(names).toContain("Antofagasta");
  });
});

describe("getImportPorts", () => {
  it("returns major import hubs for semiconductors", () => {
    const ports = getImportPorts("semiconductors");
    expect(ports.length).toBeGreaterThan(0);
    const names = ports.map((p) => p.name);
    expect(names).toContain("Los Angeles");
    expect(names).toContain("Rotterdam");
  });
});
