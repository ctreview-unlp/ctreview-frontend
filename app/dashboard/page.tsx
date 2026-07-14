'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import { uploadFilesToSupabase, createSession, getSessionStatus, evaluateReflection } from '@/app/lib/api'

type Tab = 'session' | 'reflection'
type SessionState = 'idle' | 'uploading' | 'processing' | 'complete' | 'failed'

export default function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('session')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [email, setEmail] = useState('')

  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState('')
  const [uploadProgress, setUploadProgress] = useState<string>('')

  const [reflectionText, setReflectionText] = useState('')
  const [candidateName, setCandidateName] = useState('')
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
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length > 0) setFiles(prev => [...prev, ...dropped])
  }

  async function handleSessionUpload() {
    if (files.length === 0) return
    setSessionState('uploading')
    setSessionError('')
    setUploadProgress('Uploading files...')

    try {
      const sessionId = crypto.randomUUID()
      const filePaths = await uploadFilesToSupabase(files, sessionId)
      setUploadProgress('Files uploaded. Starting analysis...')

      const { session_id } = await createSession({
        file_paths: filePaths,
        email: email || undefined,
      })

      setSessionState('processing')
      setUploadProgress('')

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
      setUploadProgress('')
    }
  }

  async function handleReflectionSubmit() {
    if (!reflectionText.trim()) return
    setReflectionLoading(true)
    setReflectionError('')
    setReflectionReport(null)

    try {
      const result = await evaluateReflection({
        reflection_text: reflectionText,
        email: email || undefined,
        candidate_name: candidateName || undefined,
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
            <span className="text-white text-xs font-bold">cr</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Coachtribe Review</span>
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

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Email (for notification)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
          />
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
                  : files.length > 0
                  ? 'border-[#2d6a4f] bg-[#f0faf2]'
                  : 'border-[#2d6a4f]/40 bg-[#f0faf2]/40 hover:bg-[#f0faf2]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,.wav,.mp4,.mov"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
                }}
              />
              <div className="text-3xl mb-3">🎬</div>
              {files.length > 0 ? (
                <div>
                  {files.map((f, i) => (
                    <p key={i} className="text-sm font-medium text-[#2d6a4f]">{f.name}</p>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">Click to add more files</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Drop your session recording here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse files</p>
                  <p className="text-xs text-gray-400 mt-2">.mp3 · .m4a · .wav · Audio files recommended</p>
                  <p className="text-xs text-gray-300 mt-1">Video files (.mp4, .mov) also supported</p>
                </>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800">
              <strong>Upload audio, not video.</strong> Download the audio file (.m4a or .mp3) from Zoom or Teams — not the video recording. Audio files are typically 50–100MB for a 1-hour session.
            </div>

            {(sessionState === 'idle' || sessionState === 'failed') && (
              <button
                onClick={handleSessionUpload}
                disabled={files.length === 0}
                className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
              >
                Analyse session →
              </button>
            )}

            {sessionState === 'uploading' && (
              <div className="space-y-3">
                <div className="w-full bg-gray-100 rounded-xl py-3 text-sm text-center text-gray-500">
                  {uploadProgress || 'Uploading...'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#2d6a4f] h-1.5 rounded-full animate-pulse" style={{ width: '30%' }} />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Uploading your file directly to secure storage...
                </p>
              </div>
            )}

            {sessionState === 'processing' && (
              <div className="space-y-3">
                <div className="w-full bg-gray-100 rounded-xl py-3 text-sm text-center text-gray-500">
                  Processing — this takes 15–30 minutes...
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#2d6a4f] h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Transcribing and evaluating your session against all 8 EMCC competencies.
                  {email && " You'll be notified by email when your report is ready."}
                </p>
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
          </div>
        )}

        {tab === 'reflection' && (
          <div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Candidate name (optional)</label>
              <input
                type="text"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                placeholder="e.g. Jan"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Reflection text</label>
              <textarea
                value={reflectionText}
                onChange={e => setReflectionText(e.target.value)}
                rows={10}
                placeholder="Paste the reflection here. The system will automatically detect which competencies are being addressed."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none"
              />
            </div>

            <button
              onClick={handleReflectionSubmit}
              disabled={reflectionLoading || !reflectionText.trim()}
              className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
            >
              {reflectionLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Generating feedback...
                </span>
              ) : 'Get feedback →'}
            </button>

            {reflectionLoading && (
              <div className="mt-3 space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#2d6a4f] h-1.5 rounded-full animate-pulse" style={{ width: '70%' }} />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Evaluating your reflection against the EMCC framework...
                </p>
              </div>
            )}

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