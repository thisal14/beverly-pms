import { TokenPayload } from './jwt.utils';
import { UserRole } from '@beverly-pms/shared';

/**
 * Canonical list of all actions in the system.
 *
 * FUTURE PERMISSION MODULE: When the Permission Management module is added,
 * map these action strings to DB-stored permission records. The `can()` function
 * below is the ONLY place that needs to change — controllers and routes are unaffected.
 *
 * Convention: 'resource:verb'
 */
export const Action = {
  // Reservations
  RESERVATION_CREATE:   'reservation:create',
  RESERVATION_VIEW:     'reservation:view',
  RESERVATION_CHECKIN:  'reservation:checkin',
  RESERVATION_CHECKOUT: 'reservation:checkout',
  PAYMENT_ADD:          'payment:add',

  // Admin — hotels/rooms/categories/packages
  ROOM_MANAGE:          'room:manage',
  CATEGORY_MANAGE:      'category:manage',
  PACKAGE_MANAGE:       'package:manage',

  // Admin — users
  USER_MANAGE:          'user:manage',
  USER_CREATE_ADMIN:    'user:create_admin', // Restricted: creating admin-level users

  // Reports & Dashboard
  REPORT_VIEW:          'report:view',
  DASHBOARD_VIEW:       'dashboard:view',
} as const;

export type ActionKey = typeof Action[keyof typeof Action];

/**
 * Default role→permission mapping.
 *
 * FUTURE PERMISSION MODULE: Replace the lookup below with a DB query to a
 * `role_permissions` or `user_permissions` table. The `can()` signature stays the same.
 */
const ROLE_PERMISSIONS: Partial<Record<string, ActionKey[]>> = {
  [UserRole.ADMIN]: [
    Action.RESERVATION_CREATE,
    Action.RESERVATION_VIEW,
    Action.RESERVATION_CHECKIN,
    Action.RESERVATION_CHECKOUT,
    Action.PAYMENT_ADD,
    Action.ROOM_MANAGE,
    Action.CATEGORY_MANAGE,
    Action.PACKAGE_MANAGE,
    Action.USER_MANAGE,
    Action.REPORT_VIEW,
  ],
  [UserRole.FRONT_OFFICE]: [
    Action.RESERVATION_CREATE,
    Action.RESERVATION_VIEW,
    Action.RESERVATION_CHECKIN,
    Action.RESERVATION_CHECKOUT,
    Action.PAYMENT_ADD,
  ],
  [UserRole.PURCHASING_MANAGER]: [
    Action.RESERVATION_VIEW,
    Action.REPORT_VIEW,
  ],
};

/**
 * Synchronous permission check.
 *
 * TODAY  — Pure role-based logic using ROLE_PERMISSIONS above.
 * FUTURE — Replace implementation with a DB-backed lookup; the call-sites never need to change.
 *
 * @example
 *   if (!can(req.user!, Action.PAYMENT_ADD)) throw new AppError('Forbidden', 403);
 */
export function can(user: TokenPayload, action: ActionKey): boolean {
  // Super admin bypasses all permission checks at the system level.
  if (user.role === UserRole.SUPER_ADMIN) return true;

  return ROLE_PERMISSIONS[user.role]?.includes(action) ?? false;
}

/**
 * Express middleware factory for route-level permission enforcement.
 *
 * Use this for fine-grained action control on individual routes.
 * Use `requireRole()` from auth.middleware.ts only for coarse group-level guards.
 *
 * @example
 *   router.post('/:id/payment', authenticateToken, requirePermission(Action.PAYMENT_ADD), addPayment);
 *
 * FUTURE PERMISSION MODULE: Only `can()` above needs to change; this middleware is stable.
 */
export function requirePermission(action: ActionKey) {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    if (!can(req.user as TokenPayload, action)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: missing permission '${action}'`,
      });
      return;
    }
    next();
  };
}
