/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 🌑 Base layers
        background: '#191919',        // App background
        surface: '#232323',           // Cards, modals, panels
        surfaceHover: '#2E2E2E',      // Hovered surface
        border: '#3A3A3A',            // Subtle borders
        divider: '#2A2A2A',           // Between list items

        // 📝 Text
        textPrimary: '#FFFFFF',       // Main readable text
        textSecondary: '#B3B3B3',     // Muted text, placeholders
        textDisabled: '#666666',      // Less important info

        // 🟩 Accent (minimal usage — similar to ChatGPT green)
        accent: '#10A37F',
        accentHover: '#1AA97D',

        // 🟦 Optional secondary accent (rare use, like upgrade)
        blueAccent: '#3B82F6',
        blueAccentHover: '#2563EB',

        // ⚠️ Semantic colors (for charts, tags, etc.)
        success: '#22C55E',
        warning: '#FACC15',
        danger: '#EF4444',
      },

      // 🎨 Radius, spacing, shadows
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },

      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.3)',
        modal: '0 4px 16px rgba(0, 0, 0, 0.45)',
        inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },

      // 📐 Typography
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', '1rem'],
        sm: ['0.875rem', '1.25rem'],
        base: ['1rem', '1.5rem'],
        lg: ['1.125rem', '1.75rem'],
        xl: ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '2rem'],
        '3xl': ['1.875rem', '2.25rem'],
      },

      // 🧭 Transitions & Animations
      transitionDuration: {
        DEFAULT: '150ms',
        fast: '100ms',
        slow: '300ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'ease-in-out',
      },

      // 🧱 Layout helpers
      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // Makes input, select styling clean
    require('@tailwindcss/typography'), // For markdown/text content
  ],
};
