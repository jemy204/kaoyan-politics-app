import { SUBJECT_META, isObjective } from './data'
import type {
  AnswerRecord,
  ProgressState,
  Question,
  Stats,
  SubjectStat,
  TopicStat,
  TypeStat,
  YearStat,
} from './types'
import { dateKey, shuffle } from './utils'

export function isGradedRecord(question: Question, record?: AnswerRecord): boolean {
  return Boolean(
    record &&
      isObjective(question) &&
      record.method === 'answer' &&
      typeof record.correct === 'boolean',
  )
}

export function isMastered(record?: AnswerRecord): boolean {
  return Boolean(record && record.wrongCount > 0 && record.streakCorrect >= 2)
}

export function isPending(record?: AnswerRecord): boolean {
  return Boolean(record && record.wrongCount > 0 && record.streakCorrect < 2)
}

export function currentStreak(activity: Record<string, number>): number {
  const active = new Set(Object.keys(activity).filter((key) => (activity[key] || 0) > 0))
  if (!active.size) return 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!active.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!active.has(dateKey(cursor))) return 0
  }
  let streak = 0
  while (active.has(dateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function weekActivity(activity: Record<string, number>): number {
  let total = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i += 1) {
    total += activity[dateKey(cursor)] || 0
    cursor.setDate(cursor.getDate() - 1)
  }
  return total
}

export function computeStats(questions: Question[], progress: ProgressState): Stats {
  const records = progress.records
  let practiced = 0
  let graded = 0
  let correct = 0
  let wrong = 0

  const subjectMap = new Map<string, SubjectStat>()
  for (const meta of SUBJECT_META) {
    subjectMap.set(meta.key, {
      key: meta.key,
      name: meta.name,
      short: meta.short,
      color: meta.color,
      total: 0,
      practiced: 0,
      graded: 0,
      correct: 0,
      accuracy: null,
    })
  }

  const typeMap = new Map<string, TypeStat>()
  const yearMap = new Map<number, YearStat>()
  const topicMap = new Map<string, TopicStat>()

  for (const question of questions) {
    const record = records[question.id]
    const subject = subjectMap.get(question.subjectKey)
    if (subject) subject.total += 1

    const type = typeMap.get(question.type) || {
      type: question.type,
      total: 0,
      practiced: 0,
      graded: 0,
      correct: 0,
      accuracy: null,
    }
    type.total += 1
    typeMap.set(question.type, type)

    const year = yearMap.get(question.year) || {
      year: question.year,
      total: 0,
      practiced: 0,
      graded: 0,
      correct: 0,
      accuracy: null,
    }
    year.total += 1
    yearMap.set(question.year, year)

    if (!record) continue
    practiced += 1
    if (subject) subject.practiced += 1
    type.practiced += 1
    year.practiced += 1

    if (isGradedRecord(question, record)) {
      graded += 1
      type.graded += 1
      year.graded += 1
      if (subject) subject.graded += 1
      if (record.correct) {
        correct += 1
        type.correct += 1
        year.correct += 1
        if (subject) subject.correct += 1
      }
    }

    if (isPending(record)) wrong += 1

    if (isObjective(question) && typeof record.correct === 'boolean') {
      const key = `${question.subjectKey}::${question.topic}`
      const topic = topicMap.get(key) || {
        topic: question.topic,
        subjectKey: question.subjectKey,
        total: 0,
        graded: 0,
        correct: 0,
        accuracy: 0,
        wrong: 0,
      }
      topic.graded += 1
      if (record.correct) topic.correct += 1
      topicMap.set(key, topic)
    }
  }

  for (const topic of topicMap.values()) {
    topic.accuracy = topic.graded ? topic.correct / topic.graded : 0
    topic.wrong = topic.graded - topic.correct
    topic.total = questions.filter(
      (q) => q.subjectKey === topic.subjectKey && q.topic === topic.topic,
    ).length
  }

  const subjects = [...subjectMap.values()].filter((s) => s.total > 0)
  for (const subject of subjects) {
    subject.accuracy = subject.graded ? subject.correct / subject.graded : null
  }

  const types = [...typeMap.values()].map((type) => ({
    ...type,
    accuracy: type.graded ? type.correct / type.graded : null,
  }))

  const years = [...yearMap.values()]
    .map((year) => ({
      ...year,
      accuracy: year.graded ? year.correct / year.graded : null,
    }))
    .sort((a, b) => a.year - b.year)

  const topics = [...topicMap.values()].sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy
    return b.graded - a.graded
  })

  const today = dateKey()
  return {
    total: questions.length,
    practiced,
    graded,
    correct,
    accuracy: graded ? correct / graded : null,
    wrong,
    favorites: progress.favorites.length,
    notes: Object.values(progress.notes).filter((note) => note.trim()).length,
    streak: currentStreak(progress.activity),
    todayCount: progress.activity[today] || 0,
    weekCount: weekActivity(progress.activity),
    subjects,
    types,
    years,
    topics,
  }
}

