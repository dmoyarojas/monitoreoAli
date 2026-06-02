import React from 'react'

export default function Switch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-12 h-6 rounded-full p-1 ${checked ? 'bg-sky-600' : 'bg-gray-300'}`}>
      <div className={`h-4 w-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
    </button>
  )
}
