'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Category, Course, CourseFeatureItem } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  buildDefaultCourseFeatureDrafts,
  deriveCourseSummaryDescription,
  extractActiveFeatureTitles,
  getCourseFeatureItems,
  MIN_ACTIVE_COURSE_FEATURES,
  sortCourseFeatures,
} from '../../lib/courseFeatures.ts';
import {
  BATCH_KEYWORD_OPTIONS,
  CANONICAL_GROUP_OPTIONS,
  DEPARTMENT_KEYWORD_OPTIONS,
  BatchKeywordOption,
  extractMatchedBatchKeywords,
  extractRatingInputValue,
  extractStudentCountInputValue,
  formatCourseDurationDisplay,
  formatCourseRatingDisplay,
  formatCourseStudentCountDisplay,
  normalizeValidationText,
  syncTargetStudentsMetadata,
  validateCourseDuration,
  validateCoursePricing,
  validateCourseRating,
  validateCourseStudentCount,
  validateSingleBatchKeyword,
} from '../../lib/courseValidation.ts';
import { CourseCard } from '../public/CourseCard.tsx';
import { CourseFeaturesManager } from './CourseFeaturesManager.tsx';
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
  Zap,
  GraduationCap,
  Clock,
  Users,
  Star,
} from 'lucide-react';

import { validateExternalHttpUrl } from '../../lib/affiliateUrl.ts';

