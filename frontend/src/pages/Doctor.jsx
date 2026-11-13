import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import CaseMessages from '../components/CaseMessages'
import CaseQueue from '../components/CaseQueue'
import { CaseProgress, CaseStatus, EmptyCase, PatientOverview } from '../components/CaseOverview'
import Icon from '../components/Icons'
import { ErrorNotice, LiveStatus } from '../components/StatusPill'
import useRealtime from '../hooks/useRealtime'

export default function Doctor() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [detail, setDetail] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
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
    setDetailLoading(true)
    try {
      setDetail(await api(`/api/cases/${caseId}`))
    } catch (reason) {
      setError(reason.message || 'Case details could not be loaded.')
    } finally {
      setDetailLoading(false)
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-ink)]">Clinical view</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Case overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Read-only view of active emergency cases assigned to your hospital.</p>
          </div>
          <LiveStatus connected={connected} />
        </div>
      </header>
      {error ? <ErrorNotice onDismiss={() => setError('')}>{error}</ErrorNotice> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.5fr)]">
        <CaseQueue
          title="Hospital cases"
          subtitle="Clinical details are scoped to your hospital."
          cases={cases}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={loading}
          emptyTitle="No cases assigned to this hospital"
        />

        {detailLoading ? (
          <div className="space-y-4" aria-label="Loading selected case">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        ) : selectedDetail ? (
          <div className="space-y-4">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Case #{selectedDetail.case.id}</h2>
                  <p className="mt-1 text-sm text-slate-600">{selectedDetail.ambulance?.vehicle_number} · {new Date(selectedDetail.case.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <Icon name="shield" className="h-6 w-6 text-slate-500" />
              </div>
              <div className="mt-4"><CaseProgress detail={selectedDetail} /></div>
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
