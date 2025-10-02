/**
 * Design Tokens extracted from ExamGenie Mobile App
 * These tokens ensure visual consistency between mobile app and web exam interface
 */

export const COLORS = {
  // Primary colors from mobile app
  primary: {
    dark: '#2D2D2D', // Dark charcoal (logo background, primary button)
    text: '#2D2D2D', // Main heading text
    medium: '#545454', // Secondary text
    light: '#9E9E9E', // Placeholder/hint text
  },

  // Background colors
  background: {
    primary: '#FFFFFF', // Main background
    secondary: '#F5F5F5', // Card backgrounds, secondary surfaces
    disabled: '#E0E0E0', // Disabled button state
  },

  // Accent colors
  accent: {
    green: '#4CAF50', // Success, battery indicator (from status bar)
  },

  // Border colors
  border: {
    light: '#E0E0E0', // Card borders, dividers
    medium: '#BDBDBD', // Input borders
  },

  // Semantic colors
  semantic: {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  }
} as const

export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Font sizes (from mobile app analysis)
  fontSize: {
    // Large heading (e.g., "Hei, Joakim Achren!")
    '2xl': '28px',
    // Page titles (e.g., "Luo koe kuvista")
    xl: '20px',
    // Section headings (e.g., "1. Valitse aine", "Opiskelijat")
    lg: '18px',
    // Body text, button text
    base: '16px',
    // Secondary text, hints
    sm: '14px',
    // Caption text, version numbers
    xs: '12px',
  },

  // Font weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  }
} as const

export const SPACING = {
  // Spacing scale (mobile-optimized)
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '40px',

  // Component-specific spacing
  button: {
    padding: {
      vertical: '14px',
      horizontal: '24px',
    },
    gap: '8px', // Icon-to-text spacing
  },

  card: {
    padding: '16px',
    gap: '12px',
  },

  page: {
    padding: '24px', // Page horizontal padding (mobile2.PNG shows ~24px)
    gapSmall: '16px',
    gapMedium: '24px',
    gapLarge: '32px',
  }
} as const

export const SHADOWS = {
  // Card shadow (subtle elevation from mobile app)
  card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.12)',

  // Button shadow (slightly more prominent)
  button: '0 2px 4px rgba(0, 0, 0, 0.1)',

  // No shadow
  none: 'none',
} as const

export const RADIUS = {
  // Border radius from mobile app
  sm: '8px',   // Small cards, inputs
  md: '12px',  // Medium cards
  lg: '16px',  // Large cards, primary buttons
  xl: '20px',  // App icon, special elements
  full: '9999px', // Circular elements (avatar)
} as const

export const BUTTONS = {
  // Primary button (dark, from "Uusi koe" button)
  primary: {
    background: COLORS.primary.dark,
    text: '#FFFFFF',
    radius: RADIUS.lg,
    padding: `${SPACING.button.padding.vertical} ${SPACING.button.padding.horizontal}`,
    shadow: SHADOWS.button,
  },

  // Secondary button (light background from "Aiemmat kokeet")
  secondary: {
    background: COLORS.background.secondary,
    text: COLORS.primary.text,
    radius: RADIUS.lg,
    padding: `${SPACING.button.padding.vertical} ${SPACING.button.padding.horizontal}`,
    shadow: SHADOWS.none,
  },

  // Disabled state
  disabled: {
    background: COLORS.background.disabled,
    text: COLORS.primary.light,
    radius: RADIUS.lg,
    padding: `${SPACING.button.padding.vertical} ${SPACING.button.padding.horizontal}`,
    shadow: SHADOWS.none,
  }
} as const

export const CARDS = {
  // Student card style (from mobile2.PNG "Opiskelijat" section)
  student: {
    background: COLORS.background.primary,
    border: `1px solid ${COLORS.border.light}`,
    radius: RADIUS.md,
    padding: SPACING.card.padding,
    shadow: SHADOWS.card,
  },

  // Stats card (from bottom section of mobile2.PNG)
  stats: {
    background: COLORS.background.secondary,
    radius: RADIUS.md,
    padding: SPACING.md,
    shadow: SHADOWS.none,
  }
} as const

export const TOUCH_TARGETS = {
  // Minimum touch target size (accessibility)
  minimum: '44px',

  // Comfortable touch target
  comfortable: '48px',
} as const

export const TRANSITIONS = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const
