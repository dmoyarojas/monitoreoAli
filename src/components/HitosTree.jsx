import React, { useEffect, useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import es from 'date-fns/locale/es'
import { supabase } from '../lib/supabaseClient'

registerLocale('es', es)

const estadoColor = {
  'Pendiente': 'bg-gray-200 text-gray-800',
  'En proceso': 'bg-yellow-200 text-yellow-800',
  'Completado': 'bg-green-200 text-green-800',
  'Retrasado': 'bg-red-200 text-red-800'
}

const estadoOptions = ['Pendiente', 'En proceso', 'Completado', 'Retrasado']

// Temporal status based on fecha_fin_prevista
function parseDateString(dateStr) {
  if (!dateStr) return null
  return new Date(`${dateStr}T00:00`)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = parseDateString(dateStr)
  if (!d) return '—'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateLocal(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = normalizeDate(new Date())
  const d = parseDateString(dateStr)
  if (!d) return null
  const diffMs = normalizeDate(d).getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function diffDays(startStr, endStr) {
  const start = parseDateString(startStr)
  const end = parseDateString(endStr)
  if (!start || !end) return null
  const diffMs = normalizeDate(end).getTime() - normalizeDate(start).getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function temporalStatus({ estado, fecha_fin_prevista, fecha_fin_real }) {
  const planned = parseDateString(fecha_fin_prevista)
  const real = parseDateString(fecha_fin_real)
  const today = normalizeDate(new Date())

  if (real) {
    if (planned) {
      const delay = diffDays(fecha_fin_prevista, fecha_fin_real)
      if (delay <= 0) {
        return { label: 'Cumplido a tiempo', color: 'bg-green-100 text-green-800', completed: true, delay }
      }
      return { label: `Cumplido con ${delay} día${delay === 1 ? '' : 's'} de retraso`, color: 'bg-yellow-100 text-yellow-800', completed: true, delay }
    }
    return { label: 'Cumplido', color: 'bg-green-100 text-green-800', completed: true }
  }

  if (!planned) {
    return { label: 'Sin fecha', color: 'bg-gray-100 text-gray-700', daysLeft: null }
  }

  const daysLeft = Math.round((planned.setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft > 4) return { label: 'En Plazo', color: 'bg-green-100 text-green-800', daysLeft }
  if (daysLeft >= 0) return { label: 'Por vencer', color: 'bg-yellow-100 text-yellow-800', daysLeft }
  return { label: 'Retrasado', color: 'bg-red-100 text-red-800', daysLeft }
}

export default function HitosTree({ id_proyecto }) {
  const [hitos, setHitos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    if (!id_proyecto) return
    const load = async () => {
      setLoading(true)
      setError(null)

      const [hitosRes, subhitosRes] = await Promise.all([
        supabase
          .from('proyecto_hitos')
          .select('*, hitos_catalogo (descripcion, orden_hito, codigo, responsable, dias_previstos)')
          .eq('id_proyecto', Number(id_proyecto)),
        supabase
          .from('proyecto_subhitos')
          .select('*, subhitos_catalogo (descripcion, codigo, responsable, dias_previstos, id_hito, orden_subhito)')
          .eq('id_proyecto', Number(id_proyecto)),
      ])

      if (hitosRes.error || subhitosRes.error) {
        setError((hitosRes.error || subhitosRes.error).message)
        setHitos([])
        setLoading(false)
        return
      }

      const subhitosByHito = {}
      ;(subhitosRes.data || []).forEach((sub) => {
        const hitoId = sub.subhitos_catalogo?.id_hito || sub.id_hito
        if (!hitoId) return
        if (!subhitosByHito[hitoId]) subhitosByHito[hitoId] = []
        subhitosByHito[hitoId].push(sub)
      })

      const mergedHitos = (hitosRes.data || []).map((hito) => ({
        ...hito,
        subhitos: (subhitosByHito[hito.id_hito] || []).sort((a, b) => (a.subhitos_catalogo?.orden_subhito ?? 0) - (b.subhitos_catalogo?.orden_subhito ?? 0)),
      })).sort((a, b) => (a.hitos_catalogo?.orden_hito ?? 0) - (b.hitos_catalogo?.orden_hito ?? 0))

      setHitos(mergedHitos)
      setLoading(false)
    }
    load()
  }, [id_proyecto])

  const updateHitoRealDate = async (id, date) => {
    const fecha_fin_real = date ? formatDateLocal(date) : null
    setSavingId(`hito-${id}`)
    const { error } = await supabase.from('proyecto_hitos').update({ fecha_fin_real }).eq('id_proyecto_hito', id)
    setSavingId(null)
    if (error) {
      setError(error.message)
      return
    }
    setHitos((prev) => prev.map((h) => h.id_proyecto_hito === id ? { ...h, fecha_fin_real } : h))
  }

  const updateSubhitoRealDate = async (id, date) => {
    const fecha_fin_real = date ? formatDateLocal(date) : null
    setSavingId(`subhito-${id}`)
    const { error } = await supabase.from('proyecto_subhitos').update({ fecha_fin_real }).eq('id_proyecto_subhito', id)
    setSavingId(null)
    if (error) {
      setError(error.message)
      return
    }
    setHitos((prev) => prev.map((h) => ({
      ...h,
      subhitos: (h.subhitos || []).map((sh) => sh.id_proyecto_subhito === id ? { ...sh, fecha_fin_real } : sh),
    })))
  }

  const updateHitoEstado = async (id, estado) => {
    setSavingId(`hito-${id}`)
    const { error } = await supabase.from('proyecto_hitos').update({ estado }).eq('id_proyecto_hito', id)
    setSavingId(null)
    if (error) {
      setError(error.message)
      return
    }
    setHitos((prev) => prev.map((h) => h.id_proyecto_hito === id ? { ...h, estado } : h))
  }

  const updateSubhitoEstado = async (id, estado) => {
    setSavingId(`subhito-${id}`)
    const { error } = await supabase.from('proyecto_subhitos').update({ estado }).eq('id_proyecto_subhito', id)
    setSavingId(null)
    if (error) {
      setError(error.message)
      return
    }
    setHitos((prev) => prev.map((h) => ({
      ...h,
      subhitos: (h.subhitos || []).map((sh) => sh.id_proyecto_subhito === id ? { ...sh, estado } : sh),
    })))
  }

  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow text-sm text-slate-600">Cargando hitos...</div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded shadow text-sm text-red-600">
        Error cargando hitos: {error}
      </div>
    )
  }

  if (!hitos.length) {
    return (
      <div className="bg-white p-4 rounded shadow text-sm text-slate-600">
        No hay hitos cargados para este proyecto. Si el proyecto se creó sin hitos o con un catálogo vacío, no se verá ninguna línea aquí.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {hitos.map(h => {
        const t = temporalStatus(h)
        const daysLeft = t.completed ? null : t.daysLeft
        return (
          <details key={h.id_proyecto_hito} className="p-3 bg-white rounded shadow">
            <summary className="flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-medium">{h.hitos_catalogo?.codigo} - {h.hitos_catalogo?.descripcion}</div>
                <div className="text-sm text-gray-500">Responsable: {h.hitos_catalogo?.responsable || '—'}</div>
                <div className="text-xs text-gray-500">Duración estimada: {h.hitos_catalogo?.dias_previstos ?? '—'} días</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded ${estadoColor[h.estado] || 'bg-gray-200'}`}>{h.estado}</div>
                <div className={`px-2 py-1 rounded text-sm ${t.color}`}>{t.label}</div>
              </div>
            </summary>
            <div className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-3 text-sm text-gray-600">
                <div>Fecha fin prevista: {formatDate(h.fecha_fin_prevista)}</div>
                <div>
                  <label className="text-xs text-slate-500">Fecha real</label>
                  <DatePicker
                    selected={parseDateString(h.fecha_fin_real)}
                    onChange={(date) => updateHitoRealDate(h.id_proyecto_hito, date)}
                    dateFormat="dd/MM/yyyy"
                    locale={es}
                    withPortal
                    popperPlacement="bottom-start"
                    className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    placeholderText="Sin fecha"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Estado</label>
                  <select
                    value={h.estado}
                    onChange={(e) => updateHitoEstado(h.id_proyecto_hito, e.target.value)}
                    className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    {estadoOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              {t.completed && t.delay > 0 && (
                <div className="text-sm font-medium text-slate-700">Retraso: {t.delay} día{t.delay === 1 ? '' : 's'} respecto a la fecha prevista</div>
              )}
              {daysLeft != null && (
                <div className="text-sm font-medium text-slate-700">{daysLeft >= 0 ? `Quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'}` : `Vencido hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) === 1 ? '' : 's'}`}</div>
              )}
              <div className="pl-4 space-y-2">
                {(h.subhitos || []).map(sh => {
                  const subData = sh.subhitos_catalogo || {}
                  const ts = temporalStatus(sh)
                  const subDaysLeft = ts.completed ? null : ts.daysLeft
                  return (
                    <div key={sh.id_proyecto_subhito} className="space-y-2 p-3 border rounded bg-slate-50">
                      <div>
                        <div className="text-sm font-medium">{subData.codigo || sh.id_subhito} - {subData.descripcion || sh.descripcion}</div>
                        <div className="text-xs text-gray-500">Responsable: {subData.responsable || sh.responsable || '—'}</div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3 text-xs text-gray-600">
                        <div>Previsto: {formatDate(sh.fecha_fin_prevista)}</div>
                        <div>
                          <label className="text-[10px] text-slate-500">Fecha real</label>
                          <DatePicker
                            selected={parseDateString(sh.fecha_fin_real)}
                            onChange={(date) => updateSubhitoRealDate(sh.id_proyecto_subhito, date)}
                            dateFormat="dd/MM/yyyy"
                            locale={es}
                            withPortal
                            popperPlacement="bottom-start"
                            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            placeholderText="Sin fecha"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500">Estado</label>
                          <select
                            value={sh.estado}
                            onChange={(e) => updateSubhitoEstado(sh.id_proyecto_subhito, e.target.value)}
                            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            {estadoOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={`px-2 py-1 rounded text-sm ${estadoColor[sh.estado] || 'bg-gray-200'}`}>{sh.estado}</div>
                        <div className={`px-2 py-1 rounded text-sm ${ts.color}`}>{ts.label}</div>
                        {ts.completed && ts.delay > 0 && (
                          <div className="text-xs text-slate-600">Retraso: {ts.delay} día{ts.delay === 1 ? '' : 's'} respecto a la fecha prevista</div>
                        )}
                        {!ts.completed && subDaysLeft != null && (
                          <div className="text-xs text-slate-600">{subDaysLeft >= 0 ? `Quedan ${subDaysLeft} día${subDaysLeft === 1 ? '' : 's'}` : `Vencido hace ${Math.abs(subDaysLeft)} día${Math.abs(subDaysLeft) === 1 ? '' : 's'}`}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}
