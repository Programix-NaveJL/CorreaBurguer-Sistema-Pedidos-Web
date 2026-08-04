// Estado global del carrito, con patrón pub/sub.
// Cada línea del carrito se identifica por producto + su combinación
// de salsas elegidas, para que "1x Burger Chicken (BBQ)" y
// "1x Burger Chicken (Ranch)" sean líneas separadas, no se sumen.

let items = []; // [{ clave, producto_id, nombre, precio, cantidad, salsas }]
const suscriptores = new Set();

function generarClave(productoId, salsas) {
  const salsasOrdenadas = [...salsas].sort().join(',');
  return `${productoId}::${salsasOrdenadas}`;
}

function notificar() {
  for (const callback of suscriptores) {
    callback(items);
  }
}

/**
 * Se suscribe a cambios del carrito. Devuelve una función para
 * cancelar la suscripción (llamar en cleanup si el componente se destruye).
 */
export function suscribirCarrito(callback) {
  suscriptores.add(callback);
  callback(items); // entrega el estado actual de inmediato al suscribirse
  return () => suscriptores.delete(callback);
}

export function obtenerCarrito() {
  return items;
}

/**
 * @param {object} producto - { id, nombre, precio }
 * @param {string[]} salsasSeleccionadas - nombres de las salsas elegidas, si aplica
 */
export function agregarProducto(producto, salsasSeleccionadas = []) {
  const clave = generarClave(producto.id, salsasSeleccionadas);
  const existente = items.find((i) => i.clave === clave);

  if (existente) {
    existente.cantidad += 1;
  } else {
    items.push({
      clave,
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      salsas: salsasSeleccionadas,
    });
  }

  notificar();
}

export function quitarProducto(clave) {
  const existente = items.find((i) => i.clave === clave);
  if (!existente) return;

  if (existente.cantidad > 1) {
    existente.cantidad -= 1;
  } else {
    items = items.filter((i) => i.clave !== clave);
  }

  notificar();
}

export function vaciarCarrito() {
  items = [];
  notificar();
}

export function calcularTotal() {
  return items.reduce((total, item) => total + item.precio * item.cantidad, 0);
}