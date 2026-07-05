// Central permission system — single source of truth for all role-based access.
// Permissions are code-defined: changes require a deploy but need no DB migration.

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppRole =
  | 'OWNER'
  | 'ADMIN'
  | 'OPS_MANAGER'
  | 'BILLING_STAFF'
  | 'DISPATCH_STAFF'
  | 'SALES_STAFF'
  | 'READ_ONLY'
  | 'MANAGER'  // legacy → maps to OPS_MANAGER behaviour
  | 'WORKER'   // legacy → maps to READ_ONLY behaviour

export type Permission =
  | 'can_export'
  | 'can_transfer'
  | 'can_dispatch'
  | 'can_move_stage'
  | 'can_manage_users'
  | 'can_edit_billing'
  | 'can_delete'
  | 'can_view_reports'
  | 'can_assign'
  | 'can_bulk_action'
  | 'can_view_audit_logs'
  | 'can_add_notes'
  | 'can_set_priority'
  | 'can_view_payments'
  | 'can_invite_users'

export const ROLE_LABELS: Record<AppRole, string> = {
  OWNER:          'Owner',
  ADMIN:          'Admin',
  OPS_MANAGER:    'Operations Manager',
  BILLING_STAFF:  'Billing Staff',
  DISPATCH_STAFF: 'Dispatch Staff',
  SALES_STAFF:    'Sales Staff',
  READ_ONLY:      'Read Only',
  MANAGER:        'Manager',
  WORKER:         'Worker',
}

// Roles selectable in the UI (excludes legacy)
export const ASSIGNABLE_ROLES: AppRole[] = [
  'ADMIN',
  'OPS_MANAGER',
  'BILLING_STAFF',
  'DISPATCH_STAFF',
  'SALES_STAFF',
  'READ_ONLY',
]

// ── Permission Matrix ─────────────────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = [
  'can_export', 'can_transfer', 'can_dispatch', 'can_move_stage',
  'can_manage_users', 'can_edit_billing', 'can_delete', 'can_view_reports',
  'can_assign', 'can_bulk_action', 'can_view_audit_logs', 'can_add_notes',
  'can_set_priority', 'can_view_payments', 'can_invite_users',
]

const OPS_MANAGER_PERMS: Permission[] = [
  'can_export', 'can_transfer', 'can_dispatch', 'can_move_stage',
  'can_edit_billing', 'can_view_reports', 'can_assign', 'can_bulk_action',
  'can_add_notes', 'can_set_priority', 'can_view_payments',
]

const ROLE_PERMISSIONS: Record<AppRole, Permission[] | '*'> = {
  OWNER:          '*',
  ADMIN:          '*',   // full access, same as OWNER
  OPS_MANAGER:    OPS_MANAGER_PERMS,
  BILLING_STAFF:  ['can_edit_billing', 'can_view_reports', 'can_add_notes', 'can_view_payments'],
  DISPATCH_STAFF: ['can_dispatch', 'can_move_stage', 'can_add_notes'],
  SALES_STAFF:    ['can_export', 'can_view_reports', 'can_add_notes'],
  READ_ONLY:      [],
  // Legacy roles — map to closest equivalent
  MANAGER:        OPS_MANAGER_PERMS,
  WORKER:         ['can_add_notes'],
}

// ── Helper functions ──────────────────────────────────────────────────────────

export function hasPermission(role: AppRole, perm: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (perms === '*') return true
  return perms.includes(perm)
}

export function getPermissions(role: AppRole): Permission[] {
  const perms = ROLE_PERMISSIONS[role]
  return perms === '*' ? ALL_PERMISSIONS : perms
}

export function normalizeRole(raw: string | undefined | null): AppRole {
  if (!raw) return 'READ_ONLY'
  const upper = raw.toUpperCase() as AppRole
  return upper in ROLE_LABELS ? upper : 'READ_ONLY'
}
