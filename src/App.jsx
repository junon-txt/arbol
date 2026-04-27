import React, { useState } from 'react'
import { loadFamilyData } from './utils/familyData.js'
import { computeLayout, buildLines } from './utils/layout.js'
import TreeView from './components/TreeView.jsx'
import ProfileModal from './components/ProfileModal.jsx'

const members  = loadFamilyData()
const positioned = computeLayout(members)
const lines    = buildLines(positioned)

export default function App() {
  const [selected, setSelected] = useState(null)
  const selectedMember = selected ? positioned.find(m => m.id === selected) : null

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="shrink-0 h-14 bg-white border-b border-gray-200 shadow-sm flex items-center gap-3 px-5 z-10">
        <svg viewBox="0 0 20 20" className="w-5 h-5 text-violet-500 shrink-0" fill="currentColor">
          <path d="M10 2a1 1 0 011 1v1.07A7.002 7.002 0 0116.93 10H18a1 1 0 110 2h-1.07A7.002 7.002 0 0111 17.93V19a1 1 0 11-2 0v-1.07A7.002 7.002 0 013.07 12H2a1 1 0 110-2h1.07A7.002 7.002 0 019 4.07V3a1 1 0 011-1zm0 4a5 5 0 100 10A5 5 0 0010 6z" />
        </svg>
        <span className="text-base font-semibold text-gray-900 tracking-tight">Family Tree</span>
        <span className="ml-1 text-sm text-gray-400">{members.length} members</span>
      </header>

      {/* Tree canvas */}
      <div className="flex-1 overflow-hidden">
        <TreeView
          members={positioned}
          lines={lines}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {/* Profile overlay */}
      {selectedMember && (
        <ProfileModal
          member={selectedMember}
          allMembers={positioned}
          onClose={() => setSelected(null)}
          onNavigate={id => setSelected(id)}
        />
      )}
    </div>
  )
}
