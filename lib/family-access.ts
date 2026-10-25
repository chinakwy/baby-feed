/** Actor identity stays separate from the server-selected shared data owner. */
export interface FamilyUser { id: string; familyOwnerId?: string | null; familyRole?: string }
export function familyDataOwner(user: FamilyUser): string { return user.familyOwnerId || user.id }
export function canManageFamily(user: FamilyUser): boolean { return (user.familyRole ?? 'OWNER') === 'OWNER' }
