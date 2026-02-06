"use client";

import dynamic from "next/dynamic";
import Layout from "@/components/ui/Layout";

const GlobeScene = dynamic(() => import("@/components/scene/GlobeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-secondary)]">
        Initializing globe...
      </p>
    </div>
  ),
});

export default function Home() {
  return (
    <Layout>
      <GlobeScene />
    </Layout>
  );
}
