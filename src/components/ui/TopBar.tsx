"use client";

const FILTER_CHIPS = [
  "Semiconductors",
  "Lithium",
  "Cobalt",
  "Rare Earths",
  "Copper",
  "Nickel",
];

export default function TopBar() {
  return (
    <header className="pointer-events-auto relative z-10 flex h-12 items-center justify-between border-b border-[var(--border-subtle)] bg-black/70 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1
          className="font-[family-name:var(--font-mono)] text-sm font-bold tracking-[0.2em] text-[var(--accent-primary)]"
          style={{
            textShadow: "0 0 10px var(--accent-primary), 0 0 30px rgba(0,255,242,0.3)",
          }}
        >
          WHERE&apos;S WALDO
        </h1>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
          AI SUPPLY CHAIN TRACKER
        </span>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            className="cursor-pointer rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" />
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-emerald-400">
            LIVE
          </span>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
          {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
        </span>
      </div>
    </header>
  );
}
