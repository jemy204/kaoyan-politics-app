import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Question } from '../../lib/types'
import { cn } from '../../lib/utils'
import { Button, Ring } from '../ui/primitives'

export type NavStatus = 'current' | 'correct' | 'wrong' | 'answered' | 'todo'

export function Navigator({
  questions,
  currentIndex,
  answered,
  statusFor,
  onJump,
  onPrev,
  onNext,
  label = '答题卡',
  countLabel = '已答',
  note,
  exam = false,
}: {
  questions: Question[]
  currentIndex: number
  answered: number
  statusFor: (question: Question, index: number) => NavStatus
  onJump: (index: number) => void
  onPrev: () => void
  onNext: () => void
  label?: string
  countLabel?: string
  note?: string
  exam?: boolean
}) {
  const total = questions.length
  return (
    <aside className="navigator" aria-label={label}>
      <div className="navigator-head">
        <div>
          <span className="panel-label">{label}</span>
          <strong>
            {countLabel} {answered} <span>/ {total}</span>
          </strong>
        </div>
        <Ring value={total ? answered / total : 0} size={54} stroke={5}>
          <span className="ring-mini-value">{total ? Math.round((answered / total) * 100) : 0}%</span>
        </Ring>
      </div>

      <div className="navigator-grid">
        {questions.map((question, index) => {
          const status = statusFor(question, index)
          return (
            <button
              key={question.id}
              type="button"
              className={cn('nav-cell', `is-${status}`)}
              onClick={() => onJump(index)}
              aria-label={`第 ${index + 1} 题，${question.year} 年第 ${question.number} 题`}
              aria-current={index === currentIndex ? 'true' : undefined}
              title={`${question.year} · 第 ${question.number} 题`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      {note ? <p className="navigator-note">{note}</p> : null}
      <div className="navigator-legend">
        <span>
          <i className="legend-dot is-current" /> 当前
        </span>
        {exam ? (
          <span>
            <i className="legend-dot is-answered" /> 已答
          </span>
        ) : (
          <>
            <span>
              <i className="legend-dot is-correct" /> 答对
            </span>
            <span>
              <i className="legend-dot is-wrong" /> 答错
            </span>
          </>
        )}
        <span>
          <i className="legend-dot is-todo" /> 未做
        </span>
      </div>

      <div className="navigator-actions">
        <Button
          size="sm"
          variant="secondary"
          onClick={onPrev}
          disabled={currentIndex <= 0}
          leading={<ChevronLeft size={15} />}
        >
          上一题
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onNext}
          disabled={currentIndex >= total - 1}
          trailing={<ChevronRight size={15} />}
        >
          下一题
        </Button>
      </div>

      <p className="navigator-tip">
        <kbd>←</kbd> <kbd>→</kbd> 切题 · <kbd>1</kbd>—<kbd>4</kbd> 选择 · <kbd>Enter</kbd> 提交
      </p>
    </aside>
  )
}
