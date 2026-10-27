import { useMemo, useState } from 'react'
import { ArrowUpRight, Bookmark, NotebookPen, Star, StarOff } from 'lucide-react'
import { Button, Chip, EmptyState } from '../components/ui/primitives'
import { SUBJECT_MAP, SUBJECT_META, TYPE_META } from '../lib/data'
import type { SubjectKey } from '../lib/types'
import { useStudy } from '../store/StudyProvider'

export function Collection() {
  const { questions, progress, toggleFavorite, notify } = useStudy()
  const [subject, setSubject] = useState<SubjectKey | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  const favorites = useMemo(
    () =>
      progress.favorites
        .map((id) => questions.find((q) => q.id === id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q)),
    [progress.favorites, questions],
  )

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    return favorites.filter((q) => {
      if (subject !== 'all' && q.subjectKey !== subject) return false
      if (needle && !`${q.stem} ${q.topic} ${q.knowledgePoint}`.toLowerCase().includes(needle))
        return false
      return true
    })
  }, [favorites, subject, keyword])

  const subjectCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of favorites) map.set(q.subjectKey, (map.get(q.subjectKey) || 0) + 1)
    return map
  }, [favorites])

  const withNotes = favorites.filter((q) => progress.notes[q.id]?.trim()).length
  const subjectsCovered = new Set(favorites.map((q) => q.subjectKey)).size

  return (
    <div className="page collection-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            COLLECTION · 值得再看一遍
          </span>
          <h1>收藏夹</h1>
          <p className="page-sub">把值得再想一遍的题收在这里，配上自己的笔记，复习时直接回来。</p>
        </div>
        <div className="page-head-aside">
          <div className="mistake-total">
            <span>已收藏</span>
            <strong>{favorites.length}</strong>
            <em>题</em>
          </div>
        </div>
      </header>

      <section className="collection-stats">
        <div>
          <span className="stat-label">收藏题目</span>
          <strong>{favorites.length}</strong>
          <span className="stat-note">来自 {subjectsCovered} 个学科</span>
        </div>
        <div>
          <span className="stat-label">带笔记</span>
          <strong>{withNotes}</strong>
          <span className="stat-note">写下自己的理解</span>
        </div>
        <div className="collection-tip">
          <NotebookPen size={16} aria-hidden="true" />
          <p>收藏不是囤积。每周挑 3 道收藏题，遮住解析重讲一遍。</p>
        </div>
      </section>

      <section className="collection-toolbar">
        <div className="subject-chips">
          <Chip active={subject === 'all'} count={favorites.length} onClick={() => setSubject('all')}>
            全部
          </Chip>
          {SUBJECT_META.filter((s) => subjectCounts.get(s.key)).map((s) => (
            <Chip
              key={s.key}
              active={subject === s.key}
              count={subjectCounts.get(s.key)}
              dotColor={s.color}
              onClick={() => setSubject(s.key)}
            >
              {s.short}
            </Chip>
          ))}
        </div>
        <label className="search-field is-compact">
          <Star size={14} aria-hidden="true" />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索收藏"
            aria-label="搜索收藏"
          />
        </label>
      </section>

      {filtered.length ? (
        <section className="collection-grid" aria-label="收藏题目">
          {filtered.map((question) => {
            const subjectMeta = SUBJECT_MAP[question.subjectKey]
            const note = progress.notes[question.id]
            return (
              <article key={question.id} className="collection-card">
                <div className="collection-top">
                  <span className="collection-subject">
                    <i style={{ background: subjectMeta.color }} />
                    {subjectMeta.short}
                    <span className="meta-divider">/</span>
                    {question.topic}
                  </span>
                  <span className={`type-badge type-${question.type}`}>
                    {TYPE_META[question.type].short}
                  </span>
                </div>
                <a className="collection-stem" href={`#/practice?view=favorite&q=${question.id}`}>
                  {question.stem}
                </a>
                {note ? (
                  <div className="collection-note">
                    <NotebookPen size={13} aria-hidden="true" />
                    <p>{note}</p>
                  </div>
                ) : null}
                <div className="collection-foot">
                  <span>
                    {question.year} · 第 {question.number} 题
                  </span>
                  <div>
                    <button
                      type="button"
                      className="collection-remove"
                      onClick={() => {
                        toggleFavorite(question.id)
                        notify('已取消收藏')
                      }}
                      aria-label="取消收藏"
                      title="取消收藏"
                    >
                      <StarOff size={15} />
                    </button>
                    <a className="collection-open" href={`#/practice?view=favorite&q=${question.id}`}>
                      打开 <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <EmptyState
          icon={<Bookmark size={26} />}
          title={favorites.length ? '这些筛选下没有收藏' : '还没有收藏题目'}
          description={
            favorites.length
              ? '换个学科或关键词看看。'
              : '在刷题时点击题目右上角的收藏，题目就会出现在这里。'
          }
          action={
            <Button variant="primary" onClick={() => (window.location.hash = '#/practice')}>
              去刷题
            </Button>
          }
        />
      )}

      {favorites.length ? (
        <div className="collection-footnote">
          <span>共 {favorites.length} 道收藏 · 笔记保存在本机</span>
          <Button variant="ghost" size="sm" onClick={() => (window.location.hash = '#/settings')}>
            导出学习记录
          </Button>
        </div>
      ) : null}
    </div>
  )
}
