import React, { useEffect, useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import es from 'date-fns/locale/es'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from '../lib/supabaseClient'
import ProjectTable from '../components/ProjectTable'
import ProjectDetail from './ProjectDetail'

registerLocale('es', es)

const cargoOptions = ['Presidente', 'Miembro 1', 'Miembro 2']
const estadoOptions = ['Pendiente', 'En proceso', 'Completado', 'Retrasado']

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [numero, setNumero] = useState('')
  const [proceso, setProceso] = useState('')
  const [idTipo, setIdTipo] = useState('')
  const [ht, setHt] = useState('')
  const [tipos, setTipos] = useState([])
  const [members, setMembers] = useState([{ nombre: '', cargo: 'Presidente' }])
  const [hitosCatalogo, setHitosCatalogo] = useState([])
  const [subhitosCatalogo, setSubhitosCatalogo] = useState({})
  const [hitos, setHitos] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  const load = async () => {
    const { data } = await supabase.from('proyectos').select('*, tipos_proyecto(nombre)')
    const mapped = (data || []).map(p => ({ ...p, nombre_tipo: p.tipos_proyecto?.nombre }))
    setProjects(mapped)
  }

  useEffect(() => {
    load()
    const loadTipos = async () => {
      const { data } = await supabase.from('tipos_proyecto').select('*').order('nombre')
      setTipos(data || [])
    }
    loadTipos()
  }, [])

  useEffect(() => {
    if (!idTipo) {
      setHitosCatalogo([])
      setSubhitosCatalogo({})
      setHitos([])
      return
    }

    const loadHitos = async () => {
      const { data } = await supabase
        .from('hitos_catalogo')
        .select('*')
        .eq('id_tipo', Number(idTipo))
        .order('orden_hito')
      
      setHitosCatalogo(data || [])

      if (data && data.length > 0) {
        const subMap = {}
        for (const hito of data) {
          const { data: subs } = await supabase
            .from('subhitos_catalogo')
            .select('*')
            .eq('id_hito', hito.id_hito)
            .order('orden_subhito')
          subMap[hito.id_hito] = subs || []
        }
        setSubhitosCatalogo(subMap)

        // Auto-populate con todos los hitos del tipo
        const allHitos = data.map(h => ({
          id_hito: h.id_hito.toString(),
          fecha_inicio: '',
          fecha_fin_prevista: '',
          fecha_fin_real: '',
          estado: 'Pendiente',
          observaciones: '',
          subhitos: (subMap[h.id_hito] || []).map(s => ({
            id_subhito: s.id_subhito.toString(),
            fecha_inicio: '',
            fecha_fin_prevista: '',
            fecha_fin_real: '',
            estado: 'Pendiente',
            observaciones: '',
          })),
        }))
        setHitos(allHitos)
      }
    }
    loadHitos()
  }, [idTipo])

  const addMember = () => {
    setMembers([...members, { nombre: '', cargo: 'Miembro 1' }])
  }

  const updateMember = (index, field, value) => {
    const next = [...members]
    next[index][field] = value
    setMembers(next)
  }

  const removeMember = (index) => {
    setMembers(members.filter((_, idx) => idx !== index))
  }

  const updateHito = (index, field, value) => {
    const next = [...hitos]
    next[index][field] = value
    setHitos(next)
  }

  const updateSubhito = (hitoIndex, subIndex, field, value) => {
    const next = [...hitos]
    next[hitoIndex].subhitos[subIndex][field] = value
    setHitos(next)
  }

  const formatDateLocal = (date) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parseDateString = (dateStr) => {
    return dateStr ? new Date(`${dateStr}T00:00`) : null
  }

  const createProject = async (e) => {
    e.preventDefault()
    if (!numero || !proceso || !idTipo) {
      return alert('Debes completar número de proceso, proceso y tipo.')
    }

    setIsSaving(true)
    const { data: project, error } = await supabase.from('proyectos').insert([{ numero_proceso: numero, proceso, id_tipo: Number(idTipo), ht }]).select('id_proyecto').single()
    if (error) {
      setIsSaving(false)
      return alert('Error creando proyecto: ' + error.message)
    }

    if (members.length) {
      await supabase.from('miembros_proyecto').insert(members.map((member) => ({
        id_proyecto: project.id_proyecto,
        nombre: member.nombre,
        cargo: member.cargo,
      })))
    }

    if (hitos.length) {
      for (let i = 0; i < hitos.length; i += 1) {
        const hito = hitos[i]
        const { data: createdProyectoHito, error: proyectoHitoError } = await supabase
          .from('proyecto_hitos')
          .insert([
            {
              id_proyecto: project.id_proyecto,
              id_hito: Number(hito.id_hito),
              fecha_inicio: hito.fecha_inicio || null,
              fecha_fin_prevista: hito.fecha_fin_prevista || null,
              fecha_fin_real: hito.fecha_fin_real || null,
              estado: hito.estado,
              observaciones: hito.observaciones || null,
            },
          ])
          .select('id_proyecto_hito')
          .single()

        if (proyectoHitoError) {
          console.warn('Error al crear proyecto_hito:', proyectoHitoError)
          continue
        }

        const subhitos = hito.subhitos || []
        if (!subhitos.length) continue

        for (let j = 0; j < subhitos.length; j += 1) {
          const sub = subhitos[j]
          await supabase.from('proyecto_subhitos').insert([
            {
              id_proyecto: project.id_proyecto,
              id_subhito: Number(sub.id_subhito),
              fecha_inicio: sub.fecha_inicio || null,
              fecha_fin_prevista: sub.fecha_fin_prevista || null,
              fecha_fin_real: sub.fecha_fin_real || null,
              estado: sub.estado,
              observaciones: sub.observaciones || null,
            },
          ])
        }
      }
    }

    setShowForm(false)
    setNumero('')
    setProceso('')
    setIdTipo('')
    setHt('')
    setMembers([{ nombre: '', cargo: 'Presidente' }])
    setHitos([])
    await load()
    setIsSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-2xl font-semibold">Proyectos</h2>
        <button onClick={() => setShowForm((s) => !s)} className="bg-sky-600 text-white px-4 py-2 rounded shadow-sm">Nuevo Proyecto</button>
      </div>

      {showForm && (
        <form onSubmit={createProject} className="bg-white p-6 rounded-xl shadow-lg space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Número de proceso</label>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Proceso</label>
              <input value={proceso} onChange={(e) => setProceso(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo</label>
              <select value={idTipo} onChange={(e) => setIdTipo(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="">-- seleccionar --</option>
                {tipos.map((t) => (
                  <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">HT</label>
              <input value={ht} onChange={(e) => setHt(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Miembros del proyecto</h3>
              <button type="button" onClick={addMember} className="text-sky-600">+ Añadir miembro</button>
            </div>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="grid gap-3 lg:grid-cols-3 items-end rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input value={member.nombre} onChange={(e) => updateMember(index, 'nombre', e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Cargo</label>
                    <select value={member.cargo} onChange={(e) => updateMember(index, 'cargo', e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2">
                      {cargoOptions.map((cargo) => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => removeMember(index)} className="text-sm text-red-600">Eliminar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Hitos y subhitos</h3>
                <p className="text-sm text-slate-500 mt-1">Se incluirán todos los hitos del catálogo para este tipo de proyecto</p>
              </div>
            </div>
            {hitosCatalogo.length === 0 ? (
              <p className="text-sm text-slate-500">Selecciona un tipo para ver los hitos disponibles</p>
            ) : (
              <div className="space-y-4">
                {hitos.map((hito, index) => {
                  const hitoCatalog = hitosCatalogo.find(h => h.id_hito === Number(hito.id_hito))
                  const subhitosDisponibles = subhitosCatalogo[Number(hito.id_hito)] || []

                  return (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{hitoCatalog?.codigo} - {hitoCatalog?.descripcion}</h4>
                          <p className="text-sm text-slate-500 mt-1">Responsable: {hitoCatalog?.responsable} | Días previstos: {hitoCatalog?.dias_previstos}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Fecha fin prevista</label>
                          <DatePicker
                            selected={parseDateString(hito.fecha_fin_prevista)}
                            onChange={(date) => updateHito(index, 'fecha_fin_prevista', date ? formatDateLocal(date) : '')}
                            dateFormat="dd/MM/yyyy"
                            locale={es}
                            withPortal
                            popperPlacement="bottom-start"
                            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Fecha fin real</label>
                          <DatePicker
                            selected={parseDateString(hito.fecha_fin_real)}
                            onChange={(date) => updateHito(index, 'fecha_fin_real', date ? formatDateLocal(date) : '')}
                            dateFormat="dd/MM/yyyy"
                            locale={es}
                            withPortal
                            popperPlacement="bottom-start"
                            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Estado</label>
                          <select value={hito.estado} onChange={(e) => updateHito(index, 'estado', e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2">
                            {estadoOptions.map((estado) => (
                              <option key={estado} value={estado}>{estado}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Observaciones</label>
                        <input value={hito.observaciones} onChange={(e) => updateHito(index, 'observaciones', e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" />
                      </div>

                      {subhitosDisponibles.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                          <h4 className="font-medium">Subhitos ({hito.subhitos?.length || 0})</h4>
                          <div className="space-y-3">
                            {(hito.subhitos || []).map((sub, subIndex) => {
                              const subCatalog = subhitosDisponibles.find(s => s.id_subhito === Number(sub.id_subhito))
                              return (
                                <div key={subIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                                  <div className="text-sm font-medium text-slate-700">
                                    {subCatalog?.codigo} - {subCatalog?.descripcion}
                                  </div>
                                  <p className="text-xs text-slate-500">Responsable: {subCatalog?.responsable} | Días: {subCatalog?.dias_previstos}</p>
                                  <div className="grid gap-3 lg:grid-cols-3">
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600">Fecha fin prevista</label>
                                      <DatePicker
                                        selected={parseDateString(sub.fecha_fin_prevista)}
                                        onChange={(date) => updateSubhito(index, subIndex, 'fecha_fin_prevista', date ? formatDateLocal(date) : '')}
                                        dateFormat="dd/MM/yyyy"
                                        locale={es}
                                        withPortal
                                        popperPlacement="bottom-start"
                                        className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600">Fecha fin real</label>
                                      <DatePicker
                                        selected={parseDateString(sub.fecha_fin_real)}
                                        onChange={(date) => updateSubhito(index, subIndex, 'fecha_fin_real', date ? formatDateLocal(date) : '')}
                                        dateFormat="dd/MM/yyyy"
                                        locale={es}
                                        withPortal
                                        popperPlacement="bottom-start"
                                        className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600">Estado</label>
                                      <select value={sub.estado} onChange={(e) => updateSubhito(index, subIndex, 'estado', e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm">
                                        {estadoOptions.map((estado) => (
                                          <option key={estado} value={estado}>{estado}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600">Observaciones</label>
                                    <input value={sub.observaciones} onChange={(e) => updateSubhito(index, subIndex, 'observaciones', e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Guardando...
                </>
              ) : (
                'Guardar proyecto completo'
              )}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-slate-300 px-4 py-2 rounded-lg">Cancelar</button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número o proceso..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="w-64">
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">-- Todos los tipos --</option>
            {tipos.map((t) => (
              <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtrar proyectos por búsqueda y tipo */}
      {
        (() => {
          const q = searchQuery.trim().toLowerCase()
          const filtered = projects.filter((p) => {
            if (filterTipo && String(p.id_tipo) !== String(filterTipo)) return false
            if (!q) return true
            return (p.numero_proceso || '').toLowerCase().includes(q) || (p.proceso || '').toLowerCase().includes(q)
          })
          return <ProjectTable projects={filtered} onSelect={(p) => setSelected(p)} />
        })()
      }
      {selected && <ProjectDetail proyecto={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
