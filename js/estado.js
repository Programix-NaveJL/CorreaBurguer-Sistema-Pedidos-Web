// Estado global del carrito, con patrón pub/sub.
// Cualquier módulo puede suscribirse para reaccionar quando el carrito
// cambia (ej. menu.js actualiza el contador, checkout.js recalcula el total)
// sin que estos módulos se conozcan entre sí directamente.

let items = []; // [{ producto_id, nombre, precio, cantidad }]
const suscriptores = new Set();

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

export function agregarProducto(producto) {
  const existente = items.find((i) => i.producto_id === producto.id);

  if (existente) {
    existente.cantidad += 1;
  } else {
    items.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
    });
  }

  notificar();
}

export function quitarProducto(productoId) {
  const existente = items.find((i) => i.producto_id === productoId);
  if (!existente) return;

  if (existente.cantidad > 1) {
    existente.cantidad -= 1;
  } else {
    items = items.filter((i) => i.producto_id !== productoId);
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