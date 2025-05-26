"use client";

import Dashboard from "./components/Dashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Dashboard />
    </div>
  );
}
