import typography from '@tailwindcss/typography'

const colors = {
  background: 'rgba(var(--background) / <alpha-value>)',
  copy: 'rgba(var(--copy) / <alpha-value>)',
  copySecondary: 'rgba(var(--copy-secondary) / <alpha-value>)',
  primary: 'rgba(var(--primary) / <alpha-value>)',
  secondary: 'rgba(var(--secondary) / <alpha-value>)',
  tertiary: 'rgba(var(--tertiary) / <alpha-value>)',
  accent: 'rgba(var(--accent) / <alpha-value>)',
  accentPrimary: 'rgba(var(--accent) / <alpha-value>)',
  accentSecondary: 'rgba(var(--accent-secondary) / <alpha-value>)',
  accentTertiary: 'rgba(var(--accent-tertiary) / <alpha-value>)',
  success: 'rgba(var(--success) / <alpha-value>)',
  error: 'rgba(var(--error) / <alpha-value>)',
  warning: 'rgba(var(--warning) / <alpha-value>)',
}

const colorKeys = Object.keys(colors)

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{ts,tsx,css}', './payload/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    {
      pattern: new RegExp(
        `^(bg|text|border|ring|fill|stroke|shadow)-(${colorKeys.join('|')})(/.*)?$`,
      ),
    },
  ],
  plugins: [typography],
  theme: {
    extend: {
      colors: {
        ...colors,
      },
      fontFamily: {
        primary: ['var(--font-barlow)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        primaryBold: ['var(--font-barlow-condensed)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        secondary: [
          'var(--font-instrument)',
          'Georgia',
          'Cambria',
          "'Times New Roman'",
          'Times',
          'serif',
        ],
        system: [
          'var(--font-jetbrains)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'monospace',
        ],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        md: ['1rem', { lineHeight: '1.5', letterSpacing: '-0.02em' }],
        lg: ['1.125rem', { lineHeight: '1.5', letterSpacing: '-0.02em' }],
        xl: ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.04em' }],
        '3xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '4xl': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '5xl': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '6xl': ['3.25rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '7xl': ['3.5rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '8xl': ['3.75rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '9xl': ['4rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '10xl': ['4.25rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '11xl': ['4.5rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '12xl': ['5rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }],
        '13xl': ['5.25rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '14xl': ['5.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '15xl': ['5.625rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '16xl': ['7.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
      },
      typography: () => ({
        DEFAULT: {
          css: [
            {
              '--tw-prose-body': 'var(--text)',
              '--tw-prose-headings': 'var(--text)',
              h1: {
                fontWeight: 'normal',
                marginBottom: '0.25em',
              },
            },
          ],
        },
        base: {
          css: [
            {
              h1: {
                fontSize: '2.5rem',
              },
              h2: {
                fontSize: '1.25rem',
                fontWeight: 600,
              },
            },
          ],
        },
        md: {
          css: [
            {
              h1: {
                fontSize: '3.5rem',
              },
              h2: {
                fontSize: '1.5rem',
              },
            },
          ],
        },
      }),
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
    },
  },
}

export default config
