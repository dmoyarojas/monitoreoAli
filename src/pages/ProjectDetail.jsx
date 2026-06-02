import React, { useEffect, useState } from 'react'
import HitosTree from '../components/HitosTree'
import { supabase } from '../lib/supabaseClient'
import Switch from '../components/Switch'
import { useAuth } from '../context/AuthContext'

export default function ProjectDetail({ proyecto, onClose }) {
  const { user } = useAuth()
  const [alertConfig, setAlertConfig] = useState(null)
  const [miembros, setMiembros] = useState([])

  useEffect(() => {
    if (!proyecto || !user) return
    const load = async () => {
      const [{ data: alertData }, { data: miembrosData }] = await Promise.all([
        supabase.from('alertas_proyecto').select('*').eq('id_proyecto', proyecto.id_proyecto).eq('id_usuario', user.id).single().maybeSingle(),
        supabase.from('miembros_proyecto').select('*').eq('id_proyecto', proyecto.id_proyecto)
      ])
      setAlertConfig(alertData || { alerta_activa: false })
      setMiembros(miembrosData || [])
    }
    load()
  }, [proyecto, user])

  const toggleAlert = async (value) => {
    if (!user) return
    const payload = {
      id_proyecto: proyecto.id_proyecto,
      id_usuario: user.id,
      correo_notificacion: user.email || null,
      alerta_activa: value
    }
    await supabase.from('alertas_proyecto').upsert(payload, { onConflict: ['id_usuario', 'id_proyecto'] })
    setAlertConfig(payload)
  }

  return (
    <div className="p-4 bg-gray-50 rounded shadow space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold">{proyecto.numero_proceso} — {proyecto.proceso}</h3>
          <div className="text-sm text-slate-600">Tipo: {proyecto.nombre_tipo}</div>
          <div className="text-sm text-slate-600">HT: {proyecto.ht || '—'}</div>
          <div className="text-sm text-slate-600">Creado: {new Date(proyecto.fecha_creacion).toLocaleDateString()}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Notificaciones</span>
            <Switch checked={!!alertConfig?.alerta_activa} onChange={toggleAlert} />
          </div>
          <button onClick={onClose} className="px-3 py-1 border rounded text-slate-700">Cerrar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        <div className="mb-2 text-sm font-semibold">Miembros del proyecto</div>
        {miembros.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {miembros.map((m) => (
              <li key={m.id_miembro} className="rounded border p-3 bg-slate-50">
                <div className="text-sm font-medium">{m.nombre}</div>
                <div className="text-xs text-slate-500">Cargo: {m.cargo || '—'}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">No hay miembros definidos para este proyecto.</div>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        <div className="mb-2 text-sm font-semibold">Hitos y subhitos del proyecto</div>
        <HitosTree id_proyecto={proyecto.id_proyecto} />
      </div>
    </div>
  )
}
