'use client';

import React from 'react';
import {
  Activity,
  Atom,
  BookOpen,
  Compass,
  Dna,
  FlaskConical,
  FlaskRound,
  GraduationCap,
  Lightbulb,
  Magnet,
  Microscope,
  Orbit,
  Pi,
  Sigma,
  Sparkles,
  TestTube2,
  TestTubes,
  Waves,
  Zap,
} from 'lucide-react';

export const GlassAmbientBackdrop: React.FC = React.memo(() => {
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

      {/* 3. Subtle Curved Dashed Orbital & Trajectory Rings */}
      <div className="absolute -top-24 left-[14%] w-[420px] h-[420px] rounded-full border border-dashed border-[#E22B2B]/12" />
      <div className="hidden md:block absolute top-[22%] -right-28 w-[520px] h-[520px] rounded-full border border-dashed border-[#B91C1C]/10" />
      <div className="hidden lg:block absolute bottom-[8%] -left-28 w-[460px] h-[460px] rounded-full border border-dashed border-rose-500/12" />

      {/* 4. Decorative Flowing Dashed Wave & Molecular Curves */}
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

      {/* 5. Science, Physics & Chemistry Floating Glass Elements (Optimized for Tablet & Laptop) */}

      {/* Top-Left Flank: Bohr Atom Ring + Formula */}
      <div className="absolute top-[10%] left-[3%] sm:left-[5%] -rotate-6 flex items-center gap-2.5">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="hidden md:block absolute inset-0 rounded-full border border-dashed border-[#E22B2B]/20" />
          <div className="w-11 h-11 rounded-2xl bg-white/34 border border-white/60 shadow-[0_8px_24px_-10px_rgba(185,28,28,0.16)] flex items-center justify-center text-[#B91C1C]/32">
            <Atom className="w-6 h-6 stroke-[1.6]" />
          </div>
        </div>
        <span className="hidden md:inline-block text-[11px] font-extrabold tracking-wide text-[#B91C1C]/26 bg-white/30 border border-white/55 px-2.5 py-0.5 rounded-full -mt-5">
          F = ma
        </span>
      </div>

      {/* Top-Right Flank: Chemistry Flask + Molecular H2O Pill */}
      <div className="absolute top-[12%] right-[3%] sm:right-[5%] rotate-6 flex items-center gap-2">
        <span className="hidden md:inline-block text-[11px] font-extrabold tracking-wide text-[#B91C1C]/26 bg-white/30 border border-white/55 px-2.5 py-0.5 rounded-full -mb-5">
          H₂O · O₂
        </span>
        <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white/34 border border-white/60 shadow-[0_8px_24px_-10px_rgba(185,28,28,0.16)] flex items-center justify-center text-[#B91C1C]/32">
          <FlaskConical className="w-6 h-6 stroke-[1.6]" />
        </div>
      </div>

      {/* Upper-Mid Left (Tablet & Laptop): Physics Magnet + Waves */}
      <div className="hidden md:flex absolute top-[27%] left-[2%] -rotate-6 items-center gap-2">
        <div className="w-10 h-10 rounded-2xl bg-white/30 border border-white/55 flex items-center justify-center text-[#B91C1C]/28">
          <Magnet className="w-5 h-5 stroke-[1.6]" />
        </div>
        <Waves className="w-5 h-5 text-[#E22B2B]/22" />
        <span className="hidden xl:inline-block text-[10.5px] font-bold tracking-wider text-[#B91C1C]/24 bg-white/25 border border-white/45 px-2 py-0.5 rounded-full">
          v = fλ
        </span>
      </div>

      {/* Upper-Mid Right (Tablet & Laptop): Benzene Ring Geometry + Lightbulb */}
      <div className="hidden md:flex absolute top-[28%] right-[2.5%] rotate-6 items-center gap-2">
        <div className="relative w-10 h-10 hidden xl:flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[#E22B2B]/14"
            style={{
              clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            }}
          />
          <div
            className="w-9 h-9 bg-white/38 flex items-center justify-center text-[#B91C1C]/26"
            style={{
              clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            }}
          >
            <Sparkles className="w-4 h-4 stroke-[1.5]" />
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white/30 border border-white/55 flex items-center justify-center text-[#B91C1C]/28">
          <Lightbulb className="w-5 h-5 stroke-[1.6]" />
        </div>
      </div>

      {/* Center-Left (All + Enhanced for Tablet & Laptop): Orbit, Energy & Physics Formula */}
      <div className="absolute top-[46%] left-[2.5%] sm:left-[4%] rotate-6 flex flex-col items-start gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-2xl bg-white/28 border border-white/50 flex items-center justify-center text-[#B91C1C]/28">
            <Orbit className="w-6 h-6 stroke-[1.5]" />
          </div>
          <Zap className="w-4 h-4 text-[#E22B2B]/22" />
        </div>
        <span className="hidden md:inline-block text-[11px] font-extrabold tracking-wider text-[#B91C1C]/24 bg-white/28 border border-white/45 px-2.5 py-0.5 rounded-full">
          E = mc² · λ = h/p
        </span>
      </div>

      {/* Center-Right (All + Enhanced for Tablet & Laptop): DNA, Test Tubes & Gas Law */}
      <div className="absolute top-[48%] right-[2.5%] sm:right-[4%] -rotate-6 flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-2">
          <TestTubes className="w-5 h-5 text-[#E22B2B]/22" />
          <div className="w-11 h-11 rounded-2xl bg-white/28 border border-white/50 flex items-center justify-center text-[#B91C1C]/28">
            <Dna className="w-6 h-6 stroke-[1.5]" />
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-[11px] font-extrabold tracking-wider text-[#B91C1C]/24 bg-white/28 border border-white/45 px-2.5 py-0.5 rounded-full">
            C₆H₆ · PV = nRT
          </span>
        </div>
      </div>

      {/* Lower-Mid Left (Tablet & Laptop): Microscope + TestTube2 + Compass */}
      <div className="hidden md:flex absolute top-[67%] left-[3.5%] -rotate-6 items-center gap-2">
        <div className="w-11 h-11 rounded-2xl bg-white/28 border border-white/52 flex items-center justify-center text-[#B91C1C]/26">
          <Microscope className="w-5 h-5 stroke-[1.5]" />
        </div>
        <TestTube2 className="w-5 h-5 text-[#E22B2B]/22 rotate-12" />
        <Compass className="hidden xl:block w-4 h-4 text-[#B91C1C]/20" />
      </div>

      {/* Lower-Mid Right (Tablet & Laptop): FlaskRound + Activity Wave + Sigma/Pi */}
      <div className="hidden md:flex absolute top-[69%] right-[3.5%] rotate-6 items-center gap-2">
        <div className="hidden xl:flex items-center gap-1 text-[#B91C1C]/22">
          <Sigma className="w-4 h-4 stroke-[1.6]" />
          <Pi className="w-4 h-4 stroke-[1.6]" />
        </div>
        <Activity className="w-5 h-5 text-[#E22B2B]/22" />
        <div className="w-11 h-11 rounded-2xl bg-white/28 border border-white/52 flex items-center justify-center text-[#B91C1C]/26">
          <FlaskRound className="w-5 h-5 stroke-[1.5]" />
        </div>
      </div>

      {/* Bottom Flanks: Graduation / Thermodynamics & Organic Chemistry Motifs */}
      <div className="absolute bottom-[10%] left-[4%] sm:left-[6%] rotate-6 flex items-center gap-2">
        <div className="w-11 h-11 rounded-2xl bg-white/30 border border-white/52 flex items-center justify-center text-[#B91C1C]/26">
          <GraduationCap className="w-6 h-6 stroke-[1.6]" />
        </div>
        <span className="hidden md:inline-block text-[10.5px] font-extrabold tracking-wider text-[#B91C1C]/22 bg-white/25 border border-white/45 px-2.5 py-0.5 rounded-full">
          ΔG = ΔH - TΔS
        </span>
      </div>

      <div className="absolute bottom-[11%] right-[4%] sm:right-[6%] -rotate-6 flex items-center gap-2">
        <span className="hidden md:inline-block text-[10.5px] font-extrabold tracking-wider text-[#B91C1C]/22 bg-white/25 border border-white/45 px-2.5 py-0.5 rounded-full">
          v = u + at
        </span>
        <div className="w-11 h-11 rounded-2xl bg-white/30 border border-white/52 flex items-center justify-center text-[#B91C1C]/26">
          <BookOpen className="w-6 h-6 stroke-[1.6]" />
        </div>
      </div>

      {/* Subtle Inner Center Watermarks (peek softly behind frosted glass on Laptop+) */}
      <div className="hidden lg:block absolute top-[21%] left-[26%] text-[#B91C1C]/12 rotate-12">
        <Atom className="w-7 h-7 stroke-[1.4]" />
      </div>
      <div className="hidden lg:block absolute top-[20%] right-[25%] text-[#B91C1C]/12 -rotate-12">
        <FlaskConical className="w-7 h-7 stroke-[1.4]" />
      </div>
      <div className="hidden lg:block absolute top-[58%] left-[22%] text-[#B91C1C]/10 rotate-6">
        <Dna className="w-8 h-8 stroke-[1.3]" />
      </div>
      <div className="hidden lg:block absolute top-[56%] right-[24%] text-[#B91C1C]/10 -rotate-6">
        <Orbit className="w-8 h-8 stroke-[1.3]" />
      </div>
    </div>
  );
});
GlassAmbientBackdrop.displayName = 'GlassAmbientBackdrop';
