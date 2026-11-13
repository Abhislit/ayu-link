import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorNotice } from '../components/StatusPill'

const SECTIONS = [
  { key: 'hospitals', label: 'Hospitals', columns: [['name', 'Hospital'], ['address', 'Address'], ['phone', 'Phone']] },
  { key: 'ambulances', label: 'Ambulances', columns: [['vehicle_number', 'Vehicle'], ['hospital_id', 'Home hospital ID'], ['is_active', 'Status']] },
  { key: 'users', label: 'Users', columns: [['name', 'Name'], ['email', 'Email'], ['role', 'Role'], ['is_active', 'Status']] },
  { key: 'patients', label: 'Patients', columns: [['name', 'Name'], ['age', 'Age'], ['sex', 'Sex'], ['blood_group', 'Blood group']] },
]

function valueFor(row, key) {
  const value = row[key]
  if (key === 'role') return value?.replaceAll('_', ' ')
  if (key === 'is_active') return value ? 'Active' : 'Inactive'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export default function Admin() {
  const [overview, setOverview] = useState(null)
  const [directories, setDirectories] = useState({})
  const [activeSection, setActiveSection] = useState('hospitals')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [counts, ...lists] = await Promise.all([
        api('/api/admin/overview'),
        ...SECTIONS.map((section) => api(`/api/admin/${section.key}`)),
      ])
      setOverview(counts)
      setDirectories(Object.fromEntries(SECTIONS.map((section, index) => [section.key, lists[index]])))
      setError('')
    } catch (reason) {
      setError(reason.message || 'Admin dashboard data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const active = SECTIONS.find((section) => section.key === activeSection) ?? SECTIONS[0]
  const rows = directories[active.key] ?? []

  return (
    <div className="space-y-6">
      <header className="border-b border-[var(--board-line)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-4xl tracking-[0.08em] text-[var(--text)] sm:text-5xl">Platform overview</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">View demo directory and platform totals. Clinical records are not shown here.</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="chrome-label m-0">Administration</p>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="btn-ghost"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>
      {error ? <ErrorNotice onDismiss={() => setError('')}>{error}</ErrorNotice> : null}

      {loading && !overview ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Loading overview">
          {SECTIONS.map((section) => <div key={section.key} className="skeleton h-24" />)}
        </div>
      ) : overview ? (
        <section aria-label="Platform totals" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ['Users', overview.users],
            ['Hospitals', overview.hospitals],
            ['Ambulances', overview.ambulances],
            ['Patients', overview.patients],
            ['Emergency cases', overview.cases],
          ].map(([label, count]) => (
            <div key={label} className="border border-[var(--paper-line)] bg-[var(--paper)] px-4 py-4">
              <p className="paper-label">{label}</p>
              <p className="display mt-2 text-[28px] tabular-nums text-[var(--ink)]">{count}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="border border-[var(--paper-line)] bg-[var(--paper)]">
        <div className="border-b border-[var(--paper-line)] px-4 pt-4 sm:px-5">
          <h2 className="display text-[19px] text-[var(--ink)]">Directory</h2>
          <div className="mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Admin directories">
            {SECTIONS.map((section) => (
              <button
                type="button"
                key={section.key}
                role="tab"
                aria-selected={activeSection === section.key}
                onClick={() => setActiveSection(section.key)}
                className={`shrink-0 px-3 py-2 text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors ${
                  activeSection === section.key ? 'bg-[var(--paper-band)] text-[var(--ink)] shadow-[inset_0_-2px_0_var(--alarm)]' : 'text-[var(--paper-muted)] hover:bg-[var(--paper-band)]'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger min-w-[36rem] text-left">
            <thead>
              <tr>
                <th scope="col">ID</th>
                {active.columns.map(([, label]) => <th key={label} scope="col">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="text-[var(--ink)]">
                  <td className="font-semibold tabular-nums">{row.id}</td>
                  {active.columns.map(([key]) => (
                    <td key={key} className={key === 'role' || key === 'sex' ? 'capitalize' : ''}>{valueFor(row, key)}</td>
                  ))}
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr><td colSpan={active.columns.length + 1} className="py-8 text-center text-[var(--paper-muted)]">No {active.label.toLowerCase()} found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--paper-line)] px-4 py-3 text-[11px] text-[var(--paper-muted)] sm:px-5">Prototype directories are read-only. Add or edit records through an authorized administrative workflow before production use.</p>
      </section>
    </div>
  )
}
