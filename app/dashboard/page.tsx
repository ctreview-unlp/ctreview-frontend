'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import { uploadSession, getSessionStatus, evaluateReflection } from '@/app/lib/api'

const COMPETENCIES = [
  { value: 'understanding_self', label: 'Understanding Self' },
  { value: 'commitment_to_self_development', label: 'Commitment to Self-Development' },
  { value: 'managing_the_contract', label: 'Managing the Contract' },
  { value: 'building_the_relationship', label: 'Building the Relationship' },
  { value: 'enabling_insight_and_learning', label: 'Enabling Insight and Learning' },
  { value: 'outcome_and_action_orientation', label: 'Outcome and Action Orientation' },
  { value: 'use_of_models_and_techniques', label: 'Use of Models and Techniques' },
  { value: 'evaluation', label: 'Evaluation' },
]

const LEVELS = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'senior_practitioner', label: 'Senior Practitioner' },
  { value: 'master_practitioner', label: 'Master Practitioner' },
]

type Tab = 'session' | 'reflection'
type SessionState = 'idle' | 'uploading' | 'processing' | 'complete' | 'failed'

export default function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('session')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [studentLevel, setStudentLevel] = useState('practitioner')
  const [email, setEmail] = useState('')

  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState('')

  const [competency, setCompetency] = useState('building_the_relationship')
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionLoading, setReflectionLoading] = useState(false)
  const [reflectionReport, setReflectionReport] = useState<string | null>(null)
  const [reflectionError, setReflectionError] = useState('')

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleSessionUpload() {
    if (!file) return
    setSessionState('uploading')
    setSessionError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('student_level', studentLevel)
      if (email) formData.append('email', email)

      const { session_id } = await uploadSession(formData)
      setSessionState('processing')

      const poll = setInterval(async () => {
        const status = await getSessionStatus(session_id)
        if (status.status === 'complete') {
          clearInterval(poll)
          setReportUrl(status.report_url)
          setSessionState('complete')
        } else if (status.status === 'failed') {
          clearInterval(poll)
          setSessionError('Processing failed. Please try again.')
          setSessionState('failed')
        }
      }, 5000)
    } catch (e: unknown) {
      setSessionError(e instanceof Error ? e.message : 'Upload failed')
      setSessionState('failed')
    }
  }

  async function handleReflectionSubmit() {
    if (!reflectionText.trim()) return
    setReflectionLoading(true)
    setReflectionError('')
    setReflectionReport(null)

    try {
      const result = await evaluateReflection({
        competency,
        reflection_text: reflectionText,
        student_level: studentLevel,
        email: email || undefined,
      })
      setReflectionReport(result.report_url)
    } catch (e: unknown) {
      setReflectionError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setReflectionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2]">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">cb</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">CoachBetter.ai</span>
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-900">
          Sign out
        </button>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Elevate your coaching with{' '}
          <span className="text-[#2d6a4f] italic">AI-powered</span> feedback
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Upload a session recording or submit a written reflection to receive structured EMCC feedback.
        </p>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('session')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'session' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Session recording
          </button>
          <button
            onClick={() => setTab('reflection')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'reflection' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Written reflection
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Student level</label>
            <select
              value={studentLevel}
              onChange={e => setStudentLevel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
            >
              {LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email (for notification)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
            />
          </div>
        </div>

        {tab === 'session' && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-4 ${
                dragging
                  ? 'border-[#2d6a4f] bg-[#d8f3dc]'
                  : file
                  ? 'border-[#2d6a4f] bg-[#f0faf2]'
                  : 'border-[#2d6a4f]/40 bg-[#f0faf2]/40 hover:bg-[#f0faf2]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.mp3,.m4a,.wav"
                className="hidden"
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              <div className="text-3xl mb-3">🎬</div>
              {file ? (
                <p className="text-sm font-medium text-[#2d6a4f]">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Drop your session video here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse files</p>
                  <p className="text-xs text-gray-400 mt-2">.mp4 · .mov · .mp3 · .m4a · .wav · Max 5 GB</p>
                </>
              )}
            </div>

            {(sessionState === 'idle' || sessionState === 'failed') && (
              <button
                onClick={handleSessionUpload}
                disabled={!file}
                className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
              >
                Analyse session →
              </button>
            )}

            {sessionState === 'uploading' && (
              <div className="w-full bg-gray-100 rounded-xl py-3 text-sm text-center text-gray-500">
                Uploading...
              </div>
            )}

            {sessionState === 'processing' && (
              <div className="w-full bg-gray-100 rounded-xl py-3 text-sm text-center text-gray-500">
                Processing — this takes a few minutes...
              </div>
            )}

            {sessionState === 'complete' && reportUrl && (
            <a  
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-[#2d6a4f] text-white rounded-xl py-3 text-sm font-medium text-center hover:bg-[#245e44]"
              >
                View your report →
              </a>
            )}

            {sessionError && <p className="text-sm text-red-500 mt-2">{sessionError}</p>}

            <p className="text-xs text-gray-400 text-center mt-4">
              Analysis typically takes <strong className="text-gray-600">15–30 minutes</strong> depending on session length.
              {email && " You'll be notified when your report is ready."}
            </p>
          </div>
        )}

        {tab === 'reflection' && (
          <div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Competency</label>
              <select
                value={competency}
                onChange={e => setCompetency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
              >
                {COMPETENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Your reflection</label>
              <textarea
                value={reflectionText}
                onChange={e => setReflectionText(e.target.value)}
                rows={8}
                placeholder="Write your reflection here..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none"
              />
            </div>

            <button
              onClick={handleReflectionSubmit}
              disabled={reflectionLoading || !reflectionText.trim()}
              className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
            >
              {reflectionLoading ? 'Generating feedback...' : 'Get feedback →'}
            </button>

            {reflectionReport && (
            <a  
                href={reflectionReport}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full mt-3 bg-[#2d6a4f] text-white rounded-xl py-3 text-sm font-medium text-center hover:bg-[#245e44]"
              >
                View your report →
              </a>
            )}

            {reflectionError && (
              <p className="text-sm text-red-500 mt-2">{reflectionError}</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}