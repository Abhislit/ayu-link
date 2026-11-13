import Icon from './Icons'
import { StatusPill } from './StatusPill'

export function PatientOverview({ detail, compact = false }) {
  if (!detail?.patient) return null
  const { patient, medical_record: record } = detail
  return (
    <section className="strip">
      <span className="strip-perf" aria-hidden="true" />
      <div className="strip-body">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-l border-[var(--alarm)] bg-[var(--alarm-tint)] py-1 pl-3 pr-2">
            <p className="paper-label text-[var(--alarm)]">Allergies</p>
            <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">{patient.allergies || 'None recorded'}</p>
          </div>
          <div className="border border-[var(--paper-line)] bg-[var(--paper-band)] p-2.5">
            <p className="paper-label">Known conditions</p>
            <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">{patient.conditions || 'None recorded'}</p>
          </div>
        </div>

        {patient.aadhaar || patient.phone || patient.emergency_contact || patient.address ? (
          <div className="mt-3 grid gap-x-3 gap-y-2.5 border border-[var(--paper-line)] bg-[var(--paper)] p-3 sm:grid-cols-2">
            <div>
              <p className="paper-label">Aadhaar</p>
              <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">{patient.aadhaar || 'Not recorded'}</p>
            </div>
            <div>
              <p className="paper-label">Phone</p>
              <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">{patient.phone || 'Not recorded'}</p>
            </div>
            <div>
              <p className="paper-label">Emergency contact</p>
              <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">{patient.emergency_contact || 'Not recorded'}</p>
            </div>
            <div>
              <p className="paper-label">Address</p>
              <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">{patient.address || 'Not recorded'}</p>
            </div>
          </div>
        ) : null}

        {!compact ? (
          <div className="mt-4 border-t border-[var(--paper-line)] pt-3">
            <p className="paper-label">Available medical history</p>
            {record ? (
              <div className="mt-1.5 space-y-1 text-[13px] leading-6 text-[var(--ink)]">
                {record.summary ? <p>{record.summary}</p> : null}
                {record.medications ? <p><span className="font-semibold">Medications:</span> {record.medications}</p> : null}
                {record.notes ? <p>{record.notes}</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-[13px] text-[var(--paper-muted)]">No additional medical record is available.</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function CaseStatus({ detail }) {
  if (!detail?.case) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill status={detail.case.status} />
      <StatusPill status={detail.case.priority} label={`${detail.case.priority} priority`} />
      {detail.case.emergency_category && detail.case.emergency_category !== 'unknown' ? (
        <StatusPill status={detail.case.emergency_category} label={`Category: ${detail.case.emergency_category}`} />
      ) : null}
      <StatusPill
        status={detail.case.ambulance_status}
        label={`Ambulance ${detail.case.ambulance_status?.replaceAll('_', ' ') ?? 'status unavailable'}`}
      />
      {detail.case.prep_status ? <StatusPill status={detail.case.prep_status} label={`Hospital ${detail.case.prep_status}`} /> : null}
    </div>
  )
}

const PROGRESS_STEPS = [
  ['open', 'Identified'],
  ['hospital_selected', 'Hospital'],
  ['acknowledged', 'Acknowledged'],
  ['closed', 'Closed'],
]

export function CaseProgress({ detail }) {
  const status = detail?.case?.status
  if (!status) return null
  const current = Math.max(0, PROGRESS_STEPS.findIndex(([key]) => key === status))
  return (
    <div>
      <p className="paper-label">Handoff progress</p>
      <ol className="mt-2 grid grid-cols-2 gap-1.5">
        {PROGRESS_STEPS.map(([key, label], index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'future'
          return (
            <li key={key} aria-current={index === current ? 'step' : undefined} className="min-w-0">
              <div
                className={`border p-2 ${
                  state === 'done'
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : state === 'current'
                      ? 'border-[var(--alarm)] bg-[var(--alarm)] text-[var(--paper)]'
                      : 'border-[var(--paper-line)] text-[var(--paper-muted)]'
                }`}
              >
                <span className="block text-[9px] font-semibold tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase leading-tight tracking-[0.06em]">
                  {label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function EmptyCase({ title = 'No active emergency case', description, children }) {
  return (
    <section className="border border-[var(--board-line)] bg-[var(--paper)] px-5 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center border border-[var(--board-line)] bg-[var(--paper)] text-[var(--ink)]">
        <Icon name="activity" className="h-6 w-6" />
      </div>
      <h2 className="display mt-4 text-[22px] tracking-[0.06em] text-[var(--text)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[var(--text-muted)]">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  )
}
