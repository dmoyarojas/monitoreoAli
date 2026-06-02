import React from 'react'

export default function KpiCard({ title, value, color = 'bg-sky-500' }) {
  return (
    <div className="p-4 bg-white rounded shadow flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
      <div className={`h-12 w-12 rounded ${color} flex items-center justify-center text-white`}>
        ✓
      </div>
    </div>
  )
}
