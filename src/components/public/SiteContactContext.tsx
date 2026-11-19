'use client';

import React, { createContext, useContext } from 'react';

export interface SiteContactInfo {
  whatsappNumber: string;
  whatsappLink: string;
  callNumber: string;
  messengerLink: string;
}

const DEFAULT_SITE_CONTACT: SiteContactInfo = {
  whatsappNumber: '+880 1625171822',
  whatsappLink: 'https://wa.me/8801625171822',
  callNumber: '+880 1625171822',
  messengerLink: 'https://m.me/10minuteschool',
};

const SiteContactContext = createContext<SiteContactInfo>(DEFAULT_SITE_CONTACT);

export function SiteContactProvider({
  value,
  children,
}: {
  value: SiteContactInfo;
  children: React.ReactNode;
}) {
  return (
    <SiteContactContext.Provider value={value}>
      {children}
    </SiteContactContext.Provider>
  );
}

export function useSiteContact(): SiteContactInfo {
  return useContext(SiteContactContext);
}
