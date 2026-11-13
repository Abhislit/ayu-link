import Icon from './Icons'
import { StatusPill } from './StatusPill'

export default function CaseQueue({
  title = 'Incoming cases',
  subtitle,
  cases,
  selectedId,
  onSelect,
  loading,
  emptyTitle = 'No incoming cases',
  emptyDescription,
}) {
  return (
    <section className="dashboard-panel overflow-hidden rounded-[28px] bg-white/90">
      <header className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-4">
        <div>
          <h2 className="font-bold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold tabular-nums text-white">{cases.length}</span>
      </header>
      <div className="max-h-[34rem] divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4" aria-label="Loading cases">
            <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
          </div>
        ) : cases.length ? (
          cases.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={String(selectedId) === String(item.id) ? 'true' : undefined}
              className="queue-item w-full border border-transparent bg-white/40 px-4 py-4 text-left"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-950">{item.patient?.name ?? 'Patient'}</span>
                  <span className="mt-1 block text-xs text-slate-600">Case #{item.id} · Ambulance #{item.ambulance_id}</span>
                </span>
                <Icon name="chevron" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              </span>
              <span className="mt-3 flex flex-wrap gap-2">
                <StatusPill status={item.priority} label={`${item.priority} priority`} />
                <StatusPill status={item.emergency_category} label={item.emergency_category ?? 'unknown'} />
                <StatusPill status={item.status} />
              </span>
            </button>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-800">{emptyTitle}</p>
            {emptyDescription ? <p className="mt-1 text-sm leading-5 text-slate-600">{emptyDescription}</p> : null}
          </div>
        )}
      </div>
    </section>
  )
}
