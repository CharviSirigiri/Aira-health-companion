import { Platform } from 'react-native';

const primaryTeal = '#0E9F6E';
const primaryTealDark = '#10B981';
const caregiverIndigo = '#4F46E5';

export const Colors = {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    tint: primaryTeal,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: primaryTeal,
    success: '#10B981',
    successBg: '#ECFDF5',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
  },
  dark: {
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    tint: primaryTealDark,
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: primaryTealDark,
    success: '#34D399',
    successBg: '#064E3B',
    warning: '#FBBF24',
    warningBg: '#78350F',
    danger: '#F87171',
    dangerBg: '#7F1D1D',
    info: '#60A5FA',
    infoBg: '#1E3A8A',
  },
};

export const RoleThemes = {
  elder: {
    primary: '#0D9488', // Safety Teal
    primaryDark: '#0F766E',
    primaryLight: '#CCFBF1',
    bg: '#F8FAFC', // Off-white canvas
    card: '#FFFFFF', // Pure White containers
    text: '#0F172A', // Deep Navy text (High Contrast)
    textMuted: '#475569',
    accent: '#EA580C', // Warm Coral/Orange Action Alert Accent
    voicePulse: '#0D9488',
    border: '#E2E8F0',
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

export const Radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
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
