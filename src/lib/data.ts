import type {
  Question,
  QuestionType,
  RawQuestion,
  SubjectKey,
  SubjectMeta,
} from './types'

export const SUBJECT_META: SubjectMeta[] = [
  {
    key: '马原',
    name: '马克思主义基本原理',
    short: '马原',
    desc: '原理与方法',
    color: 'var(--s-mayuan)',
    initial: '理',
  },
  {
    key: '毛中特',
    name: '毛泽东思想和中国特色社会主义理论体系',
    short: '毛中特',
    desc: '理论与实践',
    color: 'var(--s-mao)',
    initial: '论',
  },
  {
    key: '新思想',
    name: '习近平新时代中国特色社会主义思想',
    short: '新思想',
    desc: '新时代 · 新思想',
    color: 'var(--s-xin)',
    initial: '新',
  },
  {
    key: '史纲',
    name: '中国近现代史纲要',
    short: '史纲',
    desc: '历史与选择',
    color: 'var(--s-shi)',
    initial: '史',
  },
  {
    key: '思法',
    name: '思想道德与法治',
    short: '思法',
    desc: '修养与法治',
    color: 'var(--s-si)',
    initial: '法',
  },
  {
    key: '时政',
    name: '形势与政策及当代世界经济与政治',
    short: '时政',
    desc: '时代与世界',
    color: 'var(--s-shiZheng)',
    initial: '时',
  },
  {
    key: '综合',
    name: '跨学科综合',
    short: '综合',
    desc: '综合专题',
    color: 'var(--s-zong)',
    initial: '综',
  },
]

export const SUBJECT_MAP = Object.fromEntries(
  SUBJECT_META.map((s) => [s.key, s]),
) as Record<SubjectKey, SubjectMeta>

export const TYPE_META: Record<QuestionType, { label: string; short: string; score: number }> = {
  single: { label: '单项选择', short: '单选', score: 1 },
  multiple: { label: '多项选择', short: '多选', score: 2 },
  analysis: { label: '分析题', short: '分析', score: 10 },
}

const SUBJECT_RULES: Array<[RegExp, SubjectKey]> = [
  [/新思想|习近平/, '新思想'],
  [/马原|马克思主义基本/, '马原'],
  [/毛中特|毛泽东|中国特色社会主义理论/, '毛中特'],
  [/史纲|近现代史/, '史纲'],
  [/思法|思修|思想道德|法律基础|道德修养/, '思法'],
  [/时政|形势|政策|当代世界/, '时政'],
]

export function toSubjectKey(value: string): SubjectKey {
  const text = String(value || '综合')
  for (const [rule, key] of SUBJECT_RULES) {
    if (rule.test(text)) return key
  }
  return '综合'
}

function normalizeType(value: string): QuestionType {
  return value === 'single' || value === 'multiple' || value === 'analysis'
    ? value
    : 'analysis'
}

function normalizeAnswer(value: RawQuestion['answer']): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((x) => String(x).trim().toUpperCase()).filter((x) => /^[A-D]$/.test(x)))]
  }
  if (typeof value === 'string') {
    return [...new Set((value.match(/[A-D]/gi) || []).map((x) => x.toUpperCase()))]
  }
  return []
}

function normalizeOptions(value: RawQuestion['options']): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, text] of Object.entries(value)) {
    if (/^[A-D]$/.test(key) && typeof text === 'string') out[key] = text
  }
  return out
}

export function normalizeQuestion(raw: RawQuestion): Question {
  const subjectKey = toSubjectKey(raw.subject)
  return {
    id: String(raw.id),
    year: Number(raw.year),
    number: Number(raw.number),
    type: normalizeType(raw.type),
    subject: String(raw.subject || subjectKey),
    subjectKey,
    topic: String(raw.topic || '未细分专题'),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    stem: String(raw.stem || ''),
    options: normalizeOptions(raw.options),
    answer: normalizeAnswer(raw.answer),
    explanation: String(raw.explanation || ''),
    sourceUrl: String(raw.sourceUrl || ''),
    sourceTitle: String(raw.sourceTitle || ''),
    sourceLinks: Array.isArray(raw.sourceLinks)
      ? raw.sourceLinks.filter((s) => s && typeof s.url === 'string' && typeof s.title === 'string')
      : [],
    knowledgePoint: String(raw.knowledgePoint || raw.topic || ''),
    referenceAnswer: String(raw.referenceAnswer || ''),
    referenceAnswerNote: String(raw.referenceAnswerNote || ''),
    sourceNote: String(raw.sourceNote || ''),
    imageUrls: Array.isArray(raw.imageUrls) ? raw.imageUrls.filter((x) => typeof x === 'string') : [],
    figureNote: String(raw.figureNote || ''),
    missingImage: Boolean(raw.missingImage),
    verified: raw.verified !== false,
  }
}

export interface QuestionBank {
  metadata: Record<string, unknown>
  years: Array<{ year: number; total: number }>
  questions: Question[]
}

export async function loadQuestionBank(): Promise<QuestionBank> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/questions.json`, {
    cache: 'force-cache',
  })
  if (!response.ok) throw new Error(`题库加载失败（HTTP ${response.status}）`)
  const data = await response.json()
  if (!data || !Array.isArray(data.questions)) throw new Error('题库格式不正确')
  const questions = (data.questions as RawQuestion[])
    .filter((q) => q && q.id && q.stem)
    .map(normalizeQuestion)
  if (!questions.length) throw new Error('题库为空')
  return {
    metadata: data.metadata || {},
    years: Array.isArray(data.years) ? data.years : [],
    questions,
  }
}

export function isObjective(q: Question): boolean {
  return q.type !== 'analysis'
}

export function hasKnownAnswer(q: Question): boolean {
  return (
    q.type !== 'analysis' &&
    q.answer.length > 0 &&
    q.answer.every((key) => Object.prototype.hasOwnProperty.call(q.options, key))
  )
}

export function getYears(questions: Question[]): number[] {
  return [...new Set(questions.map((q) => q.year))].sort((a, b) => b - a)
}

export function resolveAsset(url: string): string {
  const clean = url.replace(/^\.\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}