export function getWrongQuestions(questions: Question[], progress: ProgressState): Question[] {
  return questions
    .filter((q) => {
      const record = progress.records[q.id]
      return isPending(record)
    })
    .sort((a, b) => {
      const atA = progress.records[a.id]?.at || ''
      const atB = progress.records[b.id]?.at || ''
      return atB.localeCompare(atA)
    })
}

export function getMasteredQuestions(questions: Question[], progress: ProgressState): Question[] {
  return questions
    .filter((q) => isMastered(progress.records[q.id]))
    .sort((a, b) => {
      const atA = progress.records[a.id]?.at || ''
      const atB = progress.records[b.id]?.at || ''
      return atB.localeCompare(atA)
    })
}

export function paperObjectiveTotal(questions: Question[], year: number): number {
  return questions
    .filter((q) => q.year === year)
    .reduce((sum, q) => sum + (q.type === 'single' ? 1 : q.type === 'multiple' ? 2 : 0), 0)
}

export function gradeAnswer(question: Question, selected: string[]): boolean | null {
  if (question.type === 'analysis' || !question.answer.length) return null
  const left = [...selected].sort().join('')
  const right = [...question.answer].sort().join('')
  return left === right
}

export function buildRound(
  pool: Question[],
  progress: ProgressState,
  size = 20,
  excludeIds: Set<string> = new Set(),
): Question[] {
  if (!pool.length) return []
  const fresh = pool.filter((q) => !excludeIds.has(q.id))
  const source = fresh.length >= Math.min(size, pool.length) ? fresh : pool
  const wrong = source.filter((q) => isPending(progress.records[q.id]))
  const unseen = source.filter((q) => !progress.records[q.id])
  const rest = source.filter((q) => progress.records[q.id])

  const picked: Question[] = []
  const used = new Set<string>()
  const take = (items: Question[], count: number) => {
    for (const question of shuffle(items)) {
      if (picked.length >= size || count <= 0) break
      if (used.has(question.id)) continue
      used.add(question.id)
      picked.push(question)
      count -= 1
    }
  }

  take(wrong, Math.min(6, Math.ceil(size * 0.3)))
  take(unseen, Math.min(10, Math.ceil(size * 0.5)))
  take(rest, size - picked.length)
  take(source, size - picked.length)

  return picked.slice(0, size)
}

export function buildSmartSession(
  questions: Question[],
  progress: ProgressState,
  size = 20,
): Question[] {
  const wrong = questions.filter((q) => isPending(progress.records[q.id]))
  const unseen = questions.filter((q) => !progress.records[q.id])
  const weakSubjects = new Set(
    computeStats(questions, progress)
      .subjects.filter((s) => s.accuracy !== null && s.accuracy < 0.65)
      .map((s) => s.key),
  )
  const weak = questions.filter(
    (q) =>
      weakSubjects.has(q.subjectKey) &&
      (!progress.records[q.id] || progress.records[q.id].correct === false),
  )

  const picked: Question[] = []
  const used = new Set<string>()
  const take = (pool: Question[], count: number) => {
    for (const question of shuffle(pool)) {
      if (picked.length >= size || count <= 0) break
      if (used.has(question.id)) continue
      used.add(question.id)
      picked.push(question)
      count -= 1
    }
  }

  take(wrong, Math.min(6, Math.ceil(size * 0.3)))
  take(unseen, Math.min(8, Math.ceil(size * 0.4)))
  take(weak, 4)
  take(questions, size - picked.length)

  return picked.slice(0, size)
}
