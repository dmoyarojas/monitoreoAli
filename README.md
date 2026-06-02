# Monitoreo Proyectos - Frontend

Pequeña app React + Vite para monitoreo de proyectos (UI minimalista con Tailwind). Incluye integración con Supabase Auth y un endpoint serverless para alertas.

Variables de entorno (local): copia `.env.local.example` a `.env.local` y rellena con tus claves.

Comandos útiles:

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

Despliegue en Vercel: añade las variables de entorno `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RESEND_FROM`.

Endpoint Cron: `api/check-dates.js` — configurar Cron job en Vercel para ejecutar diariamente.

Reglas temporales para estados visuales de hitos:
- `En Plazo`: fecha prevista a más de 4 días.
- `Por vencer`: fecha prevista entre 0 y 4 días inclusive.
- `Vencido`: fecha prevista con diferencia negativa (ya vencida).

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
