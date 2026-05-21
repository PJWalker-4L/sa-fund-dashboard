import type { ReactNode } from 'react'

interface Props {
  label?: string
  title?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export default function Panel({ label, title, actions, children, className = '', noPadding = false }: Props) {
  const hasHeader = label || title || actions

  return (
    <section className={`panel ${className}`.trim()}>
      {hasHeader && (
        <div className="panel-header">
          <div className="panel-header-text">
            {label && <span className="section-label">{label}</span>}
            {title && <span className="panel-title">{title}</span>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? 'panel-body panel-body-flush' : 'panel-body'}>
        {children}
      </div>
    </section>
  )
}
