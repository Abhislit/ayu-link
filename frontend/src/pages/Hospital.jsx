import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import CaseMessages from '../components/CaseMessages'
import { CaseStatus, EmptyCase, PatientOverview } from '../components/CaseOverview'
import Icon from '../components/Icons'
import { ErrorNotice, LiveStatus, StatusPill } from '../components/StatusPill'
import useRealtime from '../hooks/useRealtime'

function CaseQueue({ cases, selectedId, onSelect, loading }) {
  return (
    <section className="dashboard-panel overflow-hidden rounded-[28px] bg-white/90">
      <header className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-4">
        <div>
          <h2 className="font-bold text-slate-950">Incoming cases</h2>
          <p className="mt-1 text-xs text-slate-600">Assigned to your hospital</p>
        </div>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold tabular-nums text-white">{cases.length}</span>
      </header>
      <div className="max-h-[34rem] divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4" aria-label="Loading incoming cases">
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
              className={`queue-item w-full border border-transparent px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-red-600 ${
                String(selectedId) === String(item.id) ? 'bg-red-50/70' : 'bg-white/40'
              }`}
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
            <p className="text-sm font-semibold text-slate-800">No incoming cases</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">Cases appear here after an ambulance selects this hospital.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Hospital() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [detail, setDetail] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadCases = useCallback(async () => {
    try {
      const result = await api('/api/hospital/cases')
      setCases(result)
      setError('')
      setSelectedId((current) => current ?? result[0]?.id ?? null)
    } catch (reason) {
      setError(reason.message || 'Incoming cases could not be loaded.')
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
    (event, payload) => {
      loadCases()
      if (String(payload?.case?.id) === String(selectedId)) loadDetail(selectedId)
      if (event === 'message:new') setNotice('New emergency communication received.')
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

  async function acknowledge() {
    if (!selectedId || saving) return
    setSaving(true)
    setError('')
    try {
      await api(`/api/cases/${selectedId}/acknowledge`, { method: 'POST' })
      await Promise.all([loadCases(), loadDetail(selectedId)])
      setNotice('Emergency communication acknowledged.')
    } catch (reason) {
      setError(reason.message || 'Acknowledgement could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function updatePrepStatus(event) {
    const status = event.target.value
    if (!selectedId || saving) return
    setSaving(true)
    setError('')
    try {
      await api(`/api/cases/${selectedId}/prep-status`, {
        method: 'PATCH',
        body: { status },
      })
      await Promise.all([loadCases(), loadDetail(selectedId)])
      setNotice(`Preparation status updated to ${status}.`)
    } catch (reason) {
      setError(reason.message || 'Preparation status could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="dashboard-hero rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Hospital desk</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Emergency coordination</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Receive ambulance handoffs and coordinate emergency preparation.</p>
          </div>
          <LiveStatus connected={connected} />
        </div>
      </header>
      {error ? <ErrorNotice onDismiss={() => setError('')}>{error}</ErrorNotice> : null}
      {notice ? (
        <div role="status" className="notice-banner rounded-2xl px-4 py-3 text-sm font-medium text-emerald-900">
          {notice}
        </div>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.5fr)]">
        <CaseQueue cases={cases} selectedId={selectedId} onSelect={setSelectedId} loading={loading} />

        {detailLoading ? (
          <div className="space-y-4" aria-label="Loading selected case">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        ) : selectedDetail ? (
          <div className="space-y-4">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Case #{selectedDetail.case.id} · {selectedDetail.ambulance?.vehicle_number}</h2>
                  <p className="mt-1 text-sm text-slate-600">Opened {new Date(selectedDetail.case.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <div className="mt-3"><CaseStatus detail={selectedDetail} /></div>
                </div>
                <button
                  type="button"
                  onClick={acknowledge}
                  disabled={saving || detail.case.status === 'acknowledged'}
                  className="min-h-12 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedDetail.case.status === 'acknowledged' ? 'Acknowledged' : saving ? 'Saving…' : 'Acknowledge emergency'}
                </button>
              </div>
              <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="prep-status" className="text-sm font-semibold text-slate-800">Emergency preparation</label>
                  <select
                    id="prep-status"
                    value={selectedDetail.case.prep_status}
                    onChange={updatePrepStatus}
                    disabled={saving}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:opacity-60"
                  >
                    <option value="pending">Pending</option>
                    <option value="requested">Requested</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                  </select>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Case handoff status</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-950">{selectedDetail.case.status.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-xs text-slate-600">Ambulance movement: <span className="font-semibold capitalize">{selectedDetail.case.ambulance_status.replaceAll('_', ' ')}</span></p>
                </div>
              </div>
            </section>
            <PatientOverview detail={selectedDetail} />
            <CaseMessages caseId={selectedDetail.case.id} user={user} canReply replyLabel="Reply to ambulance" />
          </div>
        ) : (
          <EmptyCase
            title="Select an incoming emergency"
            description="Choose a case from the queue to view patient information, listen to ambulance updates, and acknowledge the handoff."
          />
        )}
      </div>
    </div>
  )
}
