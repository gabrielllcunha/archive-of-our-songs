export const colorTokens = {
  background: 'var(--color-background)',
  foreground: 'var(--color-foreground)',
  primary: 'var(--color-primary)',
  primaryHover: 'var(--color-primary-hover)',
  primarySolid: 'var(--color-primary-solid)',
  secondary: 'var(--color-secondary)',
  secondarySoft: 'var(--color-secondary-soft)',
  surface: 'var(--color-surface)',
  surfaceElevated: 'var(--color-surface-elevated)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  textSubtle: 'var(--color-text-subtle)',
  borderSubtle: 'var(--color-border-subtle)',
  borderDefault: 'var(--color-border-default)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  danger: 'var(--color-danger)',
} as const;

export type ColorToken = keyof typeof colorTokens;
