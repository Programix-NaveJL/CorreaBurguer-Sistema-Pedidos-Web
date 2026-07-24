import {
  obtenerCarrito,
  quitarProducto,
  agregarProducto,
  calcularTotal,
  suscribirCarrito,
} from '../estado.js';

export async function render(container) {
  container.innerHTML = `
    <div class="pagina-carrito">
      <header class="carrito-header">
        <a href="#/menu" class="carrito-volver">&larr; Seguir viendo el menú</a>
        <h1>Tu pedido</h1>
      </header>

      <div id="carrito-lista"></div>

      <div class="carrito-resumen-total">
        <span>Total</span>
        <span id="carrito-total-grande">$0.00</span>
      </div>

      <button class="btn-continuar" id="btn-continuar">Continuar al pago</button>
    </div>
  `;

  const lista = container.querySelector('#carrito-lista');
  const totalEl = container.querySelector('#carrito-total-grande');
  const btnContinuar = container.querySelector('#btn-continuar');

  suscribirCarrito((items) => {
    if (items.length === 0) {
      lista.innerHTML = `<p class="carrito-vacio-pagina">Tu carrito está vacío. <a href="#/menu">Ir al menú</a></p>`;
      totalEl.textContent = '$0.00';
      btnContinuar.disabled = true;
      return;
    }

    btnContinuar.disabled = false;
    totalEl.textContent = `$${calcularTotal().toFixed(2)}`;

    lista.innerHTML = items
      .map(
        (item) => `
      <div class="carrito-linea">
        <div class="carrito-linea-info">
          <span class="carrito-linea-nombre">${item.nombre}</span>
          <span class="carrito-linea-precio">$${item.precio.toFixed(2)} c/u</span>
        </div>
        <div class="carrito-linea-controles">
          <button class="carrito-quitar" data-id="${item.producto_id}" aria-label="Quitar uno de ${item.nombre}">−</button>
          <span>${item.cantidad}</span>
          <button class="carrito-agregar" data-id="${item.producto_id}" aria-label="Agregar uno más de ${item.nombre}">+</button>
        </div>
        <span class="carrito-linea-subtotal">$${(item.precio * item.cantidad).toFixed(2)}</span>
      </div>
    `
      )
      .join('');

    lista.querySelectorAll('.carrito-quitar').forEach((btn) =>
      btn.addEventListener('click', () => quitarProducto(btn.dataset.id))
    );
    lista.querySelectorAll('.carrito-agregar').forEach((btn) =>
      btn.addEventListener('click', () => {
        const item = obtenerCarrito().find((i) => i.producto_id === btn.dataset.id);
        if (item) agregarProducto({ id: item.producto_id, nombre: item.nombre, precio: item.precio });
      })
    );
  });

  btnContinuar.addEventListener('click', () => {
    if (obtenerCarrito().length === 0) return;
    window.location.hash = '#/checkout';
  });
}