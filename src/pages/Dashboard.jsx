import React, { useEffect, useState } from 'react'
import KpiCard from '../components/KpiCard'
import { supabase } from '../lib/supabaseClient'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  const d = new Date(dateStr)
  const diffMs = d.setHours(0,0,0,0) - today.setHours(0,0,0,0)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export default function Dashboard() {
  const [counts, setCounts] = useState({ proyectos: 0, enProceso: 0, completados: 0, retrasados: 0, porVencer: 0, vencido: 0, subPorVencer: 0, subVencido: 0 })

  useEffect(() => {
    const load = async () => {
      const [{ count: proyectos }] = await Promise.all([
        supabase.from('proyectos').select('*', { count: 'exact', head: true })
      ])

      // Fetch all 'En proceso' hitos to compute temporal statuses (incluye subhitos)
      const { data: enHitos } = await supabase.from('proyecto_hitos').select('fecha_fin_prevista').eq('estado', 'En proceso')
      // Incluir subhitos que no estén completados (pendientes o en proceso)
      const { data: enSubhitos } = await supabase.from('proyecto_subhitos').select('fecha_fin_prevista, estado').neq('estado', 'Completado')
      let enProceso = (enHitos || []).length + (enSubhitos || []).length
      let porVencer = 0
      let vencido = 0
      let subPorVencer = 0
      let subVencido = 0
      for (const h of (enHitos || [])) {
        const days = daysUntil(h.fecha_fin_prevista)
        if (days != null) {
          if (days < 0) vencido++
          else if (days <= 4) porVencer++
        }
      }
      for (const s of (enSubhitos || [])) {
        const days = daysUntil(s.fecha_fin_prevista)
        if (days != null) {
          if (days < 0) {
            vencido++
            subVencido++
          } else if (days <= 4) {
            porVencer++
            subPorVencer++
          }
        }
      }

      const { count: completados } = await supabase.from('proyecto_hitos').select('*', { count: 'exact', head: true }).eq('estado', 'Completado')
      const { count: retrasados } = await supabase.from('proyecto_hitos').select('*', { count: 'exact', head: true }).eq('estado', 'Retrasado')

      setCounts({ proyectos: proyectos || 0, enProceso: enProceso || 0, completados: completados || 0, retrasados: retrasados || 0, porVencer, vencido, subPorVencer, subVencido })
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Proyectos" value={counts.proyectos} color="bg-sky-500" />
        <KpiCard title="Hitos en proceso" value={counts.enProceso} color="bg-yellow-500" />
        <KpiCard title="Por vencer (≤4d)" value={counts.porVencer} color="bg-amber-500" />
        <KpiCard title="Vencidos" value={counts.vencido} color="bg-red-500" />
        <KpiCard title="Subhitos por vencer" value={counts.subPorVencer} color="bg-amber-400" />
        <KpiCard title="Subhitos vencidos" value={counts.subVencido} color="bg-red-600" />
        <KpiCard title="Completados" value={counts.completados} color="bg-green-500" />
        <KpiCard title="Retrasados" value={counts.retrasados} color="bg-red-700" />
      </div>
    </div>
  )
}
