'use client';

import React from 'react';

interface FloatingContactWidgetProps {
  whatsappLink: string;
  whatsappNumber: string;
  messengerLink?: string;
}

export const FloatingContactWidget: React.FC<FloatingContactWidgetProps> = ({
  whatsappLink,
  whatsappNumber,
  messengerLink = 'https://m.me/10minuteschool',
}) => {
  const handleOpenWhatsApp = () => {
    const targetUrl = whatsappLink || `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenMessenger = () => {
    const targetUrl = messengerLink || 'https://m.me/10minuteschool';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside
      aria-label="সরাসরি যোগাযোগ ও সহায়তা"
      className="fixed bottom-20 md:bottom-7 right-4 md:right-7 z-40 flex flex-col items-center gap-3 select-none print:hidden pointer-events-auto"
    >
      {/* 1. Official WhatsApp Direct Chat Floating Button */}
      <button
        type="button"
        onClick={handleOpenWhatsApp}
        className="w-13 h-13 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-[0_8px_25px_-5px_rgba(37,211,102,0.5)] hover:shadow-[0_12px_30px_-5px_rgba(37,211,102,0.7)] hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group relative border-2 border-white/60"
        aria-label="হোয়াটসঅ্যাপে সরাসরি চ্যাট করুন"
        title="হোয়াটসঅ্যাপে সরাসরি চ্যাট করুন"
      >
        {/* Official WhatsApp Vector Icon */}
        <svg
          className="w-7 h-7 fill-white drop-shadow-xs"
          viewBox="0 0 24 24"
        >
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.78 14.15c-.24.67-1.39 1.28-1.92 1.36-.5.08-1.14.12-3.66-.92-3.22-1.33-5.3-4.57-5.46-4.78-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.11-2.66.29-.32.64-.4.85-.4.21 0 .43.002.61.01.2.008.47-.076.73.55.27.64.91 2.22.99 2.38.08.16.13.35.03.56-.1.21-.16.34-.31.52-.16.18-.33.4-.47.54-.16.15-.32.32-.14.63.19.31.83 1.37 1.78 2.22 1.22 1.09 2.25 1.42 2.57 1.58.32.16.51.13.7-.08.19-.21.82-.95 1.04-1.28.22-.32.43-.27.73-.16.29.11 1.87.88 2.19 1.04.32.16.53.24.61.37.08.14.08.79-.16 1.46z" />
        </svg>

        {/* Hover Tooltip */}
        <span className="hidden md:group-hover:flex absolute right-16 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl border border-white/10 pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
          <span>হোয়াটসঅ্যাপে চ্যাট করুন</span>
        </span>
      </button>

      {/* 2. Official Facebook Messenger Direct Inbox Floating Button */}
      <button
        type="button"
        onClick={handleOpenMessenger}
        className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#006AFF] via-[#0084FF] to-[#00C6FF] hover:from-[#005ce6] hover:to-[#00b0e6] text-white flex items-center justify-center shadow-[0_8px_25px_-5px_rgba(0,132,255,0.5)] hover:shadow-[0_12px_30px_-5px_rgba(0,132,255,0.7)] hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group relative border-2 border-white/60"
        aria-label="ফেসবুক মেসেঞ্জারে সরাসরি নক দিন"
        title="ফেসবুক মেসেঞ্জারে সরাসরি নক দিন"
      >
        {/* Official Facebook Messenger Vector Icon */}
        <svg
          className="w-7 h-7 fill-white drop-shadow-xs"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.734 7.227V22l3.373-1.851c.917.254 1.888.39 2.893.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.585-2.756-5.045 2.756 5.55-5.892 2.65 2.756 4.98-2.756-5.55 5.892z" />
        </svg>

        {/* Hover Tooltip */}
        <span className="hidden md:group-hover:flex absolute right-16 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl border border-white/10 pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          <span className="w-2 h-2 rounded-full bg-[#0084FF] animate-pulse" />
          <span>মেসেঞ্জারে নক দিন</span>
        </span>
      </button>
    </aside>
  );
};
