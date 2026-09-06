import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * PrimeNG preset for WealthLens. Maps PrimeNG's semantic design tokens onto
 * the same hex values as the Tailwind `@theme` tokens in src/styles.scss, so
 * PrimeNG components (p-select, p-table, p-paginator, p-toggleswitch, ...)
 * inherit the app's dark theme natively instead of via ad hoc !important
 * overrides. Keep these two token sources in sync if the palette changes.
 */
export const WealthLensPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#E6F7F2',
      100: '#C0EBE0',
      200: '#96DECD',
      300: '#6BD1B9',
      400: '#3EC4A5',
      500: '#10A37F',
      600: '#1AA97D',
      700: '#0D8A6B',
      800: '#0A6C54',
      900: '#074E3D',
      950: '#043024',
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#FFFFFF',
          50: '#F2F2F2',
          100: '#E0E0E0',
          200: '#C7C7C7',
          300: '#A3A3A3',
          400: '#808080',
          500: '#666666',
          600: '#3A3A3A',
          700: '#2E2E2E',
          800: '#232323',
          900: '#1C1C1C',
          950: '#191919',
        },
        primary: {
          color: '#10A37F',
          contrastColor: '#FFFFFF',
          hoverColor: '#1AA97D',
          activeColor: '#1AA97D',
        },
        highlight: {
          background: '#10A37F',
          focusBackground: '#1AA97D',
          color: '#FFFFFF',
          focusColor: '#FFFFFF',
        },
        content: {
          background: '#232323',
          hoverBackground: '#2E2E2E',
          borderColor: '#3A3A3A',
          color: '#FFFFFF',
          hoverColor: '#FFFFFF',
        },
        text: {
          color: '#FFFFFF',
          hoverColor: '#FFFFFF',
          mutedColor: '#B3B3B3',
          hoverMutedColor: '#FFFFFF',
        },
        formField: {
          background: '#2A2A2A',
          disabledBackground: '#2E2E2E',
          filledBackground: '#2A2A2A',
          filledHoverBackground: '#2E2E2E',
          filledFocusBackground: '#2A2A2A',
          borderColor: '#3A3A3A',
          hoverBorderColor: '#10A37F',
          focusBorderColor: '#10A37F',
          invalidBorderColor: '#EF4444',
          color: '#FFFFFF',
          disabledColor: '#666666',
          placeholderColor: '#666666',
          invalidPlaceholderColor: '#EF4444',
          iconColor: '#B3B3B3',
        },
        overlay: {
          select: {
            background: '#232323',
            borderColor: '#3A3A3A',
            color: '#FFFFFF',
          },
          popover: {
            background: '#232323',
            borderColor: '#3A3A3A',
            color: '#FFFFFF',
          },
          modal: {
            background: '#1C1C1C',
            borderColor: '#3A3A3A',
            color: '#FFFFFF',
          },
        },
        list: {
          option: {
            focusBackground: '#2E2E2E',
            selectedBackground: '#10A37F',
            selectedFocusBackground: '#1AA97D',
            color: '#B3B3B3',
            focusColor: '#FFFFFF',
            selectedColor: '#FFFFFF',
            selectedFocusColor: '#FFFFFF',
          },
        },
      },
    },
    formField: {
      borderRadius: '0.75rem',
      paddingX: '1rem',
      paddingY: '0.625rem',
    },
    overlay: {
      select: {
        borderRadius: '0.75rem',
        shadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
      },
    },
    list: {
      padding: '0.375rem',
      option: {
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
      },
    },
  },
});
