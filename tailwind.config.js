/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
                        colors: {
                    brand: {
                      bg: 'var(--bg)',
                      surface: 'var(--surface)',
                      'surface-2': 'var(--surface-2)',
                      text: 'var(--text)',
                      'text-muted': 'var(--text-muted)',
                      line: 'var(--line)',
                      primary: 'var(--primary)',
                      accent: 'var(--accent)',
                    },
                    chart: {
                      blue: '#2563EB',
                      teal: '#14B8A6',
                      amber: '#F59E0B',
                      red: '#EF4444',
                      green: '#22C55E',
                      indigo: '#6366F1',
                    }
                  },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'float': 'float 15s infinite ease-in-out alternate',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        float: {
          '0%': { transform: 'translate(0, 0) rotate(0deg)' },
          '100%': { transform: 'translate(-20px, -20px) rotate(10deg)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(1)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
