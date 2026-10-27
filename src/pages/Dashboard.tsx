import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Flame,
  History,
  RotateCcw,
  Sparkles,
  Star,
  Target,
} from 'lucide-react'
import { Heatmap } from '../components/charts/Charts'
import { Button, ProgressBar, Ring } from '../components/ui/primitives'
import { SUBJECT_META, TYPE_META } from '../lib/data'
import { cn } from '../lib/utils'
import type { Question } from '../lib/types'
import {
  daysToExam,
  formatDateCN,
  greeting,
  navigate,
  pct,
  relativeTime,
} from '../lib/utils'
import { useStudy } from '../store/StudyProvider'

function pickStart(questions: Question[], lastId: string | null): Question | undefined {
  if (lastId) {
    const last = questions.find((q) => q.id === lastId)
    if (last) return last
  }
  return [...questions].sort((a, b) => b.year - a.year || a.number - b.number)[0]
}

export function Dashboard() {
  const { questions, stats, progress } = useStudy()
  const start = pickStart(questions, progress.lastQuestionId)
  const overall = stats.total ? stats.practiced / stats.total : 0
  const exam = daysToExam()
  const todayLeft = Math.max(0, 3 - stats.todayCount)
  const recent = Object.entries(progress.records)
    .sort((a, b) => (b[1].at || '').localeCompare(a[1].at || ''))
    .slice(0, 3)
    .map(([id, record]) => ({ question: questions.find((q) => q.id === id), record }))
    .filter((item): item is { question: Question; record: typeof item.record } => Boolean(item.question))

  const headline =
    stats.practiced === 0
      ? '从第一道真题开始。'
      : stats.todayCount >= 3
        ? '今天的节奏接上了。'
        : `再练${todayLeft === 1 ? '一' : todayLeft === 2 ? '两' : '三'}题。`

  return (
    <div className="page dashboard">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            {formatDateCN()}
          </span>
          <h1>
            {greeting()}，<span className="headline-accent">{headline}</span>
          </h1>
          <p className="page-sub">
            {stats.practiced
              ? `已练 ${stats.practiced} 道，客观题正确率 ${pct(stats.accuracy)}。${
                  stats.wrong ? `还有 ${stats.wrong} 道题等着回看。` : '保持这个节奏。'
                }`
              : '2007—2026 年 760 道真题，按学科、专题与年份整理。先从一道开始。'}
          </p>
        </div>
        <div className="page-head-aside">
          <div className="countdown-chip">
            <span>{exam.label}</span>
            <strong>{exam.days}</strong>
            <em>天</em>
          </div>
          <button type="button" className="quiet-link" onClick={() => navigate('/insights')}>
            查看学情 <ArrowUpRight size={14} />
          </button>
        </div>
      </header>

      <section className="hero" aria-label="继续练习">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="live-dot is-light" aria-hidden="true" />
            {progress.lastQuestionId ? '继续上次' : '开始今天'}
          </span>
          <h2>
            {start
              ? progress.lastQuestionId
                ? '接着上次停下的地方，读完这一题。'
                : '第一次来，就从最近一年的真题开始。'
              : '题库正在载入'}
          </h2>
          {start ? (
            <div className="hero-meta">
              <span className="hero-year">{start.year}</span>
              <span>
                {start.subjectKey} · {start.topic}
              </span>
              <span className="hero-type">{TYPE_META[start.type].short}</span>
            </div>
          ) : null}
          <div className="hero-actions">
            <Button
              variant="primary"
              size="lg"
              disabled={!start}
              onClick={() => start && navigate(`/practice?q=${start.id}`)}
              trailing={<ArrowRight size={16} />}
            >
              {progress.lastQuestionId ? '继续这道题' : '开始第一题'}
            </Button>
            <button
              type="button"
              className="hero-secondary"
              onClick={() => navigate('/practice?random=1')}
            >
              随机抽一题
            </button>
          </div>
          <div className="hero-foot">
            <span>{stats.todayCount ? `今天已完成 ${stats.todayCount} 题` : '今天还没有开始'}</span>
            <span className="hero-foot-divider" aria-hidden="true" />
            <span>{exam.days} 天后初试</span>
          </div>
        </div>
        <div className="hero-ring">
          <Ring value={overall} size={158} stroke={10} tone="paper">
            <strong>{Math.round(overall * 100)}%</strong>
            <span>题库进度</span>
          </Ring>
          <p>
            已练 {stats.practiced} <span>/ {stats.total}</span>
          </p>
        </div>
      </section>

      <section className="stat-grid" aria-label="学习数据">
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">已练题目</span>
            <BookOpen size={16} aria-hidden="true" />
          </div>
          <div className="stat-value">
            {stats.practiced}
            <span className="stat-unit">/ {stats.total}</span>
          </div>
          <ProgressBar value={overall} className="stat-bar" />
          <span className="stat-note">题库已走过 {Math.round(overall * 100)}%</span>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">客观题正确率</span>
            <Target size={16} aria-hidden="true" />
          </div>
          <div className="stat-value">
            {stats.accuracy === null ? '—' : Math.round(stats.accuracy * 100)}
            <span className="stat-unit">{stats.accuracy === null ? '' : '%'}</span>
          </div>
          <ProgressBar value={stats.accuracy ?? 0} tone="jade" className="stat-bar" />
          <span className="stat-note">{stats.graded ? `${stats.graded} 道已判分 · ${stats.correct} 道答对` : '提交答案后开始统计'}</span>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">连续练习</span>
            <Flame size={16} aria-hidden="true" />
          </div>
          <div className="stat-value">
            {stats.streak}
            <span className="stat-unit">天</span>
          </div>
          <ProgressBar value={Math.min(1, stats.streak / 14)} className="stat-bar" />
          <span className="stat-note">本周共完成 {stats.weekCount} 题</span>
        </article>
        <button type="button" className="stat-card is-action" onClick={() => navigate('/mistakes')}>
          <div className="stat-top">
            <span className="stat-label">待巩固</span>
            <RotateCcw size={16} aria-hidden="true" />
          </div>
          <div className="stat-value">
            {stats.wrong}
            <span className="stat-unit">题</span>
          </div>
          <ProgressBar value={stats.practiced ? stats.wrong / stats.practiced : 0} className="stat-bar" />
          <span className="stat-note">
            去错题本复习 <ArrowRight size={12} />
          </span>
        </button>
      </section>

      <div className="dash-grid">
        <section className="panel subject-panel" aria-label="学科进度">
          <header className="panel-head">
            <div>
              <span className="panel-label">SUBJECTS</span>
              <h2>学科进度</h2>
            </div>
            <span className="panel-meta">按学科继续</span>
          </header>
          <div className="subject-list">
            {SUBJECT_META.filter((subject) => stats.subjects.some((s) => s.key === subject.key)).map(
              (subject) => {
                const data = stats.subjects.find((s) => s.key === subject.key)
                if (!data) return null
                const ratio = data.total ? data.practiced / data.total : 0
                return (
                  <a
                    key={subject.key}
                    className="subject-row"
                    href={`#/practice?subject=${encodeURIComponent(subject.key)}`}
                  >
                    <span
                      className="subject-symbol"
                      style={{ color: subject.color, borderColor: `color-mix(in srgb, ${subject.color} 35%, transparent)` }}
                    >
                      {subject.initial}
                    </span>
                    <span className="subject-name">
                      <strong>{subject.short}</strong>
                      <em>{data.practiced} / {data.total} 题</em>
                    </span>
                    <span className="subject-bar">
                      <i style={{ width: `${ratio * 100}%`, background: subject.color }} />
                    </span>
                    <span className="subject-accuracy">
                      {data.accuracy === null ? '—' : `${Math.round(data.accuracy * 100)}%`}
                      <em>正确率</em>
                    </span>
                    <ChevronRight size={15} className="subject-arrow" aria-hidden="true" />
                  </a>
                )
              },
            )}
          </div>
        </section>

        <div className="dash-side">
          <section className="panel heatmap-panel" aria-label="练习热力图">
            <header className="panel-head">
              <div>
                <span className="panel-label">RHYTHM</span>
                <h2>练习节奏</h2>
              </div>
              <span className="panel-meta">近 12 周</span>
            </header>
            <Heatmap activity={progress.activity} weeks={12} />
          </section>

          <section className="panel recent-panel" aria-label="最近练习">
            <header className="panel-head">
              <div>
                <span className="panel-label">RECENT</span>
                <h2>最近练习</h2>
              </div>
              <span className="panel-meta">
                <History size={12} aria-hidden="true" /> 继续回看
              </span>
            </header>
            {recent.length ? (
              <div className="recent-list">
                {recent.map(({ question, record }) => (
                  <a key={question.id} className="recent-row" href={`#/practice?q=${question.id}`}>
                    <span
                      className={cn(
                        'recent-dot',
                        record.correct === true && 'is-correct',
                        record.correct === false && 'is-wrong',
                      )}
                      aria-hidden="true"
                    />
                    <span className="recent-main">
                      <strong>
                        {question.year} · 第 {question.number} 题
                      </strong>
                      <em>{question.topic}</em>
                    </span>
                    <span className="recent-time">{relativeTime(record.at)}</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="recent-empty">完成第一道题后，这里会留下最近的练习轨迹。</p>
            )}
          </section>

          <section className="quick-links" aria-label="快捷入口">
            <a href="#/collection" className="quick-link">
              <span className="quick-icon">
                <Star size={16} />
              </span>
              <span>
                <strong>收藏夹</strong>
                <em>{stats.favorites} 道收藏</em>
              </span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <a href="#/insights" className="quick-link">
              <span className="quick-icon">
                <Target size={16} />
              </span>
              <span>
                <strong>学情分析</strong>
                <em>{stats.topics.length ? `${stats.topics.filter((t) => t.accuracy < 0.6).length} 个薄弱考点` : '练习后生成报告'}</em>
              </span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </section>
        </div>
      </div>

      <section className="train-band" aria-label="今日训练">
        <span className="train-mark" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <div className="train-copy">
          <span className="panel-label">TODAY&apos;S SET</span>
          <h3>20 道题，专挑你最容易忘的。</h3>
          <p>优先安排错题与未练题目，再混合薄弱学科。做完可以立刻看解析。</p>
        </div>
        <div className="train-side">
          <span className="train-chip">约 15 分钟</span>
          <Button variant="primary" onClick={() => navigate('/practice?smart=1')} trailing={<ArrowRight size={15} />}>
            开始训练
          </Button>
        </div>
      </section>
    </div>
  )
}
