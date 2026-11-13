import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import CaseMessages from '../components/CaseMessages'
import { CaseProgress, CaseStatus, EmptyCase, PatientOverview } from '../components/CaseOverview'
import Icon from '../components/Icons'
import { ErrorNotice, LiveStatus, StatusPill } from '../components/StatusPill'
import useRealtime from '../hooks/useRealtime'

function PageHeader({ connected }) {
  return (
    <header className="dashboard-hero rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-ink)]">Ambulance response</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Emergency command</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Identify the patient and keep the receiving team informed in real time.</p>
        </div>
        <LiveStatus connected={connected} />
      </div>
    </header>
  )
}

export default function Ambulance() {
  const { user } = useAuth()
  const [detail, setDetail] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [uid, setUid] = useState('CARD-1001')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [savingHospital, setSavingHospital] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadCaseDetail = useCallback(async (caseId) => {
    const result = await api(`/api/cases/${caseId}`)
    setDetail(result)
    setSelectedHospital(result.case.hospital_id ? String(result.case.hospital_id) : '')
    return result
  }, [])

  const refreshCurrentCase = useCallback(async () => {
    try {
      const current = await api('/api/ambulance/case')
      await loadCaseDetail(current.id)
    } catch (reason) {
      if (reason.message.includes('No active case')) {
        setDetail(null)
      } else {
        setError(reason.message || 'The active case could not be refreshed.')
      }
    } finally {
      setLoading(false)
    }
  }, [loadCaseDetail])

  const handleRealtime = useCallback(
    (event, payload) => {
      const caseId = payload?.case?.id
      if (caseId && (String(caseId) === String(detail?.case?.id) || payload.case.ambulance_id === user.ambulance_id)) {
        refreshCurrentCase()
        if (event === 'message:new') setNotice('A new hospital or case update has arrived.')
      }
    },
    [detail?.case?.id, refreshCurrentCase, user.ambulance_id],
  )
  const connected = useRealtime(handleRealtime)

  useEffect(() => {
    let active = true
    Promise.allSettled([api('/api/hospitals'), api('/api/ambulance/case')])
      .then(async ([hospitalResult, caseResult]) => {
        if (!active) return
        if (hospitalResult.status === 'fulfilled') {
          setHospitals(hospitalResult.value)
        } else {
          setError(hospitalResult.reason.message || 'Hospital directory could not be loaded.')
        }
        if (caseResult.status === 'fulfilled') {
          try {
            const caseDetail = await api(`/api/cases/${caseResult.value.id}`)
            if (active) {
              setDetail(caseDetail)
              setSelectedHospital(caseDetail.case.hospital_id ? String(caseDetail.case.hospital_id) : '')
            }
          } catch (reason) {
            if (active) setError(reason.message || 'Active case details could not be loaded.')
          }
        } else if (!caseResult.reason.message.includes('No active case')) {
          setError(caseResult.reason.message || 'Active case could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function simulateScan(event) {
    event.preventDefault()
    if (!uid.trim() || scanning) return
    setScanning(true)
    setError('')
    setNotice('')
    try {
      const result = await api('/api/rfid/demo-scans', {
        method: 'POST',
        body: { uid: uid.trim() },
      })
      await loadCaseDetail(result.case.id)
      setNotice(`Patient identified. Emergency case #${result.case.id} is ready.`)
    } catch (reason) {
      setError(reason.message || 'Card could not be read. Check the UID and try again.')
    } finally {
      setScanning(false)
    }
  }

  async function assignHospital(event) {
    event.preventDefault()
    if (!selectedHospital || !detail?.case || savingHospital) return
    setSavingHospital(true)
    setError('')
    try {
      await api(`/api/cases/${detail.case.id}/hospital`, {
        method: 'POST',
        body: { hospital_id: Number(selectedHospital) },
      })
      await loadCaseDetail(detail.case.id)
      setNotice('Receiving hospital selected. The hospital dashboard is now connected to this case.')
    } catch (reason) {
      setError(reason.message || 'Hospital selection could not be saved.')
    } finally {
      setSavingHospital(false)
    }
  }

  async function toggleAmbulanceStatus() {
    if (!detail?.case) return
    const status = detail.case.ambulance_status === 'arrived' ? 'en_route' : 'arrived'
    setError('')
    try {
      await api(`/api/cases/${detail.case.id}/ambulance-status`, {
        method: 'PATCH',
        body: { status },
      })
      await loadCaseDetail(detail.case.id)
      setNotice(`Ambulance status updated to ${status.replaceAll('_', ' ')}.`)
    } catch (reason) {
      setError(reason.message || 'Ambulance status could not be updated.')
    }
  }

  async function updateCategory(event) {
    const category = event.target.value
    if (!detail?.case || savingCategory) return
    setSavingCategory(true)
    setError('')
    try {
      await api(`/api/cases/${detail.case.id}/emergency-category`, {
        method: 'PATCH',
        body: { category },
      })
      await loadCaseDetail(detail.case.id)
      setNotice(`Emergency category set to ${category}.`)
    } catch (reason) {
      setError(reason.message || 'Emergency category could not be updated.')
    } finally {
      setSavingCategory(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5" aria-label="Loading ambulance dashboard">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader connected={connected} />
      {error ? <ErrorNotice onDismiss={() => setError('')}>{error}</ErrorNotice> : null}
      {notice ? (
        <div role="status" className="notice-banner rounded-2xl px-4 py-3 text-sm font-medium text-emerald-900">
          {notice}
        </div>
      ) : null}

      <section className="dashboard-panel rounded-[28px] bg-slate-900 p-4 text-white sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <Icon name="radio" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">Patient identification</h2>
                <p className="mt-1 text-sm text-slate-300">RFID scan status · demo scanner</p>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100 ring-1 ring-white/15">
                Authenticated · {user.name}
              </span>
            </div>
            <form onSubmit={simulateScan} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="rfid-uid">RFID card UID</label>
              <input
                id="rfid-uid"
                value={uid}
                onChange={(event) => setUid(event.target.value)}
                maxLength={64}
                placeholder="Enter RFID card UID"
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-white/15 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"
              />
              <button
                type="submit"
                disabled={!uid.trim() || scanning}
                className="primary-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="radio" className="h-4 w-4" />
                {scanning ? 'Reading card…' : 'Simulate RFID scan'}
              </button>
            </form>
            <p className="mt-2 text-xs leading-5 text-slate-300">Presentation mode: enter <span className="font-semibold text-white">CARD-1001</span>. The production device API keeps its own device-key authentication.</p>
          </div>
        </div>
      </section>

      {!detail ? (
        <EmptyCase
          title="Ready for patient identification"
          description="Scan a demo RFID card to securely load the patient summary and create or reopen an emergency case."
        />
      ) : (
        <>
          <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">Emergency case #{detail.case.id}</h2>
                    <p className="mt-1 text-sm text-slate-600">Ambulance {detail.ambulance?.vehicle_number ?? 'assigned'}</p>
                  </div>
                  <StatusPill status={detail.case.priority} label={`${detail.case.priority} priority`} />
                </div>
                <div className="mt-4"><CaseProgress detail={detail} /></div>
                <div className="mt-4"><CaseStatus detail={detail} /></div>
                <div className="mt-4">
                  <label htmlFor="emergency-category" className="text-sm font-semibold text-slate-800">Emergency category</label>
                  <select
                    id="emergency-category"
                    value={detail.case.emergency_category}
                    onChange={updateCategory}
                    disabled={savingCategory}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1] disabled:opacity-60"
                  >
                    <option value="unknown">Not yet classified</option>
                    <option value="trauma">Trauma / accident</option>
                    <option value="cardiac">Cardiac</option>
                    <option value="respiratory">Respiratory</option>
                    <option value="obstetric">Obstetric</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Ambulance movement</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{detail.case.ambulance_status?.replaceAll('_', ' ') ?? 'status unavailable'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAmbulanceStatus}
                    className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Mark {detail.case.ambulance_status === 'arrived' ? 'en route' : 'arrived'}
                  </button>
                </div>
                <form onSubmit={assignHospital} className="mt-5 space-y-2 border-t border-slate-200 pt-4">
                  <label htmlFor="hospital-select" className="text-sm font-semibold text-slate-800">Receiving hospital</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      id="hospital-select"
                      value={selectedHospital}
                      onChange={(event) => setSelectedHospital(event.target.value)}
                      required
                      className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1]"
                    >
                      <option value="" disabled>Select a hospital</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!selectedHospital || savingHospital}
                      className="min-h-12 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingHospital ? 'Saving…' : detail.hospital ? 'Update hospital' : 'Select hospital'}
                    </button>
                  </div>
                  {detail.hospital ? <p className="text-xs text-slate-600">Connected to {detail.hospital.name} · hospital staff receive updates in real time.</p> : <p className="text-xs text-amber-800">Select a hospital before sending patient updates.</p>}
                </form>
              </section>
              <PatientOverview detail={detail} />
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-800">
                  <Icon name="activity" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">AYU-LINK Emergency Assistant</h2>
                  <p className="text-sm text-slate-600">Voice-first handoff with the receiving hospital</p>
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950 ring-1 ring-inset ring-blue-100">
                This assistant supports communication only. It does not diagnose or replace professional medical judgment.
              </div>
              {detail.hospital ? (
                <CaseMessages caseId={detail.case.id} user={user} canReply replyLabel="Send update" />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-9 text-center">
                  <Icon name="hospital" className="mx-auto h-7 w-7 text-slate-500" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">Select a hospital to open communication</p>
                  <p className="mt-1 text-sm text-slate-600">Patient details remain on the ambulance dashboard until a receiving hospital is assigned.</p>
                </div>
              )}
            </section>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Icon name="clock" className="h-4 w-4 text-slate-500" />
              Case opened {new Date(detail.case.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            <div className="text-sm text-slate-600">
              {detail.case.acknowledged_at
                ? `Hospital acknowledged ${new Date(detail.case.acknowledged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Awaiting hospital acknowledgement'}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
