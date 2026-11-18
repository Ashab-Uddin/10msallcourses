# Supabase PostgreSQL Migration Execution & Rollback Guide

> **গুরুত্বপূর্ণ:** এই ফাইলটি `supabase/migrations/` ফোল্ডারের **বাইরে** রাখা হয়েছে যাতে কোনো অটোমেটেড মাইগ্রেশন রানার ভুলবশত Rollback SQL বা Admin Bootstrap SQL এক্সিকিউট না করে।

---

## ১. Migration Execution Order (সঠিক ক্রম)

Supabase Dashboard → **SQL Editor** অথবা Supabase CLI দিয়ে নিচের সঠিক ক্রমে ফাইলগুলো রান করতে হবে:

1. `supabase/migrations/0001_initial_schema.sql` — ৭টি টেবিল, Primary Key, Foreign Key, Strict URL Allowlist CHECK Constraints এবং Indexes তৈরি করে।
2. `supabase/migrations/0002_rls_and_functions.sql` — `SET search_path = ''` ফাংশন, Triggers, `public.is_admin()`, Server-only RPC (`record_active_course_click`, `submit_customer_inquiry`), Least-Privilege `REVOKE`/`GRANT` এবং সকল ৭টি টেবিলের RLS Policies কনফিগার করে।
3. `supabase/migrations/0003_migrate_existing_data.sql` — Phase 2 `data/database.json` থেকে ৪টি Core Category, ৯টি Historical Click Record এবং ১৫টি Website Settings ইডেমপটেন্টভাবে (`ON CONFLICT DO NOTHING`) মাইগ্রেট করে, প্রথম মাইগ্রেশনে ফিল্ড-বাই-ফিল্ড প্যারিটি ভেরিফাই করে এবং রি-রানে লাইভ অ্যাডমিন এডিট অক্ষুণ্ণ রেখে কনফ্লিক্টিং রেকর্ড ব্লক করে (`courses`, `inquiries`, `offer_timers` খালি রাখে)।

---

## ২. Safe Admin Registration & Privilege Management (নিরাপদ অ্যাডমিন রেজিস্ট্রেশন)

> **নিরাপত্তা নীতি (Stage B.2 Hardened):**
> - কখনোই `ON CONFLICT (user_id) DO UPDATE SET is_active = true, role = 'super_admin'` ব্যবহার করবেন না। কারণ ভুলবশত রি-রান করলে নিষ্ক্রিয় (`is_active = false`) অ্যাডমিন পুনরায় সক্রিয় হয়ে যাবে এবং সাধারণ `'admin'` স্বয়ংক্রিয়ভাবে `'super_admin'`-এ উন্নীত হবে।
> - নিচের Bootstrap SQL শুধু **একটিমাত্র বৈধ ও সক্রিয় `auth.users` অ্যাকাউন্ট** যাচাই করে Least-Privilege `'admin'` রোলে প্রথমবার রেজিস্টার করে; আগে থেকে রেজিস্টার্ড থাকলে `role` বা `is_active` পরিবর্তন করে না।
> - `'super_admin'` উন্নীতকরণ বা অ্যাডমিন সক্রিয়/নিষ্ক্রিয়করণ সম্পূর্ণ **আলাদা ও ইচ্ছাকৃত SQL** দিয়ে করতে হবে।

### ধাপ ২.১ — নতুন Admin User নিরাপদ রেজিস্ট্রেশন (Least-Privilege `'admin'`, Zero Auto-Escalation)

Supabase Dashboard → **Authentication → Users** থেকে আপনার অ্যাডমিন ইমেইল ও শক্তিশালী পাসওয়ার্ড দিয়ে ইউজার তৈরি করার পর, নিচের SQL-এ `YOUR_ADMIN_EMAIL_HERE` পরিবর্তন করে রান করুন:

