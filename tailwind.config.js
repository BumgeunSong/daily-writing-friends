import tailwindcssAnimate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';
import safeArea from 'tailwindcss-safe-area';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // 필요하다면 chart 색상도 추가
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      typography: (theme) => ({
        dark: {
          css: {
            color: theme('colors.gray.300'),
            a: {
              color: theme('colors.primary.500'),
              '&:hover': {
                color: theme('colors.primary.400'),
              },
            },
            h2: {
              color: theme('colors.gray.100'),
            },
            h3: {
              color: theme('colors.gray.100'),
            },
            code: {
              color: theme('colors.gray.100'),
            },
            'blockquote p:first-of-type::before': {
              content: 'none',
            },
            'blockquote p:last-of-type::after': {
              content: 'none',
            },
            'ol li:before': {
              color: theme('colors.gray.400'),
            },
            'ul li:before': {
              backgroundColor: theme('colors.gray.600'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    tailwindcssAnimate,
    typography,
    safeArea,
    function ({ addUtilities }) {
      addUtilities({
        '.safe-area': {
          'padding-top': ['env(safe-area-inset-top)', 'constant(safe-area-inset-top)'],
          'padding-right': ['env(safe-area-inset-right)', 'constant(safe-area-inset-right)'],
          'padding-bottom': ['env(safe-area-inset-bottom)', 'constant(safe-area-inset-bottom)'],
          'padding-left': ['env(safe-area-inset-left)', 'constant(safe-area-inset-left)'],
          '@supports (padding: max(0px))': {
            'padding-top': 'max(env(safe-area-inset-top), 0px)',
            'padding-right': 'max(env(safe-area-inset-right), 0px)',
            'padding-bottom': 'max(env(safe-area-inset-bottom), 0px)',
            'padding-left': 'max(env(safe-area-inset-left), 0px)',
          }
        },
        '.safe-area-pt': {
          'padding-top': ['env(safe-area-inset-top)', 'constant(safe-area-inset-top)'],
          '@supports (padding: max(0px))': {
            'padding-top': 'max(env(safe-area-inset-top), 0px)',
          }
        },
        '.safe-area-pr': {
          'padding-right': ['env(safe-area-inset-right)', 'constant(safe-area-inset-right)'],
          '@supports (padding: max(0px))': {
            'padding-right': 'max(env(safe-area-inset-right), 0px)',
          }
        },
        '.safe-area-pb': {
          'padding-bottom': ['env(safe-area-inset-bottom)', 'constant(safe-area-inset-bottom)'],
          '@supports (padding: max(0px))': {
            'padding-bottom': 'max(env(safe-area-inset-bottom), 0px)',
          }
        },
        '.safe-area-pl': {
          'padding-left': ['env(safe-area-inset-left)', 'constant(safe-area-inset-left)'],
          '@supports (padding: max(0px))': {
            'padding-left': 'max(env(safe-area-inset-left), 0px)',
          }
        },
        '.-mt-safe': {
          'margin-top': ['calc(env(safe-area-inset-top) * -1)', 'calc(constant(safe-area-inset-top) * -1)'],
          '@supports (margin: max(0px))': {
            'margin-top': 'calc(max(env(safe-area-inset-top), 0px) * -1)',
          }
        },
        '.-mb-safe': {
          'margin-bottom': ['calc(env(safe-area-inset-bottom) * -1)', 'calc(constant(safe-area-inset-bottom) * -1)'],
          '@supports (margin: max(0px))': {
            'margin-bottom': 'calc(max(env(safe-area-inset-bottom), 0px) * -1)',
          }
        }
      })
    }
  ]
};
