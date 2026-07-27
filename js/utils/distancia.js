// Coordenadas de Correa Burguer 2025 (no son sensibles, es la
// ubicación pública del negocio en Google Maps).
export const RESTAURANTE = { lat: 17.990254, lng: -92.955173 };

/**
 * Distancia en línea recta entre dos puntos, en kilómetros.
 * No es distancia de manejo real (no considera calles), pero es
 * suficiente como referencia para que el cliente elija su zona.
 */
export function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // radio de la Tierra en km
  const aRad = (grados) => (grados * Math.PI) / 180;

  const dLat = aRad(lat2 - lat1);
  const dLng = aRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Encuentra, entre una lista de zonas, cuál le corresponde a una
 * distancia dada. Es solo para mostrarle al cliente un adelanto —
 * la decisión real y validada ocurre en el servidor, en crear_pedido().
 */
export function encontrarZonaPorDistancia(distanciaKm, zonas) {
  return (
    zonas
      .filter((zona) => zona.distancia_min !== null && zona.distancia_max !== null)
      .find((zona) => distanciaKm >= zona.distancia_min && distanciaKm <= zona.distancia_max) ?? null
  );
}