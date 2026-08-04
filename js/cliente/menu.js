import { supabase } from '../supabaseClient.js';
import { suscribirCarrito, agregarProducto, calcularTotal } from '../estado.js';
import { montarHistorias } from './historias.js';

const ORDEN_CATEGORIAS = ['hamburguesas', 'hot_dogs', 'papas', 'alitas_boneles', 'combos', 'bebidas'];

const NOMBRE_CATEGORIA = {
  hamburguesas: 'Hamburguesas',
  hot_dogs: 'Hot dogs',
  papas: 'Papas',
  alitas_boneles: 'Alitas y boneles',
  combos: 'Combos',
  bebidas: 'Bebidas',
};

export async function render(container) {
  container.innerHTML = `
    <div class="pagina-menu">
      <header class="menu-header">
        <img src="./assets/logo.webp" alt="Correa Burguer 2025" class="menu-logo">
        <div>
          <h1>Correa Burguer 2025</h1>
          <p class="menu-horario">Abre todos los días de 17:00 a 22:30</p>
        </div>
      </header>

      <div class="historias-reel" id="historias-reel"></div>

      <nav class="menu-categorias" id="nav-categorias"></nav>

      <main class="menu-lista" id="menu-lista">
        <p class="menu-cargando">Cargando menú…</p>
      </main>

      <footer class="menu-footer">
        <a href="#/admin" class="menu-footer-admin" aria-label="Panel admin" title="Panel admin">
          ${iconoEngrane()}
        </a>
        <a href="https://programix-navejl.github.io/Programix-NaveJL-Pagina-Oficial/" target="_blank" rel="noopener" class="menu-footer-credito">
          <img src="./assets/programix.png" alt="Programix NaveJL" class="menu-footer-logo">
          Hecho por Programix NaveJL · 2026
        </a>
      </footer>
    </div>

    <div class="carrito-flotante oculto" id="carrito-flotante">
      <a href="#/carrito" class="carrito-resumen">
        ${iconoCarrito()}
        <span class="carrito-resumen-texto">
          <span id="carrito-cantidad">0 productos</span>
          <span id="carrito-total">$0.00</span>
        </span>
        ${iconoFlecha()}
      </a>
    </div>
  `;

  await cargarProductos(container);
  montarCarritoFlotante(container);
  montarHistorias(container);
}

