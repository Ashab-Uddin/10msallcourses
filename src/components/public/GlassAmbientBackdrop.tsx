'use client';

import React from 'react';
import {
  GraduationCap,
  BookOpen,
  PenTool,
  Lightbulb,
  Atom,
  Calculator,
  Compass,
  Award,
  Trophy,
  Code2,
  FlaskConical,
  Ruler,
  ArrowUpRight,
  MoveUpRight,
  TrendingUp,
  CornerRightUp,
  Sparkles,
  Target,
} from 'lucide-react';

export const GlassAmbientBackdrop: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Ambient Color Glow Orbs (Glass-Shade Depth Layer) */}
      <div
        className="glass-orb w-[440px] h-[440px] -top-28 -left-24 opacity-45"
        style={{
          background:
            'radial-gradient(circle, rgba(255,77,77,0.52), rgba(255,154,154,0.12) 70%)',
        }}
      />
      <div
        className="glass-orb w-[380px] h-[380px] -bottom-24 -right-16 opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(255,138,138,0.55), rgba(254,205,211,0.16) 70%)',
          animationDelay: '-7s',
        }}
      />
      <div
        className="glass-orb w-[320px] h-[320px] top-[38%] right-[12%] opacity-35"
        style={{
          background:
            'radial-gradient(circle, rgba(251,146,60,0.34), rgba(255,228,230,0.12) 70%)',
          animationDelay: '-12s',
        }}
      />

      {/* 2. Fine Architectural Dot-Grid Texture */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(rgba(185, 28, 28, 0.085) 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* 3. Subtle Curved Dashed Trajectory Arcs & Orbital Rings */}
      <div className="absolute -top-24 left-[14%] w-[420px] h-[420px] rounded-full border border-dashed border-[#E22B2B]/12" />
      <div className="hidden md:block absolute top-[22%] -right-28 w-[520px] h-[520px] rounded-full border border-dashed border-[#B91C1C]/10" />
      <div className="hidden lg:block absolute bottom-[8%] -left-28 w-[460px] h-[460px] rounded-full border border-dashed border-rose-500/12" />

      {/* 4. Decorative Flowing Dashed Learning Paths (Background Curves) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.14] text-[#B91C1C]"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-40 210 C 180 120, 320 290, 520 175"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeDasharray="6 8"
          strokeLinecap="round"
        />
        <path
          d="M920 155 C 1100 90, 1260 225, 1460 120"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeDasharray="6 8"
          strokeLinecap="round"
        />
        <path
          d="M-30 690 C 210 610, 340 760, 560 665"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="5 9"
          strokeLinecap="round"
        />
        <path
          d="M980 715 C 1160 640, 1300 780, 1470 675"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="5 9"
          strokeLinecap="round"
        />
      </svg>

      {/* 5. Floating Glass Educational Elements, Arrows & Academic Motifs */}
      {/* Top-Left Hero Flank: Graduation Cap + Upward Arrow */}
      <div className="absolute top-[11%] left-[4%] sm:left-[7%] -rotate-12 flex items-center gap-2">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/30 backdrop-blur-xs border border-white/55 shadow-[0_8px_24px_-10px_rgba(185,28,28,0.16)] flex items-center justify-center text-[#B91C1C]/30">
          <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.6]" />
        </div>
        <ArrowUpRight className="w-6 h-6 text-[#E22B2B]/25 -mt-6" />
      </div>

      {/* Top-Right Hero Flank: Open Book + Growth Arrow */}
      <div className="absolute top-[13%] right-[4%] sm:right-[7%] rotate-12 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-[#B91C1C]/22 -mb-6" />
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/30 backdrop-blur-xs border border-white/55 shadow-[0_8px_24px_-10px_rgba(185,28,28,0.16)] flex items-center justify-center text-[#B91C1C]/30">
          <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.6]" />
        </div>
      </div>

      {/* Upper-Mid Left: A+ Grade & PenTool */}
      <div className="hidden md:flex absolute top-[28%] left-[2.5%] -rotate-6 items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-white/28 backdrop-blur-xs border border-white/50 text-[#B91C1C]/30 font-black text-base tracking-tight">
          A+
        </div>
        <PenTool className="w-5 h-5 text-[#E22B2B]/20 rotate-45" />
      </div>

      {/* Upper-Mid Right: Lightbulb + Sparkles */}
      <div className="hidden md:flex absolute top-[29%] right-[3%] rotate-6 items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-amber-600/25 -mt-4" />
        <div className="w-11 h-11 rounded-2xl bg-white/28 backdrop-blur-xs border border-white/50 flex items-center justify-center text-[#B91C1C]/28">
          <Lightbulb className="w-6 h-6 stroke-[1.6]" />
        </div>
      </div>

      {/* Center-Left: Science & Math (Atom, Flask, Pi formula) */}
      <div className="absolute top-[47%] left-[3%] sm:left-[5%] rotate-6 flex flex-col items-start gap-3">
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur-xs border border-white/45 flex items-center justify-center text-[#B91C1C]/26">
            <Atom className="w-6 h-6 stroke-[1.5]" />
          </div>
          <MoveUpRight className="w-5 h-5 text-[#E22B2B]/20" />
        </div>
        <span className="hidden sm:inline-block text-xs font-extrabold tracking-wider text-[#B91C1C]/20 bg-white/25 border border-white/40 px-2.5 py-0.5 rounded-full">
          ∑ · π · E=mc²
        </span>
      </div>

      {/* Center-Right: Engineering & Tech (Calculator, Code, Ruler) */}
      <div className="absolute top-[50%] right-[3%] sm:right-[5%] -rotate-6 flex flex-col items-end gap-3">
        <div className="flex items-center gap-2">
          <CornerRightUp className="w-5 h-5 text-[#E22B2B]/22" />
          <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur-xs border border-white/45 flex items-center justify-center text-[#B91C1C]/26">
            <Code2 className="w-6 h-6 stroke-[1.5]" />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[#B91C1C]/22">
          <Calculator className="w-5 h-5 stroke-[1.5]" />
          <Ruler className="w-5 h-5 stroke-[1.5] rotate-45" />
        </div>
      </div>

      {/* Lower-Mid Left: Geometry Compass & Chemistry Flask */}
      <div className="hidden sm:flex absolute top-[69%] left-[5%] -rotate-12 items-center gap-2.5">
        <div className="w-11 h-11 rounded-2xl bg-white/26 backdrop-blur-xs border border-white/50 flex items-center justify-center text-[#B91C1C]/25">
          <Compass className="w-6 h-6 stroke-[1.5]" />
        </div>
        <FlaskConical className="w-5 h-5 text-[#E22B2B]/20" />
      </div>

      {/* Lower-Mid Right: Target Goal & Arrow */}
      <div className="hidden sm:flex absolute top-[71%] right-[5%] rotate-12 items-center gap-2">
        <ArrowUpRight className="w-5 h-5 text-[#E22B2B]/22" />
        <div className="w-11 h-11 rounded-2xl bg-white/26 backdrop-blur-xs border border-white/50 flex items-center justify-center text-[#B91C1C]/25">
          <Target className="w-6 h-6 stroke-[1.5]" />
        </div>
      </div>

      {/* Bottom Flanks: Trophy & Certificate Award */}
      <div className="absolute bottom-[10%] left-[4%] sm:left-[8%] rotate-12 flex items-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-white/28 backdrop-blur-xs border border-white/50 flex items-center justify-center text-[#B91C1C]/26">
          <Trophy className="w-6 h-6 stroke-[1.6]" />
        </div>
        <ArrowUpRight className="w-5 h-5 text-[#E22B2B]/22 -mt-5" />
      </div>

      <div className="absolute bottom-[11%] right-[4%] sm:right-[8%] -rotate-12 flex items-center gap-2">
        <span className="hidden md:inline-block text-[11px] font-black tracking-widest text-[#B91C1C]/20 bg-white/25 border border-white/40 px-2.5 py-0.5 rounded-full">
          {'</>'}
        </span>
        <div className="w-12 h-12 rounded-2xl bg-white/28 backdrop-blur-xs border border-white/50 flex items-center justify-center text-[#B91C1C]/26">
          <Award className="w-6 h-6 stroke-[1.6]" />
        </div>
      </div>

      {/* Subtle Inner Center Accent Marks (visible smoothly behind translucent glass cards) */}
      <div className="hidden lg:block absolute top-[21%] left-[26%] text-[#B91C1C]/12 rotate-12">
        <ArrowUpRight className="w-7 h-7 stroke-[1.5]" />
      </div>
      <div className="hidden lg:block absolute top-[20%] right-[25%] text-[#B91C1C]/12 -rotate-12">
        <GraduationCap className="w-7 h-7 stroke-[1.4]" />
      </div>
      <div className="hidden lg:block absolute top-[58%] left-[22%] text-[#B91C1C]/10 rotate-6">
        <BookOpen className="w-8 h-8 stroke-[1.3]" />
      </div>
      <div className="hidden lg:block absolute top-[56%] right-[24%] text-[#B91C1C]/10 -rotate-6">
        <TrendingUp className="w-8 h-8 stroke-[1.3]" />
      </div>
    </div>
  );
};
