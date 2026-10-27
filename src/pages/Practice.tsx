import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ListChecks,
  SearchX,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { Navigator, type NavStatus } from '../components/question/Navigator'
import { QuestionCard } from '../components/question/QuestionCard'
import {
  Button,
  Chip,
  EmptyState,
  Modal,
  ProgressBar,
  Segmented,
  Select,
} from '../components/ui/primitives'
import { SUBJECT_META, TYPE_META, getYears } from '../lib/data'
import { buildRound, buildSmartSession, isPending } from '../lib/stats'
import type { Question, QuestionType, SubjectKey } from '../lib/types'
import { cn, navigate, shuffle } from '../lib/utils'
import { useStudy } from '../store/StudyProvider'

type View = 'all' | 'wrong' | 'favorite'
type TypeFilter = 'all' | QuestionType

const ROUND_SIZE = 20

function parseView(value: string | null): View {
  return value === 'wrong' || value === 'favorite' ? value : 'all'
}

function parseSubject(value: string | null): SubjectKey | 'all' {
  return SUBJECT_META.some((s) => s.key === value) ? (value as SubjectKey) : 'all'
}

function parseType(value: string | null): TypeFilter {
  return value === 'single' || value === 'multiple' || value === 'analysis' ? value : 'all'
}

export function Practice({ params }: { params: URLSearchParams }) {
  const {
    questions,
    loading,
    progress,
    stats,
    notify,
    submitAnswer,
    rateAnalysis,
    toggleFavorite,
    setNote,
    saveDraft,
    setLastQuestion,
  } = useStudy()

  const [view, setView] = useState<View>(() => parseView(params.get('view')))
  const [subject, setSubject] = useState<SubjectKey | 'all'>(() => parseSubject(params.get('subject')))
  const [type, setType] = useState<TypeFilter>(() => parseType(params.get('type')))
  const [year, setYear] = useState<string>(() => params.get('year') || 'all')
  const [topic, setTopic] = useState<string>(() => params.get('topic') || 'all')
  const [keyword, setKeyword] = useState('')
  const [queueIds, setQueueIds] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [answerText, setAnswerText] = useState('')
  const [sessionLabel, setSessionLabel] = useState('本轮练习')
  const [poolCount, setPoolCount] = useState(0)
  const [roundDismissed, setRoundDismissed] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [navOpen, setNavOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [smart, setSmart] = useState(params.get('smart') === '1')
  const [random, setRandom] = useState(params.get('random') === '1')
  const [targetId, setTargetId] = useState<string | null>(params.get('q'))
  const cardRef = useRef<HTMLDivElement>(null)
  const roundRef = useRef<HTMLElement | null>(null)
  const announcedRound = useRef(false)
  const textTimer = useRef<number | null>(null)
  const mounted = useRef(false)
  const sessionStartRef = useRef(new Date().toISOString())
  const paramsKey = params.toString()

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const queue = useMemo(
    () => queueIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q)),
    [queueIds, byId],
  )
  const current = queue[index]
  const record = current ? progress.records[current.id] : undefined
  const answered = useMemo(
    () =>
      queue.reduce(
        (sum, q) => sum + ((progress.records[q.id]?.at || '') >= sessionStartRef.current ? 1 : 0),
        0,
      ),
    [queue, progress.records],
  )
  const roundComplete = queue.length > 0 && answered >= queue.length
  const roundCorrect = useMemo(
    () =>
      queue.filter((q) => {
        const item = progress.records[q.id]
        return item && item.at >= sessionStartRef.current && item.correct === true
      }).length,
    [queue, progress.records],
  )
  const roundWrong = useMemo(
    () =>
      queue.filter((q) => {
        const item = progress.records[q.id]
        return item && item.at >= sessionStartRef.current && item.correct === false
      }).length,
    [queue, progress.records],
  )
  const roundPending = Math.max(0, queue.length - roundCorrect - roundWrong)
  const roundAccuracy = useMemo(() => {
    const graded = queue.filter((q) => {
      const item = progress.records[q.id]
      return (
        q.type !== 'analysis' &&
        item &&
        item.at >= sessionStartRef.current &&
        item.method === 'answer' &&
        typeof item.correct === 'boolean'
      )
    })
    if (!graded.length) return null
    const correct = graded.filter((q) => progress.records[q.id]?.correct === true).length
    return correct / graded.length
  }, [queue, progress.records])

  const signature = `${view}|${subject}|${type}|${year}|${topic}|${keyword}`

  useEffect(() => {
    const nextView = parseView(params.get('view'))
    const nextSubject = parseSubject(params.get('subject'))
    const nextType = parseType(params.get('type'))
    const nextYear = params.get('year') || 'all'
    const nextTopic = params.get('topic') || 'all'
    setView(nextView)
    setSubject(nextSubject)
    setType(nextType)
    setYear(nextYear)
    setTopic(nextTopic)
    setKeyword('')
    setTargetId(params.get('q'))
    setSmart(params.get('smart') === '1')
    setRandom(params.get('random') === '1')
  }, [paramsKey])

  const getPool = useCallback(() => {
    const needle = keyword.trim().toLowerCase()
    return questions
      .filter((q) => {
        if (view === 'wrong' && !isPending(progress.records[q.id])) return false
        if (view === 'favorite' && !progress.favorites.includes(q.id)) return false
        if (subject !== 'all' && q.subjectKey !== subject) return false
        if (type !== 'all' && q.type !== type) return false
        if (year !== 'all' && q.year !== Number(year)) return false
        if (topic !== 'all' && q.topic !== topic && !q.tags.includes(topic)) return false
        if (needle) {
          const haystack = [
            q.stem,
            q.topic,
            q.knowledgePoint,
            q.subject,
            ...q.tags,
            ...Object.values(q.options),
          ]
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => b.year - a.year || a.number - b.number)
  }, [view, subject, type, year, topic, keyword, questions, progress.records, progress.favorites])

  const rebuild = useCallback(() => {
    const pool = getPool()
    const round = buildRound(pool, progress, ROUND_SIZE)
    let ids = round.map((q) => q.id)
    if (targetId && pool.some((q) => q.id === targetId)) {
      ids = [targetId, ...ids.filter((id) => id !== targetId)].slice(0, ROUND_SIZE)
    }
    setPoolCount(pool.length)
    setQueueIds(ids)
    setRoundDismissed(false)
    setSessionLabel(
      view === 'wrong' ? '错题重练' : view === 'favorite' ? '收藏练习' : '本轮练习',
    )
    sessionStartRef.current = new Date().toISOString()
    setSessionKey((value) => value + 1)
    if (targetId) {
      const position = ids.indexOf(targetId)
      setIndex(position >= 0 ? position : 0)
    } else {
      setIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPool, progress, targetId])

  useLayoutEffect(() => {
    rebuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, paramsKey, targetId, questions.length])

  const startSmart = useCallback(() => {
    if (!questions.length) return
    const list = buildSmartSession(questions, progress, ROUND_SIZE)
    setQueueIds(list.map((q) => q.id))
    setPoolCount(questions.length)
    setRoundDismissed(false)
    setIndex(0)
    setSessionLabel('智能训练')
    sessionStartRef.current = new Date().toISOString()
    setSessionKey((value) => value + 1)
    notify(`已按错题与薄弱学科组好 ${list.length} 道题`)
  }, [questions, progress, notify])

  const startRandom = useCallback(() => {
    if (!questions.length) return
    const ids = shuffle(questions)
      .slice(0, ROUND_SIZE)
      .map((q) => q.id)
    setQueueIds(ids)
    setPoolCount(questions.length)
    setRoundDismissed(false)
    setIndex(0)
    setSessionLabel('随机练习')
    sessionStartRef.current = new Date().toISOString()
    setSessionKey((value) => value + 1)
  }, [questions])

  const newRound = useCallback(() => {
    const pool = getPool()
    const round = buildRound(pool, progress, ROUND_SIZE, new Set(queueIds))
    setPoolCount(pool.length)
    setQueueIds(round.map((q) => q.id))
    setIndex(0)
    setRoundDismissed(false)
    setSessionLabel(
      view === 'wrong' ? '错题重练' : view === 'favorite' ? '收藏练习' : '新一轮练习',
    )
    sessionStartRef.current = new Date().toISOString()
    setSessionKey((value) => value + 1)
    notify('已开始新一轮')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [getPool, progress, queueIds, view, notify])

  useEffect(() => {
    if (!questions.length) return
    if (smart) startSmart()
    else if (random) startRandom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smart, random, questions.length])

  useEffect(() => {
    if (!current) return
    const currentRecord = progress.records[current.id]
    const inSession = Boolean(
      currentRecord && currentRecord.at >= sessionStartRef.current,
    )
    setRevealed(inSession)
    setSelected(
      (inSession ? currentRecord?.selected : progress.drafts[current.id]?.selected) || [],
    )
    setAnswerText(
      (inSession ? currentRecord?.text : progress.drafts[current.id]?.text) || '',
    )
    setLastQuestion(current.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, sessionKey])

  useEffect(() => {
    if (index > 0 && index >= queue.length && queue.length) setIndex(queue.length - 1)
  }, [index, queue.length])

  useEffect(() => {
    if (roundComplete && !announcedRound.current) {
      announcedRound.current = true
      window.requestAnimationFrame(() => {
        roundRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    if (!roundComplete) announcedRound.current = false
  }, [roundComplete])

  useEffect(() => {
    return () => {
      if (textTimer.current) window.clearTimeout(textTimer.current)
    }
  }, [])

  const goTo = (next: number) => {
    if (next < 0 || next >= queue.length) return
    setIndex(next)
    setNavOpen(false)
    if (mounted.current) {
      window.requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    mounted.current = true
  }

  const handleText = (value: string) => {
    setAnswerText(value)
    if (!current) return
    if (textTimer.current) window.clearTimeout(textTimer.current)
    textTimer.current = window.setTimeout(() => {
      saveDraft(current.id, { text: value })
    }, 450)
  }

  const select = (letter: string) => {
    if (!current || revealed) return
    let next: string[]
    if (current.type === 'single') {
      next = [letter]
    } else {
      next = selected.includes(letter)
        ? selected.filter((x) => x !== letter)
        : [...selected, letter]
    }
    setSelected(next)
    saveDraft(current.id, { selected: next })
  }

  const submit = () => {
    if (!current) return
    if (current.type !== 'analysis' && Object.keys(current.options).length && !selected.length) {
      notify('先选择一个答案，再提交')
      return
    }
    if (textTimer.current) window.clearTimeout(textTimer.current)
    const result = submitAnswer(current, selected, answerText)
    setRevealed(true)
    if (result === true) notify('回答正确，继续保持')
    else if (result === false) notify('已记入错题本，稍后回看')
    else notify('已保存作答，请对照参考要点自评')
  }

  const selfRate = (correct: boolean) => {
    if (!current) return
    rateAnalysis(current, correct, answerText)
    notify(correct ? '已记录：这道题掌握了' : '已加入错题本，留给下一次巩固')
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (document.querySelector('.modal-backdrop')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      const onControl =
        target?.tagName === 'BUTTON' || target?.tagName === 'A' || target?.getAttribute('role') === 'button'
      const isOption = Boolean(target?.classList.contains('option'))
      if (key === 'enter' && onControl && !isOption) return
      if (['1', '2', '3', '4'].includes(key) && current && current.type !== 'analysis') {
        const letters = Object.keys(current.options)
        const letter = letters[Number(key) - 1]
        if (letter) {
          event.preventDefault()
          select(letter)
        }
        return
      }
      if (['a', 'b', 'c', 'd'].includes(key) && current && current.type !== 'analysis') {
        if (current.options[key.toUpperCase()]) {
          event.preventDefault()
          select(key.toUpperCase())
        }
        return
      }
      if (key === 'enter') {
        if (!current) return
        event.preventDefault()
        if (revealed) {
          if (index < queue.length - 1) goTo(index + 1)
          else notify('已经是最后一题了')
        } else {
          submit()
        }
        return
      }
      if (key === 'arrowleft') {
        event.preventDefault()
        goTo(index - 1)
      } else if (key === 'arrowright') {
        event.preventDefault()
        goTo(index + 1)
      } else if (key === 's' && current) {
        event.preventDefault()
        const added = toggleFavorite(current.id)
        notify(added ? '已加入收藏' : '已取消收藏')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const years = getYears(questions)
  const topics = useMemo(
    () =>
      [...new Set(
        questions
          .filter((q) => (subject === 'all' ? true : q.subjectKey === subject))
          .map((q) => q.topic)
          .filter((t) => t && t !== '未细分专题'),
      )].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [questions, subject],
  )

  const subjectCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of questions) map.set(q.subjectKey, (map.get(q.subjectKey) || 0) + 1)
    return map
  }, [questions])

  const statusFor = (question: Question, position: number): NavStatus => {
    if (position === index) return 'current'
    const item = progress.records[question.id]
    if (!item || item.at < sessionStartRef.current) return 'todo'
    if (item.correct === false) return 'wrong'
    if (item.correct === true) return 'correct'
    return 'answered'
  }

  if (loading) {
    return (
      <div className="page practice-page">
        <div className="skeleton-block">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    )
  }

  return (
    <div className="page practice-page">
      <header className="page-head practice-head">
        <div>
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            PRACTICE · {stats.total} 道真题
          </span>
          <h1>刷题</h1>
          <p className="page-sub">按学科、专题和年份缩小范围，一次只解决一道题。</p>
        </div>
        <div className="page-head-actions">
          <Button variant="secondary" onClick={startRandom} leading={<Shuffle size={15} />}>
            随机练习
          </Button>
          <Button variant="primary" onClick={startSmart} leading={<Sparkles size={15} />}>
            智能训练
          </Button>
        </div>
      </header>

      <section className="filter-bar" aria-label="筛选题目">
        <div className="subject-chips">
          <Chip
            active={subject === 'all'}
            count={questions.length}
            onClick={() => {
              setSubject('all')
              setTopic('all')
            }}
          >
            全部
          </Chip>
          {SUBJECT_META.map((item) => (
            <Chip
              key={item.key}
              active={subject === item.key}
              count={subjectCounts.get(item.key) || 0}
              dotColor={item.color}
              onClick={() => {
                setSubject(item.key)
                setTopic('all')
              }}
            >
              {item.short}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          className={cn('filter-toggle', filtersOpen && 'is-open')}
          onClick={() => setFiltersOpen((value) => !value)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          <span>筛选</span>
          <em>
            {type === 'all' ? '全部题型' : TYPE_META[type].short} ·{' '}
            {year === 'all' ? '全部年份' : `${year} 年`} ·{' '}
            {topic === 'all' ? '全部专题' : topic}
          </em>
          <span className="filter-toggle-count">{poolCount} 题</span>
          <ChevronDown size={14} className="filter-chevron" aria-hidden="true" />
        </button>
        <div className={cn('filter-row', filtersOpen && 'is-open')}>
          <Segmented
            value={type}
            onChange={setType}
            ariaLabel="题型"
            options={[
              { value: 'all', label: '全部题型' },
              { value: 'single', label: TYPE_META.single.short },
              { value: 'multiple', label: TYPE_META.multiple.short },
              { value: 'analysis', label: TYPE_META.analysis.short },
            ]}
          />
          <Select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            aria-label="年份"
          >
            <option value="all">全部年份</option>
            {years.map((item) => (
              <option key={item} value={String(item)}>
                {item} 年
              </option>
            ))}
          </Select>
          <Select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            aria-label="专题"
          >
            <option value="all">全部专题</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <label className="search-field">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索题干、选项、考点"
              aria-label="搜索题目"
            />
            {keyword ? (
              <button type="button" onClick={() => setKeyword('')} aria-label="清空搜索">
                <X size={13} />
              </button>
            ) : null}
          </label>
          <span className="filter-count" title="筛选结果总数，每轮抽取 20 题">
            {poolCount} <em>题</em>
          </span>
        </div>
      </section>

      {queue.length && current ? (
        <div className="practice-layout">
          <div className="practice-main">
            <div className="practice-status">
              <div className="practice-status-left">
                <span className="session-label">{sessionLabel}</span>
                <span className="round-tag">{queue.length} 题</span>
                <span className="session-divider" aria-hidden="true" />
                <span>
                  第 <strong>{index + 1}</strong> / {queue.length} 题
                </span>
                <span className="session-divider" aria-hidden="true" />
                <span>本轮已答 {answered}</span>
              </div>
              <button type="button" className="nav-open-btn" onClick={() => setNavOpen(true)}>
                <ListChecks size={15} />
                答题卡
              </button>
            </div>
            <ProgressBar value={queue.length ? answered / queue.length : 0} className="practice-progress" />

            {roundComplete ? (
              roundDismissed ? (
                <div className="round-complete-chip">
                  <CheckCircle2 size={14} aria-hidden="true" />
                  本轮 {queue.length} 题已完成
                  <button type="button" onClick={newRound}>
                    再来一轮
                  </button>
                </div>
              ) : (
                <section className="round-complete" aria-live="polite" ref={roundRef}>
                  <span className="round-complete-mark" aria-hidden="true">
                    <CheckCircle2 size={21} />
                  </span>
                  <div className="round-complete-copy">
                    <span className="panel-label">ROUND COMPLETE</span>
                    <h3>这一轮 {queue.length} 题，完成了。</h3>
                    <p>
                      答对 {roundCorrect} 题
                      {roundWrong ? `，答错 ${roundWrong} 题` : ''}
                      {roundPending ? `，待自评 ${roundPending} 题` : ''}
                      {roundAccuracy !== null
                        ? ` · 客观题正确率 ${Math.round(roundAccuracy * 100)}%`
                        : ''}
                    </p>
                  </div>
                  <div className="round-complete-actions">
                    <Button variant="primary" onClick={newRound}>
                      再来一轮
                    </Button>
                    <Button variant="secondary" onClick={() => setRoundDismissed(true)}>
                      回看本轮
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/mistakes')}>
                      错题本
                    </Button>
                  </div>
                </section>
              )
            ) : null}

            <div ref={cardRef} className="qcard-anchor">
              <QuestionCard
                question={current}
                selected={selected}
                onSelect={select}
                revealed={revealed}
                record={record}
                favorite={progress.favorites.includes(current.id)}
                onFavorite={() => {
                  const added = toggleFavorite(current.id)
                  notify(added ? '已加入收藏' : '已取消收藏')
                }}
                note={progress.notes[current.id] || ''}
                onNote={(text) => {
                  setNote(current.id, text)
                  notify(text ? '笔记已保存' : '笔记已清除')
                }}
                onSubmit={submit}
                onPrev={() => goTo(index - 1)}
                onNext={() => goTo(index + 1)}
                canPrev={index > 0}
                canNext={index < queue.length - 1}
                onSelfRate={selfRate}
                draftText={answerText}
                onDraftText={handleText}
                index={index}
                total={queue.length}
              />
            </div>
          </div>

          <div className="practice-aside">
            <Navigator
              questions={queue}
              currentIndex={index}
              answered={answered}
              statusFor={statusFor}
              onJump={goTo}
              onPrev={() => goTo(index - 1)}
              onNext={() => goTo(index + 1)}
              countLabel="本轮"
              note="只统计本轮作答"
            />
            <div className="aside-tip">
              <span className="aside-tip-label">今日节奏</span>
              <p>
                {stats.todayCount >= 3
                  ? '今天已经练了 3 题以上，可以收尾，也可以再推进一点。'
                  : `今天还差 ${3 - stats.todayCount} 题完成基础节奏。`}
              </p>
            </div>
          </div>
        </div>
      ) : queue.length ? (
        <div className="empty">
          <p>正在定位题目…</p>
        </div>
      ) : (
        <EmptyState
          icon={<SearchX size={26} />}
          title={
            view === 'wrong'
              ? '错题本还是空的'
              : view === 'favorite'
                ? '还没有收藏题目'
                : '没有符合条件的题目'
          }
          description={
            view === 'wrong'
              ? '提交答案后，答错的题会自动出现在这里。'
              : view === 'favorite'
                ? '在题目右上角点收藏，就能随时回来复习。'
                : '试着减少一个筛选条件，或换一个关键词。'
          }
          action={
            <Button
              variant="primary"
              onClick={() => {
                setTargetId(null)
                setView('all')
                setSubject('all')
                setType('all')
                setYear('all')
                setTopic('all')
                setKeyword('')
              }}
            >
              查看全部真题
            </Button>
          }
        />
      )}

      <Modal open={navOpen} onClose={() => setNavOpen(false)} title="答题卡" size="md">
        <Navigator
          questions={queue}
          currentIndex={index}
          answered={answered}
          statusFor={statusFor}
          onJump={goTo}
          onPrev={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
          countLabel="本轮"
          note="只统计本轮作答"
        />
      </Modal>

      <p className={cn('practice-footnote', !queue.length && 'is-hidden')}>
        真题按年份整理，历史时政保留考试当年语境；答案与解析以原始来源为准。
      </p>
    </div>
  )
}
