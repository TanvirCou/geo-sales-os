export type PermissionKey =
  | "canAddBusiness"
  | "canEditBusiness"
  | "canDeleteBusiness"
  | "canRecordOrder"
  | "canUpdateOrder"
  | "canDeleteOrder"
  | "canManageProducts"
  | "canDeleteProduct"
  | "canImport"
  | "canManageUsers";

export interface CustomPermissions {
  canAddBusiness?: boolean;
  canEditBusiness?: boolean;
  canDeleteBusiness?: boolean;
  canRecordOrder?: boolean;
  canUpdateOrder?: boolean;
  canDeleteOrder?: boolean;
  canManageProducts?: boolean;
  canDeleteProduct?: boolean;
  canImport?: boolean;
}

export interface UserRoleInfo {
  role?: "ADMIN" | "MODERATOR" | "MARKETER" | "CUSTOM" | string;
  permissions?: any;
}

/**
 * Evaluates whether a user role has the required permission.
 * - ADMIN: Unrestricted access to everything (including permanent deletions and user management).
 * - MODERATOR: Can Add, Edit, and Archive Businesses, Products, and Orders, plus Batch Import. Blocked from permanent deletes (Business, Product, Order) and User Management.
 * - MARKETER: Pure Read-Only (Option B). All mutation permissions are denied.
 * - CUSTOM: Evaluates custom JSON permission flags set by Admin. Blocked from user management.
 */
export function hasPermission(
  user: UserRoleInfo | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  const role = user.role?.toUpperCase();

  if (role === "ADMIN") {
    return true;
  }

  if (role === "MODERATOR") {
    if (
      permission === "canDeleteBusiness" ||
      permission === "canDeleteOrder" ||
      permission === "canDeleteProduct" ||
      permission === "canManageUsers"
    ) {
      return false;
    }
    return true;
  }

  if (role === "MARKETER") {
    return false;
  }

  if (role === "CUSTOM") {
    if (permission === "canManageUsers") return false;
    const perms = (user.permissions as Record<string, boolean>) || {};
    return !!perms[permission];
  }

  return false;
}

export const ROLE_LABELS: Record<string, { label: string; description: string; badgeClass: string }> = {
  ADMIN: {
    label: "Admin",
    description: "Full system control, team management, and permanent deletion rights",
    badgeClass: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20",
  },
  MODERATOR: {
    label: "Moderator",
    description: "Operations supervisor: Can Add, Edit & Archive businesses, products and orders, and batch import data. Deletions are restricted to Admin.",
    badgeClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
  },
  MARKETER: {
    label: "Marketer",
    description: "Read-only access: Can view maps, catalog, businesses, and orders without editing",
    badgeClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  },
  CUSTOM: {
    label: "Custom",
    description: "Granular custom permissions configured by the administrator",
    badgeClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20",
  },
};
