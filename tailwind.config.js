import tailwindcssAnimate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';
import safeArea from 'tailwindcss-safe-area';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		spacing: {
  			'12': '3rem',
  			'safe-top': 'env(safe-area-inset-top)',
  			'safe-bottom': 'env(safe-area-inset-bottom)',
  			'safe-left': 'env(safe-area-inset-left)',
  			'safe-right': 'env(safe-area-inset-right)'
  		},
  		typography: '(theme) => ({\n        DEFAULT: {\n          css: {\n            color: theme('colors.gray.700'),\n            a: {\n              color: theme('colors.primary.500'),\n              '&:hover': {\n                color: theme('colors.primary.600'),\n              },\n            },\n            h2: {\n              fontWeight: '700',\n              letterSpacing: theme('letterSpacing.tight'),\n              color: theme('colors.gray.900'),\n            },\n            h3: {\n              fontWeight: '600',\n              color: theme('colors.gray.900'),\n            },\n            'ol li:before': {\n              fontWeight: '600',\n              color: theme('colors.gray.500'),\n            },\n            'ul li:before': {\n              backgroundColor: theme('colors.gray.400'),\n            },\n            code: {\n              color: theme('colors.gray.900'),\n            },\n            'blockquote p:first-of-type::before': {\n              content: 'none',\n            },\n            'blockquote p:last-of-type::after': {\n              content: 'none',\n            },\n          },\n        },\n        dark: {\n          css: {\n            color: theme('colors.gray.300'),\n            a: {\n              color: theme('colors.primary.500'),\n              '&:hover': {\n                color: theme('colors.primary.400'),\n              },\n            },\n            h2: {\n              color: theme('colors.gray.100'),\n            },\n            h3: {\n              color: theme('colors.gray.100'),\n            },\n            code: {\n              color: theme('colors.gray.100'),\n            },\n            'blockquote p:first-of-type::before': {\n              content: 'none',\n            },\n            'blockquote p:last-of-type::after': {\n              content: 'none',\n            },\n            'ol li:before': {\n              color: theme('colors.gray.400'),\n            },\n            'ul li:before': {\n              backgroundColor: theme('colors.gray.600'),\n            },\n          },\n        },\n      })'
  	}
  },
  plugins: [
    tailwindcssAnimate,
    typography,
    safeArea,
    function({ addUtilities }) {
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
    },
      require("tailwindcss-animate")
]
};

