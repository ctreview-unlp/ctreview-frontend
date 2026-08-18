'use client'

import { useState, useRef, useEffect } from 'react'
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

  const [subscriptionActive, setSubscriptionActive] = useState(true)
  const [checkingSubscription, setCheckingSubscription] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        return
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/subscription-status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        setSubscriptionActive(data.active)
      } catch {
        setSubscriptionActive(true)
      } finally {
        setCheckingSubscription(false)
      }
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (list && list.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(list)])
    }
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped])
  }

  async function handleSessionUpload() {
    if (files.length === 0) return
    setSessionState('uploading')
    setSessionError('')
    setUploadProgress('Bestanden uploaden...')

    try {
      const sessionId = crypto.randomUUID()
      const filePaths = await uploadFilesToSupabase(files, sessionId)
      setUploadProgress('Bestanden geüpload. Analyse starten...')

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
          setSessionError('Verwerking mislukt. Probeer het opnieuw.')
          setSessionState('failed')
        }
      }, 5000)
    } catch (e: unknown) {
      setSessionError(e instanceof Error ? e.message : 'Upload mislukt')
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
      setReflectionError(e instanceof Error ? e.message : 'Verzending mislukt')
    } finally {
      setReflectionLoading(false)
    }
  }

  if (checkingSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7f2]">
        <p className="text-sm text-gray-400">Laden...</p>
      </div>
    )
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
          Uitloggen
        </button>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {!subscriptionActive ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
            <p className="text-base font-semibold text-gray-900">Je abonnement is niet actief</p>
            <p className="mt-2 text-sm text-gray-500">
              Neem contact op met UNLP om je toegang te herstellen.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Elevate your coaching with{' '}
              <span className="text-[#2d6a4f] italic">AI-powered</span> feedback
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Upload een gespreksopname of dien een schriftelijke reflectie in voor gestructureerde EMCC-feedback.
            </p>

            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setTab('session')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'session' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                Gespreksopname
              </button>
              <button
                onClick={() => setTab('reflection')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'reflection' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                Schriftelijke reflectie
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail (optioneel)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
              />
            </div>

            {tab === 'session' && (
              <div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800">
                  <strong>Audio heeft de voorkeur.</strong> Je kunt audio (.m4a, .mp3, .wav) of video (.mp4, .mov) uploaden.
                </div>

                <label
                  htmlFor="session-file-input"
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-4 ${
                    dragging
                      ? 'border-[#2d6a4f] bg-[#d8f3dc]'
                      : files.length > 0
                      ? 'border-[#2d6a4f] bg-[#f0faf2]'
                      : 'border-[#2d6a4f]/40 bg-[#f0faf2]/40 hover:bg-[#f0faf2]'
                  }`}
                >
                  <input
                    id="session-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.m4a,.wav,.mp4,.mov"
                    multiple
                    className="sr-only"
                    onChange={handleFileInputChange}
                  />
                  <div className="text-3xl mb-3">🎬</div>
                  {files.length > 0 ? (
                    <div>
                      {files.map((f, i) => (
                        <p key={`${f.name}-${f.size}-${i}`} className="text-sm font-medium text-[#2d6a4f]">
                          {f.name}
                        </p>
                      ))}
                      <p className="text-xs text-gray-400 mt-2">Klik om meer bestanden toe te voegen</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">Sleep je gespreksopname hierheen</p>
                      <p className="text-xs text-gray-400 mt-1">of klik om een bestand te kiezen</p>
                      <p className="text-xs text-gray-400 mt-2">.mp3 · .m4a · .wav · audio aanbevolen</p>
                      <p className="text-xs text-gray-300 mt-1">Videobestanden (.mp4, .mov) worden ook ondersteund</p>
                    </>
                  )}
                </label>

                {(sessionState === 'idle' || sessionState === 'failed') && (
                  <button
                    onClick={handleSessionUpload}
                    disabled={files.length === 0}
                    className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
                  >
                    Analyseer gesprek →
                  </button>
                )}

                {sessionState === 'uploading' && (
                  <div className="space-y-3">
                    <div className="w-full bg-gray-100 rounded-xl py-3 text-sm text-center text-gray-500">
                      {uploadProgress || 'Uploaden...'}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#2d6a4f] h-1.5 rounded-full animate-pulse" style={{ width: '30%' }} />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Je bestand wordt direct naar beveiligde opslag geüpload...
                    </p>
                  </div>
                )}

                {sessionState === 'processing' && (
                  <div className="space-y-3">
                    <div className="w-full bg-gray-100 rounded-xl py-3 text-sm text-center text-gray-500">
                      Bezig met verwerken — dit duurt 15–30 minuten...
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#2d6a4f] h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Transcriberen en beoordelen van je gesprek aan de hand van alle 8 EMCC-competenties.
                      {email && ' Je ontvangt een e-mail wanneer je rapport klaar is.'}
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
                    Bekijk je rapport →
                  </a>
                )}

                {sessionError && <p className="text-sm text-red-500 mt-2">{sessionError}</p>}
              </div>
            )}

            {tab === 'reflection' && (
              <div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Naam kandidaat (optioneel)</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="bijv. Jan"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reflectietekst</label>
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    rows={10}
                    placeholder="Plak hier de reflectie. Het systeem detecteert automatisch welke competenties aan bod komen."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none"
                  />
                </div>

                <button
                  onClick={handleReflectionSubmit}
                  disabled={reflectionLoading || !reflectionText.trim()}
                  className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
                >
                  {reflectionLoading ? 'Feedback genereren...' : 'Vraag feedback →'}
                </button>

                {reflectionLoading && (
                  <div className="mt-3 space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#2d6a4f] h-1.5 rounded-full animate-pulse" style={{ width: '70%' }} />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Je reflectie wordt beoordeeld aan de hand van het EMCC-kader...
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
                    Bekijk je rapport →
                  </a>
                )}

                {reflectionError && <p className="text-sm text-red-500 mt-2">{reflectionError}</p>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}