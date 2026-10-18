/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dynamic surface & ink colors driven by CSS variables
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        sunk: 'var(--color-sunk)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        faint: 'var(--color-faint)',
        line: 'var(--color-line)',
        // Brand: field green (dynamic via CSS variables for dark/light contrast)
        field: { 
          DEFAULT: 'var(--color-field)', 
          hover: 'var(--color-field-hover)', 
          soft: 'var(--color-field-soft)' 
        },
        // Evidence states: what each source says about the plot
        loss: { DEFAULT: 'var(--color-loss)', soft: 'var(--color-loss-soft)', ink: 'var(--color-loss-ink)' },
        calm: { DEFAULT: 'var(--color-calm)', soft: 'var(--color-calm-soft)' },
        // Outcome tones
        hold: { DEFAULT: 'var(--color-hold)', soft: 'var(--color-hold-soft)' },
        review: { DEFAULT: 'var(--color-review)', soft: 'var(--color-review-soft)' },
        // Data colours
        rain: '#38BDF8',
        bloom: '#FDE047',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Modular scale (1.25) on a 16px base
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.5625rem', { lineHeight: '2rem' }],
        '2xl': ['1.953rem', { lineHeight: '2.35rem' }],
        '3xl': ['2.441rem', { lineHeight: '2.75rem' }],
        '4xl': ['3.052rem', { lineHeight: '3.2rem' }],
        '5xl': ['3.815rem', { lineHeight: '3.9rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '20px',
      },
      maxWidth: { prose: '66ch' },
    },
  },
  plugins: [],
};