async function cargarProductos(container) {
  const lista = container.querySelector('#menu-lista');
  const nav = container.querySelector('#nav-categorias');

  const [{ data: productos, error }, { data: salsas }] = await Promise.all([
    supabase.from('productos').select('*').eq('disponible', true).order('orden', { ascending: true }),
    supabase.from('salsas').select('*').eq('activa', true).order('orden', { ascending: true }),
  ]);

  if (error) {
    lista.innerHTML = '<p class="menu-error">No se pudo cargar el menú. Intenta recargar la página.</p>';
    console.error('Error cargando productos:', error);
    return;
  }

  const salsasDisponibles = salsas ?? [];

  const porCategoria = {};
  for (const producto of productos) {
    if (!porCategoria[producto.categoria]) porCategoria[producto.categoria] = [];
    porCategoria[producto.categoria].push(producto);
  }

  const categoriasConProductos = ORDEN_CATEGORIAS.filter((cat) => porCategoria[cat]?.length);

  nav.innerHTML = categoriasConProductos
    .map((cat) => `<button type="button" class="pill" data-cat="${cat}">${NOMBRE_CATEGORIA[cat]}</button>`)
    .join('');

  nav.querySelectorAll('.pill').forEach((boton) => {
    boton.addEventListener('click', () => {
      const seccion = lista.querySelector(`#cat-${boton.dataset.cat}`);
      seccion?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  lista.innerHTML = categoriasConProductos
    .map((cat) => renderSeccionCategoria(cat, porCategoria[cat]))
    .join('');

  lista.querySelectorAll('.btn-agregar').forEach((boton) => {
    boton.addEventListener('click', () => {
      const producto = productos.find((p) => p.id === boton.dataset.id);
      if (!producto) return;

      if (producto.salsas_a_elegir > 0) {
        abrirSelectorSalsas(producto, salsasDisponibles);
      } else {
        agregarProducto(producto);
      }
    });
  });

  lista.querySelectorAll('img.producto-imagen').forEach((img) => {
    img.addEventListener('click', () => abrirVisorImagen(img.src, img.alt));
  });
}

function abrirSelectorSalsas(producto, salsasDisponibles) {
  const overlay = document.createElement('div');
  overlay.className = 'salsas-overlay';

  const maximo = producto.salsas_a_elegir;
  const plural = maximo > 1 ? 'salsas' : 'salsa';

  overlay.innerHTML = `
    <div class="salsas-modal">
      <h3 class="salsas-titulo">${producto.nombre}</h3>
      <p class="salsas-subtitulo">Elige ${maximo} ${plural}</p>

      <div class="salsas-opciones">
        ${salsasDisponibles
          .map(
            (salsa) => `
          <label class="salsa-opcion">
            <input type="checkbox" name="salsa" value="${salsa.nombre}">
            ${salsa.nombre}
          </label>
        `
          )
          .join('')}
      </div>

      <div class="salsas-acciones">
        <button type="button" class="btn-continuar" id="btn-confirmar-salsas" disabled>Agregar al carrito</button>
        <button type="button" class="btn-cancelar" id="btn-cancelar-salsas">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const checkboxes = [...overlay.querySelectorAll('input[name="salsa"]')];
  const btnConfirmar = overlay.querySelector('#btn-confirmar-salsas');

  function actualizarBloqueo() {
    const seleccionadas = checkboxes.filter((c) => c.checked).length;
    checkboxes.forEach((c) => {
      if (!c.checked) c.disabled = seleccionadas >= maximo;
    });
    btnConfirmar.disabled = seleccionadas !== maximo;
  }

  checkboxes.forEach((c) => c.addEventListener('change', actualizarBloqueo));

  function cerrar() {
    document.body.style.overflow = '';
    overlay.remove();
  }

  overlay.querySelector('#btn-cancelar-salsas').addEventListener('click', cerrar);
  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay) cerrar();
  });

  btnConfirmar.addEventListener('click', () => {
    const salsasElegidas = checkboxes.filter((c) => c.checked).map((c) => c.value);
    agregarProducto(producto, salsasElegidas);
    cerrar();
  });
}

function abrirVisorImagen(url, alt) {
  const overlay = document.createElement('div');
  overlay.className = 'visor-imagen-overlay';
  overlay.innerHTML = `
    <button class="visor-imagen-cerrar" aria-label="Cerrar">✕</button>
    <img src="${url}" alt="${alt}" class="visor-imagen-grande">
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function cerrar() {
    document.body.style.overflow = '';
    overlay.remove();
  }

  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay || evento.target.classList.contains('visor-imagen-cerrar')) {
      cerrar();
    }
  });
}

function renderSeccionCategoria(categoria, productos) {
  return `
    <section class="categoria-seccion" id="cat-${categoria}">
      <h2 class="categoria-titulo">${NOMBRE_CATEGORIA[categoria]}</h2>
      <div class="categoria-productos">
        ${productos.map(renderTarjetaProducto).join('')}
      </div>
    </section>
  `;
}

function renderTarjetaProducto(producto) {
  const imagen = producto.imagen_url
    ? `<img src="${producto.imagen_url}" alt="${producto.nombre}" class="producto-imagen">`
    : `<div class="producto-imagen producto-imagen-pendiente">${iconoFoto()}<span>Foto pendiente</span></div>`;

  const precioAnterior = producto.precio_anterior
    ? `<span class="precio-anterior">$${Number(producto.precio_anterior).toFixed(2)}</span>`
    : '';

  const etiquetaSalsas =
    producto.salsas_a_elegir > 0
      ? `<span class="producto-etiqueta-salsas">Elige ${producto.salsas_a_elegir} salsa${producto.salsas_a_elegir > 1 ? 's' : ''}</span>`
      : '';

  return `
    <article class="producto-card">
      ${imagen}
      <div class="producto-info">
        <h3 class="producto-nombre">${producto.nombre}</h3>
        <p class="producto-descripcion">${producto.descripcion ?? ''}</p>
        ${etiquetaSalsas}
        <div class="producto-precio-fila">
          <span class="producto-precio">$${Number(producto.precio).toFixed(2)}</span>
          ${precioAnterior}
        </div>
      </div>
      <button class="btn-agregar" data-id="${producto.id}" aria-label="Agregar ${producto.nombre} al carrito">${iconoMas()}</button>
    </article>
  `;
}

function iconoCarrito() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" class="icono-carrito"><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none"/><path d="M2.5 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6"/></svg>`;
}

function iconoFlecha() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="icono-flecha"><path d="M9 6l6 6-6 6"/></svg>`;
}

function iconoEngrane() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`;
}

function iconoFoto() {
  return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5-4 4-3-3-5 5"/></svg>`;
}

function iconoMas() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
}

function montarCarritoFlotante(container) {
  const flotante = container.querySelector('#carrito-flotante');
  const cantidadEl = container.querySelector('#carrito-cantidad');
  const totalEl = container.querySelector('#carrito-total');

  suscribirCarrito((items) => {
    const cantidad = items.reduce((suma, item) => suma + item.cantidad, 0);

    flotante.classList.toggle('oculto', cantidad === 0);
    cantidadEl.textContent = cantidad === 1 ? '1 producto' : `${cantidad} productos`;
    totalEl.textContent = `$${calcularTotal().toFixed(2)}`;
  });
}