```sql
-- Safe Transactional Admin Bootstrap (Least Privilege: role = 'admin', never overwrites existing role/status)
BEGIN;

DO $$
DECLARE
  v_target_email    TEXT := lower(btrim('YOUR_ADMIN_EMAIL_HERE'));
  v_match_count     INTEGER;
  v_user_id         UUID;
  v_user_email      TEXT;
  v_existing_role   TEXT;
  v_existing_active BOOLEAN;
BEGIN
  IF v_target_email = '' OR v_target_email = 'your_admin_email_here' THEN
    RAISE EXCEPTION 'Please replace YOUR_ADMIN_EMAIL_HERE with the real Supabase Auth admin email.';
  END IF;

  SELECT COUNT(*)
  INTO v_match_count
  FROM auth.users
  WHERE lower(email) = v_target_email
    AND deleted_at IS NULL;

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'No active auth.users account found for email "%". Create the user in Supabase Auth first.', v_target_email;
  END IF;

  IF v_match_count > 1 THEN
    RAISE EXCEPTION 'Ambiguous match: % active auth.users rows found for email "%". Resolve duplicate accounts first.', v_match_count, v_target_email;
  END IF;

  SELECT id, email
  INTO v_user_id, v_user_email
  FROM auth.users
  WHERE lower(email) = v_target_email
    AND deleted_at IS NULL;

  SELECT role, is_active
  INTO v_existing_role, v_existing_active
  FROM public.admin_users
  WHERE user_id = v_user_id;

  IF FOUND THEN
    RAISE NOTICE
      'Admin user "%" is already registered (role=%, is_active=%). No changes made — use Section 2.2 for deliberate role/status updates.',
      v_user_email, v_existing_role, v_existing_active;
    RETURN;
  END IF;

  INSERT INTO public.admin_users (user_id, email, display_name, role, is_active)
  VALUES (v_user_id, v_user_email, 'Site Admin', 'admin', true)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Registered new active admin user "%" with least-privilege role = ''admin''.', v_user_email;
END;
$$;

COMMIT;
```

### ধাপ ২.২ — `[EXPLICIT PRIVILEGE ACTION]` আলাদাভাবে `'super_admin'` উন্নীতকরণ (ঐচ্ছিক, কেবল প্রথম Owner-এর জন্য)

শুধুমাত্র ইতিমধ্যে রেজিস্টার্ড ও **সক্রিয় (`is_active = true`)** একজন অ্যাডমিনকে ইচ্ছাকৃতভাবে `'super_admin'` করতে চাইলে নিচের আলাদা SQL ব্যবহার করুন (এটি কখনোই কোনো নিষ্ক্রিয় অ্যাডমিনকে রি-অ্যাক্টিভেট করবে না):

```sql
-- Deliberate Privilege Upgrade: promotes an ALREADY ACTIVE admin to 'super_admin'
BEGIN;

DO $$
DECLARE
  v_target_email TEXT := lower(btrim('YOUR_ADMIN_EMAIL_HERE'));
  v_updated_rows INTEGER;
BEGIN
  IF v_target_email = '' OR v_target_email = 'your_admin_email_here' THEN
    RAISE EXCEPTION 'Please replace YOUR_ADMIN_EMAIL_HERE with the target active admin email.';
  END IF;

  UPDATE public.admin_users
  SET role = 'super_admin'
  WHERE lower(email) = v_target_email
    AND is_active = true;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows <> 1 THEN
    RAISE EXCEPTION
      'Privilege upgrade aborted: expected 1 active public.admin_users row for "%", matched %.',
      v_target_email, v_updated_rows;
  END IF;

  RAISE NOTICE 'Promoted active admin "%" to role = ''super_admin''.', v_target_email;
END;
$$;

COMMIT;
```

### ধাপ ২.৩ — `[EXPLICIT ACCESS CONTROL]` অ্যাডমিন নিষ্ক্রিয় (`Deactivate`) করা

কোনো অ্যাডমিনের অ্যাক্সেস তাৎক্ষণিকভাবে বন্ধ করতে:

