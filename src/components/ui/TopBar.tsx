"use client";

import { useState } from "react";
import { useFilters } from "@/stores/filters";
import { COMMODITIES, COMMODITY_IDS } from "@/lib/commodity";
import type { CommodityId } from "@/lib/commodity";

export default function TopBar() {
  const { activeCommodities, toggleCommodity, searchQuery, setSearchQuery } =
    useFilters();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <header className="pointer-events-auto relative z-10 border-b border-[var(--border-subtle)] bg-black/70 backdrop-blur-md">
      {/* Main bar */}
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1
            className="font-[family-name:var(--font-mono)] text-sm font-bold tracking-[0.2em] text-[var(--accent-primary)]"
            style={{
              textShadow:
                "0 0 10px var(--accent-primary), 0 0 30px rgba(0,255,242,0.3)",
            }}
          >
            WHERE&apos;S WALDO
          </h1>
          <span className="hidden font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)] sm:inline">
            AI SUPPLY CHAIN TRACKER
          </span>
        </div>

        {/* Search — desktop */}
        <div className="mx-4 hidden flex-1 justify-center md:flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vessels, ports, MMSI..."
            className="w-64 rounded border border-[var(--border-subtle)] bg-black/50 px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>

        {/* Commodity filters — desktop */}
        <div className="hidden items-center gap-1.5 lg:flex">
          {COMMODITY_IDS.map((id: CommodityId) => {
            const info = COMMODITIES[id];
            const active = activeCommodities.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleCommodity(id)}
                className="cursor-pointer rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] transition-all"
                style={{
                  borderColor: active ? info.color : "var(--border-subtle)",
                  color: active ? info.color : "var(--text-secondary)",
                  backgroundColor: active ? `${info.color}15` : "transparent",
                  textShadow: active ? `0 0 8px ${info.color}60` : "none",
                }}
              >
                {info.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="cursor-pointer font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] lg:hidden"
          >
            FILTER
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" />
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-emerald-400">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showMobileFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] px-4 py-2 lg:hidden">
          {/* Mobile search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded border border-[var(--border-subtle)] bg-black/50 px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:outline-none md:hidden"
          />
          {COMMODITY_IDS.map((id: CommodityId) => {
            const info = COMMODITIES[id];
            const active = activeCommodities.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleCommodity(id)}
                className="cursor-pointer rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] transition-all"
                style={{
                  borderColor: active ? info.color : "var(--border-subtle)",
                  color: active ? info.color : "var(--text-secondary)",
                  backgroundColor: active ? `${info.color}15` : "transparent",
                }}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
