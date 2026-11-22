import fs from 'fs';
import path from 'path';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Book, BookCategory, BookShelfTheme } from '../types.ts';
import { computeDiscountPercent } from '../lib/courseValidation.ts';
import { isSupabaseDatabaseReady } from '../lib/supabase/config.ts';
import { getSupabaseAdminClient } from '../lib/supabase/admin.ts';
import {
  CACHE_TAG_PUBLIC_BOOKSTORE,
  invalidatePublicBookStoreCache,
} from '../lib/cacheInvalidation.ts';
import { parseFeatures, toBengaliNumber } from '../utils/format.ts';
import {
  RepositoryError,
  normalizeSlug,
  parseSafePrice,
} from './repositoryShared.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BOOKSTORE_DATA_FILE = path.join(DATA_DIR, 'bookstore.json');

const VALID_SHELF_THEMES: BookShelfTheme[] = ['blue', 'rose', 'amber', 'emerald', 'slate'];

export const DEFAULT_BOOK_CATEGORIES: BookCategory[] = [
  {
    id: 1,
    name: 'এইচএসসি',
    slug: 'hsc',
    sectionTitle: "এইচএসসি'র সকল বই",
    subtitle: 'HSC বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা বিভাগের মাস্টারবুক ও গাইড',
    shelfTheme: 'blue',
    displayOrder: 1,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'এসএসসি',
    slug: 'ssc',
    sectionTitle: "এসএসসি'র সকল বই",
    subtitle: 'নবম-দশম শ্রেণি ও SSC বোর্ড পরীক্ষার পূর্ণাঙ্গ মাস্টারবুক',
    shelfTheme: 'rose',
    displayOrder: 2,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'অষ্টম শ্রেণি',
    slug: 'class-8',
    sectionTitle: 'অষ্টম শ্রেণির সকল বই',
    subtitle: 'অষ্টম শ্রেণির বিষয়ভিত্তিক মাস্টারবুক ও প্র্যাকটিস গাইড',
    shelfTheme: 'amber',
    displayOrder: 3,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: '৭ম শ্রেণি',
    slug: 'class-7',
    sectionTitle: '৭ম শ্রেণির সকল বই',
    subtitle: '৭ম শ্রেণির সকল বিষয়ের সহজপাঠ্য মাস্টারবুক',
    shelfTheme: 'emerald',
    displayOrder: 4,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: '৬ষ্ঠ শ্রেণি',
    slug: 'class-6',
    sectionTitle: '৬ষ্ঠ শ্রেণির সকল বই',
    subtitle: '৬ষ্ঠ শ্রেণির ভিত্তি মজবুত করার প্রয়োজনীয় বইসমূহ',
    shelfTheme: 'slate',
    displayOrder: 5,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

interface LocalBookStore {
  bookCategories: BookCategory[];
  books: Book[];
}

interface PgErrorLike {
  code?: string;
  message?: string;
}

function mapPgError(error: unknown, fallbackMessage: string): RepositoryError {
  const err = (error || {}) as PgErrorLike;
  const code = err.code || '';

  if (code === '23505') {
    return new RepositoryError(
      'এই স্লাগ বা ইউনিক মানটি ইতিমধ্যে ডাটাবেসে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি মান দিন।',
      409
    );
  }
  if (code === '23503') {
    return new RepositoryError(
      'সংশ্লিষ্ট রেকর্ডের সাথে সম্পর্ক যুক্ত থাকায় এই অপারেশনটি সম্পন্ন করা যায়নি।',
      409
    );
  }
  if (code === '23514' || code === '22P02') {
    return new RepositoryError(
      'প্রদত্ত তথ্যের ফরম্যাট বা URL বৈধ নয়। অনুগ্রহ করে সঠিক তথ্য ও নিরাপদ https:// লিংক দিন।',
      400
    );
  }
  if (code === '42P01' || code === 'PGRST205') {
    return new RepositoryError(
      'Supabase-এ Book Store টেবিল (book_categories, books) পাওয়া যায়নি। অনুগ্রহ করে 0004_bookstore_schema_and_rls.sql মাইগ্রেশন রান করুন।',
      503
    );
  }

  console.error('[bookRepository] Database error:', error);
  return new RepositoryError(fallbackMessage, 500);
}

export function normalizeBookStatus(
  status: unknown,
  fallback: 'active' | 'inactive' = 'active'
): 'active' | 'inactive' {
  if (status === 'active' || status === 'inactive') {
    return status;
  }
  return fallback;
}

function normalizeShelfTheme(raw: unknown, fallback: BookShelfTheme = 'blue'): BookShelfTheme {
  if (typeof raw === 'string' && VALID_SHELF_THEMES.includes(raw as BookShelfTheme)) {
    return raw as BookShelfTheme;
  }
  return fallback;
}

function serializeFeaturesForJsonb(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  if (typeof raw === 'string') {
    return parseFeatures(raw).slice(0, 40);
  }
  return [];
}

function mapBookCategoryRow(row: Record<string, unknown>): BookCategory {
  return {
    id: Number(row.id),
    name: String(row.category_name ?? row.name ?? ''),
    slug: String(row.slug || ''),
    sectionTitle:
      row.section_title === null || row.section_title === undefined
        ? null
        : String(row.section_title),
    subtitle:
      row.subtitle === null || row.subtitle === undefined ? null : String(row.subtitle),
    shelfTheme: normalizeShelfTheme(row.shelf_theme, 'blue'),
    displayOrder: Number(row.display_order ?? 1),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapBookRow(row: Record<string, unknown>): Book {
  const rawFeatures = row.features;
  const featuresStr = Array.isArray(rawFeatures)
    ? JSON.stringify(rawFeatures.map((item) => String(item ?? '').trim()).filter(Boolean))
    : typeof rawFeatures === 'string'
    ? rawFeatures
    : '[]';

  const rawCover = row.cover_image !== undefined ? row.cover_image : row.cover_image_url;
  const rawAffiliate = row.affiliate_url !== undefined ? row.affiliate_url : row.order_url;

  return {
    id: Number(row.id),
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    categoryId:
      row.category_id === null || row.category_id === undefined
        ? null
        : Number(row.category_id),
    categorySlug: String(row.category_slug || ''),
    bookType: String(row.book_type || 'প্রিন্টেড বুক'),
    author: row.author === null || row.author === undefined ? '' : String(row.author).trim(),
    publisher: String(row.publisher || '১০ মিনিট স্কুল পাবলিকেশন'),
    edition: String(row.edition || ''),
    pages: String(row.pages || ''),
    coverImageUrl: rawCover === null || rawCover === undefined ? null : String(rawCover),
    originalPrice: Number(row.original_price ?? 0),
    price: Number(row.price ?? 0),
    discountPercent: Number(row.discount_percent ?? 0),
    affiliateUrl: String(rawAffiliate || ''),
    features: featuresStr,
    isFeatured: Boolean(row.is_featured),
    clickCount: Number(row.click_count ?? 0),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

// ============================================================================
// LOCAL JSON FALLBACK (Stored strictly in data/bookstore.json — never touches data/database.json)
// ============================================================================

let cachedBookStore: LocalBookStore | null = null;
let bookWriteQueue: Promise<void> = Promise.resolve();

function buildDefaultLocalBookStore(): LocalBookStore {
  return {
    bookCategories: DEFAULT_BOOK_CATEGORIES.map((c) => ({ ...c })),
    books: [], // ZERO hardcoded/demo books
  };
}

function normalizeLocalBookStore(raw: Partial<LocalBookStore> | null | undefined): LocalBookStore {
  const defaults = buildDefaultLocalBookStore();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const normalizedBooks: Book[] = Array.isArray(raw.books)
    ? raw.books.map((b) => {
        const legacy = b as Book & {
          orderUrl?: string;
          description?: unknown;
          fullDescription?: unknown;
        };
        const rest = { ...legacy };
        delete rest.description;
        delete rest.fullDescription;
        delete rest.orderUrl;
        return {
          ...rest,
          affiliateUrl:
            typeof b.affiliateUrl === 'string'
              ? b.affiliateUrl
              : typeof legacy.orderUrl === 'string'
              ? legacy.orderUrl
              : '',
          clickCount: typeof b.clickCount === 'number' ? b.clickCount : 0,
        };
      })
    : [];

  return {
    bookCategories:
      Array.isArray(raw.bookCategories) && raw.bookCategories.length > 0
        ? raw.bookCategories
        : defaults.bookCategories,
    books: normalizedBooks,
  };
}

function loadLocalBookStore(forceFresh = false): LocalBookStore {
  if (cachedBookStore && !forceFresh) {
    return cachedBookStore;
  }

  try {
    if (fs.existsSync(BOOKSTORE_DATA_FILE)) {
      const content = fs.readFileSync(BOOKSTORE_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content) as Partial<LocalBookStore>;
      cachedBookStore = normalizeLocalBookStore(parsed);
      return cachedBookStore;
    }
  } catch (err) {
    console.error('[bookRepository] Failed to read local bookstore.json:', err);
  }

  const initial = buildDefaultLocalBookStore();
  cachedBookStore = initial;
  return initial;
}

async function persistLocalBookStore(store: LocalBookStore): Promise<void> {
  if (process.env.VERCEL === '1') {
    throw new RepositoryError(
      'Vercel Production-এ স্থায়ী ডাটা সংরক্ষণের জন্য Supabase PostgreSQL কনফিগার করা আবশ্যক।',
      503
    );
  }

  cachedBookStore = store;
  const serialized = JSON.stringify(store, null, 2);

  const runPersist = async () => {
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${BOOKSTORE_DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, serialized, 'utf-8');
    await fs.promises.rename(tmpFile, BOOKSTORE_DATA_FILE);
  };

  const nextWrite = bookWriteQueue.then(runPersist, runPersist);
  bookWriteQueue = nextWrite.catch((err) => {
    console.error('[bookRepository] Failed to persist bookstore.json:', err);
  });
  await nextWrite;
}

// ============================================================================
// PUBLIC READ OPERATIONS
// ============================================================================

async function sbFetchPublicBookStoreData(): Promise<{
  bookCategories: BookCategory[];
  books: Book[];
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const [catsRes, booksRes] = await Promise.all([
      supabase
        .from('book_categories')
        .select('*')
        .eq('status', 'active')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('books')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
    ]);

    if (catsRes.error) {
      if (catsRes.error.code === '42P01' || catsRes.error.code === 'PGRST205') {
        return { bookCategories: DEFAULT_BOOK_CATEGORIES.map((c) => ({ ...c })), books: [] };
      }
      throw mapPgError(catsRes.error, 'বুক ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে।');
    }
    if (booksRes.error) {
      if (booksRes.error.code === '42P01' || booksRes.error.code === 'PGRST205') {
        return { bookCategories: DEFAULT_BOOK_CATEGORIES.map((c) => ({ ...c })), books: [] };
      }
      throw mapPgError(booksRes.error, 'বইয়ের তালিকা লোড করতে ব্যর্থ হয়েছে।');
    }

    return {
      bookCategories: (catsRes.data || []).map((r) =>
        mapBookCategoryRow(r as Record<string, unknown>)
      ),
      books: (booksRes.data || []).map((r) => mapBookRow(r as Record<string, unknown>)),
    };
  } catch (err) {
    if (err instanceof RepositoryError) throw err;
    throw mapPgError(err, 'বুক স্টোর ডেটা লোড করতে ব্যর্থ হয়েছে।');
  }
}

const getCachedSupabasePublicBookStoreData = unstable_cache(
  async () => sbFetchPublicBookStoreData(),
  ['sb-public-bookstore-v1'],
  {
    tags: [CACHE_TAG_PUBLIC_BOOKSTORE],
    revalidate: 60,
  }
);

export const getPublicBookStoreData = cache(
  async (): Promise<{
    bookCategories: BookCategory[];
    books: Book[];
  }> => {
    if (isSupabaseDatabaseReady()) {
      return getCachedSupabasePublicBookStoreData();
    }

    const store = loadLocalBookStore();
    const activeCategories = [...store.bookCategories]
      .filter((c) => c.status === 'active')
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const activeCategorySlugs = new Set(activeCategories.map((c) => c.slug));
    const activeBooks = store.books.filter(
      (b) => b.status === 'active' && (activeCategorySlugs.size === 0 || activeCategorySlugs.has(b.categorySlug))
    );

    return {
      bookCategories: activeCategories,
      books: activeBooks,
    };
  }
);

export async function getPublicBookByIdOrSlug(idOrSlug: string): Promise<Book | null> {
  const clean = idOrSlug.trim();
  if (!clean) return null;
  const numericId = /^\d+$/.test(clean) ? Number(clean) : null;

  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    const query = supabase.from('books').select('*').eq('status', 'active');
    const { data, error } = numericId
      ? await query.eq('id', numericId).maybeSingle()
      : await query.eq('slug', clean).maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return null;
      throw mapPgError(error, 'বইয়ের তথ্য লোড করতে ব্যর্থ হয়েছে।');
    }
    return data ? mapBookRow(data as Record<string, unknown>) : null;
  }

  const store = loadLocalBookStore();
  const found = store.books.find(
    (b) =>
      b.status === 'active' &&
      (numericId !== null ? b.id === numericId : b.slug.toLowerCase() === clean.toLowerCase())
  );
  return found || null;
}

export async function getBooksByCategory(
  categorySlugOrId: string | number
): Promise<Book[]> {
  const { books } = await getPublicBookStoreData();
  const rawInput = String(categorySlugOrId || '').trim();
  let raw = rawInput;
  try {
    raw = decodeURIComponent(rawInput).normalize('NFC').trim();
  } catch {
    raw = rawInput.normalize('NFC').trim();
  }
  if (!raw || raw === 'all') return books;
  const numericId = /^\d+$/.test(raw) ? Number(raw) : null;
  return books.filter((b) =>
    numericId !== null
      ? b.categoryId === numericId
      : b.categorySlug.normalize('NFC').toLowerCase() === raw.toLowerCase()
  );
}

export async function recordBookClick(slug: string): Promise<number> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return 0;

  if (isSupabaseDatabaseReady()) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.rpc('increment_book_click', {
        p_slug: cleanSlug,
      });
      if (error) {
        console.warn('[bookRepository] increment_book_click warning:', error);
        return 0;
      }
      return Number(data ?? 0);
    } catch (err) {
      console.warn('[bookRepository] recordBookClick error:', err);
      return 0;
    }
  }

  const store = loadLocalBookStore(true);
  const idx = store.books.findIndex(
    (b) => b.status === 'active' && b.slug.toLowerCase() === cleanSlug.toLowerCase()
  );
  if (idx === -1) return 0;

  const nextCount = (store.books[idx].clickCount || 0) + 1;
  store.books[idx] = {
    ...store.books[idx],
    clickCount: nextCount,
  };
  await persistLocalBookStore(store).catch(() => {});
  return nextCount;
}

