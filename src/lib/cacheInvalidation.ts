import { revalidatePath, revalidateTag } from 'next/cache';

export const CACHE_TAG_PUBLIC_PORTAL = 'public-portal';
export const CACHE_TAG_PUBLIC_BOOKSTORE = 'public-bookstore';

export function invalidatePublicPortalCache(): void {
  try {
    revalidateTag(CACHE_TAG_PUBLIC_PORTAL);
    revalidatePath('/', 'layout');
  } catch {
    // Safe no-op if executed outside Next.js server request context
  }
}

export function invalidatePublicBookStoreCache(): void {
  try {
    revalidateTag(CACHE_TAG_PUBLIC_BOOKSTORE);
    revalidatePath('/books', 'layout');
    revalidatePath('/', 'layout');
  } catch {
    // Safe no-op if executed outside Next.js server request context
  }
}
