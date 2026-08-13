import { supabase } from '@/app/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Authorization': `Bearer ${session.access_token}`,
  }
}

import * as tus from 'tus-js-client'

export async function uploadFilesToSupabase(files: File[], sessionId: string): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const paths: string[] = []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${session.user.id}/${sessionId}/${safeName}`

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${supabaseAnonKey}`,
          'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'videos',
          objectName: path,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024,
        onError: (error) => {
          console.error('Upload error:', error)
          reject(new Error(`Upload failed: ${error.message}`))
        },
        onSuccess: () => {
          console.log(`Uploaded ${file.name} to ${path}`)
          resolve()
        },
      })

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0])
        }
        upload.start()
      })
    })

    paths.push(path)
  }

  return paths
}

export async function createSession(payload: {
  file_paths: string[]
  email?: string
}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/sessions/create`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function evaluateReflection(payload: {
  reflection_text: string
  email?: string
  candidate_name?: string
}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/reflections/evaluate`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getSessionStatus(sessionId: string) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: 'GET',
    headers,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}