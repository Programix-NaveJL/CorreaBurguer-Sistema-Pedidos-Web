import { supabase, R2_PUBLIC_URL } from '../supabaseClient.js';
import { comprimirImagen } from './comprimirImagen.js';

/**
 * Sube una imagen a R2 pasando por la Edge Function generar-url-subida.
 * @param {File} archivo - el archivo seleccionado por el input type="file"
 * @param {string} carpeta - 'productos' | 'historias' | 'logo'
 * @param {string} nombreBase - normalmente el id del registro (producto_id, historia_id)
 * @returns {Promise<string>} la URL pública final de la imagen ya subida
 */
export async function subirImagenR2({ archivo, carpeta, nombreBase }) {
  const blob = await comprimirImagen(archivo);
  const nombreArchivo = `${nombreBase}.webp`;

  const { data, error } = await supabase.functions.invoke('generar-url-subida', {
    body: { carpeta, nombreArchivo, tipoContenido: 'image/webp' },
  });

  if (error) {
    throw new Error(`No se pudo obtener la URL de subida: ${error.message}`);
  }

  const respuestaSubida = await fetch(data.urlSubida, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    body: blob,
  });

  if (!respuestaSubida.ok) {
    throw new Error('La subida a R2 falló.');
  }

  return `${R2_PUBLIC_URL}/${data.rutaArchivo}`;
}