// ============================================================================
// ADMIN BOOK MANAGEMENT OPERATIONS
// ============================================================================

export async function getAdminBookStoreData(): Promise<{
  stats: {
    totalBooks: number;
    activeBooks: number;
    inactiveBooks: number;
    featuredBooks: number;
    totalCategories: number;
  };
  bookCategories: BookCategory[];
  books: Book[];
}> {
  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    const [catsRes, booksRes] = await Promise.all([
      supabase
        .from('book_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
    ]);

    if (catsRes.error) {
      throw mapPgError(catsRes.error, 'বুক ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে।');
    }
    if (booksRes.error) {
      throw mapPgError(booksRes.error, 'বইয়ের তালিকা লোড করতে ব্যর্থ হয়েছে।');
    }

    const bookCategories = (catsRes.data || []).map((r) =>
      mapBookCategoryRow(r as Record<string, unknown>)
    );
    const books = (booksRes.data || []).map((r) => mapBookRow(r as Record<string, unknown>));

    return {
      stats: {
        totalBooks: books.length,
        activeBooks: books.filter((b) => b.status === 'active').length,
        inactiveBooks: books.filter((b) => b.status === 'inactive').length,
        featuredBooks: books.filter((b) => b.isFeatured).length,
        totalCategories: bookCategories.length,
      },
      bookCategories,
      books,
    };
  }

  const store = loadLocalBookStore(true);
  const bookCategories = [...store.bookCategories].sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );
  const books = store.books;

  return {
    stats: {
      totalBooks: books.length,
      activeBooks: books.filter((b) => b.status === 'active').length,
      inactiveBooks: books.filter((b) => b.status === 'inactive').length,
      featuredBooks: books.filter((b) => b.isFeatured).length,
      totalCategories: bookCategories.length,
    },
    bookCategories,
    books,
  };
}

