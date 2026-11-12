import Icon from './Icons'
import { StatusPill } from './StatusPill'

export function PatientOverview({ detail, compact = false }) {
  if (!detail?.patient) return null
  const { patient, medical_record: record } = detail
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{patient.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {patient.age ? `${patient.age} years` : 'Age unavailable'}
            {patient.sex ? ` · ${patient.sex}` : ''}
            {patient.blood_group ? ` · ${patient.blood_group}` : ''}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          <Icon name="alert" className="h-4 w-4" />
          Emergency patient
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-red-50/80 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-red-900">Allergies</p>
          <p className="mt-1 text-sm font-medium text-red-950">{patient.allergies || 'None recorded'}</p>
        </div>
        <div className="rounded-xl bg-amber-50/80 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-950">Known conditions</p>
          <p className="mt-1 text-sm font-medium text-amber-950">{patient.conditions || 'None recorded'}</p>
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold text-slate-900">Available medical history</h3>
          {record ? (
            <div className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
              {record.summary ? <p>{record.summary}</p> : null}
              {record.medications ? <p><span className="font-semibold text-slate-800">Medications:</span> {record.medications}</p> : null}
              {record.notes ? <p>{record.notes}</p> : null}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">No additional medical record is available.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}

export function CaseStatus({ detail }) {
  if (!detail?.case) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill status={detail.case.status} />
      <StatusPill status={detail.case.priority} label={`${detail.case.priority} priority`} />
      <StatusPill
        status={detail.case.emergency_category}
        label={`Category: ${detail.case.emergency_category ?? 'unknown'}`}
      />
      <StatusPill
        status={detail.case.ambulance_status}
        label={`Ambulance ${detail.case.ambulance_status?.replaceAll('_', ' ') ?? 'status unavailable'}`}
      />
      {detail.case.prep_status ? <StatusPill status={detail.case.prep_status} label={`Hospital ${detail.case.prep_status}`} /> : null}
    </div>
  )
}

export function EmptyCase({ title = 'No active emergency case', description, children }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-600">
        <Icon name="activity" className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  )
}
