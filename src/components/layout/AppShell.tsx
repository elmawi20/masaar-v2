"use client";

import React, { useState } from "react";
import { RoleProvider } from "@/context/RoleContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        <Sidebar isOpenMobile={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </RoleProvider>
  );
}
