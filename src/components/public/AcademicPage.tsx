import React, { useState, useMemo, useEffect } from 'react';
import { Course } from '../../types.ts';
import { CourseCard } from './CourseCard.tsx';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  Search,
  Sparkles,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Atom,
  Briefcase,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';

export type AcademicLevel = 'ssc' | 'hsc' | 'class';
export type DepartmentType = 'all' | 'science' | 'business' | 'humanities';

interface AcademicPageProps {
  level: AcademicLevel;
  batchOrClass: string; // e.g. 'ssc-27', 'ssc-28', 'hsc-26', 'hsc-27', 'hsc-28', 'class6', 'class7', 'class8', 'class9', 'class10'
  courses: Course[];
  onNavigate: (path: string, options?: { noScroll?: boolean }) => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  sectionHash?: string;
}

interface ToggleOption {
  id: string;
  label: string;
  subLabel?: string;
  path: string;
}

export const AcademicPage: React.FC<AcademicPageProps> = ({
  level,
  batchOrClass,
  courses,
  onNavigate,
  onEnrollClick,
  sectionHash,
}) => {
  const [selectedDept, setSelectedDept] = useState<DepartmentType>('all');
  const [activeHash, setActiveHash] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');

  // Synchronize department selection from URL hash smoothly with ZERO page scrolling
  useEffect(() => {
    const rawHash = (sectionHash || (typeof window !== 'undefined' ? window.location.hash : '')).replace('#', '');
    if (rawHash === 'science' || rawHash === 'business-studies' || rawHash === 'humanities') {
      setActiveHash(rawHash);
      if (rawHash === 'science') setSelectedDept('science');
      else if (rawHash === 'business-studies') setSelectedDept('business');
      else if (rawHash === 'humanities') setSelectedDept('humanities');
    } else {
      setActiveHash('');
      setSelectedDept('all');
    }
  }, [sectionHash, batchOrClass]);

  // Define toggle buttons per academic level
  const toggleOptions: ToggleOption[] = useMemo(() => {
    if (level === 'ssc') {
      return [
        { id: 'ssc-27', label: 'SSC 2027', subLabel: 'দশম শ্রেণি', path: '/ssc/ssc-27' },
        { id: 'ssc-28', label: 'SSC 2028', subLabel: 'নবম শ্রেণি', path: '/ssc/ssc-28' },
      ];
    }
    if (level === 'hsc') {
      return [
        { id: 'hsc-26', label: 'HSC 26', subLabel: 'এডমিশন ও টেস্ট পেপার', path: '/hsc/hsc-26' },
        { id: 'hsc-27', label: 'HSC 27', subLabel: '২য় বর্ষ রিভিশন', path: '/hsc/hsc-27' },
        { id: 'hsc-28', label: 'HSC 28', subLabel: '১ম বর্ষ ব্যাচ', path: '/hsc/hsc-28' },
      ];
    }
    // Junior school: Class 6, 7, 8
    return [
      { id: 'class6', label: 'Class 6', subLabel: '৬ষ্ঠ শ্রেণি', path: '/class-6' },
      { id: 'class7', label: 'Class 7', subLabel: '৭ম শ্রেণি', path: '/class-7' },
      { id: 'class8', label: 'Class 8', subLabel: '৮ম শ্রেণি', path: '/class-8' },
    ];
  }, [level]);

  // Compute page heading details
  const pageDetails = useMemo(() => {
    if (level === 'ssc') {
      const isSsc27 = batchOrClass === 'ssc-27';
      return {
        badge: isSsc27 ? 'SSC ২০২৭ প্রস্তুতি (দশম শ্রেণি)' : 'SSC ২০২৮ প্রস্তুতি (নবম শ্রেণি)',
        title: isSsc27 ? 'SSC 2027 একাডেমিক অনলাইন ব্যাচ' : 'SSC 2028 একাডেমিক অনলাইন ব্যাচ',
        subtitle: isSsc27
          ? '১০ম শ্রেণি ও এসএসসি ২০২৭ পরীক্ষার্থীদের জন্য বিষয়ভিত্তিক লাইভ ক্লাস, মডেল টেস্ট ও বোর্ড রিভিশন।'
          : '৯ম শ্রেণি (SSC ২০২৮) শিক্ষার্থীদের জন্য নতুন কারিকুলাম ও বোর্ড সিলেবাসের গোছানো অনলাইন ব্যাচ।',
        activeName: isSsc27 ? 'SSC 2027' : 'SSC 2028',
      };
    }
    if (level === 'hsc') {
      let bTitle = 'HSC 28';
      let bSub = 'HSC ২০২৮ ব্যাচ এর সম্পূর্ণ সাইকেল কভারেজ ও ফুল ইয়ার লাইভ ক্লাস';
      if (batchOrClass === 'hsc-26') {
        bTitle = 'HSC 26';
        bSub = 'HSC ২০২৬ পরীক্ষার্থীদের শেষ মুহূর্তের টেস্ট পেপার সলভিং ও পূর্ণাঙ্গ বিশ্ববিদ্যালয় এডমিশন প্রস্তুতি';
      } else if (batchOrClass === 'hsc-27') {
        bTitle = 'HSC 27';
        bSub = 'HSC ২০২৭ ২য় বর্ষের বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা পূর্ণাঙ্গ সিলেবাস রিভিশন ও মডেল টেস্ট';
      }
      return {
        badge: `${bTitle} অনলাইন ব্যাচ ও সেকশন`,
        title: `${bTitle} একাডেমিক অনলাইন প্রোগ্রাম`,
        subtitle: bSub,
        activeName: bTitle,
      };
    }

    // class 6 - 8
    const classNum = batchOrClass.replace('class', '');
    const ordinalMap: Record<string, string> = {
      '6': '৬ষ্ঠ',
      '7': '৭ম',
      '8': '৮ম',
    };
    const bengaliOrdinal = ordinalMap[classNum] || `${toBengaliNumber(parseInt(classNum, 10) || 6)}ষ্ঠ`;
    return {
      badge: `${bengaliOrdinal} শ্রেণি একাডেমিক`,
      title: `${bengaliOrdinal} শ্রেণি অনলাইন ব্যাচ ও বার্ষিক প্রস্তুতি`,
      subtitle: `জাতীয় শিক্ষাক্রমের আলোকে ${bengaliOrdinal} শ্রেণির সকল বিষয়ের গোছানো লাইভ ক্লাস ও নিয়মিত মূল্যায়ন পরীক্ষা।`,
      activeName: `Class ${classNum}`,
    };
  }, [level, batchOrClass]);

  // Filter courses strictly for this active batch/class
  const batchCourses = useMemo(() => {
    return courses.filter((c) => {
      const text = `${c.title} ${c.slug} ${c.headerTitle} ${c.headerSubtitle} ${c.targetStudents || ''} ${c.description} ${c.categorySlug}`.toLowerCase();

      if (level === 'ssc') {
        if (batchOrClass === 'ssc-27') {
          return (
            text.includes('ssc 27') ||
            text.includes('ssc-27') ||
            text.includes('ssc ২০২৭') ||
            text.includes('১০ম') ||
            text.includes('class-10') ||
            text.includes('দশম')
          );
        }
        if (batchOrClass === 'ssc-28') {
          return (
            text.includes('ssc 28') ||
            text.includes('ssc-28') ||
            text.includes('ssc ২০২৮') ||
            text.includes('৯ম') ||
            text.includes('class-9') ||
            text.includes('নবম')
          );
        }
      }

      if (level === 'hsc') {
        if (batchOrClass === 'hsc-26') {
          return (
            text.includes('hsc 26') ||
            text.includes('hsc-26') ||
            text.includes('hsc ২৬') ||
            text.includes('hsc ২০২৬') ||
            text.includes('varsity') ||
            text.includes('admission') ||
            text.includes('এডমিশন') ||
            text.includes('মেডিকেল') ||
            text.includes('বুয়েট') ||
            text.includes('buet')
          );
        }
        if (batchOrClass === 'hsc-27') {
          return (
            text.includes('hsc 27') ||
            text.includes('hsc-27') ||
            text.includes('hsc ২৭') ||
            text.includes('hsc ২০২৭')
          );
        }
        if (batchOrClass === 'hsc-28') {
          return (
            text.includes('hsc 28') ||
            text.includes('hsc-28') ||
            text.includes('hsc ২৮') ||
            text.includes('hsc ২০২৮')
          );
        }
      }

      if (level === 'class') {
        if (batchOrClass === 'class6') {
          return text.includes('৬ষ্ঠ') || text.includes('class 6') || text.includes('class-6');
        }
        if (batchOrClass === 'class7') {
          return text.includes('৭ম') || text.includes('class 7') || text.includes('class-7');
        }
        if (batchOrClass === 'class8') {
          return text.includes('৮ম') || text.includes('class 8') || text.includes('class-8');
        }
        if (batchOrClass === 'class9') {
          return (
            text.includes('৯ম') ||
            text.includes('class 9') ||
            text.includes('class-9') ||
            text.includes('ssc 28') ||
            text.includes('ssc-28')
          );
        }
        if (batchOrClass === 'class10') {
          return (
            text.includes('১০ম') ||
            text.includes('class 10') ||
            text.includes('class-10') ||
            text.includes('ssc 27') ||
            text.includes('ssc-27') ||
            text.includes('দশম')
          );
        }
      }

      return false;
    });
  }, [level, batchOrClass, courses]);

  // Helper to determine departments for a course
  const getCourseDepartments = (c: Course): ('science' | 'business' | 'humanities')[] => {
    const text = `${c.title} ${c.slug} ${c.headerTitle} ${c.headerSubtitle} ${c.targetStudents || ''} ${c.description}`.toLowerCase();

    const isBusiness =
      text.includes('ব্যবসায়') ||
      text.includes('বাণিজ্য') ||
      text.includes('কমার্শ') ||
      text.includes('commerce') ||
      text.includes('business') ||
      text.includes('হিসাববিজ্ঞান') ||
      text.includes('ফিন্যান্স') ||
      text.includes('c-unit') ||
      text.includes('গ’ ইউনিট');

    const isHumanities =
      text.includes('মানবিক') ||
      text.includes('আর্টস') ||
      text.includes('humanities') ||
      text.includes('arts') ||
      text.includes('ইতিহাস') ||
      text.includes('পৌরনীতি') ||
      text.includes('ভূগোল') ||
      text.includes('অর্থনীতি');

    const isScience =
      text.includes('বিজ্ঞান') ||
      text.includes('সায়েন্স') ||
      text.includes('science') ||
      text.includes('pcmb') ||
      text.includes('physics') ||
      text.includes('chem') ||
      text.includes('biology') ||
      text.includes('পদার্থ') ||
      text.includes('রসায়ন') ||
      text.includes('উচ্চতর গণিত') ||
      text.includes('বুয়েট') ||
      text.includes('মেডিকেল') ||
      text.includes('ভার্সিটি ‘ক’') ||
      text.includes('টেস্ট পেপার');

    const depts: ('science' | 'business' | 'humanities')[] = [];
    if (isScience) depts.push('science');
    if (isBusiness) depts.push('business');
    if (isHumanities) depts.push('humanities');

    // General or foundational courses apply to all 3 departments
    if (depts.length === 0 || text.includes('bei') || text.includes('বাংলা, ইংরেজি') || text.includes('মাস্টারক্লাস')) {
      return ['science', 'business', 'humanities'];
    }

    return depts;
  };

  // Only HSC has the 3 dedicated department sections (Science, Business Studies, Humanities)
  const hasDepartments = level === 'hsc';

  // Base route path for current academic year / class
  const currentBaseRoute = useMemo(() => {
    if (level === 'hsc') return `/hsc/${batchOrClass}`;
    if (level === 'ssc') return `/ssc/${batchOrClass}`;
    const classNum = batchOrClass.replace('class', '');
    return `/class-${classNum}`;
  }, [level, batchOrClass]);

  // Dedicated course lists per department
  const scienceCourses = useMemo(() => {
    return batchCourses.filter((c) => getCourseDepartments(c).includes('science'));
  }, [batchCourses]);

  const businessCourses = useMemo(() => {
    return batchCourses.filter((c) => getCourseDepartments(c).includes('business'));
  }, [batchCourses]);

  const humanitiesCourses = useMemo(() => {
    return batchCourses.filter((c) => getCourseDepartments(c).includes('humanities'));
  }, [batchCourses]);

  // Search filtered courses per department
  const filteredScienceCourses = useMemo(() => {
    if (!searchQuery.trim()) return scienceCourses;
    const q = searchQuery.toLowerCase();
    return scienceCourses.filter((c) =>
      `${c.title} ${c.slug} ${c.description || ''}`.toLowerCase().includes(q)
    );
  }, [scienceCourses, searchQuery]);

  const filteredBusinessCourses = useMemo(() => {
    if (!searchQuery.trim()) return businessCourses;
    const q = searchQuery.toLowerCase();
    return businessCourses.filter((c) =>
      `${c.title} ${c.slug} ${c.description || ''}`.toLowerCase().includes(q)
    );
  }, [businessCourses, searchQuery]);

  const filteredHumanitiesCourses = useMemo(() => {
    if (!searchQuery.trim()) return humanitiesCourses;
    const q = searchQuery.toLowerCase();
    return humanitiesCourses.filter((c) =>
      `${c.title} ${c.slug} ${c.description || ''}`.toLowerCase().includes(q)
    );
  }, [humanitiesCourses, searchQuery]);

  // Filtered batch courses for classes without departments (Class 6 - 8)
  const filteredBatchCourses = useMemo(() => {
    let list = batchCourses;
    if (selectedDept !== 'all') {
      list = list.filter((c) => getCourseDepartments(c).includes(selectedDept));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        `${c.title} ${c.slug} ${c.description || ''}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [batchCourses, selectedDept, searchQuery]);

  // Switch department tab smoothly with ZERO page scrolling (in-place tab state)
  const handleDepartmentJump = (dept: 'science' | 'business-studies' | 'humanities' | '') => {
    setActiveHash(dept);
    if (dept === 'science') setSelectedDept('science');
    else if (dept === 'business-studies') setSelectedDept('business');
    else if (dept === 'humanities') setSelectedDept('humanities');
    else setSelectedDept('all');

    const targetHash = dept ? `#${dept}` : '';
    const fullPath = `${currentBaseRoute}${targetHash}`;

    // Silently update address bar URL without triggering browser native jump/scroll
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', fullPath);
    }
    onNavigate(fullPath, { noScroll: true });
  };

  return (
    <div className="min-h-screen pb-28 md:pb-16">
      {/* HERO SECTION: WARM LIGHT GLASS-SHADE THEME */}
      <section className="relative pt-8 sm:pt-10 pb-12 sm:pb-16 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-6 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="hover:text-[#E22B2B] transition-colors cursor-pointer"
            >
              হোম
            </button>
            <span className="text-rose-300">/</span>
            <span className="text-[#6B4C4F]">
              {level === 'hsc' ? 'এইচএসসি (HSC)' : level === 'ssc' ? 'এসএসসি (SSC)' : 'স্কুল'}
            </span>
            <span className="text-rose-300">/</span>
            <span className="text-[#B91C1C] font-bold">{pageDetails.activeName}</span>
          </div>

          {/* Centered Heading */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-inset text-[#B91C1C] text-xs font-bold mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E22B2B]" />
              <span>{pageDetails.badge}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#2A0F12] tracking-tight mb-3">
              {pageDetails.title.split(' ')[0]}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] via-rose-600 to-[#B91C1C]">
                {pageDetails.title.split(' ').slice(1).join(' ')}
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-[#6B4C4F] font-normal leading-relaxed max-w-2xl mx-auto">
              {pageDetails.subtitle}
            </p>
          </motion.div>

          {/* DEDICATED TOGGLE PILL FOR ACADEMIC YEARS / CLASSES */}
          <div className="flex items-center justify-center mb-6 w-full px-1">
            <div className="flex items-center gap-1.5 sm:gap-2.5 p-1.5 sm:p-2 rounded-2xl glass-strong max-w-full overflow-x-auto no-scrollbar scroll-smooth justify-start sm:justify-center mx-auto shadow-sm">
              {toggleOptions.map((opt) => {
                const isActive = opt.id === batchOrClass;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (!isActive) {
                        onNavigate(opt.path);
                      }
                    }}
                    className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-lg shadow-red-500/25 scale-[1.02]'
                        : 'glass-inset text-[#2A0F12] hover:bg-white/90 hover:text-[#B91C1C]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.subLabel && (
                      <span
                        className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md shrink-0 ${
                          isActive
                            ? 'bg-black/20 text-rose-50'
                            : 'bg-rose-500/10 text-[#6B4C4F]'
                        }`}
                      >
                        {opt.subLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK SECTION / FILTER NAVIGATION STRIP (Fixed & Stationary) */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 -mt-6 sm:-mt-7 relative z-30 sticky top-[68px] sm:top-[74px]">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-rose-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {level === 'hsc' ? (
            /* HSC DEPARTMENT TABS */
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar scroll-smooth w-full md:w-auto">
              {/* All */}
              <button
                type="button"
                onClick={() => handleDepartmentJump('')}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                  selectedDept === 'all'
                    ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                }`}
              >
                <span>সকল বিভাগ (All)</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                    selectedDept === 'all'
                      ? 'bg-black/15 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {toBengaliNumber(batchCourses.length)}
                </span>
              </button>

              {/* Science */}
              <button
                type="button"
                onClick={() => handleDepartmentJump('science')}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                  selectedDept === 'science'
                    ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                }`}
              >
                <Atom className="w-3.5 h-3.5" />
                <span>Science (বিজ্ঞান)</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                    selectedDept === 'science'
                      ? 'bg-black/15 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {toBengaliNumber(scienceCourses.length)}
                </span>
              </button>

              {/* Business Studies */}
              <button
                type="button"
                onClick={() => handleDepartmentJump('business-studies')}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                  selectedDept === 'business'
                    ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Business Studies (ব্যবসায় শিক্ষা)</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                    selectedDept === 'business'
                      ? 'bg-black/15 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {toBengaliNumber(businessCourses.length)}
                </span>
              </button>

              {/* Humanities */}
              <button
                type="button"
                onClick={() => handleDepartmentJump('humanities')}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                  selectedDept === 'humanities'
                    ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Humanities (মানবিক)</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                    selectedDept === 'humanities'
                      ? 'bg-black/15 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {toBengaliNumber(humanitiesCourses.length)}
                </span>
              </button>
            </div>
          ) : level === 'ssc' ? (
            /* SSC SUBJECT / STREAM FILTER TABS */
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar scroll-smooth w-full md:w-auto">
              <button
                type="button"
                onClick={() => setSelectedDept('all')}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                  selectedDept === 'all'
                    ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                }`}
              >
                <span>সকল বিষয় ও কোর্স</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                    selectedDept === 'all'
                      ? 'bg-black/15 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {toBengaliNumber(batchCourses.length)}
                </span>
              </button>

              {scienceCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDept('science')}
                  className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                    selectedDept === 'science'
                      ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                  }`}
                >
                  <Atom className="w-3.5 h-3.5" />
                  <span>বিজ্ঞান বিভাগ</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      selectedDept === 'science'
                        ? 'bg-black/15 text-white'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {toBengaliNumber(scienceCourses.length)}
                  </span>
                </button>
              )}

              {businessCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDept('business')}
                  className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                    selectedDept === 'business'
                      ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>ব্যবসায় শিক্ষা</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      selectedDept === 'business'
                        ? 'bg-black/15 text-white'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {toBengaliNumber(businessCourses.length)}
                  </span>
                </button>
              )}

              {humanitiesCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDept('humanities')}
                  className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                    selectedDept === 'humanities'
                      ? 'border-red-600 bg-gradient-to-r from-[#eb1c24] to-[#b91c1c] text-white shadow-md shadow-red-500/20'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-300 hover:text-[#eb1c24] hover:bg-rose-50/40 shadow-2xs'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>মানবিক বিভাগ</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      selectedDept === 'humanities'
                        ? 'bg-black/15 text-white'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {toBengaliNumber(humanitiesCourses.length)}
                  </span>
                </button>
              )}
            </div>
          ) : (
            /* CLASS 6, 7, 8 - NO DEPARTMENT FILTERS, JUST CLEAN SUBJECT LABEL */
            <div className="flex items-center gap-2">
              <div className="px-3.5 sm:px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[#b91c1c] text-xs sm:text-sm font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#eb1c24]" />
                <span>{pageDetails.activeName} সকল বিষয় ও কোর্স</span>
                <span className="bg-[#b91c1c] text-white px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                  {toBengaliNumber(filteredBatchCourses.length)}টি
                </span>
              </div>
            </div>
          )}

          {/* Search box inside filter */}
          <div className="relative w-full md:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কোর্সের নাম লিখুন..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#eb1c24] outline-none transition"
            />
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* DEDICATED DEPARTMENT SECTIONS (Science, Business, Humanities) */}
      {/* ======================================================== */}
      {hasDepartments ? (
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-10 space-y-12">
          
          {/* SECTION 1: SCIENCE */}
          {(selectedDept === 'all' || selectedDept === 'science') && (
            <section
              id="dept-section-science"
              className={`rounded-3xl p-5 sm:p-7 bg-white/70 border transition-all ${
                selectedDept === 'science'
                  ? 'border-[#eb1c24] ring-2 ring-rose-400/30 shadow-lg'
                  : 'border-rose-100/80 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-rose-100/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#eb1c24] shrink-0">
                    <Atom className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        বিজ্ঞান বিভাগ (Science)
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-[#b91c1c]">
                        {toBengaliNumber(filteredScienceCourses.length)}টি কোর্স
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      পদার্থবিজ্ঞান, রসায়ন, গণিত, জীববিজ্ঞান ও পূর্ণাঙ্গ সাইকেল কোর্সসমূহ
                    </p>
                  </div>
                </div>
              </div>

              {filteredScienceCourses.length === 0 ? (
                <div className="text-center py-10 bg-white/60 rounded-2xl border border-dashed border-rose-200 p-6">
                  <p className="text-sm font-bold text-slate-700">এই বিভাগে কোনো কোর্স তালিকাভুক্ত নেই</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {filteredScienceCourses.map((c) => (
                    <CourseCard key={`sci-${c.id}-${c.slug}`} course={c} onEnrollClick={onEnrollClick} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION 2: BUSINESS STUDIES */}
          {(selectedDept === 'all' || selectedDept === 'business') && (
            <section
              id="dept-section-business-studies"
              className={`rounded-3xl p-5 sm:p-7 bg-white/70 border transition-all ${
                selectedDept === 'business'
                  ? 'border-amber-500 ring-2 ring-amber-400/30 shadow-lg'
                  : 'border-amber-100/80 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-amber-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        ব্যবসায় শিক্ষা বিভাগ (Business Studies)
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {toBengaliNumber(filteredBusinessCourses.length)}টি কোর্স
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      হিসাববিজ্ঞান, ফিন্যান্স, ব্যবসায় সংগঠন ও ব্যবস্থাপনা কোর্সসমূহ
                    </p>
                  </div>
                </div>
              </div>

              {filteredBusinessCourses.length === 0 ? (
                <div className="text-center py-10 bg-white/60 rounded-2xl border border-dashed border-amber-200 p-6">
                  <p className="text-sm font-bold text-slate-700">এই বিভাগে কোনো কোর্স তালিকাভুক্ত নেই</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {filteredBusinessCourses.map((c) => (
                    <CourseCard key={`bus-${c.id}-${c.slug}`} course={c} onEnrollClick={onEnrollClick} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION 3: HUMANITIES */}
          {(selectedDept === 'all' || selectedDept === 'humanities') && (
            <section
              id="dept-section-humanities"
              className={`rounded-3xl p-5 sm:p-7 bg-white/70 border transition-all ${
                selectedDept === 'humanities'
                  ? 'border-emerald-500 ring-2 ring-emerald-400/30 shadow-lg'
                  : 'border-emerald-100/80 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-emerald-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        মানবিক বিভাগ (Humanities)
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {toBengaliNumber(filteredHumanitiesCourses.length)}টি কোর্স
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      অর্থনীতি, পৌরনীতি, যুক্তিবিদ্যা, ইতিহাস ও সাধারণ মানবিক বিষয়সমূহ
                    </p>
                  </div>
                </div>
              </div>

              {filteredHumanitiesCourses.length === 0 ? (
                <div className="text-center py-10 bg-white/60 rounded-2xl border border-dashed border-emerald-200 p-6">
                  <p className="text-sm font-bold text-slate-700">এই বিভাগে কোনো কোর্স তালিকাভুক্ত নেই</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {filteredHumanitiesCourses.map((c) => (
                    <CourseCard key={`hum-${c.id}-${c.slug}`} course={c} onEnrollClick={onEnrollClick} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        /* STANDARD COURSES GRID FOR CLASSES WITHOUT DEPARTMENTS (Class 6 - 8) */
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight flex items-center gap-2">
                <span>{pageDetails.activeName} সকল কোর্স ও অনলাইন ব্যাচ</span>
                <span className="text-xs font-extrabold text-[#B91C1C] glass-inset px-2.5 py-0.5 rounded-full">
                  {toBengaliNumber(filteredBatchCourses.length)}টি কোর্স
                </span>
              </h2>
            </div>
          </div>

          {filteredBatchCourses.length === 0 ? (
            <div className="glass-surface rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl glass-inset text-[#E22B2B] flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#2A0F12]">এই ক্যাটাগরিতে কোনো কোর্স পাওয়া যায়নি</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
              {filteredBatchCourses.map((course, idx) => (
                <motion.div
                  key={`academic-course-${course.id}-${course.slug}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className="h-full flex flex-col"
                >
                  <CourseCard course={course} onEnrollClick={onEnrollClick} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