export async function getBookById(id: number): Promise<Book | null> {
  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw mapPgError(error, 'বইয়ের তথ্য লোড করতে ব্যর্থ হয়েছে।');
    }
    return data ? mapBookRow(data as Record<string, unknown>) : null;
  }

  const store = loadLocalBookStore(true);
  return store.books.find((b) => b.id === id) || null;
}

export async function countBooksUsingImageUrl(
  coverImageUrl: string,
  excludeBookId?: number
): Promise<number> {
  if (!coverImageUrl) return 0;

  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('cover_image', coverImageUrl);

    if (excludeBookId !== undefined) {
      query = query.neq('id', excludeBookId);
    }

    const { count, error } = await query;
    if (error) {
      console.warn('[bookRepository] Failed to count book cover references:', error);
      return 1; // Fail safe so image is not deleted erroneously
    }
    return count ?? 0;
  }

  const store = loadLocalBookStore(true);
  return store.books.filter(
    (b) => b.coverImageUrl === coverImageUrl && (excludeBookId === undefined || b.id !== excludeBookId)
  ).length;
}

export async function createNewBook(input: Record<string, unknown>): Promise<Book> {
  const title = String(input.title || '').trim();
  const slug = normalizeSlug(String(input.slug || title));
  if (!title || !slug) {
    throw new RepositoryError('বইয়ের নাম এবং বৈধ স্লাগ পূরণ করা আবশ্যক।', 400);
  }

  const parsedOriginal = parseSafePrice(input.originalPrice ?? 0);
  const parsedPrice = parseSafePrice(input.price ?? 0);
  const originalPrice = parsedOriginal.valid ? parsedOriginal.value : 0;
  const price = parsedPrice.valid ? parsedPrice.value : 0;
  const discountPercent = computeDiscountPercent(originalPrice, price);

  const bookType = String(input.bookType || 'প্রিন্টেড বুক').trim().slice(0, 60) || 'প্রিন্টেড বুক';
  const author = typeof input.author === 'string' ? input.author.trim().slice(0, 140) : '';
  const publisher =
    String(input.publisher || '১০ মিনিট স্কুল পাবলিকেশন').trim().slice(0, 140) ||
    '১০ মিনিট স্কুল পাবলিকেশন';
  const edition = typeof input.edition === 'string' ? input.edition.trim().slice(0, 80) : '';
  const pages = typeof input.pages === 'string' ? input.pages.trim().slice(0, 40) : '';
  const rawCoverInput =
    input.coverImageUrl !== undefined ? input.coverImageUrl : input.cover_image;
  const coverImageUrl =
    typeof rawCoverInput === 'string' && rawCoverInput.trim()
      ? rawCoverInput.trim()
      : null;
  const rawAffiliateInput =
    input.affiliateUrl !== undefined
      ? input.affiliateUrl
      : input.affiliate_url !== undefined
      ? input.affiliate_url
      : input.orderUrl;
  const affiliateUrl = typeof rawAffiliateInput === 'string' ? rawAffiliateInput.trim() : '';
  const featuresArray = serializeFeaturesForJsonb(input.features);
  const isFeatured = Boolean(input.isFeatured ?? false);
  const status = normalizeBookStatus(input.status, 'active');

  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    const categorySlugInput = String(input.categorySlug || '').trim();
    const categoryIdInput = input.categoryId ? Number(input.categoryId) : null;

    let catQuery = supabase.from('book_categories').select('id, slug');
    if (categoryIdInput && Number.isInteger(categoryIdInput) && categoryIdInput > 0) {
      catQuery = catQuery.eq('id', categoryIdInput);
    } else if (categorySlugInput) {
      catQuery = catQuery.eq('slug', categorySlugInput);
    } else {
      throw new RepositoryError('অনুগ্রহ করে একটি বৈধ বুক ক্যাটাগরি নির্বাচন করুন।', 400);
    }

    const { data: catRow, error: catErr } = await catQuery.maybeSingle();
    if (catErr) {
      throw mapPgError(catErr, 'বুক ক্যাটাগরি যাচাই করতে ব্যর্থ হয়েছে।');
    }
    if (!catRow) {
      throw new RepositoryError('অনুগ্রহ করে একটি বৈধ বুক ক্যাটাগরি নির্বাচন করুন।', 400);
    }

    const { data, error } = await supabase
      .from('books')
      .insert({
        title: title.slice(0, 220),
        slug,
        category_id: Number(catRow.id),
        category_slug: String(catRow.slug),
        book_type: bookType,
        author,
        publisher,
        edition,
        pages,
        cover_image: coverImageUrl,
        original_price: originalPrice,
        price,
        discount_percent: discountPercent,
        affiliate_url: affiliateUrl,
        features: featuresArray,
        is_featured: isFeatured,
        status,
      })
      .select('*')
      .single();

    if (error) {
      throw mapPgError(error, 'নতুন বই সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    }

    invalidatePublicBookStoreCache();
    return mapBookRow(data as Record<string, unknown>);
  }

  const store = loadLocalBookStore(true);
  const slugExists = store.books.some((b) => b.slug.toLowerCase() === slug.toLowerCase());
  if (slugExists) {
    throw new RepositoryError(
      `"${slug}" স্লাগটি ইতিমধ্যে অন্য একটি বইয়ে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি স্লাগ দিন।`,
      409
    );
  }

  const categorySlugInput = String(input.categorySlug || '').trim();
  const categoryIdInput = input.categoryId ? Number(input.categoryId) : null;
  const matchedCat = store.bookCategories.find(
    (c) =>
      (categoryIdInput !== null && c.id === categoryIdInput) ||
      (categorySlugInput !== '' && c.slug === categorySlugInput)
  );
  if (!matchedCat) {
    throw new RepositoryError('অনুগ্রহ করে একটি বৈধ বুক ক্যাটাগরি নির্বাচন করুন।', 400);
  }

  const newId = store.books.length > 0 ? Math.max(...store.books.map((b) => b.id)) + 1 : 1;
  const nowIso = new Date().toISOString();

  const newBook: Book = {
    id: newId,
    title: title.slice(0, 220),
    slug,
    categoryId: matchedCat.id,
    categorySlug: matchedCat.slug,
    bookType,
    author,
    publisher,
    edition,
    pages,
    coverImageUrl,
    originalPrice,
    price,
    discountPercent,
    affiliateUrl,
    features: JSON.stringify(featuresArray),
    isFeatured,
    clickCount: 0,
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.books.unshift(newBook);
  await persistLocalBookStore(store);
  invalidatePublicBookStoreCache();

  return newBook;
}

export async function updateExistingBook(
  id: number,
  input: Record<string, unknown>
): Promise<Book | null> {
  if (isSupabaseDatabaseReady()) {
    const existing = await getBookById(id);
    if (!existing) return null;

    const supabase = getSupabaseAdminClient();
    const updatePayload: Record<string, unknown> = {};

    if (input.title !== undefined) {
      const nextTitle = String(input.title || '').trim();
      if (!nextTitle) {
        throw new RepositoryError('বইয়ের নাম খালি রাখা যাবে না।', 400);
      }
      updatePayload.title = nextTitle.slice(0, 220);
    }

    if (input.slug !== undefined) {
      const nextSlug = normalizeSlug(String(input.slug || ''));
      if (!nextSlug) {
        throw new RepositoryError('বইয়ের বৈধ স্লাগ প্রদান করুন।', 400);
      }
      updatePayload.slug = nextSlug;
    }

    if (input.categoryId !== undefined || input.categorySlug !== undefined) {
      const catId = input.categoryId ? Number(input.categoryId) : null;
      const catSlug = typeof input.categorySlug === 'string' ? input.categorySlug.trim() : '';
      let catQuery = supabase.from('book_categories').select('id, slug');
      if (catId && Number.isInteger(catId) && catId > 0) {
        catQuery = catQuery.eq('id', catId);
      } else if (catSlug) {
        catQuery = catQuery.eq('slug', catSlug);
      } else {
        throw new RepositoryError('অনুগ্রহ করে একটি বৈধ বুক ক্যাটাগরি নির্বাচন করুন।', 400);
      }
      const { data: catRow, error: catErr } = await catQuery.maybeSingle();
      if (catErr) throw mapPgError(catErr, 'বুক ক্যাটাগরি যাচাই করতে ব্যর্থ হয়েছে।');
      if (!catRow) {
        throw new RepositoryError('অনুগ্রহ করে একটি বৈধ বুক ক্যাটাগরি নির্বাচন করুন।', 400);
      }
      updatePayload.category_id = Number(catRow.id);
      updatePayload.category_slug = String(catRow.slug);
    }

    const nextOriginalPrice =
      input.originalPrice !== undefined
        ? parseSafePrice(input.originalPrice).value
        : existing.originalPrice;
    const nextPrice =
      input.price !== undefined ? parseSafePrice(input.price).value : existing.price;

    if (input.originalPrice !== undefined || input.price !== undefined) {
      updatePayload.original_price = nextOriginalPrice;
      updatePayload.price = nextPrice;
      updatePayload.discount_percent = computeDiscountPercent(nextOriginalPrice, nextPrice);
    }

    if (input.bookType !== undefined) {
      updatePayload.book_type =
        String(input.bookType || 'প্রিন্টেড বুক').trim().slice(0, 60) || 'প্রিন্টেড বুক';
    }
    if (input.author !== undefined) {
      updatePayload.author =
        typeof input.author === 'string' ? input.author.trim().slice(0, 140) : '';
    }
    if (input.publisher !== undefined) {
      updatePayload.publisher =
        String(input.publisher || '১০ মিনিট স্কুল পাবলিকেশন').trim().slice(0, 140) ||
        '১০ মিনিট স্কুল পাবলিকেশন';
    }
    if (input.edition !== undefined) {
      updatePayload.edition = String(input.edition || '').trim().slice(0, 80);
    }
    if (input.pages !== undefined) {
      updatePayload.pages = String(input.pages || '').trim().slice(0, 40);
    }
    if (input.coverImageUrl !== undefined || input.cover_image !== undefined) {
      const rawCover =
        input.coverImageUrl !== undefined ? input.coverImageUrl : input.cover_image;
      updatePayload.cover_image =
        typeof rawCover === 'string' && rawCover.trim() ? rawCover.trim() : null;
    }
    if (
      input.affiliateUrl !== undefined ||
      input.affiliate_url !== undefined ||
      input.orderUrl !== undefined
    ) {
      const rawAff =
        input.affiliateUrl !== undefined
          ? input.affiliateUrl
          : input.affiliate_url !== undefined
          ? input.affiliate_url
          : input.orderUrl;
      updatePayload.affiliate_url = String(rawAff || '').trim();
    }
    if (input.features !== undefined) {
      updatePayload.features = serializeFeaturesForJsonb(input.features);
    }
    if (input.isFeatured !== undefined) {
      updatePayload.is_featured = Boolean(input.isFeatured);
    }
    if (input.status !== undefined) {
      updatePayload.status = normalizeBookStatus(input.status, existing.status);
    }

    const { data, error } = await supabase
      .from('books')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw mapPgError(error, 'বইয়ের তথ্য আপডেট করতে ব্যর্থ হয়েছে।');
    }

    const updated = data ? mapBookRow(data as Record<string, unknown>) : null;
    if (updated) {
      invalidatePublicBookStoreCache();
    }
    return updated;
  }

  const store = loadLocalBookStore(true);
  const idx = store.books.findIndex((b) => b.id === id);
  if (idx === -1) return null;

  const existing = store.books[idx];

  let nextSlug = existing.slug;
  if (input.slug !== undefined) {
    const candidate = normalizeSlug(String(input.slug || ''));
    if (!candidate) {
      throw new RepositoryError('বইয়ের বৈধ স্লাগ প্রদান করুন।', 400);
    }
    const dup = store.books.some(
      (b) => b.id !== id && b.slug.toLowerCase() === candidate.toLowerCase()
    );
    if (dup) {
      throw new RepositoryError(
        `"${candidate}" স্লাগটি ইতিমধ্যে অন্য একটি বইয়ে ব্যবহৃত হচ্ছে।`,
        409
      );
    }
    nextSlug = candidate;
  }

  let nextCategoryId = existing.categoryId;
  let nextCategorySlug = existing.categorySlug;
  if (input.categoryId !== undefined || input.categorySlug !== undefined) {
    const catId = input.categoryId ? Number(input.categoryId) : null;
    const catSlug = typeof input.categorySlug === 'string' ? input.categorySlug.trim() : '';
    const matchedCat = store.bookCategories.find(
      (c) => (catId !== null && c.id === catId) || (catSlug !== '' && c.slug === catSlug)
    );
    if (!matchedCat) {
      throw new RepositoryError('অনুগ্রহ করে একটি বৈধ বুক ক্যাটাগরি নির্বাচন করুন।', 400);
    }
    nextCategoryId = matchedCat.id;
    nextCategorySlug = matchedCat.slug;
  }

  const parsedOriginal =
    input.originalPrice !== undefined
      ? parseSafePrice(input.originalPrice)
      : { valid: true, value: existing.originalPrice };
  const parsedPrice =
    input.price !== undefined
      ? parseSafePrice(input.price)
      : { valid: true, value: existing.price };

  const originalPrice = parsedOriginal.valid ? parsedOriginal.value : existing.originalPrice;
  const price = parsedPrice.valid ? parsedPrice.value : existing.price;
  const discountPercent = computeDiscountPercent(originalPrice, price);

  const updated: Book = {
    ...existing,
    ...(input.title !== undefined ? { title: String(input.title).trim().slice(0, 220) } : {}),
    slug: nextSlug,
    categoryId: nextCategoryId,
    categorySlug: nextCategorySlug,
    ...(input.bookType !== undefined
      ? { bookType: String(input.bookType || 'প্রিন্টেড বুক').trim().slice(0, 60) || 'প্রিন্টেড বুক' }
      : {}),
    ...(input.author !== undefined
      ? { author: typeof input.author === 'string' ? input.author.trim().slice(0, 140) : '' }
      : {}),
    ...(input.publisher !== undefined
      ? {
          publisher:
            String(input.publisher || '১০ মিনিট স্কুল পাবলিকেশন').trim().slice(0, 140) ||
            '১০ মিনিট স্কুল পাবলিকেশন',
        }
      : {}),
    ...(input.edition !== undefined ? { edition: String(input.edition).trim().slice(0, 80) } : {}),
    ...(input.pages !== undefined ? { pages: String(input.pages).trim().slice(0, 40) } : {}),
    ...(input.coverImageUrl !== undefined || input.cover_image !== undefined
      ? {
          coverImageUrl: (() => {
            const rawCover =
              input.coverImageUrl !== undefined ? input.coverImageUrl : input.cover_image;
            return typeof rawCover === 'string' && rawCover.trim() ? rawCover.trim() : null;
          })(),
        }
      : {}),
    ...(input.affiliateUrl !== undefined ||
    input.affiliate_url !== undefined ||
    input.orderUrl !== undefined
      ? {
          affiliateUrl: String(
            input.affiliateUrl !== undefined
              ? input.affiliateUrl
              : input.affiliate_url !== undefined
              ? input.affiliate_url
              : input.orderUrl || ''
          ).trim(),
        }
      : {}),
    ...(input.features !== undefined
      ? { features: JSON.stringify(serializeFeaturesForJsonb(input.features)) }
      : {}),
    ...(input.isFeatured !== undefined ? { isFeatured: Boolean(input.isFeatured) } : {}),
    status:
      input.status !== undefined
        ? normalizeBookStatus(input.status, existing.status)
        : existing.status,
    originalPrice,
    price,
    discountPercent,
    updatedAt: new Date().toISOString(),
  };

  store.books[idx] = updated;
  await persistLocalBookStore(store);
  invalidatePublicBookStoreCache();

  return updated;
}

export async function deleteBookById(
  id: number
): Promise<{ deleted: boolean; found: boolean; previousCoverUrl: string | null }> {
  if (isSupabaseDatabaseReady()) {
    const existing = await getBookById(id);
    if (!existing) {
      return { deleted: false, found: false, previousCoverUrl: null };
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) {
      throw mapPgError(error, 'বইটি মুছে ফেলতে ব্যর্থ হয়েছে।');
    }

    invalidatePublicBookStoreCache();
    return {
      deleted: true,
      found: true,
      previousCoverUrl: existing.coverImageUrl || null,
    };
  }

  const store = loadLocalBookStore(true);
  const target = store.books.find((b) => b.id === id);
  if (!target) {
    return { deleted: false, found: false, previousCoverUrl: null };
  }

  store.books = store.books.filter((b) => b.id !== id);
  await persistLocalBookStore(store);
  invalidatePublicBookStoreCache();

  return {
    deleted: true,
    found: true,
    previousCoverUrl: target.coverImageUrl || null,
  };
}

// ============================================================================
// BOOK CATEGORY MANAGEMENT OPERATIONS
// ============================================================================

export async function getBookCategories(includeInactive = false): Promise<BookCategory[]> {
  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('book_categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });

    if (!includeInactive) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') {
        return DEFAULT_BOOK_CATEGORIES.map((c) => ({ ...c }));
      }
      throw mapPgError(error, 'বুক ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে।');
    }
    return (data || []).map((r) => mapBookCategoryRow(r as Record<string, unknown>));
  }

  const store = loadLocalBookStore(true);
  return [...store.bookCategories]
    .filter((c) => includeInactive || c.status === 'active')
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export async function createNewBookCategory(
  input: Record<string, unknown>
): Promise<BookCategory> {
  const name = String(input.name ?? input.categoryName ?? input.category_name ?? '').trim();
  const slug = normalizeSlug(String(input.slug || name));
  if (!name || !slug) {
    throw new RepositoryError('বুক ক্যাটাগরির নাম এবং স্লাগ পূরণ করা আবশ্যক।', 400);
  }

  const sectionTitle =
    typeof input.sectionTitle === 'string' && input.sectionTitle.trim()
      ? input.sectionTitle.trim().slice(0, 160)
      : `${name}-এর সকল বই`;
  const subtitle =
    typeof input.subtitle === 'string' && input.subtitle.trim()
      ? input.subtitle.trim().slice(0, 250)
      : null;
  const shelfTheme = normalizeShelfTheme(input.shelfTheme, 'blue');
  const status = input.status === 'inactive' ? 'inactive' : 'active';

  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    const { count } = await supabase
      .from('book_categories')
      .select('id', { count: 'exact', head: true });
    const displayOrder = Number(input.displayOrder) || (count ?? 0) + 1;

    const { data, error } = await supabase
      .from('book_categories')
      .insert({
        category_name: name.slice(0, 120),
        slug,
        section_title: sectionTitle,
        subtitle,
        shelf_theme: shelfTheme,
        display_order: Math.max(0, Math.round(displayOrder)),
        status,
      })
      .select('*')
      .single();

    if (error) {
      throw mapPgError(error, 'নতুন বুক ক্যাটাগরি তৈরি করতে ব্যর্থ হয়েছে।');
    }

    invalidatePublicBookStoreCache();
    return mapBookCategoryRow(data as Record<string, unknown>);
  }

  const store = loadLocalBookStore(true);
  const dup = store.bookCategories.some((c) => c.slug.toLowerCase() === slug.toLowerCase());
  if (dup) {
    throw new RepositoryError(`"${slug}" স্লাগসহ একটি বুক ক্যাটাগরি ইতিমধ্যে রয়েছে।`, 409);
  }

  const newId =
    store.bookCategories.length > 0
      ? Math.max(...store.bookCategories.map((c) => c.id)) + 1
      : 1;
  const nowIso = new Date().toISOString();

  const newCategory: BookCategory = {
    id: newId,
    name: name.slice(0, 120),
    slug,
    sectionTitle,
    subtitle,
    shelfTheme,
    displayOrder: Number(input.displayOrder) || store.bookCategories.length + 1,
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.bookCategories.push(newCategory);
  await persistLocalBookStore(store);
  invalidatePublicBookStoreCache();

  return newCategory;
}

