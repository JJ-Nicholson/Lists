export const LIST_ROLES = {
    OWNER: "owner",
    EDITOR: "editor",
} as const;

export type ListRole = (typeof LIST_ROLES)[keyof typeof LIST_ROLES];

export const LIST_PERMISSIONS = {
    VIEW_LIST: "list:view",
    UPDATE_LIST: "list:update",
    DELETE_LIST: "list:delete",
    VIEW_LIST_ACCESS: "listAccess:view",
    MANAGE_LIST_ACCESS: "listAccess:manage",
    CREATE_ITEM: "item:create",
    UPDATE_ITEM: "item:update",
    DELETE_ITEM: "item:delete",
} as const;

export type ListPermission =
    (typeof LIST_PERMISSIONS)[keyof typeof LIST_PERMISSIONS];

const OWNER_PERMISSIONS = [
    LIST_PERMISSIONS.VIEW_LIST,
    LIST_PERMISSIONS.UPDATE_LIST,
    LIST_PERMISSIONS.DELETE_LIST,
    LIST_PERMISSIONS.VIEW_LIST_ACCESS,
    LIST_PERMISSIONS.MANAGE_LIST_ACCESS,
    LIST_PERMISSIONS.CREATE_ITEM,
    LIST_PERMISSIONS.UPDATE_ITEM,
    LIST_PERMISSIONS.DELETE_ITEM,
] as const satisfies readonly ListPermission[];

const EDITOR_PERMISSIONS = [
    LIST_PERMISSIONS.VIEW_LIST,
    LIST_PERMISSIONS.UPDATE_LIST,
    LIST_PERMISSIONS.VIEW_LIST_ACCESS,
    LIST_PERMISSIONS.CREATE_ITEM,
    LIST_PERMISSIONS.UPDATE_ITEM,
    LIST_PERMISSIONS.DELETE_ITEM,
] as const satisfies readonly ListPermission[];

export const LIST_ROLE_PERMISSIONS = {
    [LIST_ROLES.OWNER]: OWNER_PERMISSIONS,
    [LIST_ROLES.EDITOR]: EDITOR_PERMISSIONS,
} as const satisfies Record<ListRole, readonly ListPermission[]>;

export function isListRole(role: unknown): role is ListRole {
    return role === LIST_ROLES.OWNER || role === LIST_ROLES.EDITOR;
}

export function normaliseListRole(role: unknown): ListRole | "" {
    if (typeof role !== "string") {
        return "";
    }

    const normalisedRole = role.trim().toLowerCase();

    return isListRole(normalisedRole) ? normalisedRole : "";
}

export function getListPermissions(role: unknown): readonly ListPermission[] {
    const normalisedRole = normaliseListRole(role);

    return normalisedRole ? LIST_ROLE_PERMISSIONS[normalisedRole] : [];
}

export function hasListPermission(
    role: unknown,
    permission: ListPermission,
): boolean {
    return getListPermissions(role).includes(permission);
}

export function hasAnyListPermission(
    role: unknown,
    permissions: readonly ListPermission[],
): boolean {
    return permissions.some((permission) => hasListPermission(role, permission));
}

export function hasEveryListPermission(
    role: unknown,
    permissions: readonly ListPermission[],
): boolean {
    return permissions.every((permission) => hasListPermission(role, permission));
}

export function isListOwner(role: unknown): boolean {
    return normaliseListRole(role) === LIST_ROLES.OWNER;
}

export function isListEditor(role: unknown): boolean {
    return normaliseListRole(role) === LIST_ROLES.EDITOR;
}

export function canUpdateList(role: unknown): boolean {
    return hasListPermission(role, LIST_PERMISSIONS.UPDATE_LIST);
}

export function canDeleteList(role: unknown): boolean {
    return hasListPermission(role, LIST_PERMISSIONS.DELETE_LIST);
}

export function canViewListAccess(role: unknown): boolean {
    return hasListPermission(role, LIST_PERMISSIONS.VIEW_LIST_ACCESS);
}

export function canManageListAccess(role: unknown): boolean {
    return hasListPermission(role, LIST_PERMISSIONS.MANAGE_LIST_ACCESS);
}

export function canCreateItem(role: unknown): boolean {
    return hasListPermission(role, LIST_PERMISSIONS.CREATE_ITEM);
}

export function canUpdateItem(role: unknown): boolean {
    return hasListPermission(role, LIST_PERMISSIONS.UPDATE_ITEM);
}

export function canDeleteItem(role: unknown): boolean {
    return hasListPermission(role, LIST_PERMISSIONS.DELETE_ITEM);
}

export function canEditListItems(role: unknown): boolean {
    return hasEveryListPermission(role, [
        LIST_PERMISSIONS.CREATE_ITEM,
        LIST_PERMISSIONS.UPDATE_ITEM,
        LIST_PERMISSIONS.DELETE_ITEM,
    ]);
}
