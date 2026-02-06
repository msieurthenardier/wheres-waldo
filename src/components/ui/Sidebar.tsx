"use client";

import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto absolute top-14 right-0 z-20 flex h-10 w-6 cursor-pointer items-center justify-center rounded-l-md border border-r-0 border-[var(--border-subtle)] bg-black/70 text-[var(--text-secondary)] backdrop-blur-md transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
        aria-label={isOpen ? "Close panel" : "Open panel"}
      >
        <span className="font-[family-name:var(--font-mono)] text-xs">
          {isOpen ? "›" : "‹"}
        </span>
      </button>

      {/* Panel */}
      <aside
        className={`pointer-events-auto absolute top-12 right-0 bottom-0 z-10 w-80 border-l border-[var(--border-subtle)] bg-black/80 backdrop-blur-md transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4">
          <h2
            className="mb-4 font-[family-name:var(--font-mono)] text-xs font-bold tracking-[0.15em] text-[var(--accent-primary)]"
            style={{
              textShadow: "0 0 8px rgba(0,255,242,0.4)",
            }}
          >
            INTEL PANEL
          </h2>

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
              Select a vessel or port for details.
            </p>
          </div>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
            <h3 className="mb-2 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-wider text-[var(--text-secondary)]">
              GLOBAL STATS
            </h3>
            <div className="space-y-2">
              <StatRow label="VESSELS TRACKED" value="—" />
              <StatRow label="PORTS ACTIVE" value="—" />
              <StatRow label="EST. VALUE IN TRANSIT" value="—" />
            </div>
          </div>
        </div>
      </aside>
    </>
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