interface CourseEditorPageProps {
  authToken?: string;
  course: Course | null; // null means creating a new course
  categories: Category[];
  existingCourses?: Course[];
  onBackToList: () => void;
  onSave: (courseData: any, id?: number) => Promise<void>;
  onUnauthorized?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  whatsappNumber?: string;
  whatsappLink?: string;
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

function removeBatchKeywordsFromText(text: string): string {
  const tokens = text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const remaining = tokens.filter((token) => extractMatchedBatchKeywords(token).length === 0);
  if (remaining.length > 0 && remaining.length < tokens.length) {
    return remaining.join(', ');
  }

  let cleaned = text;
  for (const opt of BATCH_KEYWORD_OPTIONS) {
    cleaned = cleaned.replace(new RegExp(opt.matcher.source, 'gi'), ' ');
  }
  return cleaned
    .replace(/\s*,\s*,+/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeKeywordToken(token: string): string {
  return normalizeValidationText(token).toLowerCase();
}

function dedupeCommaKeywords(text: string): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of text.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalizeKeywordToken(trimmed);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result.join(', ');
}

export const CourseEditorPage: React.FC<CourseEditorPageProps> = ({
  course,
  categories,
  existingCourses,
  onBackToList,
  onSave,
  onUnauthorized,
  onShowToast,
  whatsappNumber,
  whatsappLink,
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
  const [shortBadge, setShortBadge] = useState<string>(course?.shortBadge ?? '');
  const [imageUrl, setImageUrl] = useState(course?.imageUrl || '');
  const [imageFit, setImageFit] = useState<'contain' | 'square' | 'video'>(
    (course?.imageFit as any) || 'contain'
  );
  const gradientTheme = course?.gradientTheme || 'red';
  const [fullDescription, setFullDescription] = useState(course?.fullDescription || '');
  const [originalPriceInput, setOriginalPriceInput] = useState<string>(() =>
    course ? normalizeInitialPrice(course.originalPrice, 0) : ''
  );
  const [discountPriceInput, setDiscountPriceInput] = useState<string>(() =>
    course ? normalizeInitialPrice(course.discountPrice, 0) : ''
  );
  const [affiliateUrl, setAffiliateUrl] = useState(
    course?.affiliateUrl || ''
  );
  const [description, setDescription] = useState(course?.description || '');
  const [duration, setDuration] = useState<string>(() =>
    course ? formatCourseDurationDisplay(course.duration) : ''
  );
  const [studentCountInput, setStudentCountInput] = useState<string>(() =>
    course ? extractStudentCountInputValue(course.studentCount) : ''
  );
  const [ratingInput, setRatingInput] = useState<string>(() =>
    course ? extractRatingInputValue(course.rating) : ''
  );
  const [targetStudents, setTargetStudents] = useState(() => {
    if (!course) return '';
    const synced = syncTargetStudentsMetadata({
      targetStudents: course.targetStudents || '',
      targetBatch: course.targetBatch,
      targetGroups: course.targetGroups,
    });
    return synced.valid ? synced.targetStudents : course.targetStudents || '';
  });
  const [batchError, setBatchError] = useState<string | null>(null);
  const [courseFeatures, setCourseFeatures] = useState<CourseFeatureItem[]>(() => {
    if (course) {
      const existing = getCourseFeatureItems(course, {
        includeInactive: true,
        fallbackIfEmpty: false,
      });
      return existing.length > 0 ? existing : buildDefaultCourseFeatureDrafts(course);
    }
    return buildDefaultCourseFeatureDrafts();
  });
  const [isPopular, setIsPopular] = useState<boolean>(course?.isPopular ?? true);
  const [status, setStatus] = useState<'active' | 'closed' | 'inactive'>(() => {
    if (
      course?.status === 'active' ||
      course?.status === 'closed' ||
      course?.status === 'inactive'
    ) {
      return course.status;
    }
    return 'active';
  });

  const hasOriginalPrice = originalPriceInput.trim() !== '';
  const hasDiscountPrice = discountPriceInput.trim() !== '';
  const originalPrice = hasOriginalPrice ? Number(originalPriceInput) : 0;
  const discountPrice = hasDiscountPrice ? Number(discountPriceInput) : 0;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draftUploadedFileId, setDraftUploadedFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Batch validation & selection tracking
  const matchedBatches = useMemo(
    () => extractMatchedBatchKeywords(targetStudents),
    [targetStudents]
  );
  const batchValidation = useMemo(
    () => validateSingleBatchKeyword(targetStudents),
    [targetStudents]
  );
  const targetMetadataSync = useMemo(
    () => syncTargetStudentsMetadata({ targetStudents }),
    [targetStudents]
  );

  // Auto-calculated discount & validation
  const pricingValidation = useMemo(
    () => validateCoursePricing(originalPrice, discountPrice),
    [originalPrice, discountPrice]
  );
  const isPriceInvalid = hasOriginalPrice && hasDiscountPrice && !pricingValidation.valid;
  const computedFlatSavings =
    originalPrice > 0 && originalPrice > discountPrice
      ? Math.max(0, originalPrice - discountPrice)
      : 0;
  const computedDiscountPercent = pricingValidation.valid ? pricingValidation.discountPercent : 0;

  // Dynamic Course Meta (Duration, Total Students, Rating) validation & live display
  const durationValidation = useMemo(() => validateCourseDuration(duration), [duration]);
  const studentCountValidation = useMemo(
    () => validateCourseStudentCount(studentCountInput),
    [studentCountInput]
  );
  const ratingValidation = useMemo(() => validateCourseRating(ratingInput), [ratingInput]);

  const previewFormattedDuration = durationValidation.valid ? durationValidation.value : '';
  const previewFormattedStudents =
    studentCountValidation.valid && studentCountValidation.storageValue
      ? formatCourseStudentCountDisplay(studentCountValidation.storageValue)
      : '';
  const previewFormattedRating =
    ratingValidation.valid && ratingValidation.storageValue
      ? formatCourseRatingDisplay(ratingValidation.storageValue)
      : '';

  // Target Students input & Batch Keyword Chip Handlers
  const handleTargetStudentsChange = (val: string) => {
    setTargetStudents(val);
    const check = validateSingleBatchKeyword(val);
    if (!check.valid) {
      setBatchError(check.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড ব্যবহার করা যাবে।');
    } else {
      setBatchError(null);
    }
  };

  const handleBatchChipClick = (option: BatchKeywordOption) => {
    const currentBatches = extractMatchedBatchKeywords(targetStudents);
    const isAlreadySelected =
      currentBatches.length === 1 && currentBatches[0].id === option.id;

    // Toggle off if already selected (easy removal, never duplicates)
    if (isAlreadySelected) {
      handleTargetStudentsChange(removeBatchKeywordsFromText(targetStudents));
      return;
    }

    // Replace any existing batch keyword cleanly while keeping other keywords
    const remainingText = removeBatchKeywordsFromText(targetStudents);
    const remainingTokens = remainingText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const nextValue = dedupeCommaKeywords([option.label, ...remainingTokens].join(', '));
    handleTargetStudentsChange(nextValue);
  };

  const handleClearBatchKeyword = () => {
    setTargetStudents('');
    setBatchError(null);
  };

  const handleDepartmentChipClick = (deptLabel: string) => {
    const tokens = targetStudents
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const normalizedDept = normalizeKeywordToken(deptLabel);
    const exists = tokens.some((t) => normalizeKeywordToken(t) === normalizedDept);
    if (exists) {
      const next = tokens
        .filter((t) => normalizeKeywordToken(t) !== normalizedDept)
        .join(', ');
      handleTargetStudentsChange(next);
    } else {
      const next = dedupeCommaKeywords([...tokens, deptLabel].join(', '));
      handleTargetStudentsChange(next);
    }
  };

  const handleRemoveCustomTargetToken = (tokenToRemove: string) => {
    const targetKey = normalizeKeywordToken(tokenToRemove);
    const next = targetStudents
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && normalizeKeywordToken(t) !== targetKey)
      .join(', ');
    handleTargetStudentsChange(next);
  };

  const handleTargetInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const normalized = dedupeCommaKeywords(targetStudents);
      handleTargetStudentsChange(normalized);
    } else if (e.key === 'Escape') {
      setBatchError(null);
    }
  };

  const handleTargetChipGroupKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
      return;
    }
    const buttons = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-target-chip="true"]')
    );
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1 || buttons.length === 0) return;

    e.preventDefault();
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
    buttons[nextIndex]?.focus();
  };

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

  // Optimize large images client-side (preserving original aspect ratio, max 1200px wide) before upload
  const optimizeImageForUpload = async (file: File): Promise<File> => {
    if (file.size <= 350 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
      return file;
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 1200;
          let targetW = img.naturalWidth || maxDim;
          let targetH = img.naturalHeight || Math.round((maxDim * 9) / 16);
          if (targetW > maxDim || targetH > maxDim) {
            const scale = Math.min(maxDim / targetW, maxDim / targetH);
            targetW = Math.max(1, Math.round(targetW * scale));
            targetH = Math.max(1, Math.round(targetH * scale));
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob && blob.size > 0 && blob.size < file.size) {
                const baseName = file.name.replace(/\.[^.]+$/, '') || 'course-thumb';
                resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
              } else {
                resolve(file);
              }
            },
            'image/webp',
            0.84
          );
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  };

  const deleteUnsavedDraftUpload = (fileId: string | null) => {
    if (!fileId) return;
    fetch('/api/admin/upload', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    }).catch(() => {});
  };

  const handleRemoveImage = () => {
    if (draftUploadedFileId) {
      deleteUnsavedDraftUpload(draftUploadedFileId);
      setDraftUploadedFileId(null);
    }
    setImageUrl('');
  };

  const handleBackToList = () => {
    if (draftUploadedFileId) {
      deleteUnsavedDraftUpload(draftUploadedFileId);
      setDraftUploadedFileId(null);
    }
    onBackToList();
  };

  // Production ImageKit Upload handler (validates type/size, optimizes, uploads via /api/admin/upload)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    if (!allowedTypes.has(file.type)) {
      setError('শুধুমাত্র JPG, PNG, WebP অথবা AVIF ফরম্যাটের ছবি আপলোড করা যাবে।');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('ছবির আকার সর্বোচ্চ ৪ মেগাবাইট হতে পারবে।');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const preparedFile = await optimizeImageForUpload(file);
      const formData = new FormData();
      formData.append('file', preparedFile);
      if (draftUploadedFileId) {
        formData.append('previousFileId', draftUploadedFileId);
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'ImageKit-এ ছবি আপলোড করতে সমস্যা হয়েছে।');
      }

      setImageUrl(data.url);
      setDraftUploadedFileId(
        typeof data.fileId === 'string' && data.fileId ? data.fileId : null
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploadingImage(false);
    }
  };

  // Live Constructed Course object for real-time CourseCard preview
  const previewCourse: Course = useMemo(() => {
    const matchedCategory = categories.find((c) => c.slug === categorySlug);
    const normalizedFeatures = sortCourseFeatures(courseFeatures);
    const activeTitles = extractActiveFeatureTitles(normalizedFeatures);
    return {
      id: course?.id || 99999,
      title: title.trim() || 'কোর্স শিরোনাম এখানে প্রদর্শিত হবে',
      slug: slug.trim() || 'preview-course',
      categoryId: matchedCategory ? matchedCategory.id : 1,
      categorySlug: categorySlug || 'hsc',
      shortBadge: shortBadge.trim(),
      headerTitle: headerTitle.trim() || '10MS',
      headerSubtitle: headerSubtitle.trim() || 'অনলাইন কোর্স',
      discountBadgeText:
        computedFlatSavings > 0
          ? `৳${toBengaliNumber(computedFlatSavings)} ছাড়`
          : computedDiscountPercent > 0
          ? `${toBengaliNumber(computedDiscountPercent)}% ছাড়`
          : '',
      gradientTheme,
      description: deriveCourseSummaryDescription(
        description || fullDescription,
        normalizedFeatures,
        title
      ),
      fullDescription: fullDescription.trim() || null,
      imageUrl: imageUrl.trim() || null,
      imageFit,
      originalPrice: Number(originalPrice) || 0,
      discountPrice: Number(discountPrice) || 0,
      discountPercent: computedDiscountPercent,
      rating: ratingValidation.valid ? ratingValidation.storageValue : '',
      studentCount: studentCountValidation.valid ? studentCountValidation.storageValue : '',
      duration: durationValidation.valid ? durationValidation.value : '',
      targetStudents: targetMetadataSync.valid
        ? targetMetadataSync.targetStudents
        : targetStudents.trim(),
      targetBatch: targetMetadataSync.valid ? targetMetadataSync.targetBatch : null,
      targetGroups: targetMetadataSync.valid ? targetMetadataSync.targetGroups : [],
      instructorInfo: course?.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল',
      instructorIcon: course?.instructorIcon || 'school',
      features: JSON.stringify(activeTitles),
      courseFeatures: normalizedFeatures,
      affiliateUrl: affiliateUrl.trim(),
      displayOrder: course?.displayOrder || 1,
      isPopular,
      status,
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
    durationValidation,
    courseFeatures,
    fullDescription,
    gradientTheme,
    headerSubtitle,
    headerTitle,
    imageFit,
    imageUrl,
    isPopular,
    originalPrice,
    ratingValidation,
    shortBadge,
    slug,
    status,
    studentCountValidation,
    targetMetadataSync,
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
    const normalizedFeatures = sortCourseFeatures(courseFeatures);
    const activeFeatureTitles = extractActiveFeatureTitles(normalizedFeatures);
    if (activeFeatureTitles.length < MIN_ACTIVE_COURSE_FEATURES) {
      setError(
        `কোর্স কার্ডে প্রদর্শনের জন্য ন্যূনতম ${toBengaliNumber(MIN_ACTIVE_COURSE_FEATURES)}টি সক্রিয় (Published) ফিচার যুক্ত করতে হবে।`
      );
      return;
    }
    if (!batchValidation.valid) {
      const msg =
        batchValidation.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।';
      setBatchError(msg);
      setError(msg);
      return;
    }
    if (discountPriceInput.trim() === '') {
      setError('ডিসকাউন্টেড অফার মূল্য (Discount Price) পূরণ করা আবশ্যক।');
      return;
    }
    if (!pricingValidation.valid) {
      setError(pricingValidation.error || 'অবৈধ মূল্য প্রদান করা হয়েছে।');
      return;
    }
    if (!durationValidation.valid) {
      setError(durationValidation.error || 'অবৈধ কোর্স মেয়াদ প্রদান করা হয়েছে।');
      return;
    }
    if (!studentCountValidation.valid) {
      setError(studentCountValidation.error || 'অবৈধ শিক্ষার্থীর সংখ্যা প্রদান করা হয়েছে।');
      return;
    }
    if (!ratingValidation.valid) {
      setError(ratingValidation.error || 'কোর্সের রেটিং অবশ্যই ০ থেকে ৫-এর মধ্যে হতে হবে।');
      return;
    }
    const urlCheck = validateExternalHttpUrl(affiliateUrl);
    if (!urlCheck.valid) {
      setError(
        urlCheck.error ||
          'বৈধ ভর্তি / এফিলিয়েট লিংক (https://...) পূরণ করা আবশ্যক।'
      );
      return;
    }

    setSaving(true);
    setError(null);

    const normalizedOriginalPrice = Math.round(originalPrice);
    const normalizedDiscountPrice = Math.round(discountPrice);
    const matchedCat = categories.find((c) => c.slug === categorySlug);
    const resolvedSummaryDescription = deriveCourseSummaryDescription(
      description || fullDescription,
      normalizedFeatures,
      title
    );

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      categoryId: matchedCat ? matchedCat.id : null,
      categorySlug,
      shortBadge: shortBadge.trim(),
      headerTitle: headerTitle.trim() || '10MS',
      headerSubtitle: headerSubtitle.trim() || 'অনলাইন কোর্স',
      discountBadgeText:
        computedFlatSavings > 0
          ? `৳${toBengaliNumber(computedFlatSavings)} ছাড়`
          : computedDiscountPercent > 0
          ? `${toBengaliNumber(computedDiscountPercent)}% ছাড়`
          : '',
      gradientTheme,
      description: resolvedSummaryDescription,
      fullDescription: fullDescription.trim() || null,
      imageUrl: imageUrl.trim() || null,
      imageFit,
      originalPrice: normalizedOriginalPrice,
      discountPrice: normalizedDiscountPrice,
      discountPercent: computedDiscountPercent,
      rating: ratingValidation.storageValue,
      studentCount: studentCountValidation.storageValue,
      duration: durationValidation.value,
      targetStudents: targetMetadataSync.valid
        ? targetMetadataSync.targetStudents
        : dedupeCommaKeywords(targetStudents),
      targetBatch: targetMetadataSync.valid ? targetMetadataSync.targetBatch : null,
      targetGroups: targetMetadataSync.valid ? targetMetadataSync.targetGroups : [],
      features: activeFeatureTitles,
      courseFeatures: normalizedFeatures,
      affiliateUrl: affiliateUrl.trim(),
      isPopular,
      status,
    };

    try {
      await onSave(payload, course?.id);
      setDraftUploadedFileId(null);
    } catch (err: any) {
      setError(err.message || 'কোর্সটি সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const targetTokens = targetStudents
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const targetTokensLower = targetTokens.map((t) => normalizeKeywordToken(t));
  const departmentKeys = new Set(
    DEPARTMENT_KEYWORD_OPTIONS.map((d) => normalizeKeywordToken(d))
  );
  const customTargetTokens = targetTokens.filter(
    (token) =>
      !departmentKeys.has(normalizeKeywordToken(token)) &&
      extractMatchedBatchKeywords(token).length === 0
  );

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="glass-strong rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackToList}
            className="p-2.5 rounded-xl border border-white/90 bg-white/80 hover:bg-rose-50 text-[#2A0F12] hover:text-[#eb1c24] transition cursor-pointer shadow-2xs shrink-0"
            title="কোর্স লিস্টে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight truncate">
              {isEditing ? `কোর্স এডিট: ${course?.title}` : 'নতুন কোর্স তৈরি করুন'}
            </h1>
          </div>
        </div>

        {/* Desktop Action Buttons (Kept unchanged on Desktop; shown below Preview Card on Mobile & Tablet) */}
        <div className="hidden lg:flex items-center gap-2.5 justify-end shrink-0">
          <button
            type="button"
            onClick={handleBackToList}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white/90 hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 text-[#2A0F12] font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Save' : 'Publish'}</span>
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
        <div className="lg:col-span-7 min-w-0 space-y-6">
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
              <p className="text-[11px] text-[#6B4C4F] mt-1">
                নির্বাচিত ক্যাটাগরি অনুযায়ী কোর্সটি ওয়েবসাইটের সংশ্লিষ্ট সেকশন ও ক্যাটাগরি পেজে প্রদর্শিত হবে।
              </p>
            </div>

            {/* Target Students / Batch (Matching Live Batch UI, Styling & Interaction) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">
                লক্ষ্য শিক্ষার্থী ও শিক্ষাবর্ষ (Target Students / Batch)
              </label>

              <div className="flex items-center relative">
                <span className="px-3 py-2.5 rounded-l-xl bg-rose-50 border border-r-0 border-slate-200 text-[#eb1c24]">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={targetStudents}
                  onChange={(e) => handleTargetStudentsChange(e.target.value)}
                  onKeyDown={handleTargetInputKeyDown}
                  onBlur={() => {
                    const cleaned = dedupeCommaKeywords(targetStudents);
                    if (cleaned !== targetStudents) {
                      handleTargetStudentsChange(cleaned);
                    }
                  }}
                  placeholder="যেমন: HSC 28, বিজ্ঞান বিভাগ (লিখে Enter দিন অথবা নিচে ক্লিক করুন)"
                  className={`w-full px-3.5 py-2.5 pr-9 rounded-r-xl border text-xs sm:text-sm text-slate-800 bg-white outline-none shadow-2xs font-medium transition ${
                    batchError || !batchValidation.valid
                      ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100'
                      : 'border-slate-200/90 focus:border-[#eb1c24]'
                  }`}
                />
                {targetStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBatchKeyword}
                    title="লক্ষ্য শিক্ষার্থী টেক্সট মুছুন"
                    className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Batch Validation Error Alert (when multiple batches are typed manually) */}
              {(batchError || !batchValidation.valid) && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{batchError || batchValidation.error}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleTargetStudentsChange(removeBatchKeywordsFromText(targetStudents))
                    }
                    className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-[#b91c1c] hover:bg-rose-100 text-[10.5px] font-bold cursor-pointer shrink-0"
                  >
                    বর্তমান ব্যাচ মুছুন
                  </button>
                </div>
              )}

              {/* Clickable Target Batch & Group Selector Chips */}
              <div
                className="space-y-2.5 pt-1"
                role="group"
                aria-label="লক্ষ্য শিক্ষার্থী, ব্যাচ ও বিভাগ"
                onKeyDown={handleTargetChipGroupKeyDown}
              >
                <div>
                  <div className="text-[11px] font-bold text-[#6B4C4F] mb-1.5">
                    ১. টার্গেট ব্যাচ / শ্রেণি (Target Batch — যেকোনো ১টি নির্বাচন করুন):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BATCH_KEYWORD_OPTIONS.map((opt) => {
                      const isSelected = matchedBatches.some((b) => b.id === opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          data-target-chip="true"
                          onClick={() => handleBatchChipClick(opt)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Backspace' || e.key === 'Delete') && isSelected) {
                              e.preventDefault();
                              handleBatchChipClick(opt);
                            }
                          }}
                          aria-pressed={isSelected}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb1c24]/40 ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                              : 'bg-white text-[#2A0F12] border-rose-200/90 hover:border-[#eb1c24] hover:bg-rose-50/80 shadow-2xs'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          <span>{opt.label}</span>
                          <span
                            className={`text-[10px] font-medium ${
                              isSelected ? 'text-rose-100' : 'text-[#6B4C4F]'
                            }`}
                          >
                            ({opt.subLabel})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-[#6B4C4F] mb-1.5">
                    ২. বিভাগ ও ফোকাস ট্যাগ (Group / Department — শুধুমাত্র নির্বাচিত বিভাগেই দেখাবে):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPARTMENT_KEYWORD_OPTIONS.map((dept) => {
                      const isDeptActive = targetTokensLower.includes(normalizeKeywordToken(dept));
                      return (
                        <button
                          key={dept}
                          type="button"
                          data-target-chip="true"
                          onClick={() => handleDepartmentChipClick(dept)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Backspace' || e.key === 'Delete') && isDeptActive) {
                              e.preventDefault();
                              handleDepartmentChipClick(dept);
                            }
                          }}
                          aria-pressed={isDeptActive}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb1c24]/40 ${
                            isDeptActive
                              ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c24] shadow-sm'
                              : 'bg-white text-[#2A0F12] border-rose-200/90 hover:border-[#eb1c24] hover:bg-rose-50/80 shadow-2xs'
                          }`}
                        >
                          {isDeptActive && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          <span>{dept}</span>
                        </button>
                      );
                    })}

                    {customTargetTokens.map((customToken) => (
                      <button
                        key={customToken}
                        type="button"
                        data-target-chip="true"
                        onClick={() => handleRemoveCustomTargetToken(customToken)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' || e.key === 'Delete') {
                            e.preventDefault();
                            handleRemoveCustomTargetToken(customToken);
                          }
                        }}
                        aria-pressed={true}
                        title="রিমুভ করতে ক্লিক করুন"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb1c24]/40 bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{customToken}</span>
                        <X className="w-3 h-3 shrink-0 opacity-90" />
                      </button>
                    ))}
                  </div>
                </div>

                {targetMetadataSync.valid &&
                  (targetMetadataSync.targetBatch ||
                    targetMetadataSync.targetGroups.length > 0) && (
                    <div className="text-[11px] font-bold text-[#7A353B] bg-rose-50/75 border border-rose-200/80 rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        সক্রিয় ফিল্টারিং:{' '}
                        {targetMetadataSync.targetBatch
                          ? BATCH_KEYWORD_OPTIONS.find(
                              (b) => b.id === targetMetadataSync.targetBatch
                            )?.label || targetMetadataSync.targetBatch
                          : 'নির্দিষ্ট ব্যাচ নেই'}
                      </span>
                      {targetMetadataSync.targetGroups.length > 0 && (
                        <span>
                          • বিভাগ:{' '}
                          {targetMetadataSync.targetGroups
                            .map(
                              (g) => CANONICAL_GROUP_OPTIONS.find((o) => o.key === g)?.label || g
                            )
                            .join(', ')}
                        </span>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Dynamic Live Batch Text Field */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">
                লাইভ ব্যাচ ব্যাজ টেক্সট (Live Batch)
              </label>
              <div className="flex items-center relative">
                <span className="px-3 py-2.5 rounded-l-xl bg-amber-50 border border-r-0 border-slate-200 text-amber-600">
                  <Zap className="w-4 h-4 fill-amber-400 text-amber-500" />
                </span>
                <input
                  type="text"
                  value={shortBadge}
                  onChange={(e) => setShortBadge(e.target.value)}
                  placeholder="যেমন: লাইভ ব্যাচ চলমান"
                  className="w-full px-3.5 py-2.5 pr-9 rounded-r-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
                />
                {shortBadge.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShortBadge('')}
                    title="লাইভ ব্যাচ টেক্সট মুছুন"
                    className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['Online Batch', 'Cycle-1', 'Cycle 1-4'] as const).map((keyword) => {
                  const isSelected =
                    shortBadge.trim().toLowerCase() === keyword.toLowerCase();
                  return (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => setShortBadge(keyword)}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                          : 'bg-white text-[#2A0F12] border-rose-200/90 hover:border-[#eb1c24] hover:bg-rose-50/80 shadow-2xs'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      <span>{keyword}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Dynamic Course Info & Stats (Duration, Total Students, Course Rating) */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/50 pb-3">
              <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#eb1c24]" />
                <span>কোর্স তথ্য ও পরিসংখ্যান (Course Meta Info)</span>
              </h3>
              <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-[#991b1b]">
                Show More ডিটেইলসে প্রদর্শিত হবে
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Course Duration */}
              <div>
                <label
                  htmlFor="course-duration-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  কোর্সের মেয়াদ (Course Duration)
                </label>
                <div className="flex items-center relative">
                  <span className="px-2.5 py-2.5 rounded-l-xl bg-rose-50 border border-r-0 border-slate-200 text-[#b91c1c]">
                    <Clock className="w-4 h-4" />
                  </span>
                  <input
                    id="course-duration-input"
                    type="text"
                    maxLength={60}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="যেমন: ৬ মাস, ১ বছর"
                    className={`w-full px-3 py-2.5 pr-8 rounded-r-xl border text-xs sm:text-sm text-slate-800 bg-white outline-none shadow-2xs font-medium transition ${
                      !durationValidation.valid
                        ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100'
                        : 'border-slate-200/90 focus:border-[#eb1c24]'
                    }`}
                  />
                  {duration.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDuration('')}
                      title="মেয়াদ মুছুন"
                      className="absolute right-2 p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {!durationValidation.valid ? (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">
                    {durationValidation.error}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-[#6B4C4F] mt-1">
                    উদাহরণ: ৬ মাস, ১ বছর, ৩ মাস
                  </p>
                )}
              </div>

              {/* 2. Total Students */}
              <div>
                <label
                  htmlFor="course-students-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  শিক্ষার্থীর সংখ্যা (Total Students)
                </label>
                <div className="flex items-center relative">
                  <span className="px-2.5 py-2.5 rounded-l-xl bg-rose-50 border border-r-0 border-slate-200 text-[#b91c1c]">
                    <Users className="w-4 h-4" />
                  </span>
                  <input
                    id="course-students-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100000000}
                    step={1}
                    value={studentCountInput}
                    onChange={(e) => setStudentCountInput(e.target.value)}
                    placeholder="যেমন: 12500"
                    className={`w-full px-3 py-2.5 rounded-r-xl border text-xs sm:text-sm text-slate-800 bg-white outline-none shadow-2xs font-mono font-bold transition ${
                      !studentCountValidation.valid
                        ? 'border-rose-400 text-rose-700 focus:border-rose-500 ring-2 ring-rose-100'
                        : 'border-slate-200/90 focus:border-[#eb1c24]'
                    }`}
                  />
                </div>
                {!studentCountValidation.valid ? (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">
                    {studentCountValidation.error}
                  </p>
                ) : previewFormattedStudents ? (
                  <p className="text-[10.5px] font-bold text-emerald-700 mt-1 tabular-nums">
                    দেখাবে: {previewFormattedStudents}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-[#6B4C4F] mt-1">
                    শুধু সংখ্যা লিখুন (যেমন: 12500)
                  </p>
                )}
              </div>

              {/* 3. Course Rating */}
              <div>
                <label
                  htmlFor="course-rating-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  কোর্সের রেটিং (Rating: 0 – 5)
                </label>
                <div className="flex items-center relative">
                  <span className="px-2.5 py-2.5 rounded-l-xl bg-amber-50 border border-r-0 border-slate-200 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </span>
                  <input
                    id="course-rating-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={5}
                    step={0.1}
                    value={ratingInput}
                    onChange={(e) => setRatingInput(e.target.value)}
                    placeholder="যেমন: 4.9"
                    className={`w-full px-3 py-2.5 rounded-r-xl border text-xs sm:text-sm text-slate-800 bg-white outline-none shadow-2xs font-mono font-bold transition ${
                      !ratingValidation.valid
                        ? 'border-rose-400 text-rose-700 focus:border-rose-500 ring-2 ring-rose-100'
                        : 'border-slate-200/90 focus:border-[#eb1c24]'
                    }`}
                  />
                </div>
                {!ratingValidation.valid ? (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">
                    {ratingValidation.error}
                  </p>
                ) : previewFormattedRating ? (
                  <p className="text-[10.5px] font-bold text-amber-800 mt-1 tabular-nums">
                    দেখাবে: ★ {previewFormattedRating} রেটিং
                  </p>
                ) : (
                  <p className="text-[10.5px] text-[#6B4C4F] mt-1">
                    ০ থেকে ৫-এর মধ্যে (যেমন: 4.9)
                  </p>
                )}
              </div>
            </div>

            {/* Live Formatted Pill Preview matching Show More Modal */}
            <div className="rounded-2xl bg-rose-50/55 border border-rose-200/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#6B4C4F]">
                ডিটেইলস সেকশন প্রিভিউ:
              </span>
              {previewFormattedDuration || previewFormattedStudents || previewFormattedRating ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#4A2C2F] tabular-nums">
                  {previewFormattedDuration && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-rose-200/80">
                      <Clock className="w-3 h-3 text-[#b91c1c]" />
                      <span>মেয়াদ: {previewFormattedDuration}</span>
                    </span>
                  )}
                  {previewFormattedStudents && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-rose-200/80">
                      <Users className="w-3 h-3 text-[#b91c1c]" />
                      <span>{previewFormattedStudents}</span>
                    </span>
                  )}
                  {previewFormattedRating && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/90 text-amber-900">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                      <span>{previewFormattedRating} রেটিং</span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-[#6B4C4F] italic">
                  কোনো তথ্য দেওয়া হয়নি — খালি ফিল্ডগুলো ওয়েবসাইটে প্রদর্শিত হবে না।
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Pricing & Affiliate Links */}
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
                    if (originalPriceInput !== '') {
                      setOriginalPriceInput(sanitizePriceInput(originalPriceInput));
                    }
                  }}
                  placeholder="যেমন: 4500"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ডিসকাউন্টেড অফার মূল্য (Discount Price - ৳){' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={discountPriceInput}
                  onChange={(e) => setDiscountPriceInput(sanitizePriceInput(e.target.value))}
                  onBlur={() => {
                    if (discountPriceInput !== '') {
                      setDiscountPriceInput(sanitizePriceInput(discountPriceInput));
                    }
                  }}
                  placeholder="যেমন: 2500"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm bg-white outline-none shadow-2xs font-mono font-bold ${
                    isPriceInvalid
                      ? 'border-rose-400 text-rose-700 focus:border-rose-500 ring-2 ring-rose-100'
                      : 'border-slate-200/90 text-emerald-600 focus:border-[#eb1c24]'
                  }`}
                />
              </div>
            </div>

            {/* Inline Invalid Price Validation */}
            {isPriceInvalid && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{pricingValidation.error}</span>
              </div>
            )}

            {/* Computed Savings Summary Pill */}
            {!isPriceInvalid && (
              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
                  computedDiscountPercent > 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50/90 border-slate-200 text-slate-700'
                }`}
              >
                {computedDiscountPercent > 0 ? (
                  <>
                    <span>
                      মোট ছাড়: ৳{toBengaliNumber(computedFlatSavings)} (
                      {toBengaliNumber(computedDiscountPercent)}%)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      কার্ডের উপরের বাম কোণে “{toBengaliNumber(computedDiscountPercent)}% ছাড়” ব্যাজ দেখাবে
                    </span>
                  </>
                ) : (
                  <>
                    <span>কোনো ডিসকাউন্ট নির্ধারিত নেই (০%)</span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      ছাড় না থাকায় কার্ডে অপ্রয়োজনীয় ডিসকাউন্ট ব্যাজ দেখাবে না
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Affiliate / Enrollment URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ভর্তি / এফিলিয়েট লিংক (Affiliate / Enrollment Target URL){' '}
                <span className="text-red-500">*</span>
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
                  placeholder="https://10minuteschool.com/product/course-name"
                  className="w-full px-3.5 py-2.5 rounded-r-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-[#6B4C4F] mt-1">
                শিক্ষার্থী &lsquo;কোর্সে ভর্তি হোন&rsquo; বাটনে ক্লিক করলে সরাসরি এই লিংকে চলে যাবে।
              </p>
            </div>
          </div>

          {/* Card 3: Media & Image Settings */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>কোর্স থাম্বনেইল ছবি (Course Thumbnail Image)</span>
            </h3>

            {/* Image URL & File Upload */}
            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    ১. ইমেজ লিংক (CDN Image URL) অথবা ২. কম্পিউটার থেকে ছবি আপলোড (Upload Image):
                  </label>
                  <span className="text-[11px] font-medium text-[#6B4C4F]">
                    Recommended: 1200 × 675 px (16:9)
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://ik.imagekit.io/... অথবা https://cdn.10minuteschool.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                    />
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 shadow-2xs disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{uploadingImage ? 'ImageKit-এ আপলোড হচ্ছে...' : 'ImageKit-এ আপলোড'}</span>
                  </button>
                </div>
              </div>

              {/* Live Thumbnail Preview Box */}
              {imageUrl ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Thumbnail Preview"
                      className="w-24 aspect-video object-contain rounded-lg border border-slate-300 shadow-2xs bg-white shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>লাইভ CDN ইমেজ সংযুক্ত হয়েছে</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs sm:max-w-md">
                        {imageUrl}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer shrink-0"
                    title="ছবি মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center text-xs text-slate-500">
                  কোনো ছবি নির্বাচন করা হয়নি। HTTPS CDN লিঙ্ক দিন অথবা কম্পিউটার থেকে ImageKit-এ ছবি আপলোড করুন।
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

          {/* Card 4: Dynamic Course Features & Details */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <Tag className="w-4 h-4 text-rose-600" />
              <span>কোর্স ফিচার ও বিস্তারিত ম্যানেজমেন্ট (Course Features &amp; Details)</span>
            </h3>

            {/* Structured Dynamic Course Features Manager */}
            <CourseFeaturesManager
              mode="controlled"
              items={courseFeatures}
              onChange={setCourseFeatures}
              courseId={course?.id}
              courseTitle={title}
              existingCourses={existingCourses}
              categories={categories}
              onUnauthorized={onUnauthorized}
              onShowToast={onShowToast}
            />

            {/* Full Course Description (Displayed inside Show More Modal) */}
            <div className="pt-3 border-t border-rose-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                কোর্স সম্পর্কে বিস্তারিত (Show More Modal-এ প্রদর্শিত হবে)
              </label>
              <textarea
                rows={3}
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                placeholder="কোর্সের সম্পূর্ণ বিবরণ, কারিকুলাম, ক্লাসের সময়সূচি বা বিশেষ নির্দেশনা এখানে লিখুন..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
              />
            </div>

            {/* Optional SEO / Search Summary Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                অতিরিক্ত সংক্ষিপ্ত নোট / SEO সারাংশ (ঐচ্ছিক)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="খালি রাখলে উপরের সক্রিয় ফিচারসমূহ থেকে স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
              />
            </div>

            {/* 3-State Course Status (Option 2 Public Visibility Policy) */}
            <div className="pt-3 border-t border-rose-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                কোর্সের প্রকাশনা স্ট্যাটাস (Course Visibility Status):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: 'active',
                      label: 'চালু (Active)',
                      hint: 'পাবলিক সাইটে ভর্তি চালু',
                      activeClass: 'bg-emerald-50 border-emerald-400 text-emerald-900',
                    },
                    {
                      value: 'closed',
                      label: 'ভর্তি বন্ধ (Closed)',
                      hint: '“ভর্তি বন্ধ” ব্যাজসহ দৃশ্যমান',
                      activeClass: 'bg-amber-50 border-amber-400 text-amber-900',
                    },
                    {
                      value: 'inactive',
                      label: 'লুকানো (Inactive)',
                      hint: 'পাবলিক সাইটে অদৃশ্য',
                      activeClass: 'bg-slate-100 border-slate-400 text-slate-900',
                    },
                  ] as const
                ).map((opt) => {
                  const selected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      aria-pressed={selected}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        selected
                          ? `${opt.activeClass} shadow-xs ring-1 ring-inset ring-current/15`
                          : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50/40'
                      }`}
                    >
                      <div className="text-xs font-black">{opt.label}</div>
                      <div className="text-[10.5px] opacity-80 mt-0.5">{opt.hint}</div>
                    </button>
                  );
                })}
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
                  whatsappNumber={whatsappNumber}
                  whatsappLink={whatsappLink}
                  onEnrollClick={() => {
                    const target = affiliateUrl.trim();
                    if (target) {
                      window.open(target, '_blank', 'noopener,noreferrer');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Error Banner + Action Buttons Below Preview Card */}
          {error && (
            <div className="lg:hidden p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="lg:hidden glass-strong rounded-3xl p-4 sm:p-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleBackToList}
              disabled={saving}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-200 bg-white/90 hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 text-[#2A0F12] font-bold text-xs transition cursor-pointer shadow-2xs text-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={saving}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isEditing ? 'Save' : 'Publish'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