```sql
-- Immediately revokes Admin Dashboard & RLS admin access without deleting auth history
BEGIN;

DO $$
DECLARE
  v_target_email TEXT := lower(btrim('TARGET_ADMIN_EMAIL_HERE'));
  v_updated_rows INTEGER;
BEGIN
  IF v_target_email = '' OR v_target_email = 'target_admin_email_here' THEN
    RAISE EXCEPTION 'Please replace TARGET_ADMIN_EMAIL_HERE with the admin email to deactivate.';
  END IF;

  UPDATE public.admin_users
  SET is_active = false
  WHERE lower(email) = v_target_email
    AND is_active = true;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows <> 1 THEN
    RAISE EXCEPTION
      'Deactivation aborted: expected 1 active public.admin_users row for "%", matched %.',
      v_target_email, v_updated_rows;
  END IF;

  RAISE NOTICE 'Deactivated admin "%". Access is now blocked by public.is_admin().', v_target_email;
END;
$$;

COMMIT;
```

---

## ৩. Safe Database Rollback Instructions (ধাপে ধাপে ডাটাবেজ রোলব্যাক)

> **[MANDATORY PRE-ROLLBACK CHECKLIST — DATA LOSS PROTECTION]**
> যেকোনো Database Rollback SQL চালানোর **আগে** অবশ্যই:
> 1. Supabase Dashboard → **Database → Backups** অথবা `pg_dump` দিয়ে পূর্ণ ডাটাবেজ ব্যাকআপ নিন এবং ব্যাকআপ ফাইল যাচাই করুন।
> 2. নিশ্চিত করুন যে লাইভ প্রোডাকশন ট্র্যাফিক বা নতুন রিয়েল কোর্স/ইনকোয়ারি/ক্লিক ডেটা ক্ষতিগ্রস্ত হবে না।
> 3. নিচে **`[DESTRUCTIVE]`** চিহ্নিত কোনো SQL কখনোই অনুমোদন ও ব্যাকআপ ছাড়া রান করবেন না।
> 4. **Database Rollback (অপশন ক–গ)** এবং **Git Application Code Rollback (সেকশন ৪)** সম্পূর্ণ আলাদা প্রক্রিয়া—সঠিক লেয়ার বেছে নিন।

---

### অপশন ক — `[DESTRUCTIVE — DATA LOSS RISK]` শুধুমাত্র Migration `0003` (Migrated Data) রোলব্যাক

> **সতর্কতা:** এই SQL-এ `DELETE` রয়েছে। এটি শুধুমাত্র প্রি-লঞ্চ/প্রাথমিক মাইগ্রেশন ফিরিয়ে নেওয়ার জন্য ব্যবহার করুন।
> - `website_settings` ডিলিট করার আগে `updated_at = '2026-11-16T21:00:00.797Z'` শর্ত যুক্ত থাকায় লাইভ অ্যাডমিন এডিট করা সেটিংস ভুলবশত ডিলিট হবে না।
> - `categories` ডিলিট করার আগে `updated_at = '2026-01-01T00:00:00Z'` এবং `NOT EXISTS (courses)` শর্ত যুক্ত থাকায় লাইভ এডিট করা বা কোর্সযুক্ত ক্যাটাগরি ভুলবশত ডিলিট হবে না।
> - ৯টি Historical Click Record ডিলিট করলে নতুন লাইভ ক্লিক অক্ষত থাকবে, তবে ঐ ৯টি রেকর্ড পুনরুদ্ধার করতে `0003` বা `data/database.json` ব্যাকআপ লাগবে।

```sql
-- [DESTRUCTIVE — DATA LOSS RISK] Pre-launch 0003 data rollback only (take full backup first!)
BEGIN;

DELETE FROM public.website_settings
WHERE id = 1
  AND updated_at = '2026-11-16T21:00:00.797Z'::timestamptz;

DELETE FROM public.click_records
WHERE id IN (
  1794836072016, 1794836016849, 1794836009261, 1794823663263,
  1794753845708, 1794753833346, 1794749877903, 1794737556899, 1794736842342
);

DELETE FROM public.categories
WHERE id IN (1, 2, 3, 4)
  AND updated_at = '2026-01-01T00:00:00Z'::timestamptz
  AND NOT EXISTS (SELECT 1 FROM public.courses WHERE category_id = categories.id);

COMMIT;
```

