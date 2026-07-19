/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        glass: 'var(--color-glass)',
        'glass-border': 'var(--color-glass-border)',
        'glass-hover': 'var(--color-glass-hover)',
      },
      backdropBlur: {
        glass: '25px',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '30px',
      },
      boxShadow: {
        glass: '0 10px 40px rgba(15, 23, 42, 0.14)',
        glow: '0 12px 32px rgba(37, 99, 235, 0.16)',
        'glow-secondary': '0 12px 32px rgba(15, 118, 110, 0.14)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79, 140, 255, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(79, 140, 255, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
