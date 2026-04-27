import React from 'react'
import { AVATAR } from '../utils/layout.js'
import { nameToGradient, initials, yearsDisplay } from '../utils/avatar.js'

export default function PersonNode({ member, isSelected, onClick }) {
  return (
    <div
      data-person={member.id}
      onClick={onClick}
      className="absolute flex flex-col items-center cursor-pointer select-none group"
      style={{ left: member.x, top: member.y, width: AVATAR }}
    >
      {/* Avatar circle */}
      <div
        className={[
          'rounded-full overflow-hidden transition-all duration-200',
          isSelected
            ? 'ring-2 ring-violet-500 ring-offset-2 shadow-xl shadow-violet-200/60'
            : 'ring-1 ring-black/10 shadow-md group-hover:shadow-lg group-hover:scale-105 group-hover:ring-violet-300',
        ].join(' ')}
        style={{ width: AVATAR, height: AVATAR }}
      >
        {member.photo ? (
          <img src={member.photo} alt={member.name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-semibold text-lg"
            style={{ background: nameToGradient(member.name) }}
          >
            {initials(member.name)}
          </div>
        )}
      </div>

      {/* Name + years — wider than the avatar so text isn't clipped */}
      <div className="mt-2 text-center" style={{ width: 130, marginLeft: (AVATAR - 130) / 2 }}>
        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{member.name}</p>
        {yearsDisplay(member) && (
          <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{yearsDisplay(member)}</p>
        )}
      </div>
    </div>
  )
}
