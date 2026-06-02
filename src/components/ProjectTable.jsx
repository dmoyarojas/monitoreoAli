import React from 'react'

export default function ProjectTable({ projects = [], onSelect }) {
  return (
    <div className="bg-white rounded shadow overflow-auto">
      <table className="w-full table-auto">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Número proceso</th>
            <th className="p-3">Proceso</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Creado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id_proyecto} className="border-t">
              <td className="p-3">{p.id_proyecto}</td>
              <td className="p-3">{p.numero_proceso}</td>
              <td className="p-3 truncate max-w-xs">{p.proceso}</td>
              <td className="p-3">{p.nombre_tipo}</td>
              <td className="p-3">{new Date(p.fecha_creacion).toLocaleDateString()}</td>
              <td className="p-3">
                <button onClick={() => onSelect(p)} className="text-sky-600">Abrir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
