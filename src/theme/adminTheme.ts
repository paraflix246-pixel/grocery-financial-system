/**
 * Fixed admin dashboard palette — intentionally independent of AppThemeProvider
 * so SmartCartColors mutations never cause low-contrast text on admin surfaces.
 */
export const AdminColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryText: '#FFFFFF',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  headerBg: '#FFFFFF',
  modalBackdrop: 'rgba(15, 23, 42, 0.55)',
  sidebarBg: '#0F172A',
  sidebarBorder: '#1E293B',
  sidebarText: '#F8FAFC',
  sidebarTextMuted: '#94A3B8',
  sidebarActive: '#2563EB',
  sidebarHover: '#1E293B',
  sidebarBadge: '#334155',
  topBarBg: '#FFFFFF',
};

export const AdminRadius = {
  sm: 8,
  md: 10,
  lg: 12,
};

export const AdminShadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSoft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};
