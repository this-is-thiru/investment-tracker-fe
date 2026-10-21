/**
 * Roles supported by the WealthLens authentication and authorization system.
 * Directly matches com.thiru.wealthlens.auth.dto.AuthHelper.Role.
 */
export enum UserRole {
  SUPER_USER = 'SUPER_USER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EDITOR = 'EDITOR',
  AUTHOR = 'AUTHOR',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
  GUEST = 'GUEST',
  TEST_USER = 'TEST_USER',
}
