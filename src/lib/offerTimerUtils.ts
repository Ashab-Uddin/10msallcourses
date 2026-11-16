import type { OfferTimer, OfferTimerComputedStatus } from '../types.ts';
import { toBengaliNumber } from '../utils/format.ts';

export function computeOfferTimerStatus(
  timer: Pick<OfferTimer, 'startAt' | 'endAt' | 'isPaused'>,
  nowMs: number
): OfferTimerComputedStatus {
  const startMs = new Date(timer.startAt).getTime();
  const endMs = new Date(timer.endAt).getTime();
  if (!Number.isFinite(endMs) || endMs <= nowMs) return 'expired';
  if (timer.isPaused) return 'paused';
  if (Number.isFinite(startMs) && startMs > nowMs) return 'scheduled';
  return 'active';
}

export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  d: string;
  h: string;
  m: string;
  s: string;
}

export function getCountdownParts(targetIso: string, nowMs: number): CountdownParts {
  const targetMs = new Date(targetIso).getTime();
  const diff = Number.isFinite(targetMs) ? Math.max(0, targetMs - nowMs) : 0;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    totalMs: diff,
    days,
    hours,
    minutes,
    seconds,
    d: String(days).padStart(2, '0'),
    h: String(hours).padStart(2, '0'),
    m: String(minutes).padStart(2, '0'),
    s: String(seconds).padStart(2, '0'),
  };
}

export function formatRemainingTimeSummary(
  timer: Pick<OfferTimer, 'startAt' | 'endAt' | 'isPaused'>,
  nowMs: number
): string {
  const status = computeOfferTimerStatus(timer, nowMs);
  if (status === 'expired') return 'মেয়াদ শেষ';
  if (status === 'paused') {
    const parts = getCountdownParts(timer.endAt, nowMs);
    return `বিরতি (${toBengaliNumber(parts.d)}দি ${toBengaliNumber(parts.h)}ঘ ${toBengaliNumber(parts.m)}মি)`;
  }

  const targetIso = status === 'scheduled' ? timer.startAt : timer.endAt;
  const parts = getCountdownParts(targetIso, nowMs);
  const prefix = status === 'scheduled' ? 'শুরু হতে: ' : '';

  if (parts.days > 0) {
    return `${prefix}${toBengaliNumber(parts.d)}দি : ${toBengaliNumber(parts.h)}ঘ : ${toBengaliNumber(parts.m)}মি : ${toBengaliNumber(parts.s)}সে`;
  }
  return `${prefix}${toBengaliNumber(parts.h)}ঘ : ${toBengaliNumber(parts.m)}মি : ${toBengaliNumber(parts.s)}সে`;
}

export function toLocalDateTimeInputValue(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function formatOfferDateTimeDisplay(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('bn-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function getLocalTimezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
  } catch {
    return 'Local Time';
  }
}
