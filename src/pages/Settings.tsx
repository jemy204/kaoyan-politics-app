import { useRef, useState } from 'react'
import {
  Database,
  Download,
  Keyboard,
  Monitor,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from 'lucide-react'
import { ShortcutsDialog } from '../components/overlays/ShortcutsDialog'
import { Button, Modal, Segmented, Toggle } from '../components/ui/primitives'
import { TYPE_META } from '../lib/data'
import type { ThemeMode } from '../lib/types'
import { useStudy } from '../store/StudyProvider'

const THEMES: Array<{
  value: ThemeMode
  label: string
  desc: string
  icon: typeof Sun
  bg: string
  surface: string
  ink: string
  accent: string
}> = [
  {
    value: 'light',
    label: '亮色',
    desc: '暖纸底，适合白天',
    icon: Sun,
    bg: '#f5f2ea',
    surface: '#fcfaf5',
    ink: '#1b1916',
    accent: '#b8402a',
  },
  {
    value: 'dark',
    label: '暗色',
    desc: '墨黑底，适合夜间',
    icon: Moon,
    bg: '#101215',
    surface: '#171a1f',
    ink: '#ede7dc',
    accent: '#e07a5f',
  },
  {
    value: 'system',
    label: '跟随系统',
    desc: '随设备自动切换',
    icon: Monitor,
    bg: '#e9e4d8',
    surface: '#f7f4ec',
    ink: '#1b1916',
    accent: '#b8402a',
  },
]

export function Settings() {
  const {
    questions,
    progress,
    settings,
    setTheme,
    setFontSize,
    setMotion,
    exportBackup,
    importBackup,
    resetProgress,
  } = useStudy()
  const fileRef = useRef<HTMLInputElement>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const recordCount = Object.keys(progress.records).length
  const paperCount = Object.keys(progress.papers).length

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            SETTINGS · 让阅读更舒服
          </span>
          <h1>设置</h1>
          <p className="page-sub">外观、阅读偏好与本地数据。所有记录只保存在这台设备的浏览器里。</p>
        </div>
      </header>

      <div className="settings-layout">
        <section className="settings-section" aria-labelledby="appearance-title">
          <header>
            <span className="panel-label">APPEARANCE</span>
            <h2 id="appearance-title">外观</h2>
            <p>主题会立即生效，并记住你的选择。</p>
          </header>
          <div className="theme-grid">
            {THEMES.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  className={`theme-card${settings.theme === item.value ? ' is-active' : ''}`}
                  aria-pressed={settings.theme === item.value}
                  onClick={() => setTheme(item.value)}
                >
                  <span
                    className="theme-swatch"
                    style={{ background: item.bg, borderColor: item.ink }}
                  >
                    <span className="swatch-side" style={{ background: item.surface }} />
                    <span className="swatch-main">
                      <span className="swatch-line" style={{ background: item.ink }} />
                      <span className="swatch-line is-short" style={{ background: item.ink }} />
                      <span className="swatch-pill" style={{ background: item.accent }} />
                    </span>
                  </span>
                  <span className="theme-copy">
                    <span>
                      <Icon size={15} /> {item.label}
                    </span>
                    <em>{item.desc}</em>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="reading-title">
          <header>
            <span className="panel-label">READING</span>
            <h2 id="reading-title">阅读</h2>
            <p>题干字号与动效，按自己的习惯来。</p>
          </header>
          <div className="setting-row">
            <div>
              <strong>题干字号</strong>
              <span>舒适模式行高更松，适合长时间阅读。</span>
            </div>
            <Segmented
              value={settings.fontSize}
              onChange={setFontSize}
              ariaLabel="题干字号"
              options={[
                { value: 'comfortable', label: '舒适' },
                { value: 'compact', label: '紧凑' },
              ]}
            />
          </div>
          <div className="setting-row">
            <div>
              <strong>界面动效</strong>
              <span>关闭后减少入场与位移动画。</span>
            </div>
            <Toggle checked={settings.motion} onChange={setMotion} label="界面动效" />
          </div>
          <div className="setting-row">
            <div>
              <strong>键盘快捷键</strong>
              <span>用键盘完成选择、提交与切题。</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShortcutsOpen(true)} leading={<Keyboard size={14} />}>
              查看键位
            </Button>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="data-title">
          <header>
            <span className="panel-label">DATA</span>
            <h2 id="data-title">学习数据</h2>
            <p>换设备或清理浏览器前，先导出一份 JSON 备份。</p>
          </header>
          <div className="data-summary">
            <div>
              <span>作答记录</span>
              <strong>{recordCount}</strong>
            </div>
            <div>
              <span>收藏题目</span>
              <strong>{progress.favorites.length}</strong>
            </div>
            <div>
              <span>笔记</span>
              <strong>{Object.values(progress.notes).filter((n) => n.trim()).length}</strong>
            </div>
            <div>
              <span>整卷成绩</span>
              <strong>{paperCount}</strong>
            </div>
          </div>
          <div className="data-actions">
            <Button variant="primary" onClick={exportBackup} leading={<Download size={15} />}>
              导出备份
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              leading={<Upload size={15} />}
            >
              导入备份
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (file) await importBackup(file)
                event.target.value = ''
              }}
            />
            <Button
              variant="danger"
              onClick={() => setResetOpen(true)}
              leading={<RotateCcw size={15} />}
            >
              清空记录
            </Button>
          </div>
          <p className="data-note">
            导入会按题目 ID 合并记录，较新的作答优先；不会覆盖题库本身。
          </p>
        </section>

        <section className="settings-section" aria-labelledby="bank-title">
          <header>
            <span className="panel-label">QUESTION BANK</span>
            <h2 id="bank-title">题库与来源</h2>
          </header>
          <div className="bank-summary">
            <Database size={20} aria-hidden="true" />
            <div>
              <strong>{questions.length} 道真题 · 2007—2026</strong>
              <p>
                {TYPE_META.single.label}、{TYPE_META.multiple.label}与{TYPE_META.analysis.label}
                按学科、专题、年份整理。题干与选项依据公开试卷转录，解析与学习提示为整理内容，不是官方评分细则。
              </p>
            </div>
          </div>
          <details className="bank-details">
            <summary>使用与免责声明</summary>
            <ul>
              <li>历史真题保留考试当年的时政与表述语境，复习时请结合现行考纲。</li>
              <li>选择题答案以公开参考答案为准；选项顺序以本题库题干为准。</li>
              <li>分析题提供参考作答要点，通过自评记录掌握程度，不计入客观题正确率。</li>
              <li>答案暂缺的题目明确标注，不自动判分，也不计入错题。</li>
              <li>题库用于个人学习，不构成任何考试承诺。</li>
            </ul>
          </details>
          <div className="bank-source">
            <span>原始题库项目</span>
            <a href="https://github.com/Nishino0525Nanase/kaoyan-politics" target="_blank" rel="noreferrer">
              Nishino0525Nanase/kaoyan-politics ↗
            </a>
          </div>
        </section>

        <section className="settings-section about-section" aria-labelledby="about-title">
          <div>
            <span className="panel-label">ABOUT</span>
            <h2 id="about-title">研政 POLIS</h2>
            <p>一套安静、专注的考研政治真题练习系统。数据在本地，节奏由你定。</p>
          </div>
          <div className="about-meta">
            <span>版本 1.0.0</span>
            <span>React 19 · Vite</span>
            <span>数据本地</span>
          </div>
        </section>
      </div>

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="清空全部学习记录？"
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetProgress()
                setResetOpen(false)
              }}
            >
              确认清空
            </Button>
          </div>
        }
      >
        <div className="confirm-body">
          <p>
            将删除 <strong>{recordCount}</strong> 条作答记录、{progress.favorites.length} 道收藏、
            {Object.values(progress.notes).filter((n) => n.trim()).length} 条笔记和 {paperCount} 套模考成绩。
          </p>
          <p className="confirm-note">此操作不可撤销。建议先导出备份。</p>
        </div>
      </Modal>
    </div>
  )
}
