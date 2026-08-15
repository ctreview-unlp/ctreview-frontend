import { supabase } from '@/app/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Authorization': `Bearer ${session.access_token}`,
  }
}

function uploadFileWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (loaded: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size)
        resolve()
        return
      }
      reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText || xhr.statusText}`))
    }

    xhr.onerror = () => reject(new Error('Upload failed: network error'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))

    // Match Supabase storage-js signed upload body format
    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file)
    xhr.send(body)
  })
}

export async function uploadFilesToSupabase(
  files: File[],
  sessionId: string,
  onProgress?: (percent: number) => void
): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const paths: string[] = []
  const totalBytes = files.reduce((sum, file) => sum + Math.max(file.size, 1), 0)
  let completedBytes = 0

  const report = (loadedInCurrent: number) => {
    const percent = ((completedBytes + loadedInCurrent) / totalBytes) * 100
    onProgress?.(Math.max(0, Math.min(99, percent)))
  }

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${session.user.id}/videos/${sessionId}/${safeName}`

    const { data: signed, error: signError } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl(path)

    if (signError || !signed?.signedUrl) {
      // Fallback without byte-level progress if signed uploads are unavailable
      report(0)
      const { error } = await supabase.storage
        .from('videos')
        .upload(path, file, { contentType: file.type })
      if (error) throw new Error(`Upload failed: ${error.message}`)
      completedBytes += Math.max(file.size, 1)
      report(0)
    } else {
      await uploadFileWithProgress(signed.signedUrl, file, (loaded) => report(loaded))
      completedBytes += Math.max(file.size, 1)
      report(0)
    }

    paths.push(path)
  }

  onProgress?.(100)
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
