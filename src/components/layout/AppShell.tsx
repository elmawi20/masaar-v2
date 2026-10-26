"use client";

import React, { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { RoleProvider, type AuthUser } from "@/context/RoleContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AppShell({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <RoleProvider initialUser={initialUser}>
        <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col">
          <header className="flex items-center justify-between h-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="font-bold text-sm tracking-wide text-[#0E6251] dark:text-[#48C9B0] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0E6251] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                م
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                نظام مسار Masaar
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 flex items-center justify-center p-4">
            {children}
          </main>
        </div>
      </RoleProvider>
    );
  }

  return (
    <RoleProvider initialUser={initialUser}>
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex">
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
