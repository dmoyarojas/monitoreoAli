const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter(Boolean);
  env.forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing env vars VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}
const supabase = createClient(url, key);
(async () => {
  try {
    const { data, error } = await supabase.from('proyectos').select('*, tipos_proyecto(nombre)').limit(1);
    if (error) throw error;
    console.log('One project sample:', data && data[0]);
    if (!data || !data.length) return;
    const id = data[0].id_proyecto;
    console.log('Using id_proyecto', id);
    const result = await supabase.from('proyecto_hitos')
      .select('*, hitos_catalogo (descripcion, orden_hito, codigo, responsable, dias_previstos), proyecto_subhitos (*, subhitos_catalogo (descripcion, codigo, responsable, dias_previstos, orden_subhito))')
      .eq('id_proyecto', id);
    console.log('Query result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
