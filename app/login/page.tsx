'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => { window.location.href = '/dashboard' }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">cr</span>
          </div>
          <span className="font-semibold text-gray-900">Coachtribe Review</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">Set new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a new password for your account.</p>

        {done ? (
          <p className="text-sm text-green-600">Password updated. Redirecting...</p>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}