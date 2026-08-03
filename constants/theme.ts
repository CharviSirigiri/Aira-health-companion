import { Platform } from 'react-native';

const caregiverIndigo = '#4F46E5';

// Aira brand: "Tropic Teal" — mint-white canvas with a vivid emerald-teal pop
// accent, chosen for being brighter/more engaging than the original near-black
// ink brand while staying legible for aging eyes (light ground, dark text).
// This is a fixed brand identity (not a light/dark system toggle), so `light`
// and `dark` intentionally share the same palette — screens built on
// ThemedView/ThemedText (explore, modal) render consistently either way.
const brandLight = {
  text: '#122B27',
  textMuted: '#7C9C97',
  background: '#F1FBF8',
  card: '#FFFFFF',
  border: '#D8F0E9',
  tint: '#04967A',
  icon: '#04967A',
  tabIconDefault: '#7C9C97',
  tabIconSelected: '#04967A',
  success: '#0B6B57',
  successBg: '#D3F3EA',
  warning: '#B5623E',
  warningBg: '#FDE9DD',
  danger: '#E63946',
  dangerBg: '#FCE1E3',
  info: '#146B7A',
  infoBg: '#D8F0F5',
};

export const Colors = {
  light: brandLight,
  dark: brandLight,
};

export const RoleThemes = {
  elder: {
    bg: '#F1FBF8', // Mint-white canvas
    card: '#FFFFFF', // Neutral white card
    cardBorder: '#D8F0E9',
    text: '#122B27', // High-contrast dark-teal text
    textMuted: '#7C9C97',
    ink: '#04967A', // Vivid emerald-teal pop accent (buttons, nav, primary icons)
    inkText: '#FFFFFF', // Text/icon color on ink surfaces
    sage: '#D3F3EA',
    sageDeep: '#0B6B57',
    lavender: '#D7E3F5',
    lavenderDeep: '#3A5A78',
    sky: '#D8F0F5',
    skyDeep: '#146B7A',
    peach: '#FDE9DD',
    peachDeep: '#B5623E',
    danger: '#E63946', // Bright coral-red, kept distinct from pastels for safety-critical alerts
    dangerBg: '#FCE1E3',
    dangerDeep: '#A11F2B',
    voicePulse: '#04967A',
    border: '#D8F0E9',
  },
  caregiver: {
    primary: '#D01C8B', // Vibrant Hot Pink
    primaryDark: '#831843', // Deep Hot Pink
    primaryLight: '#FCE7F3', // Soft Pink
    accent: '#F472B6', // Bright Pink Accent
    bg: '#FDF2F8', // Soft Pink Canvas
    card: '#FFFFFF',
    text: '#0F172A',
    statusOk: '#10B981',
  },
  doctor: {
    primary: '#2563EB', // Clinical Blue
    primaryLight: '#DBEAFE',
    accent: '#059669', // Emerald
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    badge: '#EFF6FF',
  },
};

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)' },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    web: { boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    web: { boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)' },
  }),
};

// Soft "lifted" shadow for floating elements (nav bar, teal CTA buttons, mic button).
export const GlowShadow = Platform.select({
  ios: {
    shadowColor: '#04967A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  android: { elevation: 8 },
  web: { boxShadow: '0 10px 28px rgba(4, 150, 122, 0.22)' },
});

export const Radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 32,
  full: 9999,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', sans-serif",
    mono: "SFMono-Regular, Consolas, monospace",
  },
});
