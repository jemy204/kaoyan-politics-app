import { ArrowUpRight, BarChart3, Target, TrendingDown } from 'lucide-react'
import { DonutStat, Heatmap, TrendChart } from '../components/charts/Charts'
import { Button, ProgressBar } from '../components/ui/primitives'
import { SUBJECT_MAP, TYPE_META } from '../lib/data'
import { navigate, pct } from '../lib/utils'
import { useStudy } from '../store/StudyProvider'

export function Insights() {
  const { stats, progress } = useStudy()
  const weakTopics = stats.topics.filter((t) => t.graded > 0).slice(0, 8)
  const hasData = stats.graded > 0
  const typeAccuracy = stats.types.filter((t) => t.type !== 'analysis')
  const analysisType = stats.types.find((t) => t.type === 'analysis')

  return (
    <div className="page insights-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            INSIGHTS · 用数据看清下一步
          </span>
          <h1>学情分析</h1>
          <p className="page-sub">正确率只是结果。真正有用的是：哪个学科在拖后腿，哪个考点反复错。</p>
        </div>
        <div className="page-head-aside">
          <Button variant="primary" onClick={() => (window.location.hash = '#/practice?smart=1')}>
            针对薄弱点训练
          </Button>
        </div>
      </header>

      <section className="insight-stats" aria-label="学习概况">
        <div>
          <span className="stat-label">已练题目</span>
          <strong>{stats.practiced}<em>/ {stats.total}</em></strong>
          <span className="stat-note">题库覆盖 {Math.round((stats.practiced / Math.max(1, stats.total)) * 100)}%</span>
        </div>
        <div>
          <span className="stat-label">客观题正确率</span>
          <strong>{pct(stats.accuracy)}</strong>
          <span className="stat-note">{stats.graded} 道已判分</span>
        </div>
        <div>
          <span className="stat-label">待巩固错题</span>
          <strong>{stats.wrong}</strong>
          <span className="stat-note">连续答对两次移出</span>
        </div>
        <div>
          <span className="stat-label">本周练习</span>
          <strong>{stats.weekCount}<em>题</em></strong>
          <span className="stat-note">连续 {stats.streak} 天</span>
        </div>
      </section>

      {!hasData ? (
        <div className="insight-empty-banner">
          <BarChart3 size={20} aria-hidden="true" />
          <div>
            <strong>先完成几道题，报告才有意义。</strong>
            <p>答完 5 道客观题后，这里会显示学科正确率、薄弱考点与年份趋势。</p>
          </div>
          <Button variant="secondary" onClick={() => (window.location.hash = '#/practice')}>
            去刷题
          </Button>
        </div>
      ) : null}

      <div className="insight-grid">
        <section className="panel subject-accuracy-panel" aria-label="学科正确率">
          <header className="panel-head">
            <div>
              <span className="panel-label">BY SUBJECT</span>
              <h2>学科正确率</h2>
            </div>
            <span className="panel-meta">低于 60% 需要重点补</span>
          </header>
          <div className="accuracy-list">
            {stats.subjects.map((subject) => {
              const meta = SUBJECT_MAP[subject.key]
              return (
                <a
                  key={subject.key}
                  className="accuracy-row"
                  href={`#/practice?subject=${encodeURIComponent(subject.key)}`}
                >
                  <span className="accuracy-name">
                    <i style={{ background: meta.color }} />
                    {meta.short}
                  </span>
                  <span className="accuracy-bar">
                    <i
                      style={{
                        width: `${(subject.accuracy ?? 0) * 100}%`,
                        background: meta.color,
                      }}
                    />
                  </span>
                  <span className="accuracy-value">
                    <strong>{pct(subject.accuracy)}</strong>
                    <em>{subject.graded} 题已判</em>
                  </span>
                  <ArrowUpRight size={14} className="accuracy-arrow" aria-hidden="true" />
                </a>
              )
            })}
          </div>
          <p className="panel-foot">
            正确率只统计单选与多选；分析题采用自评，不计入这里。
          </p>
        </section>

        <section className="panel type-panel" aria-label="题型表现">
          <header className="panel-head">
            <div>
              <span className="panel-label">BY TYPE</span>
              <h2>题型表现</h2>
            </div>
          </header>
          <div className="type-donuts">
            {typeAccuracy.map((type) => (
              <DonutStat
                key={type.type}
                value={type.accuracy}
                label={TYPE_META[type.type].label}
                caption={type.graded ? `${type.correct} / ${type.graded} 题答对` : '还没有作答'}
                tone={type.accuracy !== null && type.accuracy >= 0.7 ? 'jade' : 'accent'}
              />
            ))}
            {analysisType ? (
              <DonutStat
                value={null}
                label="分析题"
                caption={analysisType.practiced ? `${analysisType.practiced} 道已作答 · 自评` : '还没有作答'}
                tone="accent"
              />
            ) : null}
          </div>
          <div className="type-note">
            <Target size={15} aria-hidden="true" />
            <p>
              多选题的失分通常来自“少选”。不确定时，先排除明显错误的选项，再判断剩余项。
            </p>
          </div>
        </section>

        <section className="panel trend-panel" aria-label="年份正确率趋势">
          <header className="panel-head">
            <div>
              <span className="panel-label">OVER TIME</span>
              <h2>年份正确率</h2>
            </div>
            <span className="panel-meta">按作答年份统计</span>
          </header>
          <TrendChart years={stats.years} />
        </section>

        <section className="panel weak-panel" aria-label="薄弱考点">
          <header className="panel-head">
            <div>
              <span className="panel-label">WEAK POINTS</span>
              <h2>薄弱考点</h2>
            </div>
            <span className="panel-meta">错误率从高到低</span>
          </header>
          {weakTopics.length ? (
            <div className="weak-list">
              {weakTopics.map((topic, index) => (
                <a
                  key={`${topic.subjectKey}-${topic.topic}`}
                  className="weak-row"
                  href={`#/practice?subject=${encodeURIComponent(topic.subjectKey)}&topic=${encodeURIComponent(topic.topic)}`}
                >
                  <span className="weak-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="weak-main">
                    <strong>{topic.topic}</strong>
                    <em>
                      {SUBJECT_MAP[topic.subjectKey].short} · {topic.wrong} 道错题 / {topic.graded} 道已练
                    </em>
                  </span>
                  <span className="weak-bar">
                    <i style={{ width: `${(1 - topic.accuracy) * 100}%` }} />
                  </span>
                  <span className="weak-rate">{Math.round((1 - topic.accuracy) * 100)}%</span>
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : (
            <div className="chart-empty weak-empty">
              <TrendingDown size={22} aria-hidden="true" />
              <p>再练几道题，就能定位反复出错的考点了。</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/practice?smart=1')}
                trailing={<ArrowUpRight size={13} />}
              >
                先做 20 道智能训练
              </Button>
            </div>
          )}
          {weakTopics.length ? (
            <div className="weak-advice">
              <div>
                <span className="panel-label">NEXT STEP</span>
                <p>
                  先攻「{weakTopics[0].topic}」，把错误率最高的考点变成得分点。
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigate(
                    `/practice?subject=${encodeURIComponent(weakTopics[0].subjectKey)}&topic=${encodeURIComponent(weakTopics[0].topic)}`,
                  )
                }
                trailing={<ArrowUpRight size={13} />}
              >
                去练这个考点
              </Button>
            </div>
          ) : null}
        </section>

        <section className="panel heatmap-panel insights-heatmap" aria-label="练习热力图">
          <header className="panel-head">
            <div>
              <span className="panel-label">CONSISTENCY</span>
              <h2>练习节奏</h2>
            </div>
            <span className="panel-meta">近 12 周</span>
          </header>
          <Heatmap activity={progress.activity} weeks={12} />
          <div className="consistency-note">
            <strong>{stats.streak} 天</strong>
            <span>当前连续练习</span>
            <ProgressBar value={Math.min(1, stats.streak / 14)} />
            <em>目标：连续 14 天</em>
          </div>
        </section>
      </div>
    </div>
  )
}
