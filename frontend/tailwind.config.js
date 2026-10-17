/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces and text
        canvas: '#F3F4F0',
        surface: '#FFFFFF',
        sunk: '#EAECE6',
        ink: '#16231C',
        muted: '#56655B',
        faint: '#8A968D',
        line: '#D8DDD4',
        // Brand: field green, used for primary actions and links
        field: { DEFAULT: '#1F5E3B', hover: '#174A2E', soft: '#E3EEE6' },
        // Evidence states: what each source says about the plot
        loss: { DEFAULT: '#B45309', soft: '#FBEBD7', ink: '#7A3A06' },
        calm: { DEFAULT: '#5E7466', soft: '#E7ECE8' },
        // Outcome tones
        hold: { DEFAULT: '#B42318', soft: '#FBE4E1' },
        review: { DEFAULT: '#5B4BA0', soft: '#ECE9F7' },
        // Data colours
        rain: '#3A6EA5',
        bloom: '#F2DD8C',
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
