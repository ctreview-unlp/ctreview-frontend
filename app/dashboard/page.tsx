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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      }
    })
  }, [])

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

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#141210] antialiased selection:bg-[#7A3A42]/12 selection:text-[#7A3A42]">
      <nav className="sticky top-0 z-20 flex h-12 items-center justify-between overflow-visible border-b border-[#E8E2D8] bg-white/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
        <div className="flex items-center gap-2.5">
          <img
            src="/cr-logo.png?v=2"
            alt="Coachtribe Review"
            width={269}
            height={282}
            className="h-7 w-auto object-contain"
          />
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-[#141210]">Coachtribe Review</span>
        </div>
        <button
          onClick={handleSignOut}
          className="h-7 rounded-md px-2 text-[12px] text-[#5C544C] transition-[color,background-color] duration-150 hover:bg-[#F3EEE4] hover:text-[#141210] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15233F]/25"
        >
          Uitloggen
        </button>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-6 lg:px-10 lg:py-9">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start lg:gap-7">
          {/* Guidance */}
          <aside className="flex flex-col gap-3 lg:col-span-4 lg:sticky lg:top-16 lg:pb-4">
            <header className="px-0.5 pb-1">
              <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.035em] text-[#141210] sm:text-[24px]">
                Professionele coachingbeoordeling
              </h1>
              <p className="mt-3 text-[14px] leading-[1.65] text-[#5C544C]">
                Upload een opname van een coachgesprek of een schriftelijke reflectie voor een evaluatie gebaseerd op het EMCC-competentiekader en een downloadbaar beoordelingsrapport.
              </p>
            </header>

            <section className="overflow-hidden rounded-xl border border-[#E8E2D8] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.04),0_4px_12px_rgba(20,18,16,0.03)]">
              <div className="border-b border-[#EFEAE3] px-4 py-3">
                <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-[#141210]">Wat je ontvangt</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5C544C]">
                  Een gestructureerde professionele beoordeling gebaseerd op het EMCC-competentiekader.
                </p>
              </div>
              <ul className="divide-y divide-[#F3EEE4] px-1 py-1">
                {[
                  'EMCC-competentiebeoordeling',
                  'Gedragsobservaties',
                  'Sterke punten als coach',
                  'Ontwikkelpunten',
                  'Praktische aanbevelingen',
                  'Downloadbaar PDF-rapport',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 px-3 py-2.5 text-[14px] leading-none text-[#141210]">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#7A3A42]/10 text-[#7A3A42]">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                    <span className="font-medium tracking-[-0.01em]">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="overflow-hidden rounded-xl border border-[#E8E2D8] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.04),0_4px_12px_rgba(20,18,16,0.03)]">
              <div className="border-b border-[#EFEAE3] px-4 py-3">
                <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-[#141210]">Hoe het werkt</h2>
              </div>
              <ol className="px-4 py-3.5">
                {[
                  'Upload een gespreksopname of lever een schriftelijke reflectie in',
                  'AI beoordeelt je coaching aan de hand van de EMCC-competenties',
                  'Open je beoordelingsrapport zodra het klaar is',
                ].map((step, i) => (
                  <li key={step} className={`flex gap-3 ${i > 0 ? 'mt-3.5' : ''}`}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#7A3A42] text-[11px] font-semibold tabular-nums text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-[14px] leading-[1.45] tracking-[-0.01em] text-[#141210]">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="border-t border-[#EFEAE3] px-4 py-3 text-[13px] leading-relaxed text-[#5C544C]">
                Analyse van een gesprek duurt meestal 15 tot 30 minuten. Feedback op een schriftelijke reflectie is meestal sneller klaar.
              </p>
            </section>

            <section className="rounded-xl border border-[#E4D9C8] bg-[#F3EEE4] px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#7A3A42]/10 text-[#7A3A42]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#141210]">Gebouwd voor vertrouwelijke professionele coaching</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#5C544C]">
                    Gespreksbestanden worden direct naar beveiligde opslag geüpload. Gebruik dit platform voor vertrouwelijke coachgesprekken en reflecties bedoeld voor professionele beoordeling.
                  </p>
                </div>
              </div>
            </section>

            <p className="px-0.5 text-[12px] leading-relaxed text-[#8A837A]">
              Deze tool is een onafhankelijk hulpmiddel en gebruikt het EMCC-competentiekader als referentiekader voor de beoordeling. Dit platform is niet verbonden aan, goedgekeurd door, of onderdeel van EMCC of NOBCO, en de uitkomsten gelden niet als officiële accreditatiebeoordeling.
            </p>
          </aside>

          {/* Workspace */}
          <section className="lg:col-span-8">
            <div className="overflow-hidden rounded-xl border border-[#E8E2D8] bg-white shadow-[0_1px_2px_rgba(20,18,16,0.04),0_8px_24px_rgba(20,18,16,0.04)] lg:min-h-[36rem]">
              <div className="border-b border-[#EFEAE3] px-4 py-3 sm:px-5">
                <div className="relative flex w-full rounded-lg bg-[#F3EEE4] p-0.5 sm:w-fit">
                  <button
                    onClick={() => setTab('session')}
                    className={`relative flex-1 rounded-[7px] px-3.5 py-1.5 text-[13.5px] tracking-[-0.015em] transition-all duration-150 sm:flex-none ${
                      tab === 'session'
                        ? 'bg-white font-semibold text-[#141210] shadow-[0_1px_2px_rgba(20,18,16,0.08)]'
                        : 'font-medium text-[#5C544C] hover:text-[#141210]'
                    }`}
                  >
                    Gespreksopname
                    {tab === 'session' && (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-[7px] bg-[#7A3A42]" />
                    )}
                  </button>
                  <button
                    onClick={() => setTab('reflection')}
                    className={`relative flex-1 rounded-[7px] px-3.5 py-1.5 text-[13.5px] tracking-[-0.015em] transition-all duration-150 sm:flex-none ${
                      tab === 'reflection'
                        ? 'bg-white font-semibold text-[#141210] shadow-[0_1px_2px_rgba(20,18,16,0.08)]'
                        : 'font-medium text-[#5C544C] hover:text-[#141210]'
                    }`}
                  >
                    Schriftelijke reflectie
                    {tab === 'reflection' && (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-[7px] bg-[#7A3A42]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="px-4 py-5 sm:px-5">
                <div className="mb-5">
                  <label className="mb-1.5 block text-[13px] font-semibold tracking-[-0.01em] text-[#141210]">
                    E-mail (optioneel)
                  </label>
                  <p className="mb-2 text-[13px] leading-relaxed text-[#5C544C]">
                    Wordt alleen gebruikt om je te laten weten wanneer je rapport klaar is. Laat leeg als je liever op deze pagina wacht.
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jij@voorbeeld.nl"
                    className="h-9 w-full rounded-lg border border-[#E8E2D8] bg-white px-3 text-[14px] tracking-[-0.015em] text-[#141210] placeholder:text-[#7A7268] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[#D9CFC0] focus:border-[#15233F]/50 focus:shadow-[0_0_0_3px_rgba(21,35,63,0.1)]"
                  />
                </div>

                {tab === 'session' && (
                  <div>
                    <div className="mb-3 flex gap-2.5 rounded-lg border border-[#E4D9C8] bg-[#F3EEE4] px-3 py-2.5">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#7A3A42]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <p className="text-[13px] leading-[1.55] text-[#5C544C]">
                        <strong className="font-semibold text-[#141210]">Audio heeft de voorkeur.</strong> Je kunt audio (.m4a, .mp3, .wav) of video (.mp4, .mov) uploaden. Audiobestanden zijn kleiner en worden sneller geanalyseerd.
                      </p>
                    </div>

                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group relative mb-3 cursor-pointer overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow] duration-150 ${
                        dragging
                          ? 'border-[#7A3A42] bg-[#7A3A42]/[0.04] shadow-[inset_0_0_0_1px_rgba(122,58,66,0.12)]'
                          : files.length > 0
                          ? 'border-[#7A3A42]/40 bg-[#7A3A42]/[0.03]'
                          : 'border-dashed border-[#D9CFC0] bg-white hover:border-[#C4B7A2] hover:shadow-[0_1px_3px_rgba(20,18,16,0.04)]'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp3,.m4a,.wav,.mp4,.mov"
                        multiple
                        className="hidden"
                        onChange={e => {
                          const list = e.target.files
                          if (list && list.length > 0) {
                            setFiles(prev => [...prev, ...Array.from(list)])
                          }
                          e.target.value = ''
                        }}
                      />
                      <div className="flex flex-col items-center px-6 py-11 sm:py-12">
                        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-[12px] border transition-colors duration-150 ${
                          files.length > 0
                            ? 'border-[#7A3A42]/25 bg-[#7A3A42]/[0.08] text-[#7A3A42]'
                            : 'border-[#E8E2D8] bg-[#F7F6F3] text-[#15233F] shadow-[0_1px_2px_rgba(20,18,16,0.04)] group-hover:border-[#D9CFC0]'
                        }`}>
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        </div>
                        {files.length > 0 ? (
                          <div className="text-center">
                            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7A3A42]">
                              {files.length > 1 ? 'Geselecteerde bestanden' : 'Geselecteerd bestand'}
                            </p>
                            {files.map((f, i) => (
                              <p key={`${f.name}-${f.size}-${i}`} className="text-[14px] font-semibold tracking-[-0.015em] text-[#141210]">{f.name}</p>
                            ))}
                            <p className="mt-2 text-[13px] text-[#5C544C]">Klik om meer bestanden toe te voegen</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#141210]">Sleep je gespreksopname hierheen</p>
                            <p className="mt-1 text-[13px] text-[#5C544C]">of klik om een bestand te kiezen</p>
                            <div className="mt-4 flex flex-col items-center gap-1">
                              <p className="text-[13px] tabular-nums tracking-[0.02em] text-[#5C544C]">.mp3 · .m4a · .wav · audio aanbevolen</p>
                              <p className="text-[13px] text-[#5C544C]">Videobestanden (.mp4, .mov) worden ook ondersteund</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {(sessionState === 'idle' || sessionState === 'failed') && (
                      <div>
                        {files.length === 0 && (
                          <p className="mb-2 text-center text-[13px] text-[#5C544C]">
                            Upload een bestand om verder te gaan
                          </p>
                        )}
                        <button
                          onClick={handleSessionUpload}
                          disabled={files.length === 0}
                          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#7A3A42] text-[14px] font-semibold tracking-[-0.015em] text-white shadow-[0_1px_2px_rgba(122,58,66,0.28)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[#5F2D34] hover:shadow-[0_2px_8px_rgba(122,58,66,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3A42]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.995] disabled:cursor-not-allowed disabled:border disabled:border-[#D4D0C8] disabled:bg-[#E9E6E0] disabled:text-[#8A837A] disabled:shadow-none disabled:hover:bg-[#E9E6E0] disabled:active:scale-100"
                        >
                          Analyseer gesprek →
                        </button>
                      </div>
                    )}

                    {sessionState === 'uploading' && (
                      <div className="rounded-xl border border-[#E8E2D8] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(20,18,16,0.03)]">
                        <p className="mb-3 text-[14px] font-semibold tracking-[-0.015em] text-[#141210]">
                          {uploadProgress || 'Uploaden...'}
                        </p>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFEAE3]">
                          <div className="h-1 animate-pulse rounded-full bg-[#7A3A42]" style={{ width: '30%' }} />
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-[#5C544C]">
                          Je bestand wordt direct naar beveiligde opslag geüpload...
                        </p>
                      </div>
                    )}

                    {sessionState === 'processing' && (
                      <div className="rounded-xl border border-[#E8E2D8] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(20,18,16,0.03)]">
                        <p className="mb-3 text-[14px] font-semibold tracking-[-0.015em] text-[#141210]">
                          Bezig met verwerken — dit duurt 15–30 minuten...
                        </p>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFEAE3]">
                          <div className="h-1 animate-pulse rounded-full bg-[#7A3A42]" style={{ width: '60%' }} />
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-[#5C544C]">
                          Transcriberen en beoordelen van je gesprek aan de hand van alle 8 EMCC-competenties.
                          {email && " Je ontvangt een e-mail wanneer je rapport klaar is."}
                        </p>
                      </div>
                    )}

                    {sessionState === 'complete' && reportUrl && (
                      <div className="rounded-xl border border-[#E8E2D8] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(20,18,16,0.03)]">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7A3A42]/10 text-[#7A3A42]">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </span>
                          <p className="text-[14px] font-semibold tracking-[-0.015em] text-[#141210]">Je beoordelingsrapport is klaar</p>
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#5C544C]">
                          Je gesprek is beoordeeld aan de hand van de EMCC-competenties. Open het PDF-rapport om de volledige beoordeling te bekijken.
                        </p>
                        <a
                          href={reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#7A3A42] text-[14px] font-semibold tracking-[-0.015em] text-white shadow-[0_1px_2px_rgba(122,58,66,0.28)] transition-[background-color,box-shadow] duration-150 hover:bg-[#5F2D34] hover:shadow-[0_2px_8px_rgba(122,58,66,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3A42]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        >
                          Bekijk je rapport →
                        </a>
                      </div>
                    )}

                    {sessionError && (
                      <div className="mt-3 rounded-xl border border-[#E0C9C8] bg-[#FBF6F6] px-4 py-3">
                        <p className="text-[14px] font-semibold tracking-[-0.015em] text-[#8B4548]">We konden deze beoordeling niet afronden</p>
                        <p className="mt-1 text-[13px] text-[#8B4548]/90">{sessionError}</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5C544C]">
                          Controleer je verbinding en bestandsformaat, en probeer het opnieuw. Als het probleem aanhoudt, wacht even en dien opnieuw in.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'reflection' && (
                  <div>
                    <div className="mb-4">
                      <label className="mb-1.5 block text-[13px] font-semibold tracking-[-0.01em] text-[#141210]">
                        Naam kandidaat (optioneel)
                      </label>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={e => setCandidateName(e.target.value)}
                        placeholder="bijv. Jan"
                        className="h-9 w-full rounded-lg border border-[#E8E2D8] bg-white px-3 text-[14px] tracking-[-0.015em] text-[#141210] placeholder:text-[#7A7268] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[#D9CFC0] focus:border-[#15233F]/50 focus:shadow-[0_0_0_3px_rgba(21,35,63,0.1)]"
                      />
                    </div>

                    <div className="mb-5">
                      <label className="mb-1.5 block text-[13px] font-semibold tracking-[-0.01em] text-[#141210]">
                        Reflectietekst
                      </label>
                      <textarea
                        value={reflectionText}
                        onChange={e => setReflectionText(e.target.value)}
                        rows={10}
                        placeholder="Plak hier de reflectie. Het systeem detecteert automatisch welke competenties aan bod komen."
                        className="w-full resize-none rounded-lg border border-[#E8E2D8] bg-white px-3 py-2.5 text-[14px] leading-[1.65] tracking-[-0.01em] text-[#141210] placeholder:text-[#7A7268] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[#D9CFC0] focus:border-[#15233F]/50 focus:shadow-[0_0_0_3px_rgba(21,35,63,0.1)]"
                      />
                    </div>

                    <button
                      onClick={handleReflectionSubmit}
                      disabled={reflectionLoading || !reflectionText.trim()}
                      className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#7A3A42] text-[14px] font-semibold tracking-[-0.015em] text-white shadow-[0_1px_2px_rgba(122,58,66,0.28)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[#5F2D34] hover:shadow-[0_2px_8px_rgba(122,58,66,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3A42]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.995] disabled:cursor-not-allowed disabled:border disabled:border-[#D4D0C8] disabled:bg-[#E9E6E0] disabled:text-[#8A837A] disabled:shadow-none disabled:hover:bg-[#E9E6E0] disabled:active:scale-100"
                    >
                      {reflectionLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-3.5 w-3.5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Feedback genereren...
                        </span>
                      ) : 'Vraag feedback →'}
                    </button>

                    {reflectionLoading && (
                      <div className="mt-3 rounded-xl border border-[#E8E2D8] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(20,18,16,0.03)]">
                        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-[#EFEAE3]">
                          <div className="h-1 animate-pulse rounded-full bg-[#7A3A42]" style={{ width: '70%' }} />
                        </div>
                        <p className="text-center text-[13px] leading-relaxed text-[#5C544C]">
                          Je reflectie wordt beoordeeld aan de hand van het EMCC-kader...
                        </p>
                      </div>
                    )}

                    {reflectionReport && (
                      <div className="mt-3 rounded-xl border border-[#E8E2D8] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(20,18,16,0.03)]">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7A3A42]/10 text-[#7A3A42]">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </span>
                          <p className="text-[14px] font-semibold tracking-[-0.015em] text-[#141210]">Je beoordelingsrapport is klaar</p>
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#5C544C]">
                          Je reflectie is beoordeeld aan de hand van de EMCC-competenties. Open het PDF-rapport om de volledige beoordeling te bekijken.
                        </p>
                        <a
                          href={reflectionReport}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#7A3A42] text-[14px] font-semibold tracking-[-0.015em] text-white shadow-[0_1px_2px_rgba(122,58,66,0.28)] transition-[background-color,box-shadow] duration-150 hover:bg-[#5F2D34] hover:shadow-[0_2px_8px_rgba(122,58,66,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3A42]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        >
                          Bekijk je rapport →
                        </a>
                      </div>
                    )}

                    {reflectionError && (
                      <div className="mt-3 rounded-xl border border-[#E0C9C8] bg-[#FBF6F6] px-4 py-3">
                        <p className="text-[14px] font-semibold tracking-[-0.015em] text-[#8B4548]">We konden deze reflectie niet beoordelen</p>
                        <p className="mt-1 text-[13px] text-[#8B4548]/90">{reflectionError}</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5C544C]">
                          Controleer je verbinding en probeer het opnieuw. Als het blijft misgaan, wacht even en probeer opnieuw.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