export async function updateExistingBookCategory(
  id: number,
  input: Record<string, unknown>
): Promise<BookCategory | null> {
  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    const { data: existingRow, error: fetchErr } = await supabase
      .from('book_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw mapPgError(fetchErr, 'বুক ক্যাটাগরি খুঁজে পাওয়া যায়নি।');
    if (!existingRow) return null;

    const existing = mapBookCategoryRow(existingRow as Record<string, unknown>);
    const incomingName =
      input.name !== undefined
        ? input.name
        : input.categoryName !== undefined
        ? input.categoryName
        : input.category_name;
    const nextName =
      incomingName !== undefined ? String(incomingName || '').trim() : existing.name;
    const nextSlug =
      input.slug !== undefined ? normalizeSlug(String(input.slug || '')) : existing.slug;
    if (!nextName || !nextSlug) {
      throw new RepositoryError('বুক ক্যাটাগরির নাম এবং স্লাগ খালি রাখা যাবে না।', 400);
    }

    const updatePayload: Record<string, unknown> = {
      category_name: nextName.slice(0, 120),
      slug: nextSlug,
      section_title:
        input.sectionTitle !== undefined
          ? typeof input.sectionTitle === 'string' && input.sectionTitle.trim()
            ? input.sectionTitle.trim().slice(0, 160)
            : null
          : existing.sectionTitle,
      subtitle:
        input.subtitle !== undefined
          ? typeof input.subtitle === 'string' && input.subtitle.trim()
            ? input.subtitle.trim().slice(0, 250)
            : null
          : existing.subtitle,
      shelf_theme:
        input.shelfTheme !== undefined
          ? normalizeShelfTheme(input.shelfTheme, existing.shelfTheme || 'blue')
          : existing.shelfTheme || 'blue',
      display_order:
        input.displayOrder !== undefined
          ? Math.max(0, Math.round(Number(input.displayOrder) || existing.displayOrder))
          : existing.displayOrder,
      status:
        input.status !== undefined
          ? input.status === 'inactive'
            ? 'inactive'
            : 'active'
          : existing.status,
    };

    const { data, error } = await supabase
      .from('book_categories')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw mapPgError(error, 'বুক ক্যাটাগরি আপডেট করতে ব্যর্থ হয়েছে।');
    }

    const updated = data ? mapBookCategoryRow(data as Record<string, unknown>) : null;
    if (updated) {
      invalidatePublicBookStoreCache();
    }
    return updated;
  }

  const store = loadLocalBookStore(true);
  const idx = store.bookCategories.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const existing = store.bookCategories[idx];
  const incomingName =
    input.name !== undefined
      ? input.name
      : input.categoryName !== undefined
      ? input.categoryName
      : input.category_name;
  const nextName =
    incomingName !== undefined ? String(incomingName || '').trim() : existing.name;
  const nextSlug =
    input.slug !== undefined ? normalizeSlug(String(input.slug || '')) : existing.slug;
  if (!nextName || !nextSlug) {
    throw new RepositoryError('বুক ক্যাটাগরির নাম এবং স্লাগ খালি রাখা যাবে না।', 400);
  }

  const dup = store.bookCategories.some(
    (c) => c.id !== id && c.slug.toLowerCase() === nextSlug.toLowerCase()
  );
  if (dup) {
    throw new RepositoryError(`"${nextSlug}" স্লাগটি অন্য বুক ক্যাটাগরিতে ব্যবহৃত হচ্ছে।`, 409);
  }

  const updated: BookCategory = {
    ...existing,
    name: nextName.slice(0, 120),
    slug: nextSlug,
    sectionTitle:
      input.sectionTitle !== undefined
        ? typeof input.sectionTitle === 'string' && input.sectionTitle.trim()
          ? input.sectionTitle.trim().slice(0, 160)
          : null
        : existing.sectionTitle,
    subtitle:
      input.subtitle !== undefined
        ? typeof input.subtitle === 'string' && input.subtitle.trim()
          ? input.subtitle.trim().slice(0, 250)
          : null
        : existing.subtitle,
    shelfTheme:
      input.shelfTheme !== undefined
        ? normalizeShelfTheme(input.shelfTheme, existing.shelfTheme || 'blue')
        : existing.shelfTheme,
    displayOrder:
      input.displayOrder !== undefined
        ? Number(input.displayOrder) || existing.displayOrder
        : existing.displayOrder,
    status:
      input.status !== undefined
        ? input.status === 'inactive'
          ? 'inactive'
          : 'active'
        : existing.status,
    updatedAt: new Date().toISOString(),
  };

  store.bookCategories[idx] = updated;

  if (nextSlug !== existing.slug) {
    store.books = store.books.map((book) =>
      book.categoryId === id || book.categorySlug === existing.slug
        ? { ...book, categoryId: id, categorySlug: nextSlug }
        : book
    );
  }

  await persistLocalBookStore(store);
  invalidatePublicBookStoreCache();

  return updated;
}

