'use client'
import { useState } from 'react'
import { FolderIcon, Squares2X2Icon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

type View = 'dashboard' | 'uploads' | 'chartsHistory'

export default function Sidebar({ active, onSelect }: { active: View; onSelect: (v: View) => void }) {
  const [openFolders, setOpenFolders] = useState(false)

  const buttonCls = (isActive: boolean) => `w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer ${isActive ? 'bg-[var(--primary)] text-white' : ''}`
  const buttonStyle = (isActive: boolean) => isActive ? {} : ({ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--text)' } as const)

  return (
    <aside className="space-y-3" aria-label="Sidebar">
      <div className="rounded-2xl border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <button className={buttonCls(active === 'dashboard')} style={buttonStyle(active === 'dashboard')} onClick={() => onSelect('dashboard')}>
          <Squares2X2Icon className="w-5 h-5" />
          Dashboard
        </button>
        <div className="mt-2">
          <button onClick={() => setOpenFolders(s => !s)}
                  className={buttonCls(active === 'uploads' || active === 'chartsHistory')} style={buttonStyle(active === 'uploads' || active === 'chartsHistory')}>
            <span className="flex items-center gap-2"><FolderIcon className="w-5 h-5" /> Folders</span>
            {openFolders ? <ChevronDownIcon className="w-4 h-4 ml-auto"/> : <ChevronRightIcon className="w-4 h-4 ml-auto"/>}
          </button>
          {openFolders && (
            <div className="mt-2 ml-2 space-y-2">
              <button className={buttonCls(active === 'uploads')} style={buttonStyle(active === 'uploads')} onClick={() => onSelect('uploads')}>Recent Uploads</button>
              <button className={buttonCls(active === 'chartsHistory')} style={buttonStyle(active === 'chartsHistory')} onClick={() => onSelect('chartsHistory')}>Recent Charts</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}


