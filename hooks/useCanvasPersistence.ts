'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { type Node, type Edge } from '@xyflow/react'

const DEBOUNCE_MS = 1500

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseCanvasPersistenceOptions {
  sessionId: string
  nodes: Node[]
  edges: Edge[]
  enabled?: boolean
}

export interface VersionMeta {
  id: string
  created_at: string
  node_count: number
  label: string
}

interface UseCanvasPersistenceReturn {
  saveStatus: SaveStatus
  lastSaved: Date | null
  saveNow: () => Promise<void>
  versions: VersionMeta[]
  restoreVersion: (versionId: string) => Promise<void>
}

export function useCanvasPersistence({
  sessionId,
  nodes,
  edges,
  enabled = true,
}: UseCanvasPersistenceOptions): UseCanvasPersistenceReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [versions, setVersions] = useState<VersionMeta[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const pendingRef = useRef(false)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  const fetchVersions = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`/api/sessions/${sessionId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions ?? [])
      }
    } catch { /* silent */ }
  }, [sessionId])

  const saveNow = useCallback(async () => {
    if (!sessionId || isSavingRef.current) { pendingRef.current = true; return }

    isSavingRef.current = true
    setSaveStatus('saving')

    try {
      const payload = {
        nodes: nodesRef.current.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
          width: n.width,
          height: n.height,
        })),
        edges: edgesRef.current.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          style: e.style,
        })),
      }

      const res = await fetch(`/api/sessions/${sessionId}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Save failed')

      setLastSaved(new Date())
      setSaveStatus('saved')
      fetchVersions()
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Canvas save error:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      isSavingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        saveNow()
      }
    }
  }, [sessionId, fetchVersions])

  const restoreVersion = useCallback(async (versionId: string) => {
    if (!sessionId) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/versions/${versionId}/restore`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Restore failed')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [sessionId])

  useEffect(() => {
    if (enabled && sessionId) fetchVersions()
  }, [sessionId, enabled, fetchVersions])

  useEffect(() => {
    if (!enabled || !sessionId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(saveNow, DEBOUNCE_MS)
    // No cleanup return: let the timer fire even if the component unmounts
    // (user navigates away), so the last unsaved changes are persisted.
  }, [nodes, edges, sessionId, enabled, saveNow])

  return { saveStatus, lastSaved, saveNow, versions, restoreVersion }
}
