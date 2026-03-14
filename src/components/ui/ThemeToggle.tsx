'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[color:rgb(255_255_255/0.02)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[color:rgb(37_99_235/0.35)] cursor-pointer"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text)]" />
      ) : (
        <Sun className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text)]" />
      )}
    </button>
  );
}
