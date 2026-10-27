import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ListChecks,
  RotateCcw,
  Timer,
  XCircle,
} from 'lucide-react'
import { Navigator, type NavStatus } from '../components/question/Navigator'
import { QuestionCard } from '../components/question/QuestionCard'
import {
  Button,
  EmptyState,
  Modal,
  ProgressBar,
  Ring,
} from '../components/ui/primitives'
import { TYPE_META } from '../lib/data'
import type { Question } from '../lib/types'
import { cn, formatDuration, navigate } from '../lib/utils'
import { useStudy, type PaperSummary } from '../store/StudyProvider'

function isCorrect(question: Question, selected: string[]): boolean {
  if (!selected.length) return false
  return [...selected].sort().join('') === [...question.answer].sort().join('')
}

function gradeLabel(ratio: number): { title: string; sub: string } {
  if (ratio >= 0.85)
    return { title: '这一套，稳。', sub: '客观题掌握得很扎实，接下来把分析题的要点写完整。' }
  if (ratio >= 0.7)
    return { title: '基础扎实，补细节。', sub: '大方向没有问题，错题集中在少数考点上，逐个吃透就好。' }
  if (ratio >= 0.55)
    return { title: '还有明显的提分空间。', sub: '先回看错题的解析，再按学科做一轮专项练习。' }
  return { title: '先把错题吃透。', sub: '不要急着做下一套，把这一套里每个错因写清楚更重要。' }
}

