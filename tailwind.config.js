/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        chilli: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        turmeric: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        masala: {
          50: '#fdf8f3',
          100: '#f7ead9',
          200: '#ecd0ad',
          300: '#dcae78',
          400: '#cc8a4f',
          500: '#a96a35',
          600: '#874f28',
          700: '#693b22',
          800: '#4a2a1c',
          900: '#2b1810',
        },
        cream: '#fff8ee',
        ink: '#1b1109',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        hindi: ['"Tiro Devanagari Hindi"', 'serif'],
      },
      boxShadow: {
        warm: '0 18px 40px -20px rgba(234, 88, 12, 0.45)',
        plate: '0 30px 60px -25px rgba(122, 39, 26, 0.4)',
        glow: '0 0 0 1px rgba(255, 237, 213, 0.6), 0 12px 30px -10px rgba(234, 88, 12, 0.35)',
      },
      backgroundImage: {
        'spice-radial':
          'radial-gradient(circle at 20% 20%, rgba(251,146,60,0.25), transparent 55%), radial-gradient(circle at 80% 0%, rgba(239,68,68,0.18), transparent 50%), radial-gradient(circle at 50% 100%, rgba(234,179,8,0.18), transparent 55%)',
        'curry-gradient':
          'linear-gradient(135deg, #ea580c 0%, #dc2626 55%, #7c2d12 100%)',
        'cream-gradient':
          'linear-gradient(180deg, #fff8ee 0%, #ffedd5 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
        'shimmer': 'shimmer 2.4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