export async function deleteBookCategoryById(
  id: number
): Promise<{ deleted: boolean; found: boolean }> {
  if (isSupabaseDatabaseReady()) {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: fetchErr } = await supabase
      .from('book_categories')
      .select('id, slug')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw mapPgError(fetchErr, 'বুক ক্যাটাগরি খুঁজে পাওয়া যায়নি।');
    if (!existing) return { deleted: false, found: false };

    const { count } = await supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if ((count ?? 0) > 0) {
      throw new RepositoryError(
        `এই ক্যাটাগরিতে ${toBengaliNumber(count ?? 0)}টি বই যুক্ত রয়েছে। ক্যাটাগরি মুছে ফেলার আগে বইগুলো অন্য ক্যাটাগরিতে স্থানান্তর করুন।`,
        409
      );
    }

    const { error } = await supabase.from('book_categories').delete().eq('id', id);
    if (error) {
      throw mapPgError(error, 'বুক ক্যাটাগরি মুছে ফেলতে ব্যর্থ হয়েছে।');
    }

    invalidatePublicBookStoreCache();
    return { deleted: true, found: true };
  }

  const store = loadLocalBookStore(true);
  const existing = store.bookCategories.find((c) => c.id === id);
  if (!existing) return { deleted: false, found: false };

  const linkedBooksCount = store.books.filter(
    (b) => b.categoryId === id || b.categorySlug === existing.slug
  ).length;
  if (linkedBooksCount > 0) {
    throw new RepositoryError(
      `এই ক্যাটাগরিতে ${toBengaliNumber(linkedBooksCount)}টি বই যুক্ত রয়েছে। ক্যাটাগরি মুছে ফেলার আগে বইগুলো অন্য ক্যাটাগরিতে স্থানান্তর করুন।`,
      409
    );
  }

  store.bookCategories = store.bookCategories.filter((c) => c.id !== id);
  await persistLocalBookStore(store);
  invalidatePublicBookStoreCache();

  return { deleted: true, found: true };
}
