'use client';

import type React from 'react';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

/**
 * Renders admin modal overlays directly into `document.body` so ancestor
 * stacking contexts (sticky navbar, tablet strip, glass cards, mobile bottom bar)
 * never clip or overlap modal dialogs.
 */
export function AdminModalPortal({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isClient || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}
