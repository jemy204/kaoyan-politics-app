import { Modal } from '../ui/primitives'

const GROUPS = [
  {
    title: '刷题',
    items: [
      ['A / B / C / D', '选择选项'],
      ['1 / 2 / 3 / 4', '选择第 1—4 项'],
      ['Enter', '提交答案 / 下一题'],
      ['← / →', '上一题 / 下一题'],
    ],
  },
  {
    title: '通用',
    items: [
      ['S', '收藏当前题目'],
      ['⌘K / Ctrl K', '打开搜索'],
      ['?', '打开快捷键面板'],
      ['Esc', '关闭浮层'],
    ],
  },
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="键盘快捷键"
      description="不用离开键盘，也能完成一次练习。"
      size="sm"
    >
      <div className="shortcut-groups">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3>{group.title}</h3>
            <dl>
              {group.items.map(([keys, label]) => (
                <div key={keys}>
                  <dt>{label}</dt>
                  <dd>
                    {keys.split(' / ').map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
