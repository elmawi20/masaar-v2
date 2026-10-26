"use client";

import React, { createContext, useContext, useState } from "react";

export type UserRole = "OWNER" | "MANAGER" | "RECEPTIONIST" | "PHYSIOTHERAPIST" | "NUTRITIONIST";

export interface AuthUser {
  id: string;
  fullName?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface RoleContextType {
  user: AuthUser | null;
  role: UserRole;
  setUser: (user: AuthUser | null) => void;
}

const RoleContext = createContext<RoleContextType>({
  user: null,
  role: "OWNER",
  setUser: () => {},
});

export function RoleProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser || null);

  // Menus and permissions come strictly from logged-in user's role (R-1-6)
  const role: UserRole = user?.role || "OWNER";

  return (
    <RoleContext.Provider value={{ user, role, setUser }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