export function PaperSession({ year }: { year: number }) {
  const {
    questions,
    progress,
    notify,
    submitPaper,
    saveExamDraft,
    toggleFavorite,
    setNote,
    setLastQuestion,
    rateAnalysis,
  } = useStudy()

  const paperQuestions = useMemo(
    () => questions.filter((q) => q.year === year).sort((a, b) => a.number - b.number),
    [questions, year],
  )
  const draft = progress.examDraft?.year === year ? progress.examDraft : null
  const [startedAt, setStartedAt] = useState(() => draft?.startedAt || Date.now())
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => draft?.answers || {})
  const [texts, setTexts] = useState<Record<string, string>>(() => draft?.texts || {})
  const [index, setIndex] = useState(0)
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - (draft?.startedAt || Date.now())) / 1000),
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [result, setResult] = useState<PaperSummary | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const current = paperQuestions[index]
  const objectiveTotal = paperQuestions.reduce(
    (sum, q) => sum + (q.type === 'single' ? 1 : q.type === 'multiple' ? 2 : 0),
    0,
  )
  const answeredCount = paperQuestions.filter(
    (q) => (answers[q.id]?.length || 0) > 0 || Boolean(texts[q.id]?.trim()),
  ).length

  useEffect(() => {
    if (result) return
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, result])

  useEffect(() => {
    if (result) return
    const timer = window.setTimeout(() => {
      saveExamDraft({ year, startedAt, answers, texts })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [answers, texts, startedAt, result, year, saveExamDraft])

  useEffect(() => {
    if (current) setLastQuestion(current.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const select = (letter: string) => {
    if (!current || result) return
    setAnswers((prev) => {
      const existing = prev[current.id] || []
      const next =
        current.type === 'single'
          ? [letter]
          : existing.includes(letter)
            ? existing.filter((x) => x !== letter)
            : [...existing, letter]
      return { ...prev, [current.id]: next }
    })
  }

  const goTo = (next: number) => {
    if (next < 0 || next >= paperQuestions.length) return
    setIndex(next)
    setNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      if (document.querySelector('.modal-backdrop') || result) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      const onControl =
        target?.tagName === 'BUTTON' || target?.tagName === 'A' || target?.getAttribute('role') === 'button'
      if (key === 'enter' && onControl) return
      if (['1', '2', '3', '4'].includes(key) && current && current.type !== 'analysis') {
        const letter = Object.keys(current.options)[Number(key) - 1]
        if (letter) {
          event.preventDefault()
          select(letter)
        }
      } else if (['a', 'b', 'c', 'd'].includes(key) && current && current.type !== 'analysis') {
        if (current.options[key.toUpperCase()]) {
          event.preventDefault()
          select(key.toUpperCase())
        }
      } else if (key === 'arrowleft') {
        event.preventDefault()
        goTo(index - 1)
      } else if (key === 'arrowright' || key === 'enter') {
        event.preventDefault()
        goTo(index + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const statusFor = (question: Question, position: number): NavStatus => {
    if (position === index) return 'current'
    const answered =
      (answers[question.id]?.length || 0) > 0 || Boolean(texts[question.id]?.trim())
    return answered ? 'answered' : 'todo'
  }

  const confirmSubmit = () => {
    if (!paperQuestions.length) return
    const summary = submitPaper(year, answers, texts, elapsed)
    setConfirmOpen(false)
    setResult(summary)
    setReviewOpen(false)
    window.scrollTo({ top: 0 })
  }

  const restart = () => {
    setResult(null)
    setAnswers({})
    setTexts({})
    setIndex(0)
    setElapsed(0)
    setStartedAt(Date.now())
    setReviewOpen(false)
    window.scrollTo({ top: 0 })
    notify('已重新开始这一套试卷')
  }

  if (!paperQuestions.length) {
    return (
      <div className="page">
        <EmptyState
          icon={<XCircle size={26} />}
          title="没有找到这一年的试卷"
          description="请返回整卷列表，重新选择年份。"
          action={<Button variant="primary" onClick={() => navigate('/papers')}>返回整卷</Button>}
        />
      </div>
    )
  }

  if (result) {
    const ratio = objectiveTotal ? result.score / objectiveTotal : 0
    const grade = gradeLabel(ratio)
    const accuracy = result.gradedCount ? result.correctCount / result.gradedCount : null
    const objectiveQuestions = paperQuestions.filter((q) => q.type !== 'analysis')
    const wrongQuestions = objectiveQuestions.filter(
      (q) => (answers[q.id]?.length || 0) > 0 && !isCorrect(q, answers[q.id] || []),
    )
    const unansweredObjective = objectiveQuestions.filter((q) => !answers[q.id]?.length).length
    const analysisQuestions = paperQuestions.filter((q) => q.type === 'analysis')
    const typeRows = (['single', 'multiple', 'analysis'] as const).map((type) => {
      const list = paperQuestions.filter((q) => q.type === type)
      const answered = list.filter(
        (q) => (answers[q.id]?.length || 0) > 0 || Boolean(texts[q.id]?.trim()),
      ).length
      const correct = list.filter(
        (q) => q.type !== 'analysis' && isCorrect(q, answers[q.id] || []),
      ).length
      return { type, total: list.length, answered, correct }
    })

    return (
      <div className="page result-page">
        <header className="result-head">
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            RESULT · {year} 年真题
          </span>
          <h1>{grade.title}</h1>
          <p className="page-sub">{grade.sub}</p>
        </header>

        <section className="result-hero">
          <div className="result-score">
            <Ring value={ratio} size={176} stroke={11} tone={ratio >= 0.7 ? 'jade' : 'accent'}>
              <strong>{result.score}</strong>
              <span>/ {objectiveTotal} 客观分</span>
            </Ring>
          </div>
          <div className="result-metrics">
            <div>
              <span className="stat-label">客观题正确率</span>
              <strong>{accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`}</strong>
              <em>{result.correctCount} / {result.gradedCount} 题</em>
            </div>
            <div>
              <span className="stat-label">已作答</span>
              <strong>{result.answered}<em>/ {paperQuestions.length}</em></strong>
              <em>含 {analysisQuestions.length} 道分析题</em>
            </div>
            <div>
              <span className="stat-label">用时</span>
              <strong>{formatDuration(result.durationSec)}</strong>
              <em>建议控制在 180 分钟内</em>
            </div>
            <div>
              <span className="stat-label">客观错题</span>
              <strong>{wrongQuestions.length}</strong>
              <em>{unansweredObjective} 道未作答</em>
            </div>
          </div>
        </section>

        <section className="result-types" aria-label="分题型表现">
          {typeRows.map((row) => (
            <article key={row.type} className="result-type">
              <span className={cn('type-badge', `type-${row.type}`)}>{TYPE_META[row.type].label}</span>
              <strong>
                {row.type === 'analysis' ? row.answered : row.correct}
                <em>/ {row.total}</em>
              </strong>
              <ProgressBar
                value={row.type === 'analysis' ? (row.total ? row.answered / row.total : 0) : row.total ? row.correct / row.total : 0}
                tone={row.type === 'analysis' ? 'ink' : 'jade'}
              />
              <span>{row.type === 'analysis' ? '已作答，待自评' : '答对题数'}</span>
            </article>
          ))}
        </section>

        <div className="result-actions">
          <Button variant="primary" onClick={() => setReviewOpen((v) => !v)} leading={<ListChecks size={16} />}>
            {reviewOpen ? '收起逐题复盘' : '逐题复盘'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/practice?view=wrong')}>
            重做错题
          </Button>
          <Button variant="ghost" onClick={restart} leading={<RotateCcw size={15} />}>
            再做一遍
          </Button>
          <Button variant="ghost" onClick={() => navigate('/papers')} leading={<ArrowLeft size={15} />}>
            返回整卷
          </Button>
        </div>

        {reviewOpen ? (
          <section className="review" aria-label="逐题复盘">
            <div className="review-head">
              <h2>客观题错题</h2>
              <span>
                {wrongQuestions.length} 道错答
                {unansweredObjective ? ` · ${unansweredObjective} 道未答` : ''}
              </span>
            </div>
            {wrongQuestions.length ? (
              <div className="review-list">
                {wrongQuestions.map((question) => {
                  const selected = answers[question.id] || []
                  return (
                    <details key={question.id} className="review-item">
                      <summary>
                        <span className="review-no">{question.number}</span>
                        <span className="review-topic">
                          {question.subjectKey} · {question.topic}
                        </span>
                        <span className="review-answers">
                          你的 {selected.length ? selected.join('、') : '未答'} · 正确{' '}
                          {question.answer.join('、')}
                        </span>
                        <span className="review-flag">
                          {selected.length ? <XCircle size={15} /> : <Clock3 size={15} />}
                          {selected.length ? '错答' : '未答'}
                        </span>
                      </summary>
                      <div className="review-body">
                        <p className="review-stem">{question.stem}</p>
                        <div className="review-options">
                          {Object.entries(question.options).map(([letter, text]) => (
                            <span
                              key={letter}
                              className={cn(
                                question.answer.includes(letter) && 'is-correct',
                                selected.includes(letter) && !question.answer.includes(letter) && 'is-wrong',
                              )}
                            >
                              <b>{letter}</b>
                              {text}
                            </span>
                          ))}
                        </div>
                        <p className="review-explain">
                          <strong>解析</strong>
                          {question.explanation || '暂无文字解析。'}
                        </p>
                      </div>
                    </details>
                  )
                })}
              </div>
            ) : (
              <p className="review-empty">
                <CheckCircle2 size={16} />
                {unansweredObjective
                  ? `没有错答的客观题，还有 ${unansweredObjective} 道未作答。`
                  : '客观题全部答对，做得干净。'}
              </p>
            )}

            <div className="review-head">
              <h2>分析题参考要点</h2>
              <span>{analysisQuestions.length} 道</span>
            </div>
            <div className="review-list">
              {analysisQuestions.map((question) => {
                const record = progress.records[question.id]
                return (
                  <details key={question.id} className="review-item">
                    <summary>
                      <span className="review-no">{question.number}</span>
                      <span className="review-topic">
                        {question.subjectKey} · {question.topic}
                      </span>
                      <span className="review-answers">
                        {texts[question.id]?.trim() ? '已作答' : '未作答'} · 参考要点
                      </span>
                      <span className={cn('review-flag', record?.correct === true ? 'is-ok' : 'is-neutral')}>
                        {record?.correct === true ? '已掌握' : record?.correct === false ? '待巩固' : '待自评'}
                      </span>
                    </summary>
                    <div className="review-body">
                      <p className="review-stem">{question.stem}</p>
                      <p className="review-explain">
                        <strong>参考作答要点</strong>
                        {question.referenceAnswer || question.explanation || '暂未收录参考要点。'}
                      </p>
                      <div className="review-self">
                        <span>对照要点，判断掌握程度</span>
                        <button
                          type="button"
                          className={cn('self-btn', record?.correct === true && 'is-active')}
                          onClick={() => {
                            rateAnalysis(question, true, texts[question.id] || '')
                            notify('已记录：这道题掌握了')
                          }}
                        >
                          <CheckCircle2 size={14} /> 已掌握
                        </button>
                        <button
                          type="button"
                          className={cn('self-btn', record?.correct === false && 'is-active')}
                          onClick={() => {
                            rateAnalysis(question, false, texts[question.id] || '')
                            notify('已加入错题本，留给下一次巩固')
                          }}
                        >
                          <RotateCcw size={14} /> 继续巩固
                        </button>
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    )
  }

  return (
    <div className="page paper-session">
      <div className="exam-bar">
        <a className="exam-back" href="#/papers">
          <ArrowLeft size={16} />
          <span>整卷</span>
        </a>
        <div className="exam-title">
          <strong>{year} 年真题</strong>
          <span>{paperQuestions.length} 题 · 客观 {objectiveTotal} 分</span>
        </div>
        <div className="exam-timer" aria-label="已用时间">
          <Timer size={15} />
          <strong>{formatDuration(elapsed)}</strong>
        </div>
        <div className="exam-count">
          已答 <strong>{answeredCount}</strong> / {paperQuestions.length}
        </div>
        <button type="button" className="nav-open-btn exam-sheet-btn" onClick={() => setNavOpen(true)}>
          <ListChecks size={15} />
          答题卡
        </button>
        <Button variant="primary" onClick={() => setConfirmOpen(true)}>
          交卷
        </Button>
      </div>

      <div className="practice-layout exam-layout">
        <div className="practice-main">
          <div className="practice-status">
            <div className="practice-status-left">
              <span className="session-label">模拟考试</span>
              <span className="session-divider" aria-hidden="true" />
              <span>
                第 <strong>{index + 1}</strong> / {paperQuestions.length} 题
              </span>
              <span className="session-divider" aria-hidden="true" />
              <span>交卷后统一判分</span>
            </div>
          </div>
          <ProgressBar value={paperQuestions.length ? answeredCount / paperQuestions.length : 0} className="practice-progress" />

          {current ? (
            <QuestionCard
              question={current}
              selected={answers[current.id] || []}
              onSelect={select}
              revealed={false}
              examMode
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
              draftText={texts[current.id] || ''}
              onDraftText={(text) => setTexts((prev) => ({ ...prev, [current.id]: text }))}
              index={index}
              total={paperQuestions.length}
            />
          ) : null}

          <div className="practice-pager">
            <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0}>
              ← 上一题
            </Button>
            <span className="pager-note">考试模式下不显示即时答案，交卷后统一复盘。</span>
            <Button
              variant="secondary"
              onClick={() => goTo(index + 1)}
              disabled={index >= paperQuestions.length - 1}
            >
              下一题 →
            </Button>
          </div>
        </div>

        <div className="practice-aside">
          <Navigator
            questions={paperQuestions}
            currentIndex={index}
            answered={answeredCount}
            statusFor={statusFor}
            onJump={goTo}
            onPrev={() => goTo(index - 1)}
            onNext={() => goTo(index + 1)}
            exam
          />
          <div className="aside-tip">
            <span className="aside-tip-label">考试提醒</span>
            <p>先做有把握的题，不确定的标记后回看。分析题至少写出原理与材料对应关系。</p>
          </div>
        </div>
      </div>

      <Modal open={navOpen} onClose={() => setNavOpen(false)} title="答题卡" size="md">
        <Navigator
          questions={paperQuestions}
          currentIndex={index}
          answered={answeredCount}
          statusFor={statusFor}
          onJump={goTo}
          onPrev={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
          exam
        />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="确认交卷？"
        description={`${year} 年真题 · 已用时 ${formatDuration(elapsed)}`}
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              继续作答
            </Button>
            <Button variant="primary" onClick={confirmSubmit} trailing={<ArrowRight size={15} />}>
              确认交卷
            </Button>
          </div>
        }
      >
        <div className="confirm-body">
          <p>
            已作答 <strong>{answeredCount}</strong> / {paperQuestions.length} 题
            {answeredCount < paperQuestions.length ? (
              <>
                ，还有 <strong>{paperQuestions.length - answeredCount}</strong> 题未完成。
              </>
            ) : (
              '，全部完成。'
            )}
          </p>
          <p className="confirm-note">
            交卷后客观题立即判分，分析题展示参考要点供自评。本次成绩会保存到整卷记录。
          </p>
        </div>
      </Modal>
    </div>
  )
}
