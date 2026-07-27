import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

// Estas dos las inyecta Supabase automáticamente en toda Edge Function,
// no hace falta configurarlas como secret aparte.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Estas sí las guardaste tú como secrets con `supabase secrets set`.
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;

const NOMBRE_BUCKET = 'correa-burguer';
const CARPETAS_PERMITIDAS = ['productos', 'historias', 'logo'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // en producción, cámbialo por tu dominio real de GitHub Pages
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respuestaError(mensaje, status) {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // 1. Verificar que quien llama tiene una sesión válida.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return respuestaError('No autenticado.', 401);
  }

  // 2. Verificar que esa sesión pertenece a un admin real (reutiliza is_admin()
  //    de Postgres, la misma función que ya protege el resto del panel).
  const supabaseCliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: esAdmin, error: errorAdmin } = await supabaseCliente.rpc('is_admin');
  if (errorAdmin || !esAdmin) {
    return respuestaError('No tienes permisos de administrador.', 403);
  }

  // 3. Leer y validar lo que pide el frontend.
  let body;
  try {
    body = await req.json();
  } catch {
    return respuestaError('Cuerpo de la petición inválido.', 400);
  }

  const { carpeta, nombreArchivo, tipoContenido } = body;

  if (!carpeta || !nombreArchivo) {
    return respuestaError('Faltan los campos carpeta o nombreArchivo.', 400);
  }

  if (!CARPETAS_PERMITIDAS.includes(carpeta)) {
    return respuestaError('Esa carpeta no está permitida.', 400);
  }

  // Nombre de archivo sin caracteres raros, para evitar rutas inesperadas.
  const nombreSeguro = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '');
  const rutaArchivo = `${carpeta}/${nombreSeguro}`;

  // 4. Firmar la URL de subida (PUT) contra R2, usando AWS Signature V4.
  const cliente = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });

  const urlDestino = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${NOMBRE_BUCKET}/${rutaArchivo}`;

  const peticionFirmada = await cliente.sign(urlDestino, {
    method: 'PUT',
    headers: tipoContenido ? { 'Content-Type': tipoContenido } : {},
    aws: { signQuery: true },
  });

  return new Response(
    JSON.stringify({
      urlSubida: peticionFirmada.url,
      rutaArchivo,
    }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});