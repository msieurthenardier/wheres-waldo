"use client";

import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* 3D Canvas — full bleed behind everything */}
      <div className="absolute inset-0">{children}</div>

      {/* UI Chrome overlay */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <TopBar />
        <Sidebar />
      </div>
    </div>
  );
}
