// Comprime y convierte cualquier imagen a webp usando Canvas API,
// antes de subirla a R2 (menos peso = menos costo de storage/egress).

export async function comprimirImagen(archivo, opciones = {}) {
  const { maxAncho = 800, maxAlto = 800, calidad = 0.82 } = opciones;

  const bitmap = await createImageBitmap(archivo);

  let { width, height } = bitmap;
  const escala = Math.min(1, maxAncho / width, maxAlto / height);
  width = Math.round(width * escala);
  height = Math.round(height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const contexto = canvas.getContext('2d');
  contexto.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', calidad));

  if (!blob) {
    throw new Error('No se pudo convertir la imagen a webp.');
  }

  return blob;
}