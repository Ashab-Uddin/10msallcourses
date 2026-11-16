'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Category, Course } from '../../types.ts';
import { toBengaliNumber, parseFeatures } from '../../utils/format.ts';
import { CourseCard } from '../public/CourseCard.tsx';
import {
  ArrowLeft,
  Save,
  Eye,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  DollarSign,
  Tag,
  BookOpen,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';

interface CourseEditorPageProps {
  course: Course | null; // null means creating a new course
  categories: Category[];
  onBackToList: () => void;
  onSave: (courseData: any, id?: number) => Promise<void>;
}

function sanitizePriceInput(raw: string): string {
  const asciiDigits = raw.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  const digitsOnly = asciiDigits.replace(/[^\d]/g, '');
  if (digitsOnly === '') return '';
  return digitsOnly.replace(/^0+(?=\d)/, '').replace(/^0+$/, '0');
}

function normalizeInitialPrice(val: unknown, fallback: number): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || num < 0) return String(fallback);
  return String(Math.round(num));
}

export const CourseEditorPage: React.FC<CourseEditorPageProps> = ({
  course,
  categories,
  onBackToList,
  onSave,
}) => {
  const isEditing = Boolean(course);

  // Form states
  const [title, setTitle] = useState(course?.title || '');
  const [slug, setSlug] = useState(course?.slug || '');
  const [categorySlug, setCategorySlug] = useState(
    course?.categorySlug || (categories[0]?.slug ?? 'hsc')
  );
  const headerTitle = course?.headerTitle || '10MS';
  const headerSubtitle = course?.headerSubtitle || 'অনলাইন কোর্স';
  const shortBadge = course?.shortBadge || 'লাইভ ব্যাচ চলমান';
  const [imageUrl, setImageUrl] = useState(course?.imageUrl || '');
  const [imageFit, setImageFit] = useState<'contain' | 'square' | 'video'>(
    (course?.imageFit as any) || 'contain'
  );
  const gradientTheme = course?.gradientTheme || 'red';
  const fullDescription = course?.fullDescription || '';
  const [originalPriceInput, setOriginalPriceInput] = useState<string>(() =>
    normalizeInitialPrice(course?.originalPrice, 4500)
  );
  const [discountPriceInput, setDiscountPriceInput] = useState<string>(() =>
    normalizeInitialPrice(course?.discountPrice, 3500)
  );
  const [affiliateUrl, setAffiliateUrl] = useState(
    course?.affiliateUrl || 'https://10minuteschool.com'
  );
  const [description, setDescription] = useState(
    course?.description ||
      'দেশসেরা অভিজ্ঞ শিক্ষকদের পরিচালিত লাইভ ক্লাস ও পূর্ণাঙ্গ পরীক্ষার প্রস্তুতি নিয়ে এগিয়ে থাকুন...'
  );
  const duration = course?.duration || '৬ মাস';
  const studentCount = course?.studentCount || '১২,৫০০+ শিক্ষার্থী';
  const rating = course?.rating || '৪.৯';
  const [targetStudents, setTargetStudents] = useState(
    course?.targetStudents || ''
  );
  const [featuresList, setFeaturesList] = useState<string[]>(() =>
    parseFeatures(course?.features || JSON.stringify(['লাইভ ক্লাস', 'লেকচার শিট', 'মডেল টেস্ট', 'ডেইলি সলভিং']))
  );
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [isPopular, setIsPopular] = useState<boolean>(course?.isPopular ?? true);

  const originalPrice = originalPriceInput === '' ? 0 : Number(originalPriceInput);
  const discountPrice = discountPriceInput === '' ? 0 : Number(discountPriceInput);

  // Preview modal for mobile / quick test
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-calculated discount & savings
  const computedFlatSavings = Math.max(0, originalPrice - discountPrice);
  const computedDiscountPercent =
    originalPrice > 0 && originalPrice > discountPrice
      ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
      : 0;

  // Title change with auto-slug generation for new courses
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!course) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(autoSlug);
    }
  };

  // Image Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('ছবির আকার সর্বোচ্চ ৮ মেগাবাইট হতে পারবে।');
      return;
    }

    setUploadingImage(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageUrl(result);
      setUploadingImage(false);
    };
    reader.onerror = () => {
      setError('ছবি লোড করতে সমস্যা হয়েছে।');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Live Constructed Course object for real-time CourseCard preview
  const previewCourse: Course = useMemo(() => {
    const matchedCategory = categories.find((c) => c.slug === categorySlug);
    return {
      id: course?.id || 99999,
      title: title.trim() || 'কোর্স শিরোনাম এখানে প্রদর্শিত হবে',
      slug: slug.trim() || 'preview-course',
      categoryId: matchedCategory ? matchedCategory.id : 1,
      categorySlug: categorySlug || 'hsc',
      shortBadge: shortBadge.trim() || 'অনলাইন ব্যাচ',
      headerTitle: headerTitle.trim() || '10MS',
      headerSubtitle: headerSubtitle.trim() || 'অনলাইন কোর্স',
      discountBadgeText:
        computedFlatSavings > 0
          ? `৳${toBengaliNumber(computedFlatSavings)} ছাড়`
          : computedDiscountPercent > 0
          ? `${toBengaliNumber(computedDiscountPercent)}% ছাড়`
          : '',
      gradientTheme,
      description:
        description.trim() ||
        'দেশসেরা শিক্ষকদের সাথে লাইভ ক্লাসের মাধ্যমে ঘরে বসেই নাও সেরা প্রস্তুতি...',
      fullDescription: fullDescription.trim() || null,
      imageUrl: imageUrl.trim() || null,
      imageFit,
      originalPrice: Number(originalPrice) || 0,
      discountPrice: Number(discountPrice) || 0,
      discountPercent: computedDiscountPercent,
      rating: rating.trim() || '৪.৯',
      studentCount: studentCount.trim() || '১২,৫০০+ শিক্ষার্থী',
      duration: duration.trim() || '৬ মাস',
      targetStudents: targetStudents.trim() || 'সকল শিক্ষার্থী',
      instructorInfo: course?.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল',
      instructorIcon: course?.instructorIcon || 'school',
      features: JSON.stringify(featuresList),
      affiliateUrl: affiliateUrl.trim() || 'https://10minuteschool.com',
      isPopular,
      status: course?.status && course.status !== 'draft' ? course.status : 'active',
      clickCount: course?.clickCount || 0,
    };
  }, [
    categories,
    categorySlug,
    computedDiscountPercent,
    computedFlatSavings,
    course,
    description,
    discountPrice,
    duration,
    featuresList,
    fullDescription,
    gradientTheme,
    headerSubtitle,
    headerTitle,
    imageFit,
    imageUrl,
    isPopular,
    originalPrice,
    rating,
    shortBadge,
    slug,
    studentCount,
    targetStudents,
    title,
    affiliateUrl,
  ]);

  // Handle Form Submission
  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('কোর্সের শিরোনাম (Title) পূরণ করা আবশ্যক।');
      return;
    }
    if (!slug.trim()) {
      setError('কোর্সের স্লাগ (Slug) পূরণ করা আবশ্যক।');
      return;
    }
    if (discountPriceInput.trim() === '') {
      setError('ডিসকাউন্টেড অফার মূল্য (Discount Price) পূরণ করা আবশ্যক।');
      return;
    }
    if (!Number.isFinite(originalPrice) || originalPrice < 0 || !Number.isFinite(discountPrice) || discountPrice < 0) {
      setError('কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।');
      return;
    }

    setSaving(true);
    setError(null);

    const normalizedOriginalPrice = Math.round(originalPrice);
    const normalizedDiscountPrice = Math.round(discountPrice);
    const matchedCat = categories.find((c) => c.slug === categorySlug);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      categoryId: matchedCat ? matchedCat.id : null,
      categorySlug,
      shortBadge: shortBadge.trim() || 'অনলাইন ব্যাচ',
      headerTitle: headerTitle.trim() || '10MS',
      headerSubtitle: headerSubtitle.trim() || 'অনলাইন কোর্স',
      discountBadgeText:
        computedFlatSavings > 0
          ? `৳${toBengaliNumber(computedFlatSavings)} ছাড়`
          : computedDiscountPercent > 0
          ? `${toBengaliNumber(computedDiscountPercent)}% ছাড়`
          : '',
      gradientTheme,
      description: description.trim(),
      fullDescription: fullDescription.trim() || null,
      imageUrl: imageUrl.trim() || null,
      imageFit,
      originalPrice: normalizedOriginalPrice,
      discountPrice: normalizedDiscountPrice,
      discountPercent: computedDiscountPercent,
      rating: rating.trim() || '৪.৯',
      studentCount: studentCount.trim() || '১২,৫০০+ শিক্ষার্থী',
      duration: duration.trim() || '৬ মাস',
      targetStudents: targetStudents.trim() || 'সকল শিক্ষার্থী',
      features: featuresList,
      affiliateUrl: affiliateUrl.trim() || 'https://10minuteschool.com',
      isPopular,
      status: course?.status && course.status !== 'draft' ? course.status : 'active',
    };

    try {
      await onSave(payload, course?.id);
    } catch (err: any) {
      setError(err.message || 'কোর্সটি সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="glass-strong rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToList}
            className="p-2.5 rounded-xl border border-white/90 bg-white/80 hover:bg-rose-50 text-[#2A0F12] hover:text-[#eb1c24] transition cursor-pointer shadow-2xs shrink-0"
            title="কোর্স লিস্টে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#6B4C4F]">
              <span>Admin</span>
              <span>/</span>
              <span>Courses</span>
              <span>/</span>
              <span className="text-[#b91c1c] font-bold">
                {isEditing ? 'Edit Course' : 'Add New Course'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight mt-0.5 truncate">
              {isEditing ? `কোর্স এডিট: ${course?.title}` : 'নতুন কোর্স তৈরি করুন'}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={onBackToList}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-white/90 bg-white/80 hover:bg-white text-[#2A0F12] font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            বাতিল (Cancel)
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2 rounded-xl border border-rose-200/80 bg-rose-50/80 hover:bg-rose-100 text-[#b91c1c] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Eye className="w-4 h-4" />
            <span>প্রিভিউ কার্ড</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'আপডেট করুন (Save)' : 'পাবলিশ করুন (Publish)'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Layout: Form on Left, Sticky Real-Time Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Course Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Primary Information */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <BookOpen className="w-4 h-4 text-[#eb1c24]" />
              <span>প্রাথমিক ও সাধারণ তথ্য (Basic Info)</span>
            </h3>

            {/* Course Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                কোর্স শিরোনাম (Course Title) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="যেমন: HSC 28 অনলাইন ব্যাচ (বিজ্ঞান বিভাগ)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-900 bg-white focus:border-[#eb1c24] focus:ring-2 focus:ring-red-100 outline-none transition shadow-2xs font-medium"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                কোর্স স্লাগ (Unique URL Slug) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-slate-100 border border-r-0 border-slate-200 text-slate-500 text-xs font-mono">
                  /go/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="hsc-28-online-batch"
                  className="w-full px-3.5 py-2.5 rounded-r-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ক্যাটাগরি (Category) <span className="text-red-500">*</span>
              </label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Students / Academic Class */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                লক্ষ্য শিক্ষার্থী ও শিক্ষাবর্ষ (Target Students / Batch)
              </label>
              <input
                type="text"
                value={targetStudents}
                onChange={(e) => setTargetStudents(e.target.value)}
                placeholder="যেমন: HSC 28, HSC 27, SSC 2027, Class 8, বিজ্ঞান বিভাগ, মানবিক, ব্যবসায় শিক্ষা"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
              />
              <p className="text-[11px] text-[#6B4C4F] mt-1.5 leading-relaxed">
                সমর্থিত ব্যাচ ও বিভাগ কীওয়ার্ড: <span className="font-semibold text-[#2A0F12]">HSC 26 / 27 / 28, SSC 2027 / 2028, Class 6–8 (৬ষ্ঠ–৮ম শ্রেণি), বিজ্ঞান (Science), ব্যবসায় শিক্ষা (Business / Commerce), মানবিক (Humanities / Arts), এডমিশন / ভার্সিটি / মেডিকেল / বুয়েট</span>। এই কীওয়ার্ড অনুযায়ী কোর্স স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট ব্যাচ ও বিভাগ পেজে যুক্ত হয়।
              </p>
            </div>
          </div>

          {/* Card 2: Pricing & Affiliate Links */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>মূল্য, ছাড় ও এনরোলমেন্ট লিংক (Pricing & Links)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পূর্বের মূল মূল্য (Original Price - ৳)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={originalPriceInput}
                  onChange={(e) => setOriginalPriceInput(sanitizePriceInput(e.target.value))}
                  onBlur={() => {
                    if (originalPriceInput === '') setOriginalPriceInput('0');
                    else setOriginalPriceInput(sanitizePriceInput(originalPriceInput));
                  }}
                  placeholder="4500"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ডিসকাউন্টেড অফার মূল্য (Discount Price - ৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={discountPriceInput}
                  onChange={(e) => setDiscountPriceInput(sanitizePriceInput(e.target.value))}
                  onBlur={() => {
                    if (discountPriceInput === '') setDiscountPriceInput('0');
                    else setDiscountPriceInput(sanitizePriceInput(discountPriceInput));
                  }}
                  placeholder="3500"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono font-bold text-emerald-600"
                />
              </div>
            </div>

            {/* Computed Savings summary pill */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>মোট ছাড়: ৳{toBengaliNumber(computedFlatSavings)} ({toBengaliNumber(computedDiscountPercent)}%)</span>
              <span className="text-[11px] text-emerald-700 font-semibold">পাবলিক কার্ডে স্বয়ংক্রিয়ভাবে ডিসকাউন্ট ব্যাজ যুক্ত হবে</span>
            </div>

            {/* Affiliate / Enrollment URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ভর্তি / এফিলিয়েট লিংক (Affiliate / Enrollment Target URL) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-slate-100 border border-r-0 border-slate-200 text-slate-500">
                  <LinkIcon className="w-4 h-4" />
                </span>
                <input
                  type="url"
                  required
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://10minuteschool.com/product/..."
                  className="w-full px-3.5 py-2.5 rounded-r-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-[#6B4C4F] mt-1">
                শিক্ষার্থী &lsquo;কোর্সে ভর্তি হোন&rsquo; বাটনে ক্লিক করলে সরাসরি এই লিংকে চলে যাবে।
              </p>
            </div>
          </div>

          {/* Card 3: Media & Image Settings (Only Image URL and Computer Upload with Live Preview) */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>কোর্স থাম্বনেইল ছবি (Course Thumbnail Image)</span>
            </h3>

            {/* Image URL & File Upload */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ১. ইমেজ লিংক (CDN Image URL) অথবা ২. কম্পিউটার থেকে ছবি আপলোড (Upload Image):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://cdn.10minuteschool.com/images/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                    />
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{uploadingImage ? 'আপলোড হচ্ছে...' : 'কম্পিউটার থেকে আপলোড'}</span>
                  </button>
                </div>
              </div>

              {/* Live Thumbnail Preview Box */}
              {imageUrl ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={imageUrl}
                      alt="Thumbnail Preview"
                      className="w-20 h-14 object-cover rounded-lg border border-slate-300 shadow-2xs bg-white"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>লাইভ ইমেজ সংযুক্ত হয়েছে</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs sm:max-w-md">
                        {imageUrl.startsWith('data:') ? 'লোকাল ফাইল (Base64)' : imageUrl}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="ছবি মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center text-xs text-slate-500">
                  কোনো ছবি নির্বাচন করা হয়নি। ইমেজ লিঙ্ক দিন অথবা কম্পিউটার থেকে ছবি আপলোড করুন।
                </div>
              )}

              {/* Image Fit / Ratio Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেজ রেশিও / ফিট (Image Fit):
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setImageFit('contain')}
                    className={`py-1.5 text-center text-xs font-bold rounded-lg transition ${
                      imageFit === 'contain'
                        ? 'bg-white text-[#b91c1c] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ফুল ইমেজ (Contain)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFit('square')}
                    className={`py-1.5 text-center text-xs font-bold rounded-lg transition ${
                      imageFit === 'square'
                        ? 'bg-white text-[#b91c1c] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1:1 স্কয়ার
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFit('video')}
                    className={`py-1.5 text-center text-xs font-bold rounded-lg transition ${
                      imageFit === 'video'
                        ? 'bg-white text-[#b91c1c] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    16:9 ওয়াইড
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Description & Features */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <Tag className="w-4 h-4 text-rose-600" />
              <span>বিবরণ ও মূল ফিচারসমূহ (Description & Features)</span>
            </h3>

            {/* Short Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                সংক্ষিপ্ত বিবরণ (Short Description for Card) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="কোর্সের সংক্ষেপ বিবরণ..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
              />
            </div>

            {/* Feature Bullets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                কোর্সের মূল সুবিধাসমূহ (Key Features):
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newFeatureInput.trim() && !featuresList.includes(newFeatureInput.trim())) {
                        setFeaturesList([...featuresList, newFeatureInput.trim()]);
                        setNewFeatureInput('');
                      }
                    }
                  }}
                  placeholder="যেমন: ১৫০+ লাইভ ক্লাস (লিখে এন্টার চাপুন)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newFeatureInput.trim() && !featuresList.includes(newFeatureInput.trim())) {
                      setFeaturesList([...featuresList, newFeatureInput.trim()]);
                      setNewFeatureInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  + যোগ করুন
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {featuresList.map((feat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-rose-50/80 border border-rose-200 text-slate-800 text-xs px-3 py-1 rounded-lg font-bold shadow-2xs"
                  >
                    <span>{feat}</span>
                    <button
                      type="button"
                      onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600 font-bold ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Popular toggle */}
            <div className="pt-2 border-t border-rose-100 flex items-center gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-[#eb1c24]"
                />
                <span className="text-xs font-bold text-slate-800">
                  ★ জনপ্রিয় ও ট্রেন্ডিং কোর্স হিসেবে চিহ্নিত করুন (Featured Course)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Real-Time Live Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="glass-strong rounded-3xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#eb1c24]" />
                <span className="text-xs sm:text-sm font-black text-[#2A0F12]">
                  লাইভ পাবলিক কার্ড প্রিভিউ
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-[#b91c1c] text-[10px] font-bold">
                রিয়েল-টাইম
              </span>
            </div>
            <p className="text-[11px] text-[#6B4C4F]">
              মেইন ওয়েবসাইটের হুবহু অরিজিনাল সাইজ ও ডাইমেনশনে লাইভ প্রিভিউ:
            </p>

            {/* Live Rendered CourseCard in exact dimensions */}
            <div className="pt-2 flex justify-center">
              <div className="w-full max-w-[340px]">
                <CourseCard
                  course={previewCourse}
                  onEnrollClick={() => {
                    window.open(affiliateUrl, '_blank');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 space-y-4 border border-white/90 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-sm font-bold text-[#2A0F12] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#eb1c24]" />
                <span>ফুল সাইজ কোর্স কার্ড প্রিভিউ</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-rose-50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <div className="w-full max-w-[340px]">
                <CourseCard
                  course={previewCourse}
                  onEnrollClick={() => window.open(affiliateUrl, '_blank')}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
