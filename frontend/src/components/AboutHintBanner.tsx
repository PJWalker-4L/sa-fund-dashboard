interface Props {
  onDismiss: () => void
  onOpenAbout: () => void
}

export default function AboutHintBanner({ onDismiss, onOpenAbout }: Props) {
  return (
    <div
      role="status"
      className="about-hint-banner"
      style={{
        background: 'rgba(0,200,224,0.04)',
        borderBottom: '1px solid rgba(0,200,224,0.18)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <p style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.45, margin: 0 }}>
        <span style={{ color: 'var(--text-3)', letterSpacing: '0.04em' }}>
          Thesis intelligence for SA Partners LP
        </span>
        <span style={{ color: 'var(--border-hi)', margin: '0 8px' }}>·</span>
        New here? See{' '}
        <button
          type="button"
          onClick={onOpenAbout}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--teal)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          About
        </button>
        {' '}for scope & disclaimer.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss about hint"
        style={{
          padding: '2px 8px',
          fontSize: 10,
          background: 'transparent',
          color: 'var(--text-3)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}

export const ABOUT_HINT_SESSION_KEY = 'se_about_hinted'

export function isAboutHintDismissed(): boolean {
  return sessionStorage.getItem(ABOUT_HINT_SESSION_KEY) === '1'
}

export function dismissAboutHintSession(): void {
  sessionStorage.setItem(ABOUT_HINT_SESSION_KEY, '1')
}
