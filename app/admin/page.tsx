'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return { 'Authorization': `Bearer ${session.access_token}` }
}

type Tab = 'users' | 'reports' | 'sessions'

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

  async function fetchData(t: Tab) {
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

  useEffect(() => { fetchData(tab) }, [tab])

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

  return (
    <div className="min-h-screen bg-[#f8f7f2]">
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
          {(['users', 'reports', 'sessions'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              {t}
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
                    <td className="px-4 py-3 text-right">
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
                    <td className="px-4 py-3 text-right">
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
      </main>
    </div>
  )
}