---

### অপশন খ — `[NON-DESTRUCTIVE TO TABLE DATA / FAIL-CLOSED SERVICE IMPACT]` শুধুমাত্র Migration `0002` (Policies, Triggers, Functions) রোলব্যাক

> **গুরুত্বপূর্ণ নিরাপত্তা ও Fail-Closed সতর্কতা:**
> - এই রোলব্যাক কোনো টেবিলের ডেটা মুছবে না।
> - সব ৭টি টেবিলে **RLS `ENABLED` (Fail-Closed)** অবস্থায় রাখা হয়েছে—অর্থাৎ পলিসি ড্রপ হওয়ার পর `anon` এবং `authenticated` ইউজারদের সকল রিড/রাইট **তাৎক্ষণিকভাবে ব্লক (Deny-All)** থাকবে যতক্ষণ না রিপ্লেসমেন্ট `0002` পলিসি অ্যাপ্লাই করা হয়।
> - লাইভ ট্র্যাফিক চালু থাকা অবস্থায় এটি আলাদাভাবে চালালে ওয়েবসাইটের পাবলিক/অ্যাডমিন কোয়েরি সাময়িকভাবে বন্ধ থাকবে; তাই কেবল রক্ষণাবেক্ষণ উইন্ডোতে অথবা রিপ্লেসমেন্ট পলিসি স্ক্রিপ্টের সঙ্গে একই ট্রানজ্যাকশনে ব্যবহার করুন।
> - **কখনোই পলিসি ছাড়া `DISABLE ROW LEVEL SECURITY` চালাবেন না**, নতুবা প্রাইভেট `inquiries`, `click_records` এবং `admin_users` ডেটা উন্মুক্ত হওয়ার ঝুঁকি তৈরি হবে।

```sql
-- [FAIL-CLOSED] Drops 0002 triggers, RLS policies, and functions while keeping RLS ENABLED on all 7 tables
BEGIN;

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_categories_set_updated_at      ON public.categories;
DROP TRIGGER IF EXISTS trg_categories_sync_course_slug    ON public.categories;
DROP TRIGGER IF EXISTS trg_courses_enforce_category_slug  ON public.courses;
DROP TRIGGER IF EXISTS trg_courses_set_updated_at         ON public.courses;
DROP TRIGGER IF EXISTS trg_website_settings_set_updated_at ON public.website_settings;
DROP TRIGGER IF EXISTS trg_offer_timers_set_updated_at    ON public.offer_timers;
DROP TRIGGER IF EXISTS trg_admin_users_set_updated_at     ON public.admin_users;

-- Drop RLS Policies (RLS remains ENABLED = fail-closed deny-all for anon/authenticated)
DROP POLICY IF EXISTS categories_public_read        ON public.categories;
DROP POLICY IF EXISTS categories_admin_all          ON public.categories;
DROP POLICY IF EXISTS courses_public_read           ON public.courses;
DROP POLICY IF EXISTS courses_admin_all             ON public.courses;
DROP POLICY IF EXISTS click_records_admin_read      ON public.click_records;
DROP POLICY IF EXISTS inquiries_public_insert       ON public.inquiries;
DROP POLICY IF EXISTS inquiries_admin_select        ON public.inquiries;
DROP POLICY IF EXISTS inquiries_admin_update        ON public.inquiries;
DROP POLICY IF EXISTS inquiries_admin_delete        ON public.inquiries;
DROP POLICY IF EXISTS website_settings_public_read  ON public.website_settings;
DROP POLICY IF EXISTS website_settings_admin_write  ON public.website_settings;
DROP POLICY IF EXISTS website_settings_admin_insert ON public.website_settings;
DROP POLICY IF EXISTS website_settings_admin_update ON public.website_settings;
DROP POLICY IF EXISTS offer_timers_public_read      ON public.offer_timers;
DROP POLICY IF EXISTS offer_timers_admin_all        ON public.offer_timers;
DROP POLICY IF EXISTS admin_users_self_read         ON public.admin_users;

-- Drop Functions
DROP FUNCTION IF EXISTS public.submit_customer_inquiry(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_active_course_click(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.sync_courses_on_category_slug_change();
DROP FUNCTION IF EXISTS public.enforce_course_category_slug();
DROP FUNCTION IF EXISTS public.set_courses_updated_at();
DROP FUNCTION IF EXISTS public.set_updated_at();

COMMIT;
```

