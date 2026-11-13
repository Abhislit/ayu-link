import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import CaseMessages from '../components/CaseMessages'
import { CaseStatus, EmptyCase, PatientOverview } from '../components/CaseOverview'
import Icon from '../components/Icons'
import { ErrorNotice, LiveStatus, StatusPill } from '../components/StatusPill'
import useRealtime from '../hooks/useRealtime'

export default function Doctor() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [detail, setDetail] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCases = useCallback(async () => {
    try {
      const result = await api('/api/doctor/cases')
      setCases(result)
      setSelectedId((current) => current ?? result[0]?.id ?? null)
      setError('')
    } catch (reason) {
      setError(reason.message || 'Cases could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (caseId) => {
    if (!caseId) {
      setDetail(null)
      return
    }
    try {
      setDetail(await api(`/api/cases/${caseId}`))
    } catch (reason) {
      setError(reason.message || 'Case details could not be loaded.')
    }
  }, [])

  const handleRealtime = useCallback(
    (_event, payload) => {
      loadCases()
      if (String(payload?.case?.id) === String(selectedId)) loadDetail(selectedId)
    },
    [loadCases, loadDetail, selectedId],
  )
  const connected = useRealtime(handleRealtime)

  useEffect(() => {
    loadCases()
  }, [loadCases])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [loadDetail, selectedId])

  const selectedDetail =
    String(detail?.case?.id) === String(selectedId) ? detail : null

  return (
    <div className="space-y-6">
      <header className="dashboard-hero rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Clinical view</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Case overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Read-only view of active emergency cases assigned to your hospital.</p>
          </div>
          <LiveStatus connected={connected} />
        </div>
      </header>
      {error ? <ErrorNotice onDismiss={() => setError('')}>{error}</ErrorNotice> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.5fr)]">
        <section className="dashboard-panel overflow-hidden rounded-[28px] bg-white/90">
          <header className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4">
            <h2 className="font-bold text-slate-950">Hospital cases</h2>
            <p className="mt-1 text-xs text-slate-600">Clinical details are scoped to your hospital.</p>
          </header>
          {loading ? (
            <div className="space-y-2 p-4" aria-label="Loading cases">
              <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
            </div>
          ) : cases.length ? (
            <div className="divide-y divide-slate-100">
              {cases.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  aria-current={String(selectedId) === String(item.id) ? 'true' : undefined}
                  className={`queue-item w-full border border-transparent px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-red-600 ${
                    String(selectedId) === String(item.id) ? 'bg-red-50/70' : 'bg-white/40'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-bold text-slate-950">{item.patient?.name ?? 'Patient'} · Case #{item.id}</span>
                      <span className="mt-1 block text-xs text-slate-600">Ambulance #{item.ambulance_id}</span>
                    </span>
                    <Icon name="chevron" className="h-4 w-4 shrink-0 text-slate-400" />
                  </span>
                  <span className="mt-3 flex flex-wrap gap-2">
                    <StatusPill status={item.priority} label={`${item.priority} priority`} />
                    <StatusPill status={item.status} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-600">No cases assigned to this hospital.</div>
          )}
        </section>

        {selectedDetail ? (
          <div className="space-y-4">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Case #{selectedDetail.case.id}</h2>
                  <p className="mt-1 text-sm text-slate-600">{selectedDetail.ambulance?.vehicle_number} · {new Date(selectedDetail.case.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <Icon name="shield" className="h-6 w-6 text-slate-500" />
              </div>
              <div className="mt-3"><CaseStatus detail={selectedDetail} /></div>
            </section>
            <PatientOverview detail={selectedDetail} />
            <CaseMessages caseId={selectedDetail.case.id} user={user} canReply={false} />
            <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-700">This role can review information and listen to case communications. Only hospital staff can acknowledge or update preparation status.</p>
          </div>
        ) : (
          <EmptyCase
            title="Choose a case to review"
            description="Open an assigned case to read the medical summary and listen to the ambulance handoff."
          />
        )}
      </div>
    </div>
  )
}
