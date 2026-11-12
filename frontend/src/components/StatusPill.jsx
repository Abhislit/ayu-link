import Icon from './Icons'

const STATUS_STYLES = {
  open: 'bg-amber-50 text-amber-800 ring-amber-200',
  hospital_selected: 'bg-blue-50 text-blue-800 ring-blue-200',
  acknowledged: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-700 ring-slate-200',
  en_route: 'bg-blue-50 text-blue-800 ring-blue-200',
  arrived: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  requested: 'bg-blue-50 text-blue-800 ring-blue-200',
  preparing: 'bg-amber-50 text-amber-800 ring-amber-200',
  ready: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  sent: 'bg-slate-100 text-slate-700 ring-slate-200',
  delivered: 'bg-blue-50 text-blue-800 ring-blue-200',
  high: 'bg-red-50 text-red-800 ring-red-200',
  critical: 'bg-red-100 text-red-900 ring-red-300',
  trauma: 'bg-red-50 text-red-800 ring-red-200',
  cardiac: 'bg-orange-50 text-orange-800 ring-orange-200',
  respiratory: 'bg-blue-50 text-blue-800 ring-blue-200',
  obstetric: 'bg-violet-50 text-violet-800 ring-violet-200',
  other: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export function StatusPill({ status, label }) {
  const title = label ?? status?.replaceAll('_', ' ') ?? 'Unknown'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}
    >
      {status === 'acknowledged' || status === 'ready' ? (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
      {title}
    </span>
  )
}

export function LiveStatus({ connected }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
      <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {connected ? 'Live updates on' : 'Reconnecting'}
    </span>
  )
}

export function ErrorNotice({ children, onDismiss }) {
  if (!children) return null
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-inset ring-red-200">
      <p>{children}</p>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss error"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
