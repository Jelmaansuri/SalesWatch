// User whitelist configuration for shared business data access
// Users in the same whitelist group can access each other's business data

export interface WhitelistConfig {
  // Main business owner - has full access to all data
  primaryUserId: string;
  // Additional authorized users who can access shared business data
  authorizedUserIds: string[];
  // Business information
  businessName: string;
  description?: string;
}

// PROGENY AGROTECH whitelist configuration
export const PROGENY_WHITELIST: WhitelistConfig = {
  primaryUserId: "21540079", // afiqsyahmifaridun@gmail.com (main data owner)
  authorizedUserIds: [
    "21540079", // afiqsyahmifaridun@gmail.com (full access)
    "45944294", // progenyagrotech@gmail.com (full access)
  ],
  businessName: "PROGENY AGROTECH",
  description: "Malaysian fresh young ginger farming and agriculture business - both users have full edit access"
};

/**
 * Check if a user has access to business data
 */
export function hasBusinessAccess(userId: string): boolean {
  return PROGENY_WHITELIST.authorizedUserIds.includes(userId);
}

/**
 * Get all authorized user IDs for shared business access
 */
export function getAuthorizedUserIds(): string[] {
  return PROGENY_WHITELIST.authorizedUserIds;
}

/**
 * Check if two users can access shared data
 */
export function canAccessSharedData(userId1: string, userId2: string): boolean {
  const authorizedUsers = getAuthorizedUserIds();
  return authorizedUsers.includes(userId1) && authorizedUsers.includes(userId2);
}

/**
 * Get the primary business owner user ID
 */
export function getPrimaryUserId(): string {
  return PROGENY_WHITELIST.primaryUserId;
}

/**
 * Check if user has full edit access to shared business data
 * All whitelisted users have full CRUD access
 */
export function hasFullEditAccess(userId: string): boolean {
  return PROGENY_WHITELIST.authorizedUserIds.includes(userId);
}

/**
 * Check if user can edit/modify data created by another user
 * Returns true for whitelisted users accessing shared business data
 */
export function canEditSharedData(currentUserId: string, dataOwnerId: string): boolean {
  const authorizedUsers = getAuthorizedUserIds();
  // Both users must be in the whitelist for shared access
  return authorizedUsers.includes(currentUserId) && authorizedUsers.includes(dataOwnerId);
}