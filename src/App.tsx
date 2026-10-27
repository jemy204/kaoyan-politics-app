import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, RefreshCw } from 'lucide-react'
import { SearchDialog } from './components/overlays/SearchDialog'
import { ShortcutsDialog } from './components/overlays/ShortcutsDialog'
import { Brand, MobileNav, Sidebar, Topbar, pageMeta } from './components/shell/Shell'
import { Button } from './components/ui/primitives'
import { useHashRoute } from './hooks/useHashRoute'
import { Collection } from './pages/Collection'
import { Dashboard } from './pages/Dashboard'
import { Insights } from './pages/Insights'
import { Mistakes } from './pages/Mistakes'
import { PaperSession } from './pages/PaperSession'
import { Papers } from './pages/Papers'
import { Practice } from './pages/Practice'
import { Settings } from './pages/Settings'
import { StudyProvider, useStudy } from './store/StudyProvider'

function BootScreen({ error }: { error?: string | null }) {
  return (
    <div className="boot-screen">
      <Brand />
      {error ? (
        <>
          <p className="boot-title">题库没有载入成功</p>
          <p className="boot-sub">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()} leading={<RefreshCw size={15} />}>
            重新载入
          </Button>
        </>
      ) : (
        <>
          <p className="boot-title">正在载入 760 道真题</p>
          <p className="boot-sub">按学科、专题与年份整理</p>
          <span className="boot-bar" aria-hidden="true">
            <i />
          </span>
        </>
      )}
    </div>
  )
}

function Toast() {
  const { toast } = useStudy()
  return (
    <div className="toast-layer" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.2 }}
          >
            <span className="toast-mark">
              <Check size={13} />
            </span>
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function Workspace() {
  const { questions, loading, error } = useStudy()
  const { path, params } = useHashRoute()
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const active = path[0] || ''

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        return
      }
      if (event.key === '?' && !typing) {
        event.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = `${pageMeta(path).label} · 研政 POLIS`
  }, [path.join('/'), params.toString()])

  if (loading || error) return <BootScreen error={error} />

  let page = <Dashboard />
  let key = 'dashboard'
  if (path[0] === 'practice') {
    page = <Practice params={params} />
    key = 'practice'
  } else if (path[0] === 'papers' && path[1]) {
    page = <PaperSession year={Number(path[1])} />
    key = `paper-${path[1]}`
  } else if (path[0] === 'papers') {
    page = <Papers />
    key = 'papers'
  } else if (path[0] === 'mistakes') {
    page = <Mistakes />
    key = 'mistakes'
  } else if (path[0] === 'collection') {
    page = <Collection />
    key = 'collection'
  } else if (path[0] === 'insights') {
    page = <Insights />
    key = 'insights'
  } else if (path[0] === 'settings') {
    page = <Settings />
    key = 'settings'
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} />
      <div className="app-main">
        <Topbar path={path} onSearch={() => setSearchOpen(true)} />
        <main className="app-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {page}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="site-footer">
          <span>
            <strong>研政 POLIS</strong> · 一题一得，稳步向前
          </span>
          <span>真题用于个人学习 · 答案与解析以原始来源为准</span>
        </footer>
      </div>
      <MobileNav active={active} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} questions={questions} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toast />
    </div>
  )
}

export function App() {
  return (
    <StudyProvider>
      <Workspace />
    </StudyProvider>
  )
}
