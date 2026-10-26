"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "OWNER" | "MANAGER" | "RECEPTIONIST" | "PHYSIOTHERAPIST" | "NUTRITIONIST";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: "OWNER",
  setRole: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("OWNER");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("masaar_preview_role");
      if (
        saved &&
        ["OWNER", "MANAGER", "RECEPTIONIST", "PHYSIOTHERAPIST", "NUTRITIONIST"].includes(saved)
      ) {
        setRoleState(saved as UserRole);
      }
    } catch {
      // Ignore localStorage errors in SSR or restricted environments
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("masaar_preview_role", newRole);
    } catch {
      // Ignore
    }
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
