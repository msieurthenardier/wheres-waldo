"use client";

import { useState, useMemo } from "react";
import { useAISData } from "@/stores/ais";
import { useFilters } from "@/stores/filters";
import { COMMODITIES, COMMODITY_IDS, COMMODITY_PORTS } from "@/lib/commodity";
import type { CommodityId } from "@/lib/commodity";

function formatValue(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { stats } = useAISData();
  const { selectedId, selectedType, selectItem } = useFilters();

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto absolute top-14 right-0 z-20 flex h-10 w-6 cursor-pointer items-center justify-center rounded-l-md border border-r-0 border-[var(--border-subtle)] bg-black/70 text-[var(--text-secondary)] backdrop-blur-md transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
        aria-label={isOpen ? "Close panel" : "Open panel"}
      >
        <span className="font-[family-name:var(--font-mono)] text-xs">
          {isOpen ? "\u203A" : "\u2039"}
        </span>
      </button>

      {/* Panel */}
      <aside
        className={`pointer-events-auto absolute top-12 right-0 bottom-0 z-10 w-80 border-l border-[var(--border-subtle)] bg-black/80 backdrop-blur-md transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto p-4">
          <h2
            className="mb-4 font-[family-name:var(--font-mono)] text-xs font-bold tracking-[0.15em] text-[var(--accent-primary)]"
            style={{ textShadow: "0 0 8px rgba(0,255,242,0.4)" }}
          >
            INTEL PANEL
          </h2>

          {/* Selection detail */}
          {selectedId && selectedType ? (
            <SelectionDetail
              id={selectedId}
              type={selectedType}
              onClose={() => selectItem(null, null)}
            />
          ) : (
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
                Select a vessel or port for details.
              </p>
            </div>
          )}

          {/* Global Stats */}
          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
            <h3 className="mb-2 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-wider text-[var(--text-secondary)]">
              GLOBAL STATS
            </h3>
            <div className="space-y-2">
              <StatRow
                label="VESSELS TRACKED"
                value={String(stats.totalVessels)}
              />
              <StatRow
                label="PORTS ACTIVE"
                value={String(COMMODITY_PORTS.length)}
              />
              <StatRow
                label="EST. VALUE IN TRANSIT"
                value={formatValue(stats.totalValueInTransit)}
              />
            </div>
          </div>

          {/* Commodity Breakdown */}
          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
            <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-wider text-[var(--text-secondary)]">
              COMMODITY BREAKDOWN
            </h3>
            <div className="space-y-2">
              {COMMODITY_IDS.map((id: CommodityId) => {
                const info = COMMODITIES[id];
                const data = stats.commodityBreakdown[id];
                return (
                  <div key={id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: info.color }}
                      />
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
                        {info.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
                        {data?.count ?? 0}
                      </span>
                      <span
                        className="font-[family-name:var(--font-mono)] text-xs"
                        style={{ color: info.color }}
                      >
                        {data ? formatValue(data.value) : "$0"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Port List */}
          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
            <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-wider text-[var(--text-secondary)]">
              KEY PORTS ({COMMODITY_PORTS.length})
            </h3>
            <div className="space-y-1">
              {COMMODITY_PORTS.slice(0, 12).map((port) => {
                const primaryCommodity = port.exports[0] ?? port.imports[0];
                const color = primaryCommodity
                  ? COMMODITIES[primaryCommodity]?.color ?? "#00fff2"
                  : "#00fff2";
                return (
                  <button
                    key={port.name}
                    onClick={() => selectItem(port.name, "port")}
                    className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1 text-left transition-colors hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-primary)]">
                        {port.name}
                      </span>
                    </div>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
                      {port.country}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function SelectionDetail({
  id,
  type,
  onClose,
}: {
  id: string;
  type: "vessel" | "port";
  onClose: () => void;
}) {
  if (type === "port") return <PortDetail name={id} onClose={onClose} />;
  return <VesselDetail mmsi={id} onClose={onClose} />;
}

function VesselDetail({
  mmsi,
  onClose,
}: {
  mmsi: string;
  onClose: () => void;
}) {
  const { vessels } = useAISData();
  const vessel = useMemo(
    () => vessels.find((v) => v.mmsi === mmsi),
    [vessels, mmsi]
  );

  if (!vessel) {
    return (
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
          Vessel {mmsi} not found.
        </p>
      </div>
    );
  }

  const commodityColor = vessel.commodity
    ? COMMODITIES[vessel.commodity as CommodityId]?.color ?? "#00fff2"
    : "#00fff2";

  return (
    <div className="border-t border-[var(--border-subtle)] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="font-[family-name:var(--font-mono)] text-xs font-bold"
          style={{ color: commodityColor }}
        >
          {vessel.shipName || "UNKNOWN"}
        </h3>
        <button
          onClick={onClose}
          className="cursor-pointer font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
        >
          CLOSE
        </button>
      </div>
      <div className="space-y-1.5">
        <DetailRow label="MMSI" value={vessel.mmsi} />
        <DetailRow
          label="POSITION"
          value={`${vessel.lat.toFixed(4)}, ${vessel.lon.toFixed(4)}`}
        />
        <DetailRow
          label="SPEED"
          value={isNaN(vessel.sog) ? "N/A" : `${vessel.sog.toFixed(1)} kn`}
        />
        <DetailRow
          label="HEADING"
          value={
            isNaN(vessel.heading) ? "N/A" : `${vessel.heading.toFixed(0)}\u00B0`
          }
        />
        <DetailRow
          label="COMMODITY"
          value={vessel.commodity ?? "Unclassified"}
          valueColor={commodityColor}
        />
        <DetailRow
          label="EST. VALUE"
          value={formatValue(vessel.estimatedValueUsd)}
          valueColor={commodityColor}
        />
      </div>
    </div>
  );
}

function PortDetail({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const port = useMemo(
    () => COMMODITY_PORTS.find((p) => p.name === name),
    [name]
  );

  if (!port) {
    return (
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
          Port &quot;{name}&quot; not found.
        </p>
      </div>
    );
  }

  const primaryCommodity = port.exports[0] ?? port.imports[0];
  const color = primaryCommodity
    ? COMMODITIES[primaryCommodity]?.color ?? "#00fff2"
    : "#00fff2";

  return (
    <div className="border-t border-[var(--border-subtle)] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="font-[family-name:var(--font-mono)] text-xs font-bold"
          style={{ color }}
        >
          {port.name}
        </h3>
        <button
          onClick={onClose}
          className="cursor-pointer font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
        >
          CLOSE
        </button>
      </div>
      <div className="space-y-1.5">
        <DetailRow label="COUNTRY" value={port.country} />
        <DetailRow label="REGION" value={port.region} />
        <DetailRow
          label="POSITION"
          value={`${port.lat.toFixed(2)}, ${port.lon.toFixed(2)}`}
        />
        {port.exports.length > 0 && (
          <DetailRow
            label="EXPORTS"
            value={port.exports.map((e) => COMMODITIES[e].label).join(", ")}
          />
        )}
        {port.imports.length > 0 && (
          <DetailRow
            label="IMPORTS"
            value={port.imports.map((i) => COMMODITIES[i].label).join(", ")}
          />
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
        {label}
      </span>
      <span
        className="font-[family-name:var(--font-mono)] text-[11px]"
        style={{ color: valueColor ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
