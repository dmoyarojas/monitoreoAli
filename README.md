# Monitoreo Proyectos - Frontend

Pequeña app React + Vite para monitoreo de proyectos (UI minimalista con Tailwind). Incluye integración con Supabase Auth y un endpoint serverless para alertas.

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena con tus claves:

```bash
cp .env.example .env.local
```

**Client-side (Vite):**
- `VITE_SUPABASE_URL` - URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Anon Key de Supabase (publica, OK para frontend)

**Server-side (Vercel Cron & API Routes):**
- `SUPABASE_URL` - URL de Supabase (puede ser igual a client)
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Secret (PRIVADA, solo para servidor)
  - Obtén en Supabase: Settings > API > Service Role Secret
- `POR_VENCER_DAYS` - Días de anticipación para alertar (default: 4)
- `SENDGRID_API_KEY` - (Opcional) Para envío de correos
- `EMAIL_FROM` - (Opcional) Email remitente para notificaciones

## Comandos útiles

```bash
# Instalar dependencias
npm install

# Levantar en desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## Despliegue en Vercel

1. **Conectar repo a Vercel** desde https://vercel.com

2. **Variables de entorno en Vercel Project Settings > Environment Variables:**
   - Añade: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, y opcionalmente SendGrid keys
   - ⚠️ NO incluyas `VITE_*` aquí (Vite las carga desde `.env.local` en build time)

3. **Cron Jobs** (`vercel.json` ya está configurado):
   - El archivo `vercel.json` define que `/api/check-dates` se ejecute diariamente a las 8:00 AM UTC
   - Vercel ejecutará automáticamente el cron job en el horario especificado
   - Para cambiar la frecuencia, edita `crons[0].schedule` en `vercel.json` (formato cron POSIX)

4. **Verificar cron jobs:**
   - En Vercel Dashboard > Deployments > Crons
   - Ver logs en Deployments > [tu-deployment] > Runtime Logs

## Funcionalidad de alertas (Cron Job)

El endpoint `/api/check-dates` detecta:
- **Hitos/Subhitos por vencer**: fecha fin prevista ≤ POR_VENCER_DAYS
- **Hitos/Subhitos vencidos**: fecha fin prevista < hoy

Y upserta registros en tabla `alertas_proyecto` con:
- `id_proyecto`, `id_hito` (null si es subhito), `id_subhito` (null si es hito)
- `tipo`: "hito" o "subhito"
- `tipo_alerta`: "por_vencer" o "vencido"
- `fecha_alerta`: fecha en que se generó la alerta

Si `SENDGRID_API_KEY` está configurada, intenta enviar correos a miembros que tengan `email`.

## Reglas temporales para estados de hitos

- **En Plazo**: fecha fin prevista > 4 días
- **Por vencer**: 0 a 4 días restantes
- **Vencido**: fecha fin prevista ya pasada

## Tech Stack

- React + Vite
- Tailwind CSS
- Supabase (Auth, DB, Realtime)
- React DatePicker (fecha con Spanish locale)
- Vercel Cron Jobs para alertas automáticas
- SendGrid (opcional) para email



# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
"# monitoreoAli" 
