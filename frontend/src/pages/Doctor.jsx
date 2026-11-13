import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import CaseMessages from '../components/CaseMessages'
import CaseQueue from '../components/CaseQueue'
import { CaseProgress, CaseStatus, EmptyCase, PatientOverview } from '../components/CaseOverview'
import Icon from '../components/Icons'
import { ErrorNotice, LiveStatus } from '../components/StatusPill'
import useRealtime from '../hooks/useRealtime'
import { useStripAdvance } from '../hooks/useStripAdvance'

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
  const advancing = useStripAdvance(selectedDetail?.case?.status)

  return (
    <div className="space-y-6">
      <header className="border-b border-[var(--board-line)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-4xl tracking-[0.08em] text-[var(--text)] sm:text-5xl">Case overview</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
              Read-only view of active emergency cases assigned to your hospital.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="chrome-label m-0">Clinical view</p>
            <LiveStatus connected={connected} />
          </div>
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
            <div className="skeleton h-40" />
            <div className="skeleton h-80" />
          </div>
        ) : selectedDetail ? (
          <div className="space-y-4">
            <section className={`strip overflow-hidden ${advancing ? 'strip-advance' : ''}`}>
              <span className="strip-perf" aria-hidden="true" />
              <div className="strip-head">
                <div className="flex items-center gap-2">
                  <span className="paper-label">Case</span>
                  <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">#{selectedDetail.case.id}</span>
                  <span className="text-[var(--perf)]">·</span>
                  <span className="paper-label">{selectedDetail.ambulance?.vehicle_number}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--paper-muted)]">
                  <span className="st">
                    {new Date(selectedDetail.case.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <Icon name="shield" className="h-4 w-4" />
                </div>
              </div>
              <div className="strip-body space-y-3">
                <h2 className="display text-[30px] leading-none text-[var(--ink)]">{selectedDetail.patient.name}</h2>
                <p className="mt-1.5 text-[12px] text-[var(--paper-muted)]">
                  {selectedDetail.patient.age} years · {selectedDetail.patient.sex} · {selectedDetail.patient.blood_group}
                </p>
                <CaseStatus detail={selectedDetail} />
                <div className="border-t border-[var(--paper-line)] pt-3">
                  <CaseProgress detail={selectedDetail} />
                </div>
              </div>
              <div className="stamp py-2 pl-4 pr-4 sm:pl-[58px] sm:pr-[30px]">
                <p className="stamp-line">
                  Handoff state · {selectedDetail.case.status?.replaceAll('_', ' ')} · prep{' '}
                  {selectedDetail.case.prep_status?.replaceAll('_', ' ') ?? 'pending'}
                </p>
              </div>
            </section>
            <PatientOverview detail={selectedDetail} />
            <CaseMessages caseId={selectedDetail.case.id} user={user} canReply={false} />
            <p className="border border-[var(--paper-line)] bg-[var(--paper-band)] px-3 py-2 text-[12px] leading-5 text-[var(--paper-muted)]">
              This role can review information and listen to case communications. Only hospital staff can acknowledge or update preparation status.
            </p>
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
