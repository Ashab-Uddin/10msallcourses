'use client';

import React from 'react';
import {
  Activity,
  Atom,
  BarChart3,
  BookOpen,
  Briefcase,
  Calculator,
  Coins,
  Compass,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  LineChart,
  Magnet,
  Microscope,
  Orbit,
  PieChart,
  Scale,
  ScrollText,
  TestTubes,
  TrendingUp,
  Waves,
} from 'lucide-react';

interface ScienceBackdropAccentProps {
  variant?: 'physics-chemistry' | 'humanities' | 'business' | 'science';
  layout?: 'right' | 'symmetrical';
  className?: string;
}

/**
 * Light, minimal category-themed ambient decoration for empty spaces
 * in Tablet (md) and Laptop/Desktop (lg+) category headers.
 * Uses only lucide-react icons + pure CSS geometry to stay 100% consistent with the
 * warm frosted rose-cream glass theme without altering layout or content.
 */
export const ScienceBackdropAccent: React.FC<ScienceBackdropAccentProps> = ({
  variant = 'physics-chemistry',
  layout = 'right',
  className = '',
}) => {
  if (layout === 'symmetrical') {
    if (variant === 'humanities') {
      return (
        <div
          aria-hidden="true"
          className={`pointer-events-none select-none hidden md:flex items-center justify-between absolute inset-y-0 inset-x-3 lg:inset-x-6 z-0 overflow-hidden ${className}`}
        >
          {/* Left Flank: Geography, Civics & World Cluster */}
          <div className="flex items-center gap-2.5 lg:gap-3.5 relative opacity-85">
            <div
              className="absolute -inset-4 rounded-full opacity-50 blur-xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(226,43,43,0.12) 0%, rgba(255,228,230,0.04) 68%, transparent 100%)',
              }}
            />

            <div className="relative w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border border-dashed border-[#E22B2B]/22" />
              <div className="absolute inset-2 rounded-full border border-[#B91C1C]/12 rotate-45" />
              <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E22B2B]/35" />
              <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B91C1C]/30" />

              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-2xl bg-white/60 border border-white/85 shadow-[0_8px_20px_-8px_rgba(185,28,28,0.18)] flex items-center justify-center text-[#B91C1C]/38">
                <Globe2 className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[1.6]" />
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-start gap-1.5 relative">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/34 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
                  ২৩.৫° N
                </span>
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/28 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                  GDP · CPI
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-xl bg-white/50 border border-white/80 flex items-center justify-center text-[#B91C1C]/30 -rotate-6">
                  <Compass className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
                <div className="w-7 h-7 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#E22B2B]/30">
                  <ScrollText className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
                <span className="text-[9.5px] font-bold tracking-wide text-[#6B4C4F]/42 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                  ভূগোল
                </span>
              </div>
            </div>
          </div>

          {/* Right Flank: Civics, Economics & History Cluster */}
          <div className="flex items-center gap-2.5 lg:gap-3.5 relative opacity-85">
            <div
              className="absolute -inset-4 rounded-full opacity-50 blur-xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(226,43,43,0.12) 0%, rgba(251,146,60,0.05) 55%, transparent 100%)',
              }}
            />

            <div className="hidden lg:flex flex-col items-end gap-1.5 relative">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/34 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
                  পৌরনীতি
                </span>
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/30 bg-white/50 border border-white/75 px-2 py-0.5 rounded-full">
                  অর্থনীতি
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-bold tracking-wide text-[#6B4C4F]/42 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                  ইতিহাস
                </span>
                <div className="w-7 h-7 rounded-xl bg-white/50 border border-white/80 flex items-center justify-center text-[#E22B2B]/30 -rotate-6">
                  <Scale className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
                <div className="w-7 h-7 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#B91C1C]/32 rotate-6">
                  <BookOpen className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
              </div>
            </div>

            <div className="relative flex flex-col items-center gap-1">
              <div className="relative w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-[#E22B2B]/16"
                  style={{
                    clipPath:
                      'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                />
                <div
                  className="w-[42px] h-[42px] lg:w-[50px] lg:h-[50px] bg-white/75 flex items-center justify-center text-[#B91C1C]/38"
                  style={{
                    clipPath:
                      'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                >
                  <Landmark className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[1.6]" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#B91C1C]/28">
                <Scale className="w-3 h-3 stroke-[1.6]" />
                <Compass className="w-3 h-3 stroke-[1.6]" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === 'business') {
      return (
        <div
          aria-hidden="true"
          className={`pointer-events-none select-none hidden md:flex items-center justify-between absolute inset-y-0 inset-x-3 lg:inset-x-6 z-0 overflow-hidden ${className}`}
        >
          {/* Left Flank: Finance, Analytics & Accounting Cluster */}
          <div className="flex items-center gap-2.5 lg:gap-3.5 relative opacity-85">
            <div
              className="absolute -inset-4 rounded-full opacity-50 blur-xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(226,43,43,0.12) 0%, rgba(255,228,230,0.04) 68%, transparent 100%)',
              }}
            />

            <div className="relative w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border border-dashed border-[#E22B2B]/22" />
              <div className="absolute inset-2 rounded-full border border-[#B91C1C]/12 rotate-45" />
              <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E22B2B]/35" />
              <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B91C1C]/30" />

              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-2xl bg-white/60 border border-white/85 shadow-[0_8px_20px_-8px_rgba(185,28,28,0.18)] flex items-center justify-center text-[#B91C1C]/38">
                <TrendingUp className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[1.6]" />
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-start gap-1.5 relative">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/34 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
                  A = L + OE
                </span>
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/28 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                  ROI
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-xl bg-white/50 border border-white/80 flex items-center justify-center text-[#B91C1C]/30 -rotate-6">
                  <Calculator className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
                <div className="w-7 h-7 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#E22B2B]/30">
                  <BarChart3 className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
                <span className="text-[9.5px] font-bold tracking-wide text-[#6B4C4F]/42 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                  Dr · Cr
                </span>
              </div>
            </div>
          </div>

          {/* Right Flank: Business Management, Banking & Marketing Cluster */}
          <div className="flex items-center gap-2.5 lg:gap-3.5 relative opacity-85">
            <div
              className="absolute -inset-4 rounded-full opacity-50 blur-xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(226,43,43,0.12) 0%, rgba(251,146,60,0.05) 55%, transparent 100%)',
              }}
            />

            <div className="hidden lg:flex flex-col items-end gap-1.5 relative">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/34 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
                  NPV · IRR
                </span>
                <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/30 bg-white/50 border border-white/75 px-2 py-0.5 rounded-full">
                  ৪P
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-bold tracking-wide text-[#6B4C4F]/42 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                  B/S
                </span>
                <div className="w-7 h-7 rounded-xl bg-white/50 border border-white/80 flex items-center justify-center text-[#E22B2B]/30 -rotate-6">
                  <Coins className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
                <div className="w-7 h-7 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#B91C1C]/32 rotate-6">
                  <PieChart className="w-3.5 h-3.5 stroke-[1.6]" />
                </div>
              </div>
            </div>

            <div className="relative flex flex-col items-center gap-1">
              <div className="relative w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-[#E22B2B]/16"
                  style={{
                    clipPath:
                      'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                />
                <div
                  className="w-[42px] h-[42px] lg:w-[50px] lg:h-[50px] bg-white/75 flex items-center justify-center text-[#B91C1C]/38"
                  style={{
                    clipPath:
                      'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                >
                  <Briefcase className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[1.6]" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#B91C1C]/28">
                <LineChart className="w-3 h-3 stroke-[1.6]" />
                <Landmark className="w-3 h-3 stroke-[1.6]" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none select-none hidden md:flex items-center justify-between absolute inset-y-0 inset-x-3 lg:inset-x-6 z-0 overflow-hidden ${className}`}
      >
        {/* Left Flank: Physics & Atomic Orbit Cluster */}
        <div className="flex items-center gap-2.5 lg:gap-3.5 relative opacity-85">
          <div
            className="absolute -inset-4 rounded-full opacity-50 blur-xl"
            style={{
              background:
                'radial-gradient(circle, rgba(226,43,43,0.12) 0%, rgba(255,228,230,0.04) 68%, transparent 100%)',
            }}
          />

          <div className="relative w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-full border border-dashed border-[#E22B2B]/22" />
            <div className="absolute inset-2 rounded-full border border-[#B91C1C]/12 rotate-45" />
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E22B2B]/35" />
            <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B91C1C]/30" />

            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-2xl bg-white/60 border border-white/85 shadow-[0_8px_20px_-8px_rgba(185,28,28,0.18)] flex items-center justify-center text-[#B91C1C]/38">
              <Atom className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[1.6]" />
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-start gap-1.5 relative">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/34 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
                E = mc²
              </span>
              <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/28 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                F = ma
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-xl bg-white/50 border border-white/80 flex items-center justify-center text-[#B91C1C]/30 -rotate-6">
                <Magnet className="w-3.5 h-3.5 stroke-[1.6]" />
              </div>
              <div className="w-7 h-7 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#E22B2B]/30">
                <Waves className="w-3.5 h-3.5 stroke-[1.6]" />
              </div>
              <span className="text-[9.5px] font-bold tracking-wide text-[#6B4C4F]/42 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                λ = h/p
              </span>
            </div>
          </div>
        </div>

        {/* Right Flank: Chemistry Glassware, Benzene Ring & Formulas */}
        <div className="flex items-center gap-2.5 lg:gap-3.5 relative opacity-85">
          <div
            className="absolute -inset-4 rounded-full opacity-50 blur-xl"
            style={{
              background:
                'radial-gradient(circle, rgba(226,43,43,0.12) 0%, rgba(251,146,60,0.05) 55%, transparent 100%)',
            }}
          />

          <div className="hidden lg:flex flex-col items-end gap-1.5 relative">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/34 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
                H₂O
              </span>
              <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/30 bg-white/50 border border-white/75 px-2 py-0.5 rounded-full">
                C₆H₆
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-bold tracking-wide text-[#6B4C4F]/42 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
                {variant === 'physics-chemistry' ? 'PV = nRT' : 'ΔH = qₚ'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-white/50 border border-white/80 flex items-center justify-center text-[#E22B2B]/30 -rotate-6">
                <TestTubes className="w-3.5 h-3.5 stroke-[1.6]" />
              </div>
              <div className="w-7 h-7 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#B91C1C]/32 rotate-6">
                <Dna className="w-3.5 h-3.5 stroke-[1.6]" />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-1">
            <div className="relative w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-[#E22B2B]/16"
                style={{
                  clipPath:
                    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }}
              />
              <div
                className="w-[42px] h-[42px] lg:w-[50px] lg:h-[50px] bg-white/75 flex items-center justify-center text-[#B91C1C]/38"
                style={{
                  clipPath:
                    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }}
              >
                <FlaskConical className="w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[1.6]" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#B91C1C]/28">
              <Orbit className="w-3 h-3 stroke-[1.6]" />
              <Activity className="w-3 h-3 stroke-[1.6]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none hidden md:flex items-center justify-end relative shrink-0 ${className}`}
    >
      {/* Tablet View (md to <lg): Clean, compact 2-node orbital + glassware cluster */}
      <div className="flex lg:hidden items-center gap-3 relative pr-1">
        <div
          className="absolute -inset-4 rounded-full opacity-55 blur-xl"
          style={{
            background:
              'radial-gradient(circle, rgba(226,43,43,0.12) 0%, rgba(255,228,230,0.04) 68%, transparent 100%)',
          }}
        />

        <div className="relative flex flex-col items-end gap-1.5">
          <span className="text-[10px] font-extrabold tracking-wider text-[#B91C1C]/35 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
            E = mc²
          </span>
          <span className="text-[10px] font-extrabold tracking-wider text-[#B91C1C]/30 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
            {variant === 'physics-chemistry' ? 'PV = nRT' : 'F = ma'}
          </span>
        </div>

        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-dashed border-[#E22B2B]/20" />
          <div className="absolute inset-2.5 rounded-full border border-[#B91C1C]/12" />
          <span className="absolute -top-0.5 right-3 w-1.5 h-1.5 rounded-full bg-[#E22B2B]/35" />
          <span className="absolute bottom-1 left-2 w-1.5 h-1.5 rounded-full bg-[#B91C1C]/30" />

          <div className="w-10 h-10 rounded-2xl bg-white/60 border border-white/85 shadow-[0_8px_20px_-8px_rgba(185,28,28,0.18)] flex items-center justify-center text-[#B91C1C]/38">
            <Atom className="w-5 h-5 stroke-[1.6]" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#B91C1C]/32 rotate-6">
            <FlaskConical className="w-4 h-4 stroke-[1.6]" />
          </div>
          <div className="w-8 h-8 rounded-xl bg-white/50 border border-white/75 flex items-center justify-center text-[#E22B2B]/30 -rotate-6">
            <Dna className="w-4 h-4 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* Laptop & Desktop View (lg+): Balanced Physics, Chemistry & Science constellation */}
      <div className="hidden lg:flex items-center gap-4 relative pr-2">
        <div
          className="absolute -inset-6 rounded-full opacity-60 blur-2xl"
          style={{
            background:
              'radial-gradient(circle at 60% 50%, rgba(226,43,43,0.13) 0%, rgba(251,146,60,0.06) 45%, transparent 75%)',
          }}
        />

        <div className="relative flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-extrabold tracking-wide text-[#B91C1C]/35 bg-white/60 border border-white/85 px-2.5 py-0.5 rounded-full shadow-2xs">
              E = mc²
            </span>
            <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/30 bg-white/50 border border-white/80 px-2 py-0.5 rounded-full">
              F = ma
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/50 border border-white/80 flex items-center justify-center text-[#B91C1C]/30 -rotate-6">
              <Magnet className="w-4 h-4 stroke-[1.6]" />
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#E22B2B]/32">
              <Waves className="w-4 h-4 stroke-[1.6]" />
            </div>
            <span className="text-[10px] font-bold tracking-wide text-[#6B4C4F]/45 bg-white/45 border border-white/75 px-2 py-0.5 rounded-full">
              λ = h/p
            </span>
          </div>
        </div>

        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border border-dashed border-[#E22B2B]/22" />
          <div className="absolute inset-2.5 rounded-full border border-[#B91C1C]/14 rotate-45" />
          <div className="absolute inset-5 rounded-full border border-dashed border-rose-400/22" />

          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#E22B2B]/35 ring-2 ring-white/70" />
          <span className="absolute bottom-2 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B91C1C]/35" />
          <span className="absolute top-6 left-0.5 w-1.5 h-1.5 rounded-full bg-amber-600/30" />

          <div className="w-11 h-11 rounded-2xl bg-white/65 border border-white/90 shadow-[0_10px_24px_-10px_rgba(185,28,28,0.22)] flex items-center justify-center text-[#B91C1C]/42">
            <Atom className="w-6 h-6 stroke-[1.6]" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 opacity-45">
          <span className="w-1 h-1 rounded-full bg-[#B91C1C]/45" />
          <span className="w-4 h-px border-t border-dashed border-[#B91C1C]/45" />
          <span className="w-1 h-1 rounded-full bg-[#E22B2B]/40" />
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl bg-white/60 border border-white/85 flex items-center justify-center text-[#B91C1C]/35 rotate-6 shadow-2xs">
                <FlaskConical className="w-4 h-4 stroke-[1.6]" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/55 border border-white/80 flex items-center justify-center text-[#E22B2B]/32 -rotate-6">
                <TestTubes className="w-4 h-4 stroke-[1.6]" />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/35 bg-white/55 border border-white/80 px-2 py-0.5 rounded-full">
                H₂O
              </span>
              <span className="text-[10px] font-extrabold tracking-wide text-[#B91C1C]/32 bg-white/50 border border-white/75 px-2 py-0.5 rounded-full">
                C₆H₆
              </span>
            </div>
          </div>

          <div className="hidden xl:flex flex-col items-center gap-1.5">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-[#E22B2B]/15"
                style={{
                  clipPath:
                    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }}
              />
              <div
                className="w-[44px] h-[44px] bg-white/75 flex items-center justify-center text-[#B91C1C]/38"
                style={{
                  clipPath:
                    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }}
              >
                {variant === 'physics-chemistry' ? (
                  <Orbit className="w-5 h-5 stroke-[1.5]" />
                ) : (
                  <Microscope className="w-5 h-5 stroke-[1.5]" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#B91C1C]/28">
              <Dna className="w-3.5 h-3.5 stroke-[1.6]" />
              <Activity className="w-3.5 h-3.5 stroke-[1.6]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
