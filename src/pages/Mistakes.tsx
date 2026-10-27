import { useMemo, useState } from 'react'
import { ArrowRight, CheckCheck, RotateCcw, SearchX, ShieldCheck } from 'lucide-react'
import { Button, Chip, EmptyState, Segmented, Select } from '../components/ui/primitives'
import { SUBJECT_MAP, SUBJECT_META, TYPE_META } from '../lib/data'
import { getMasteredQuestions, getWrongQuestions } from '../lib/stats'
import type { QuestionType, SubjectKey } from '../lib/types'
import { cn, relativeTime } from '../lib/utils'
import { useStudy } from '../store/StudyProvider'

type Tab = 'pending' | 'mastered'
type TypeFilter = 'all' | QuestionType

export function Mistakes() {
  const { questions, progress, stats, markMastered, notify } = useStudy()
  const [tab, setTab] = useState<Tab>('pending')
  const [subject, setSubject] = useState<SubjectKey | 'all'>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [keyword, setKeyword] = useState('')

  const pending = useMemo(() => getWrongQuestions(questions, progress), [questions, progress])
  const mastered = useMemo(() => getMasteredQuestions(questions, progress), [questions, progress])

  const weekNew = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000
    return questions.filter((q) => {
      const record = progress.records[q.id]
      return record?.correct === false && new Date(record.at).getTime() >= cutoff
    }).length
  }, [questions, progress.records])

  const source = tab === 'pending' ? pending : mastered
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    return source.filter((q) => {
      if (subject !== 'all' && q.subjectKey !== subject) return false
      if (type !== 'all' && q.type !== type) return false
      if (needle && !`${q.stem} ${q.topic} ${q.knowledgePoint}`.toLowerCase().includes(needle))
        return false
      return true
    })
  }, [source, subject, type, keyword])

  const subjectCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of source) map.set(q.subjectKey, (map.get(q.subjectKey) || 0) + 1)
    return map
  }, [source])

  return (
    <div className="page mistakes-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            MISTAKES · 把错因留住
          </span>
          <h1>错题本</h1>
          <p className="page-sub">错题不是负担，是下一次的得分点。连续答对两次，自动移入“已掌握”。</p>
        </div>
        <div className="page-head-aside">
          <div className="mistake-total">
            <span>待巩固</span>
            <strong>{pending.length}</strong>
            <em>题</em>
          </div>
        </div>
      </header>

      <section className="mistake-stats" aria-label="错题概况">
        <div>
          <span className="stat-label">待巩固</span>
          <strong>{pending.length}</strong>
          <span className="stat-note">最近一次作答错误</span>
        </div>
        <div>
          <span className="stat-label">已掌握</span>
          <strong>{mastered.length}</strong>
          <span className="stat-note">连续答对两次</span>
        </div>
        <div>
          <span className="stat-label">本周新增</span>
          <strong>{weekNew}</strong>
          <span className="stat-note">近 7 天答错</span>
        </div>
        <div>
          <span className="stat-label">整体正确率</span>
          <strong>{stats.accuracy === null ? '—' : `${Math.round(stats.accuracy * 100)}%`}</strong>
          <span className="stat-note">{stats.graded} 道客观题已判分</span>
        </div>
      </section>

      <section className="mistake-toolbar">
        <Segmented
          value={tab}
          onChange={setTab}
          ariaLabel="错题状态"
          options={[
            { value: 'pending', label: '待巩固', count: pending.length },
            { value: 'mastered', label: '已掌握', count: mastered.length },
          ]}
        />
        <div className="mistake-filters">
          <Select
            value={subject}
            onChange={(event) => setSubject(event.target.value as SubjectKey | 'all')}
            aria-label="按学科筛选"
          >
            <option value="all">全部学科</option>
            {SUBJECT_META.filter((s) => subjectCounts.get(s.key)).map((s) => (
              <option key={s.key} value={s.key}>
                {s.short}（{subjectCounts.get(s.key)}）
              </option>
            ))}
          </Select>
          <Select
            value={type}
            onChange={(event) => setType(event.target.value as TypeFilter)}
            aria-label="按题型筛选"
          >
            <option value="all">全部题型</option>
            <option value="single">单项选择</option>
            <option value="multiple">多项选择</option>
            <option value="analysis">分析题</option>
          </Select>
          <label className="search-field is-compact">
            <SearchX size={14} aria-hidden="true" />
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索错题"
              aria-label="搜索错题"
            />
          </label>
        </div>
      </section>

      {filtered.length ? (
        <section className="mistake-list" aria-label="错题列表">
          {filtered.map((question) => {
            const record = progress.records[question.id]
            const subjectMeta = SUBJECT_MAP[question.subjectKey]
            return (
              <article key={question.id} className="mistake-row">
                <div className="mistake-index">
                  <strong>{question.year}</strong>
                  <span>第 {question.number} 题</span>
                </div>
                <div className="mistake-main">
                  <a className="mistake-stem" href={`#/practice?${tab === 'pending' ? 'view=wrong&' : ''}q=${question.id}`}>
                    {question.stem}
                  </a>
                  <div className="mistake-meta">
                    <span className="meta-subject">
                      <i style={{ background: subjectMeta.color }} />
                      {subjectMeta.short}
                    </span>
                    <span>{question.topic}</span>
                    <span className={cn('type-badge', `type-${question.type}`)}>
                      {TYPE_META[question.type].short}
                    </span>
                    {record ? (
                      <>
                        <span>答错 {record.wrongCount} 次</span>
                        <span>{relativeTime(record.at)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="mistake-actions">
                  {tab === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          markMastered(question.id)
                          notify('已标记为掌握，可在“已掌握”中查看')
                        }}
                        leading={<ShieldCheck size={14} />}
                      >
                        已掌握
                      </Button>
                      <a className="btn btn-primary btn-sm" href={`#/practice?view=wrong&q=${question.id}`}>
                        <span className="btn-label">重练</span>
                        <ArrowRight size={14} />
                      </a>
                    </>
                  ) : (
                    <>
                      <span className="mastered-mark">
                        <CheckCheck size={14} /> 已掌握
                      </span>
                      <a className="btn btn-secondary btn-sm" href={`#/practice?q=${question.id}`}>
                        <span className="btn-label">再练一次</span>
                      </a>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <EmptyState
          icon={<SearchX size={26} />}
          title={
            tab === 'pending'
              ? pending.length
                ? '这些筛选下没有错题'
                : '错题本还是空的'
              : mastered.length
                ? '这些筛选下没有已掌握的题'
                : '还没有已掌握的错题'
          }
          description={
            tab === 'pending'
              ? '换个学科或题型看看；答错的题会自动收进这里。'
              : '错题连续答对两次后，会自动出现在这里。'
          }
          action={
            <Button
              variant="primary"
              onClick={() => {
                setSubject('all')
                setType('all')
                setKeyword('')
                setTab('pending')
              }}
              leading={<RotateCcw size={15} />}
            >
              回到待巩固
            </Button>
          }
        />
      )}

      <div className="mistake-tip">
        <span className="panel-label">REVIEW METHOD</span>
        <p>
          复习错题时，先遮住解析，用自己的话讲一遍“为什么错”。能讲清错因，比再做对一次更有价值。
        </p>
        <div className="tip-chips">
          <Chip onClick={() => setSubject('马原')} active={subject === '马原'}>马原</Chip>
          <Chip onClick={() => setSubject('新思想')} active={subject === '新思想'}>新思想</Chip>
          <Chip onClick={() => setSubject('史纲')} active={subject === '史纲'}>史纲</Chip>
        </div>
      </div>
    </div>
  )
}
