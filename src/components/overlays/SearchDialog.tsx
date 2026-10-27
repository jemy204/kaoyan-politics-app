import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react'
import { TYPE_META } from '../../lib/data'
import type { Question } from '../../lib/types'
import { cn, highlightParts, navigate } from '../../lib/utils'
import { Modal } from '../ui/primitives'

function snippet(text: string, query: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const index = clean.toLowerCase().indexOf(query.toLowerCase())
  if (index < 0) return clean.slice(0, 96) + (clean.length > 96 ? '…' : '')
  const start = Math.max(0, index - 28)
  return `${start > 0 ? '…' : ''}${clean.slice(start, start + 104)}${start + 104 < clean.length ? '…' : ''}`
}

export function SearchDialog({
  open,
  onClose,
  questions,
}: {
  open: boolean
  onClose: () => void
  questions: Question[]
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    const scored: Array<{ question: Question; score: number }> = []
    for (const question of questions) {
      const stem = question.stem.toLowerCase()
      const topic = `${question.topic} ${question.knowledgePoint}`.toLowerCase()
      const options = Object.values(question.options).join(' ').toLowerCase()
      let score = 0
      if (stem.includes(needle)) score += 6
      if (topic.includes(needle)) score += 4
      if (options.includes(needle)) score += 2
      if (`${question.year}`.includes(needle)) score += 1
      if (score > 0) scored.push({ question, score })
    }
    return scored
      .sort((a, b) => b.score - a.score || b.question.year - a.question.year)
      .slice(0, 14)
      .map((item) => item.question)
  }, [query, questions])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((prev) => Math.min(results.length - 1, prev + 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((prev) => Math.max(0, prev - 1))
      } else if (event.key === 'Enter' && results[active]) {
        event.preventDefault()
        navigate(`/practice?q=${results[active].id}`)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, active, onClose])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <Modal open={open} onClose={onClose} title="搜索真题" size="md" className="search-modal">
      <div className="search-box">
        <Search size={17} aria-hidden="true" />
        <input
          data-autofocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入题干、选项、考点，或年份…"
          aria-label="搜索题目"
        />
        <kbd>Esc</kbd>
      </div>

      {!query.trim() ? (
        <div className="search-hint">
          <p>试试这些关键词</p>
          <div>
            {['中国式现代化', '矛盾', '抗日战争', '全过程人民民主', '2023'].map((word) => (
              <button key={word} type="button" onClick={() => setQuery(word)}>
                {word}
              </button>
            ))}
          </div>
        </div>
      ) : results.length ? (
        <div className="search-results" ref={listRef} role="listbox" aria-label="搜索结果">
          {results.map((question, index) => {
            const parts = highlightParts(snippet(question.stem, query), query)
            return (
              <button
                key={question.id}
                type="button"
                data-index={index}
                role="option"
                aria-selected={index === active}
                className={cn('search-result', index === active && 'is-active')}
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  navigate(`/practice?q=${question.id}`)
                  onClose()
                }}
              >
                <div className="search-result-top">
                  <span className={cn('type-badge', `type-${question.type}`)}>
                    {TYPE_META[question.type].short}
                  </span>
                  <span>
                    {question.year} · 第 {question.number} 题
                  </span>
                  <span className="search-result-topic">{question.topic}</span>
                </div>
                <p>
                  {parts.map((part, i) =>
                    part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>,
                  )}
                </p>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="search-empty">
          <p>没有找到「{query}」相关的题目</p>
          <span>试试更短的关键词，或只输入考点名称。</span>
        </div>
      )}

      <div className="search-foot">
        <span>
          <ArrowRight size={13} /> 点击进入题目
        </span>
        <span>
          <CornerDownLeft size={13} /> 回车打开
        </span>
        <span>共 {questions.length} 道真题</span>
      </div>
    </Modal>
  )
}
