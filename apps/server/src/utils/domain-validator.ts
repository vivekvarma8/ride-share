import { config } from '../config/env';

/**
 * Validates whether an email belongs to an allowed domain whitelist.
 * If allowedDomains contains "*" or is empty, ALL valid email domains (gmail, yahoo, outlook, custom, etc.) are allowed.
 */
export function isAllowedDomain(email: string, allowedDomains = config.allowedEmailDomains): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }

  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1] || !parts[1].includes('.')) return false;

  // Open to all domains if wildcard or empty
  if (allowedDomains.length === 0 || allowedDomains.includes('*')) {
    return true;
  }

  const domain = parts[1];

  return allowedDomains.some((allowed) => {
    const cleanAllowed = allowed.toLowerCase().trim();
    return domain === cleanAllowed || domain.endsWith('.' + cleanAllowed);
  });
}

export function extractDomain(email: string): string {
  if (!email || !email.includes('@')) return '';
  return email.trim().toLowerCase().split('@')[1];
}
