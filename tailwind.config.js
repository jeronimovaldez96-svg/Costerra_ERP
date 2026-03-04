/** @type {import('tailwindcss').Config} */

/**
 * Helper: creates a Tailwind-compatible color function that reads
 * bare HSL channels from a CSS custom property and injects
 * the <alpha-value> placeholder for opacity modifier support.
 *
 * CSS vars store values like "220 20% 100%" (no hsl() wrapper).
 * Tailwind calls the function with { opacityValue } when the
 * developer writes e.g. bg-surface-900/60.
 */
function hslVar(varName) {
    return ({ opacityValue }) => {
        if (opacityValue !== undefined) {
            return `hsl(var(${varName}) / ${opacityValue})`
        }
        return `hsl(var(${varName}))`
    }
}

module.exports = {
    content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
    darkMode: 'class',
    theme: {
        extend: {
            /* ── Typography ─────────────────────────────────── */
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'monospace']
            },

            /* ── Color Palette (CSS Custom Property Tokens) ── */
            /* Actual HSL channel values are defined in globals.css
               under :root (light) and .dark (dark) selectors.
               The hslVar helper enables Tailwind's /opacity syntax. */
            colors: {
                brand: {
                    50: hslVar('--color-brand-50'),
                    100: hslVar('--color-brand-100'),
                    200: hslVar('--color-brand-200'),
                    300: hslVar('--color-brand-300'),
                    400: hslVar('--color-brand-400'),
                    500: hslVar('--color-brand-500'),
                    600: hslVar('--color-brand-600'),
                    700: hslVar('--color-brand-700'),
                    800: hslVar('--color-brand-800'),
                    900: hslVar('--color-brand-900'),
                    950: hslVar('--color-brand-950')
                },
                surface: {
                    0: hslVar('--color-surface-0'),
                    50: hslVar('--color-surface-50'),
                    100: hslVar('--color-surface-100'),
                    200: hslVar('--color-surface-200'),
                    300: hslVar('--color-surface-300'),
                    400: hslVar('--color-surface-400'),
                    500: hslVar('--color-surface-500'),
                    600: hslVar('--color-surface-600'),
                    700: hslVar('--color-surface-700'),
                    800: hslVar('--color-surface-800'),
                    850: hslVar('--color-surface-850'),
                    900: hslVar('--color-surface-900'),
                    950: hslVar('--color-surface-950')
                },
                success: {
                    50: hslVar('--color-success-50'),
                    500: hslVar('--color-success-500'),
                    600: hslVar('--color-success-600')
                },
                warning: {
                    50: hslVar('--color-warning-50'),
                    500: hslVar('--color-warning-500'),
                    600: hslVar('--color-warning-600')
                },
                danger: {
                    50: hslVar('--color-danger-50'),
                    500: hslVar('--color-danger-500'),
                    600: hslVar('--color-danger-600')
                }
            },

            /* ── Spacing Tokens ─────────────────────────────── */
            spacing: {
                '4.5': '1.125rem',
                '13': '3.25rem',
                '15': '3.75rem',
                '18': '4.5rem',
                '88': '22rem',
                '100': '25rem',
                '120': '30rem'
            },

            /* ── Border Radius ──────────────────────────────── */
            borderRadius: {
                'sm': '0.25rem',
                'md': '0.5rem',
                'lg': '0.75rem',
                'xl': '1rem',
                '2xl': '1.25rem'
            },

            /* ── Box Shadow ─────────────────────────────────── */
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.08)',
                'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.12)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
                'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
                'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                'elevated': '0 10px 30px rgba(0, 0, 0, 0.08)'
            },

            /* ── Backdrop Blur ──────────────────────────────── */
            backdropBlur: {
                'xs': '2px',
                'glass': '12px'
            },

            /* ── Animations ─────────────────────────────────── */
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(4px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                'slide-in-right': {
                    '0%': { opacity: '0', transform: 'translateX(8px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.96)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                }
            },
            animation: {
                'fade-in': 'fade-in 0.2s ease-out',
                'slide-in-right': 'slide-in-right 0.25s ease-out',
                'scale-in': 'scale-in 0.15s ease-out',
                'shimmer': 'shimmer 1.5s ease-in-out infinite'
            },

            /* ── Font Sizes ─────────────────────────────────── */
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
                'base': ['0.875rem', { lineHeight: '1.5rem' }],
                'lg': ['1rem', { lineHeight: '1.75rem' }],
                'xl': ['1.125rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.25rem', { lineHeight: '1.875rem' }],
                '3xl': ['1.5rem', { lineHeight: '2rem' }],
                '4xl': ['1.875rem', { lineHeight: '2.25rem' }]
            }
        }
    },
    plugins: []
}
