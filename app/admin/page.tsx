'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return { 'Authorization': `Bearer ${session.access_token}` }
}

type Tab = 'users' | 'reports' | 'sessions' | 'prompt-settings'

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviteSent, setInviteSent] = useState('')

  const [promptSettings, setPromptSettings] = useState({
    general_instructions: '',
    assessment_criteria: '',
    report_structure: '',
  })
  const [promptSaving, setPromptSaving] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)

  const [sessionPromptSettings, setSessionPromptSettings] = useState({
    general_instructions: '',
    assessment_criteria: '',
    report_structure: '',
  })
  const [sessionPromptSaving, setSessionPromptSaving] = useState(false)
  const [sessionPromptSaved, setSessionPromptSaved] = useState(false)

  const [modal, setModal] = useState<{ title: string; content: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      }
    })
  }, [])

  async function fetchData(t: 'users' | 'reports' | 'sessions') {
    setLoading(true)
    setError('')
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/admin/${t}`, { headers })
      if (!res.ok) throw new Error('Access denied or fetch failed')
      const data = await res.json()
      if (t === 'users') setUsers(data.users)
      if (t === 'reports') setReports(data.reports)
      if (t === 'sessions') setSessions(data.sessions)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPromptSettings() {
    setLoading(true)
    setError('')
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/admin/prompt-settings`, { headers })
      if (!res.ok) throw new Error('Failed to fetch prompt settings')
      const data = await res.json()
      setPromptSettings({
        general_instructions: data.general_instructions || '',
        assessment_criteria: data.assessment_criteria || '',
        report_structure: data.report_structure || '',
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load prompt settings')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSessionPromptSettings() {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/admin/session-prompt-settings`, { headers })
      if (!res.ok) throw new Error('Failed to fetch session prompt settings')
      const data = await res.json()
      setSessionPromptSettings({
        general_instructions: data.general_instructions || '',
        assessment_criteria: data.assessment_criteria || '',
        report_structure: data.report_structure || '',
      })
    } catch (e: unknown) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (tab === 'prompt-settings') {
      fetchPromptSettings()
      fetchSessionPromptSettings()
    } else {
      fetchData(tab as 'users' | 'reports' | 'sessions')
    }
  }, [tab])

  async function savePromptSettings() {
    setPromptSaving(true)
    setPromptSaved(false)
    setError('')
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/admin/prompt-settings`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(promptSettings),
      })
      if (!res.ok) throw new Error('Failed to save')
      setPromptSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save prompt settings')
    } finally {
      setPromptSaving(false)
    }
  }

  async function resetPromptSettings() {
    if (!confirm('Reset reflection prompt to default? This will overwrite your current settings.')) return
    setError('')
    try {
      const headers = await getAuthHeaders()
      await fetch(`${API_URL}/admin/prompt-settings/reset`, { method: 'POST', headers })
      fetchPromptSettings()
      setPromptSaved(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset')
    }
  }

  async function saveSessionPromptSettings() {
    setSessionPromptSaving(true)
    setSessionPromptSaved(false)
    setError('')
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/admin/session-prompt-settings`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionPromptSettings),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSessionPromptSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save session prompt settings')
    } finally {
      setSessionPromptSaving(false)
    }
  }

  async function resetSessionPromptSettings() {
    if (!confirm('Reset session prompt to default? This will overwrite your current settings.')) return
    setError('')
    try {
      const headers = await getAuthHeaders()
      await fetch(`${API_URL}/admin/session-prompt-settings/reset`, { method: 'POST', headers })
      fetchSessionPromptSettings()
      setSessionPromptSaved(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset')
    }
  }

  async function handleCreateUser() {
    if (!newEmail) return
    setCreating(true)
    setInviteSent('')
    setError('')
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(
        `${API_URL}/admin/users?email=${encodeURIComponent(newEmail)}`,
        { method: 'POST', headers }
      )
      if (!res.ok) throw new Error('Failed to create user')
      setInviteSent(newEmail)
      setNewEmail('')
      fetchData('users')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Delete user ${email}?`)) return
    try {
      const headers = await getAuthHeaders()
      await fetch(`${API_URL}/admin/users/${userId}`, { method: 'DELETE', headers })
      fetchData('users')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete user')
    }
  }

  async function viewReflectionInput(reportId: string) {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/admin/reflections`, { headers })
      const data = await res.json()
      const reflection = data.reflections.find((r: any) =>
        reports.find(rep => rep.reflection_id === r.id && rep.id === reportId)
      )
      if (reflection?.reflection_text) {
        setModal({ title: 'Ingediende reflectie', content: reflection.reflection_text })
      } else {
        setModal({ title: 'Ingediende reflectie', content: 'Geen tekst beschikbaar.' })
      }
    } catch {
      setModal({ title: 'Fout', content: 'Kon de reflectietekst niet laden.' })
    }
  }

  async function viewSessionTranscript(sessionId: string) {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/admin/sessions`, { headers })
      const data = await res.json()
      const session = data.sessions.find((s: any) => s.id === sessionId)
      if (session?.transcript) {
        setModal({ title: 'Transcript', content: session.transcript })
      } else {
        setModal({ title: 'Transcript', content: 'Geen transcript beschikbaar.' })
      }
    } catch {
      setModal({ title: 'Fout', content: 'Kon het transcript niet laden.' })
    }
  }

  const tabLabels: Record<Tab, string> = {
    users: 'Users',
    reports: 'Reports',
    sessions: 'Sessions',
    'prompt-settings': 'Prompt settings',
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2]">
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">{modal.title}</h2>
              <button
                onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {modal.content}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">cr</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Coachtribe Review — Admin</span>
        </div>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          Back to dashboard
        </a>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h1>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {(Object.keys(tabLabels) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {loading && <p className="text-sm text-gray-400 mb-4">Loading...</p>}

        {tab === 'users' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Invite new user</h2>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                />
                <button
                  onClick={handleCreateUser}
                  disabled={creating || !newEmail}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
                >
                  {creating ? 'Sending...' : 'Send invite'}
                </button>
              </div>
              {inviteSent && (
                <p className="text-sm text-green-600 mt-3">
                  Invite sent to {inviteSent} — they will receive an email to set their password.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Last sign in</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-gray-900">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('nl-NL')}</td>
                      <td className="px-4 py-3 text-gray-500">{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('nl-NL') : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">User ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.user_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(r.created_at).toLocaleDateString('nl-NL')}</td>
                    <td className="px-4 py-3 text-gray-500">{r.session_id ? 'Session' : 'Reflection'}</td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                      {!r.session_id && (
                        <button
                          onClick={() => viewReflectionInput(r.id)}
                          className="text-xs text-gray-400 hover:text-gray-700"
                        >
                          View input
                        </button>
                      )}
                      {r.pdf_url && (
                        <a
                          href={r.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          View PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'sessions' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">File</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-gray-900 text-xs font-mono">{s.file_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.status === 'complete' ? 'bg-green-100 text-green-700' :
                        s.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString('nl-NL')}</td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                      {s.transcript && (
                        <button
                          onClick={() => viewSessionTranscript(s.id)}
                          className="text-xs text-gray-400 hover:text-gray-700"
                        >
                          View transcript
                        </button>
                      )}
                      {s.report_url && (
                        <a
                          href={s.report_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          View PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'prompt-settings' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              Changes are saved to the database and applied immediately to new reports. The original default prompt is always available via Reset.
            </div>

            <h2 className="text-base font-semibold text-gray-900 pt-2">Written reflection</h2>

            {[
              {
                key: 'general_instructions',
                label: 'General AI instructions',
                description: 'Tone, language, and general behaviour of the AI supervisor.',
              },
              {
                key: 'assessment_criteria',
                label: 'Assessment criteria and rubrics',
                description: 'EMCC competencies, VI indicators, and level calibration rules.',
              },
              {
                key: 'report_structure',
                label: 'Report structure and instructions',
                description: 'Supervisory rules, output structure, and quality checklist.',
              },
            ].map(({ key, label, description }) => (
              <div key={key} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{label}</h3>
                <p className="text-xs text-gray-400 mb-3">{description}</p>
                <textarea
                  value={promptSettings[key as keyof typeof promptSettings]}
                  onChange={e => setPromptSettings(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={14}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 resize-y"
                />
              </div>
            ))}

            <div className="flex items-center gap-4">
              <button
                onClick={savePromptSettings}
                disabled={promptSaving}
                className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
              >
                {promptSaving ? 'Saving...' : 'Save reflection settings'}
              </button>
              <button
                onClick={resetPromptSettings}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Reset to default
              </button>
              {promptSaved && (
                <p className="text-sm text-green-600">Saved — applied to new reports immediately.</p>
              )}
            </div>

            <h2 className="text-base font-semibold text-gray-900 pt-6 border-t border-gray-200 mt-6">
              Session / video analysis
            </h2>

            {[
              {
                key: 'general_instructions',
                label: 'General AI instructions',
                description: 'Tone, language, and general behaviour for session/transcript evaluation.',
              },
              {
                key: 'assessment_criteria',
                label: 'Assessment criteria and rubrics',
                description: 'EMCC competencies, VI indicators, and level calibration for session analysis.',
              },
              {
                key: 'report_structure',
                label: 'Report structure and instructions',
                description: 'Sprekerlabels, transcript-specific rules, and quality checklist for sessions.',
              },
            ].map(({ key, label, description }) => (
              <div key={`session-${key}`} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{label}</h3>
                <p className="text-xs text-gray-400 mb-3">{description}</p>
                <textarea
                  value={sessionPromptSettings[key as keyof typeof sessionPromptSettings]}
                  onChange={e => setSessionPromptSettings(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={14}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 resize-y"
                />
              </div>
            ))}

            <div className="flex items-center gap-4">
              <button
                onClick={saveSessionPromptSettings}
                disabled={sessionPromptSaving}
                className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
              >
                {sessionPromptSaving ? 'Saving...' : 'Save session settings'}
              </button>
              <button
                onClick={resetSessionPromptSettings}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Reset to default
              </button>
              {sessionPromptSaved && (
                <p className="text-sm text-green-600">Saved — applied to new session reports immediately.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}