import { describe, it, expect } from "vitest";
import { isRouteAllowedForRole, getRoleDefaultRoute } from "@/domain/routePermissions";
import { Role } from "@prisma/client";

describe("Bug 2: Role-based Route Protection Matrix for Every Role [R-1-1 to R-1-6, R-1.1-19]", () => {
  const routes = {
    adminStaff: "/admin/staff",
    adminSettings: "/admin/settings",
    adminTemplates: "/admin/templates",
    adminAuditLog: "/admin/audit-log",
    managementResources: "/management/resources",
    managementSchedules: "/management/staff-schedules",
    managementReports: "/management/reports",
    managementCommissions: "/management/commissions",
    clinicalQueue: "/clinical/queue",
    clinicalCommissions: "/clinical/my-commissions",
    nutritionQueue: "/nutrition/queue",
    nutritionCommissions: "/nutrition/my-commissions",
    receptionToday: "/reception/today",
    receptionCalendar: "/reception/calendar",
    receptionPatients: "/reception/patients",
    receptionBilling: "/reception/billing",
    receptionExpenses: "/reception/expenses",
    receptionCashClosing: "/reception/cash-closing",
  };

  describe("OWNER Role Access", () => {
    it("allows OWNER to access ALL routes in the system [R-1-1]", () => {
      Object.values(routes).forEach((path) => {
        expect(isRouteAllowedForRole(path, Role.OWNER)).toBe(true);
      });
    });
  });

  describe("MANAGER Role Access", () => {
    it("allows MANAGER to access management, reception, and audit-log; blocks admin settings/staff and clinical [R-1-2]", () => {
      // Allowed
      expect(isRouteAllowedForRole(routes.adminAuditLog, Role.MANAGER)).toBe(true);
      expect(isRouteAllowedForRole(routes.managementResources, Role.MANAGER)).toBe(true);
      expect(isRouteAllowedForRole(routes.managementSchedules, Role.MANAGER)).toBe(true);
      expect(isRouteAllowedForRole(routes.managementReports, Role.MANAGER)).toBe(true);
      expect(isRouteAllowedForRole(routes.managementCommissions, Role.MANAGER)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionToday, Role.MANAGER)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionCalendar, Role.MANAGER)).toBe(true);

      // Blocked
      expect(isRouteAllowedForRole(routes.adminStaff, Role.MANAGER)).toBe(false);
      expect(isRouteAllowedForRole(routes.adminSettings, Role.MANAGER)).toBe(false);
      expect(isRouteAllowedForRole(routes.adminTemplates, Role.MANAGER)).toBe(false);
      expect(isRouteAllowedForRole(routes.clinicalQueue, Role.MANAGER)).toBe(false);
      expect(isRouteAllowedForRole(routes.nutritionQueue, Role.MANAGER)).toBe(false);
    });
  });

  describe("RECEPTIONIST Role Access", () => {
    it("allows RECEPTIONIST to access ONLY reception routes; blocks all /admin/*, /management/*, /clinical/*, /nutrition/* [R-1-6]", () => {
      // Allowed
      expect(isRouteAllowedForRole(routes.receptionToday, Role.RECEPTIONIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionCalendar, Role.RECEPTIONIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionPatients, Role.RECEPTIONIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionBilling, Role.RECEPTIONIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionExpenses, Role.RECEPTIONIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionCashClosing, Role.RECEPTIONIST)).toBe(true);

      // Blocked - MUST BE FALSE
      expect(isRouteAllowedForRole(routes.adminStaff, Role.RECEPTIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.adminSettings, Role.RECEPTIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.adminAuditLog, Role.RECEPTIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.managementResources, Role.RECEPTIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.managementSchedules, Role.RECEPTIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.managementReports, Role.RECEPTIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.clinicalQueue, Role.RECEPTIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.nutritionQueue, Role.RECEPTIONIST)).toBe(false);
    });
  });

  describe("PHYSIOTHERAPIST Role Access", () => {
    it("allows PHYSIOTHERAPIST to access clinical and calendar; blocks admin, management, nutrition, billing, cash-closing [R-1-3, R-1-4]", () => {
      // Allowed
      expect(isRouteAllowedForRole(routes.clinicalQueue, Role.PHYSIOTHERAPIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.clinicalCommissions, Role.PHYSIOTHERAPIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionCalendar, Role.PHYSIOTHERAPIST)).toBe(true);

      // Blocked
      expect(isRouteAllowedForRole(routes.adminStaff, Role.PHYSIOTHERAPIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.adminSettings, Role.PHYSIOTHERAPIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.managementResources, Role.PHYSIOTHERAPIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.nutritionQueue, Role.PHYSIOTHERAPIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.receptionBilling, Role.PHYSIOTHERAPIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.receptionCashClosing, Role.PHYSIOTHERAPIST)).toBe(false);
    });
  });

  describe("NUTRITIONIST Role Access", () => {
    it("allows NUTRITIONIST to access nutrition and calendar; blocks admin, management, clinical, billing, cash-closing [R-1-5]", () => {
      // Allowed
      expect(isRouteAllowedForRole(routes.nutritionQueue, Role.NUTRITIONIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.nutritionCommissions, Role.NUTRITIONIST)).toBe(true);
      expect(isRouteAllowedForRole(routes.receptionCalendar, Role.NUTRITIONIST)).toBe(true);

      // Blocked
      expect(isRouteAllowedForRole(routes.adminStaff, Role.NUTRITIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.adminSettings, Role.NUTRITIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.clinicalQueue, Role.NUTRITIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.receptionBilling, Role.NUTRITIONIST)).toBe(false);
      expect(isRouteAllowedForRole(routes.receptionCashClosing, Role.NUTRITIONIST)).toBe(false);
    });
  });

  describe("Role Default Route Redirection", () => {
    it("provides the correct default landing route for each role", () => {
      expect(getRoleDefaultRoute(Role.OWNER)).toBe("/admin/staff");
      expect(getRoleDefaultRoute(Role.MANAGER)).toBe("/management/resources");
      expect(getRoleDefaultRoute(Role.RECEPTIONIST)).toBe("/reception/today");
      expect(getRoleDefaultRoute(Role.PHYSIOTHERAPIST)).toBe("/clinical/queue");
      expect(getRoleDefaultRoute(Role.NUTRITIONIST)).toBe("/nutrition/queue");
    });
  });
});
