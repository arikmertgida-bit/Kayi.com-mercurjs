// GDPR Consent helpers (localStorage tabanlı, SSR etkisi yok)
export type ConsentType = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const CONSENT_KEY = "kayi_cookie_consent";

export const getConsent = (): ConsentType | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setConsent = (consent: ConsentType) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
};

export const revokeConsent = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONSENT_KEY);
};
import 'server-only';
import { cookies as nextCookies } from 'next/headers';

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  const cookies = await nextCookies();
  const token = cookies.get('_medusa_jwt')?.value;

  if (!token) {
    return {};
  }

  return { authorization: `Bearer ${token}` };
};

export const getCacheTag = async (
  tag: string
): Promise<string> => {
  try {
    const cookies = await nextCookies();
    const cacheId = cookies.get('_medusa_cache_id')?.value;

    if (!cacheId) {
      return '';
    }

    return `${tag}-${cacheId}`;
  } catch (error) {
    return '';
  }
};

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== 'undefined') {
    return {};
  }

  const cacheTag = await getCacheTag(tag);

  if (!cacheTag) {
    return {};
  }

  return { tags: [`${cacheTag}`] };
};

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies();
  cookies.set('_medusa_jwt', token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
};

export const removeAuthToken = async () => {
  const cookies = await nextCookies();
  cookies.set('_medusa_jwt', '', {
    maxAge: -1,
  });
};

export const getCartId = async () => {
  const cookies = await nextCookies();
  return cookies.get('_medusa_cart_id')?.value;
};

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies();
  cookies.set('_medusa_cart_id', cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
};

export const removeCartId = async () => {
  const cookies = await nextCookies();
  cookies.set('_medusa_cart_id', '', {
    maxAge: -1,
  });
};

/**
 * Returns the raw JWT string for passing to client components that need
 * to authenticate with external services like kayi-messenger.
 */
export const getAuthToken = async (): Promise<string | null> => {
  const cookies = await nextCookies();
  return cookies.get('_medusa_jwt')?.value ?? null;
};
