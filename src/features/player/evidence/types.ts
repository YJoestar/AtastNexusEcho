export type ArtifactSource = 'EVIDENCE' | 'INVENTORY' | 'FRAGMENT'

export interface CaseArtifact {
  id: string
  code: string
  title: string
  description: string
  type: string
  source: ArtifactSource
  content: Record<string, unknown>
  location: string | null
  acquiredAt: string | null
}

export function contentString(content: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = content[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function artifactMediaUrl(artifact: CaseArtifact, media: 'IMAGE' | 'AUDIO' | 'VIDEO'): string | null {
  const keys = media === 'IMAGE'
    ? ['image_url', 'imageUrl', 'photo_url', 'document_url', 'file_url']
    : media === 'AUDIO'
      ? ['audio_url', 'audioUrl']
      : ['video_url', 'videoUrl']
  const raw = contentString(artifact.content, keys)
  if (!raw || typeof window === 'undefined') return null
  try {
    const url = new URL(raw, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export function visibleArtifactFields(content: Record<string, unknown>): Array<[string, string]> {
  const hiddenMediaKeys = new Set([
    'image_url', 'imageUrl', 'photo_url', 'document_url', 'file_url',
    'audio_url', 'audioUrl', 'video_url', 'videoUrl',
  ])
  return Object.entries(content)
    .filter(([key, value]) => !hiddenMediaKeys.has(key) && value !== null && value !== undefined)
    .map(([key, value]) => [key.replace(/_/g, ' ').toUpperCase(), typeof value === 'string' ? value : JSON.stringify(value)] as [string, string])
}