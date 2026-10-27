import type { ProgressState, Settings } from './types'
import { dateKey } from './utils'

export const PROGRESS_KEY = 'polis.progress.v1'
export const SETTINGS_KEY = 'polis.settings'

export const defaultProgress: ProgressState = {
  records: {},
  favorites: [],
  notes: {},
  drafts: {},
  activity: {},
  lastQuestionId: null,
  papers: {},
  examDraft: null,
}

export const defaultSettings: Settings = {
  theme: 'system',
  fontSize: 'comfortable',
  motion: true,
}

function safeParse<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadProgress(): ProgressState {
  const saved = safeParse<Partial<ProgressState>>(PROGRESS_KEY)
  if (!saved || typeof saved !== 'object') return { ...defaultProgress }
  return {
    records: saved.records && typeof saved.records === 'object' ? saved.records : {},
    favorites: Array.isArray(saved.favorites) ? saved.favorites.filter((x) => typeof x === 'string') : [],
    notes: saved.notes && typeof saved.notes === 'object' ? saved.notes : {},
    drafts: saved.drafts && typeof saved.drafts === 'object' ? saved.drafts : {},
    activity: saved.activity && typeof saved.activity === 'object' ? saved.activity : {},
    lastQuestionId: typeof saved.lastQuestionId === 'string' ? saved.lastQuestionId : null,
    papers: saved.papers && typeof saved.papers === 'object' ? saved.papers : {},
    examDraft: saved.examDraft && typeof saved.examDraft === 'object' ? saved.examDraft : null,
  }
}

export function saveProgress(progress: ProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* Storage may be full or blocked; the session keeps working in memory. */
  }
}

export function loadSettings(): Settings {
  const saved = safeParse<Partial<Settings>>(SETTINGS_KEY)
  if (!saved || typeof saved !== 'object') return { ...defaultSettings }
  return {
    theme: saved.theme === 'light' || saved.theme === 'dark' || saved.theme === 'system' ? saved.theme : 'system',
    fontSize: saved.fontSize === 'compact' ? 'compact' : 'comfortable',
    motion: saved.motion !== false,
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* Ignore blocked storage. */
  }
}

export interface BackupFile {
  app: string
  version: number
  exportedAt: string
  progress: ProgressState
  settings: Settings
}

export function buildBackup(progress: ProgressState, settings: Settings): BackupFile {
  return {
    app: '研政 POLIS',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
    settings,
  }
}

export function downloadBackup(progress: ProgressState, settings: Settings): void {
  const blob = new Blob([JSON.stringify(buildBackup(progress, settings), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = dateKey()
  anchor.href = url
  anchor.download = `研政学习记录_${stamp}.json`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
