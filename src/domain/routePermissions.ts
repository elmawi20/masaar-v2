import { Role } from "@prisma/client";

/**
 * Route RBAC Mapping defining allowed roles for each route prefix.
 * Based on spec §1, §1.1, and §15.
 */
export const ROUTE_PERMISSIONS_RULES: Array<{
  pattern: RegExp;
  allowedRoles: Role[];
}> = [
  // 1. Audit Log: Owner & Manager
  {
    pattern: /^\/admin\/audit-log(\/.*)?$/,
    allowedRoles: [Role.OWNER, Role.MANAGER],
  },
  // 2. Admin (Staff, Settings, Templates): Owner Only
  {
    pattern: /^\/admin(\/.*)?$/,
    allowedRoles: [Role.OWNER],
  },
  // 3. Management (Resources, Staff Schedules, Reports, Commissions): Owner & Manager
  {
    pattern: /^\/management(\/.*)?$/,
    allowedRoles: [Role.OWNER, Role.MANAGER],
  },
  // 4. Clinical Physiotherapy: Owner & Physiotherapist
  {
    pattern: /^\/clinical(\/.*)?$/,
    allowedRoles: [Role.OWNER, Role.PHYSIOTHERAPIST],
  },
  // 5. Clinical Nutrition: Owner & Nutritionist
  {
    pattern: /^\/nutrition(\/.*)?$/,
    allowedRoles: [Role.OWNER, Role.NUTRITIONIST],
  },
  // 6. Reception & Front Desk: Owner, Manager, Receptionist
  // Note: Physio & Nutritionist only have access to /reception/calendar
  {
    pattern: /^\/reception\/calendar(\/.*)?$/,
    allowedRoles: [Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.PHYSIOTHERAPIST, Role.NUTRITIONIST],
  },
  {
    pattern: /^\/reception(\/.*)?$/,
    allowedRoles: [Role.OWNER, Role.MANAGER, Role.RECEPTIONIST],
  },
];

/**
 * Normalizes a pathname by stripping the locale prefix (e.g. /ar/admin/staff -> /admin/staff).
 */
export function normalizeAppPath(pathname: string): string {
  if (!pathname) return "/";
  // Remove /ar or /en prefix if present
  const stripped = pathname.replace(/^\/(ar|en)(\/|$)/, "/");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/**
 * Checks whether the given user role is authorized to access the route.
 */
export function isRouteAllowedForRole(pathname: string, role?: Role | null): boolean {
  if (!role) return false;
  // Owner has universal access to all routes (R-1-1)
  if (role === Role.OWNER) return true;

  const normalized = normalizeAppPath(pathname);

  for (const rule of ROUTE_PERMISSIONS_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.allowedRoles.includes(role);
    }
  }

  // Routes not matched by restricted prefixes (e.g. "/" or public) are accessible to authenticated roles
  return true;
}

/**
 * Returns the default landing page for each role upon login or redirect.
 */
export function getRoleDefaultRoute(role?: Role | null): string {
  switch (role) {
    case Role.OWNER:
      return "/admin/staff";
    case Role.MANAGER:
      return "/management/resources";
    case Role.RECEPTIONIST:
      return "/reception/today";
    case Role.PHYSIOTHERAPIST:
      return "/clinical/queue";
    case Role.NUTRITIONIST:
      return "/nutrition/queue";
    default:
      return "/login";
  }
}
