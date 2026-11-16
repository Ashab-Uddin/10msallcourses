import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#fff6f6] via-[#ffe6e8] to-[#ffd8dc]">
      <div className="max-w-md w-full glass-strong rounded-3xl p-8 text-center space-y-6 shadow-2xl border border-white/80">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shadow-lg shadow-red-500/25">
          <span className="material-symbols-outlined text-4xl">search_off</span>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#B91C1C] bg-rose-500/10 border border-rose-300/40 px-3 py-1 rounded-full">
            ৪০৪ ত্রুটি — পেজ পাওয়া যায়নি
          </span>
          <h1 className="text-2xl font-black text-[#2A0F12]">
            অনুরোধকৃত পেজটি বিদ্যমান নেই
          </h1>
          <p className="text-xs text-[#6B4C4F] leading-relaxed">
            আপনি যে লিংকটিতে প্রবেশ করার চেষ্টা করছেন তা সরানো হয়েছে অথবা লিংকটির ইউআরএল ভুল হতে পারে।
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all text-center"
          >
            হোমপেজে ফিরে যান
          </Link>
          <a
            href="https://wa.me/8801814946474"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full glass-inset hover:bg-white text-[#2A0F12] text-xs font-bold transition text-center flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm text-emerald-600">chat</span>
            <span>সাপোর্ট নিন</span>
          </a>
        </div>
      </div>
    </div>
  );
}
