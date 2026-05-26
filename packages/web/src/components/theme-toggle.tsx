'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_EVENT = 'theme-change';

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot() {
  return true; // default to dark
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
