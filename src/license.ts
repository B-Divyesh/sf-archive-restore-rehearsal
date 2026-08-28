import type { LicenseState } from './types';

const SLUG = 'archive-restore-rehearsal';
const LICENSE_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const DAY = 86_400_000;
const BILLING_BASE = (import.meta.env.VITE_BILLING_BASE || 'https://api.sociobot.in').replace(/\/$/, '');

interface CachedVerdict {
  valid: boolean;
  checkedAt: number;
}

export const checkoutUrl = `${BILLING_BASE}/api/v1/products/${SLUG}/checkout`;

export function captureLicenseFromUrl(): void {
  const url = new URL(window.location.href);
  const license = url.searchParams.get('license');
  if (!license) return;
  localStorage.setItem(LICENSE_KEY, license);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function saveLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function removeLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(VERDICT_KEY);
}

function cachedVerdict(): CachedVerdict | undefined {
  try {
    return JSON.parse(localStorage.getItem(VERDICT_KEY) || '') as CachedVerdict;
  } catch {
    return undefined;
  }
}

export function initialLicenseState(): LicenseState {
  const token = localStorage.getItem(LICENSE_KEY);
  const cached = cachedVerdict();
  return {
    unlocked: Boolean(token && cached?.valid),
    checking: Boolean(token && (!cached || Date.now() - cached.checkedAt >= DAY))
  };
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return { unlocked: false, checking: false };
  const cached = cachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) {
    return { unlocked: cached.valid, checking: false };
  }
  try {
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error(`Verification returned ${response.status}`);
    const result = await response.json() as { valid: boolean };
    const verdict = { valid: result.valid, checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return {
      unlocked: result.valid,
      checking: false,
      notice: result.valid ? 'Archive keeper unlock is active.' : 'This license is no longer active.'
    };
  } catch {
    return {
      unlocked: Boolean(cached?.valid),
      checking: false,
      notice: 'License check will retry when you are online.'
    };
  }
}
