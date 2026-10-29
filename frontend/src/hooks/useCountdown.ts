import { useState, useEffect } from 'react';

export interface CountdownResult {
  formatted: string;
  isImminent: boolean; // within 15 minutes
  isStarted: boolean;
  isOverdue: boolean;
  totalSeconds: number;
}

export function useCountdown(targetDate: string | Date | null): CountdownResult {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) {
    return {
      formatted: '--',
      isImminent: false,
      isStarted: false,
      isOverdue: false,
      totalSeconds: 0,
    };
  }

  const target = new Date(targetDate).getTime();
  const diffMs = target - now;
  const isStarted = diffMs <= 0;
  const isOverdue = diffMs < -3600000; // > 1 hour past target
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);

  const hours = Math.floor(absDiffSec / 3600);
  const minutes = Math.floor((absDiffSec % 3600) / 60);
  const seconds = absDiffSec % 60;

  let formatted = '';
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    formatted = `${days}d ${remHours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }

  if (isStarted) {
    formatted = isOverdue ? `Overdue by ${formatted}` : `Active (${formatted} elapsed)`;
  } else {
    formatted = `Starts in ${formatted}`;
  }

  const isImminent = !isStarted && diffMs <= 15 * 60 * 1000;

  return {
    formatted,
    isImminent,
    isStarted,
    isOverdue,
    totalSeconds: Math.floor(diffMs / 1000),
  };
}
