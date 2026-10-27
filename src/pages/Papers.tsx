import { motion } from 'motion/react'
import { ArrowRight, Clock3, FileText } from 'lucide-react'
import { Button, ProgressBar } from '../components/ui/primitives'
import { TYPE_META, getYears } from '../lib/data'
import { paperObjectiveTotal } from '../lib/stats'
import { daysToExam, pct } from '../lib/utils'
import { useStudy } from '../store/StudyProvider'

export function Papers() {
  const { questions, progress, stats } = useStudy()
  const years = getYears(questions)
  const exam = daysToExam()
  const results = Object.values(progress.papers)
  const attempted = results.length
  const average = attempted ? results.reduce((sum, r) => sum + r.best, 0) / attempted : null
  const best = attempted ? Math.max(...results.map((r) => r.best)) : null
  const draftYear = progress.examDraft?.year

  return (
    <div className="page papers-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            PAPERS · 20 套年份卷
          </span>
          <h1>整卷模考</h1>
          <p className="page-sub">
            按年份还原一张完整试卷，计时作答，交卷后统一判分。分析题不自动计分，可对照参考要点自评。
          </p>
        </div>
        <div className="page-head-aside">
          <div className="countdown-chip">
            <span>{exam.label}</span>
            <strong>{exam.days}</strong>
            <em>天</em>
          </div>
        </div>
      </header>

      <section className="paper-stats" aria-label="模考概况">
        <div className="paper-stat">
          <span className="stat-label">已完成试卷</span>
          <strong>{attempted}<em>/ 20</em></strong>
          <span className="stat-note">交卷即记录成绩</span>
        </div>
        <div className="paper-stat">
          <span className="stat-label">平均客观分</span>
          <strong>{average === null ? '—' : average.toFixed(1)}<em>/ 50</em></strong>
          <span className="stat-note">按最好成绩计算</span>
        </div>
        <div className="paper-stat">
          <span className="stat-label">最高客观分</span>
          <strong>{best === null ? '—' : best}<em>/ 50</em></strong>
          <span className="stat-note">
            {stats.accuracy === null ? '完成一套后生成' : `全库正确率 ${pct(stats.accuracy)}`}
          </span>
        </div>
        <div className="paper-stat is-note">
          <span className="stat-label">计分说明</span>
          <p>单选 16 × 1 分，多选 17 × 2 分，客观题满分 50 分。</p>
          <span className="stat-note">多选题少选、错选均不得分</span>
        </div>
      </section>

      <section className="paper-grid" aria-label="年份试卷">
        {years.map((year, index) => {
          const paperQuestions = questions.filter((q) => q.year === year)
          const total = paperQuestions.length
          const practiced = paperQuestions.filter((q) => progress.records[q.id]).length
          const result = progress.papers[String(year)]
          const objective = paperObjectiveTotal(questions, year)
          const isDraft = draftYear === year
          const status = isDraft ? '进行中' : result ? '已完成' : '未开始'
          return (
            <motion.a
              key={year}
              className={`paper-card${isDraft ? ' is-draft' : ''}`}
              href={`#/papers/${year}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: Math.min(index * 0.025, 0.35), ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="paper-card-top">
                <span className="paper-year">{year}</span>
                <span className={`paper-status is-${isDraft ? 'draft' : result ? 'done' : 'new'}`}>
                  {status}
                </span>
              </div>
              <div className="paper-card-meta">
                <span>
                  <FileText size={13} aria-hidden="true" /> {total} 题
                </span>
                <span>{objective} 分客观题</span>
                <span>5 道分析题</span>
                {result ? <span>已模考 {result.attempts} 次</span> : null}
              </div>
              <div className="paper-card-progress">
                <ProgressBar value={total ? practiced / total : 0} />
                <span>{practiced}/{total}</span>
              </div>
              <div className="paper-card-foot">
                <span className="paper-score">
                  {result ? (
                    <>
                      最高 <strong>{result.best}</strong>
                      <em>/ {objective}</em>
                    </>
                  ) : (
                    <em>尚未模考</em>
                  )}
                </span>
                <span className="paper-go">
                  {isDraft ? '继续' : result ? '再练一次' : '开始'}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </motion.a>
          )
        })}
      </section>

      <div className="papers-note">
        <Clock3 size={16} aria-hidden="true" />
        <p>
          建议按考试时间限时 180 分钟完成一套。中途离开会自动保存作答，回到本页点击“继续”即可接着做。
          交卷后，客观题立即判分，分析题展示参考要点供自评。
        </p>
      </div>

      <div className="papers-footnote">
        <span>{TYPE_META.single.label} 16 题 · {TYPE_META.multiple.label} 17 题 · {TYPE_META.analysis.label} 5 题</span>
        <Button variant="ghost" size="sm" onClick={() => (window.location.hash = '#/practice?view=wrong')}>
          先去错题本
        </Button>
      </div>
    </div>
  )
}