---

### অপশন গ — `[HIGHLY DESTRUCTIVE — PERMANENT DATA LOSS]` সম্পূর্ণ Schema Rollback (`0001` + `0002` + `0003`)

> **চরম সতর্কতা (`HIGHLY DESTRUCTIVE`):** নিচের `DROP TABLE ... CASCADE` চালালে এই ৭টি টেবিল এবং তার ভেতরে থাকা **সকল কোর্স, ক্যাটাগরি, হিস্টরিক্যাল ও নতুন ক্লিক, ইনকোয়ারি, টাইমার, সেটিংস এবং অ্যাডমিন তালিকা স্থায়ীভাবে মুছে যাবে।** (`auth.users` অক্ষুণ্ণ থাকবে।) কেবল পূর্ণ ব্যাকআপ নেওয়ার পর এবং চূড়ান্ত অনুমোদন নিয়েই ব্যবহার করবেন।

```sql
-- [HIGHLY DESTRUCTIVE — PERMANENT DATA LOSS] Drops all 7 application tables and all data!
BEGIN;

DROP TABLE IF EXISTS public.offer_timers     CASCADE;
DROP TABLE IF EXISTS public.courses          CASCADE;
DROP TABLE IF EXISTS public.categories       CASCADE;
DROP TABLE IF EXISTS public.click_records    CASCADE;
DROP TABLE IF EXISTS public.inquiries        CASCADE;
DROP TABLE IF EXISTS public.website_settings CASCADE;
DROP TABLE IF EXISTS public.admin_users      CASCADE;

DROP FUNCTION IF EXISTS public.submit_customer_inquiry(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_active_course_click(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.sync_courses_on_category_slug_change();
DROP FUNCTION IF EXISTS public.enforce_course_category_slug();
DROP FUNCTION IF EXISTS public.set_courses_updated_at();
DROP FUNCTION IF EXISTS public.set_updated_at();

COMMIT;
```

---

## ৪. Git Application Code Rollback (ডাটাবেজ রোলব্যাক থেকে সম্পূর্ণ আলাদা)

ডাটাবেজে হাত না দিয়ে শুধুমাত্র Application Source Code ও Local JSON অবস্থায় ফিরে যেতে চাইলে নিচের Git কমান্ড ব্যবহার করুন:

- **Phase 2 ক্লিন Local JSON অবস্থা** (৪ ক্যাটাগরি, ০ কোর্স, ৯ হিস্টরিক্যাল ক্লিক, ১৫ সেটিংস — সুপারিশকৃত নিরাপদ রোলব্যাক পয়েন্ট):
  `git checkout 995b0f7`
- **Pre-Migration মূল বেসলাইন ট্যাগ:**
  `git checkout baseline-pre-migration` (`445e3a658e375bcc703f7a1f96c1ab0fe4a57708`)
- **এক্সটার্নাল প্রি-মাইগ্রেশন ব্যাকআপ আর্টিফ্যাক্ট:**
  `/tmp/10ms-pre-migration-backup/database.json.bak` এবং `10ms-affiliate-portal-pre-migration.tar.gz` (কোনো পরিবর্তন করা হয়নি)।
