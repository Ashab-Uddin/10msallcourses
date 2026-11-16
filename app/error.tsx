'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#fff6f6] via-[#ffe6e8] to-[#ffd8dc]">
      <div className="max-w-md w-full glass-strong rounded-3xl p-8 text-center space-y-5 shadow-2xl border border-white/80">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-300 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#2A0F12]">
            সাময়িক সমস্যা দেখা দিয়েছে
          </h2>
          <p className="text-xs text-[#6B4C4F]">
            পৃষ্ঠাটি পুনরায় লোড করতে নিচের বাটনে চাপ দিন।
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    </div>
  );
}
