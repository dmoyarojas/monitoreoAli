import { createClient } from '@supabase/supabase-js'

// Endpoint to be scheduled by Vercel Cron. It finds hitos and subhitos
// that are about to expire or already expired and upserts rows into
// `alertas_proyecto`. Optionally, it can attempt to send emails if
// members with `email` exist and SENDGRID_API_KEY is provided.

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  const d = new Date(dateStr)
  const diffMs = d.setHours(0,0,0,0) - today.setHours(0,0,0,0)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

async function sendEmail(to, subject, text) {
  if (!SENDGRID_API_KEY || !EMAIL_FROM || !to) return false
  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: EMAIL_FROM },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    })
    return true
  } catch (err) {
    console.warn('sendEmail error', err)
    return false
  }
}

export default async function handler(req, res) {
  try {
    const POR_VENCER_DAYS = Number(process.env.POR_VENCER_DAYS || 4)

    // Hitos pendientes/no completados
    const { data: hitos } = await supabase
      .from('proyecto_hitos')
      .select('id_proyecto,id_proyecto_hito,id_hito,fecha_fin_prevista,estado')
      .neq('estado', 'Completado')

    // Subhitos pendientes/no completados
    const { data: subhitos } = await supabase
      .from('proyecto_subhitos')
      .select('id_proyecto,id_proyecto_subhito,id_subhito,fecha_fin_prevista,estado')
      .neq('estado', 'Completado')

    const alerts = []

    for (const h of (hitos || [])) {
      const days = daysUntil(h.fecha_fin_prevista)
      if (days == null) continue
      if (days < 0) alerts.push({ id_proyecto: h.id_proyecto, id_hito: h.id_hito, tipo: 'hito', tipo_alerta: 'vencido', fecha_alerta: new Date().toISOString().split('T')[0] })
      else if (days <= POR_VENCER_DAYS) alerts.push({ id_proyecto: h.id_proyecto, id_hito: h.id_hito, tipo: 'hito', tipo_alerta: 'por_vencer', fecha_alerta: new Date().toISOString().split('T')[0] })
    }

    for (const s of (subhitos || [])) {
      const days = daysUntil(s.fecha_fin_prevista)
      if (days == null) continue
      if (days < 0) alerts.push({ id_proyecto: s.id_proyecto, id_subhito: s.id_subhito, tipo: 'subhito', tipo_alerta: 'vencido', fecha_alerta: new Date().toISOString().split('T')[0] })
      else if (days <= POR_VENCER_DAYS) alerts.push({ id_proyecto: s.id_proyecto, id_subhito: s.id_subhito, tipo: 'subhito', tipo_alerta: 'por_vencer', fecha_alerta: new Date().toISOString().split('T')[0] })
    }

    // Upsert alerts into alertas_proyecto. We try to avoid duplicates by
    // using onConflict on a combination of columns (if your table has a
    // different unique constraint adjust the onConflict accordingly).
    let upserted = 0
    if (alerts.length > 0) {
      try {
        const { error } = await supabase.from('alertas_proyecto').upsert(alerts, { onConflict: ['id_proyecto', 'id_hito', 'id_subhito', 'tipo_alerta'] })
        if (error) throw error
        upserted = alerts.length
      } catch (err) {
        // If upsert fails (schema mismatch) fallback to simple insert and ignore errors
        for (const a of alerts) {
          try {
            await supabase.from('alertas_proyecto').insert([a])
            upserted++
          } catch (e) {
            // ignore individual insert errors
          }
        }
      }
    }

    // Optionally, try to send emails directly to miembros_proyecto if they have emails
    const sent = []
    for (const a of alerts) {
      const { data: miembros } = await supabase.from('miembros_proyecto').select('nombre,cargo,email').eq('id_proyecto', a.id_proyecto)
      if (miembros && miembros.length) {
        for (const m of miembros) {
          if (!m.email) continue
          const subject = a.tipo_alerta === 'vencido' ? `Alerta: elemento vencido` : `Alerta: elemento por vencer`
          const text = `Proyecto ${a.id_proyecto} - ${a.tipo} ${a.id_hito || a.id_subhito} está ${a.tipo_alerta} (fecha alerta ${a.fecha_alerta}).` 
          const ok = await sendEmail(m.email, subject, text)
          if (ok) sent.push({ to: m.email, alert: a })
        }
      }
    }

    return res.status(200).json({ ok: true, alertsFound: alerts.length, upserted, emailsSent: sent.length, sampleAlerts: alerts.slice(0, 10) })
  } catch (err) {
    console.error('check-dates error', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
// Vercel Serverless cron endpoint: runs daily to notify upcoming hitos
import fetch from 'node-fetch'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM || 'no-reply@example.com'

function formatDate(d) {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default async function handler(req, res) {
  try {
    const today = new Date()
    const todayStr = formatDate(today)
    const plus4 = new Date(today)
    plus4.setDate(plus4.getDate() + 4)
    const plus4Str = formatDate(plus4)

    // Fetch hitos en 'En proceso' with fecha_fin_prevista between today and today+4 (por vencer)
    const url = `${SUPABASE_URL}/rest/v1/proyecto_hitos?estado=eq.En%20proceso&fecha_fin_prevista=gte.${todayStr}&fecha_fin_prevista=lte.${plus4Str}&select=*`
    const hitosResp = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`
      }
    })
    const hitos = await hitosResp.json()

    let sent = 0

    for (const h of hitos) {
      // Get alertas for project
      const aUrl = `${SUPABASE_URL}/rest/v1/alertas_proyecto?alerta_activa=eq.true&id_proyecto=eq.${h.id_proyecto}&select=*`
      const aResp = await fetch(aUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`
        }
      })
      const alerts = await aResp.json()

      for (const a of alerts) {
        // skip if already notified today
        const last = a.ult_notificacion_enviada ? new Date(a.ult_notificacion_enviada).toISOString().slice(0,10) : null
        if (last === todayStr) continue

        const to = a.correo_notificacion || ''
        if (!to) continue

        const subject = `Alerta: hito próximo a vencer (Proyecto ${h.id_proyecto})`
        const html = `<p>El hito con id ${h.id_proyecto_hito} tiene fecha prevista de finalización <strong>${h.fecha_fin_prevista}</strong>.</p><p>Estado: ${h.estado}</p>`

        // Send via Resend
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to,
            subject,
            html
          })
        })

        // Update ult_notificacion_enviada
        const updateUrl = `${SUPABASE_URL}/rest/v1/alertas_proyecto?id_alerta=eq.${a.id_alerta}`
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify({ ult_notificacion_enviada: todayStr })
        })

        sent++
      }
    }

    res.status(200).json({ ok: true, scanned: hitos.length, emailsSent: sent })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
