export default {
  darkMode: 'class',
  content: [
    './index.html',
    './bookmarks/index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          active: 'var(--brand-active)',
          subtle: 'var(--brand-subtle)',
        },
        accent: {
          success: 'oklch(0.72 0.16 145)',
          warning: 'oklch(0.75 0.18 85)',
          danger: 'var(--error)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
        },
        card: {
          DEFAULT: 'var(--card)',
          hover: 'var(--card-hover)',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        'xs': 'clamp(0.6875rem, 0.63rem + 0.25vw, 0.75rem)',
        'sm': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem)',
        'base': 'clamp(0.8125rem, 0.76rem + 0.26vw, 0.875rem)',
        'lg': 'clamp(0.875rem, 0.8rem + 0.38vw, 1rem)',
        'xl': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
        '2xl': 'clamp(1.125rem, 0.98rem + 0.72vw, 1.375rem)',
        '3xl': 'clamp(1.375rem, 1.1rem + 1.37vw, 1.875rem)',
        '4xl': 'clamp(1.75rem, 1.3rem + 2.25vw, 2.75rem)',
        '5xl': 'clamp(2rem, 1.4rem + 3vw, 3.5rem)',
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
      },
      lineHeight: {
        'tight': '1.25',
        'normal': '1.625',
        'relaxed': '1.75',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'crisp': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'fade': 'cubic-bezier(0.2, 0, 0, 1)',
        'slide': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'card': '0.75rem',
      },
    },
  },
  plugins: [],
}
