import { supabase } from '../supabaseClient.js';
import { subirImagenR2 } from '../utils/subirImagenR2.js';

const NOMBRE_CATEGORIA = {
  hamburguesas: 'Hamburguesas',
  hot_dogs: 'Hot dogs',
  papas: 'Papas',
  alitas_boneles: 'Alitas y boneles',
  combos: 'Combos',
  bebidas: 'Bebidas',
};
const ORDEN_CATEGORIAS = Object.keys(NOMBRE_CATEGORIA);

export async function render(container) {
  container.innerHTML = `
    <h2 class="admin-seccion-titulo">Productos</h2>
    <div id="admin-productos-lista"><p class="menu-cargando">Cargando productos…</p></div>
  `;
  await cargarProductos(container);
}

async function cargarProductos(container) {
  const lista = container.querySelector('#admin-productos-lista');
  if (!lista) return;

  const { data: productos, error } = await supabase
    .from('productos')
    .select('*')
    .order('orden', { ascending: true });

  if (error) {
    lista.innerHTML = '<p class="menu-error">No se pudieron cargar los productos.</p>';
    console.error('Error cargando productos:', error);
    return;
  }

  const porCategoria = {};
  for (const producto of productos) {
    if (!porCategoria[producto.categoria]) porCategoria[producto.categoria] = [];
    porCategoria[producto.categoria].push(producto);
  }

  lista.innerHTML = ORDEN_CATEGORIAS.filter((cat) => porCategoria[cat]?.length)
    .map(
      (cat) => `
      <section class="admin-categoria-seccion">
        <h3 class="admin-categoria-titulo">${NOMBRE_CATEGORIA[cat]}</h3>
        ${porCategoria[cat].map(renderFilaProducto).join('')}
      </section>
    `
    )
    .join('');

  montarEventos(container, lista);
}

function renderFilaProducto(producto) {
  const imagen = producto.imagen_url
    ? `<img src="${producto.imagen_url}" alt="${producto.nombre}" class="admin-producto-imagen">`
    : `<div class="admin-producto-imagen admin-producto-imagen-pendiente">${iconoFoto()}</div>`;

  const precioAnterior = producto.precio_anterior
    ? `<span class="precio-anterior">$${Number(producto.precio_anterior).toFixed(2)}</span>`
    : '';

  return `
    <div class="admin-producto-fila" data-id="${producto.id}">
      <div class="admin-producto-vista">
        ${imagen}
        <div class="admin-producto-info">
          <p class="admin-producto-nombre">${producto.nombre}</p>
          <p class="admin-producto-precio">$${Number(producto.precio).toFixed(2)} ${precioAnterior}${producto.salsas_a_elegir > 0 ? `<span class="admin-badge-salsas">Elige ${producto.salsas_a_elegir} salsa${producto.salsas_a_elegir > 1 ? 's' : ''}</span>` : ''}</p>
        </div>
        <label class="admin-toggle" title="Disponible">
          <input type="checkbox" class="input-disponible" data-id="${producto.id}" ${producto.disponible ? 'checked' : ''}>
          <span class="admin-toggle-slider"></span>
        </label>
        <button class="btn-editar" data-id="${producto.id}" aria-label="Editar ${producto.nombre}">${iconoLapiz()}</button>
      </div>

      <form class="admin-producto-form oculto" data-id="${producto.id}">
        <label class="campo">
          <span>Nombre</span>
          <input type="text" name="nombre" value="${producto.nombre}" required>
        </label>
        <label class="campo">
          <span>Descripción</span>
          <textarea name="descripcion">${producto.descripcion ?? ''}</textarea>
        </label>
        <div class="admin-form-fila">
          <label class="campo">
            <span>Precio</span>
            <input type="number" step="0.01" name="precio" value="${producto.precio}" required>
          </label>
          <label class="campo">
            <span>Precio anterior (opcional)</span>
            <input type="number" step="0.01" name="precio_anterior" value="${producto.precio_anterior ?? ''}">
          </label>
        </div>
        <label class="campo">
          <span>Salsas a elegir (0 = no aplica)</span>
          <input type="number" name="salsas_a_elegir" value="${producto.salsas_a_elegir ?? 0}" min="0" max="4">
        </label>
        <label class="campo">
          <span>Foto del producto</span>
          <input type="file" name="archivo_imagen" accept="image/*" class="input-archivo">
          <input type="hidden" name="imagen_url" value="${producto.imagen_url ?? ''}">
          ${
            producto.imagen_url
              ? `<span class="admin-imagen-actual">Ya tiene foto — selecciona otra solo si quieres reemplazarla.</span>`
              : `<span class="admin-imagen-actual">Sin foto todavía.</span>`
          }
        </label>

        <div class="admin-form-acciones">
          <button type="submit" class="btn-continuar admin-btn-guardar">Guardar</button>
          <button type="button" class="btn-cancelar btn-cancelar-edicion" data-id="${producto.id}">Cancelar</button>
        </div>
      </form>
    </div>
  `;
}

function montarEventos(container, lista) {
  lista.querySelectorAll('.btn-editar').forEach((boton) => {
    boton.addEventListener('click', () => {
      const fila = lista.querySelector(`.admin-producto-fila[data-id="${boton.dataset.id}"]`);
      fila.querySelector('.admin-producto-form').classList.toggle('oculto');
    });
  });

  lista.querySelectorAll('.btn-cancelar-edicion').forEach((boton) => {
    boton.addEventListener('click', () => {
      const fila = lista.querySelector(`.admin-producto-fila[data-id="${boton.dataset.id}"]`);
      fila.querySelector('.admin-producto-form').classList.add('oculto');
    });
  });

  lista.querySelectorAll('.input-disponible').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const { error } = await supabase
        .from('productos')
        .update({ disponible: checkbox.checked })
        .eq('id', checkbox.dataset.id);

      if (error) {
        console.error('Error actualizando disponibilidad:', error);
        alert('No se pudo actualizar la disponibilidad.');
        checkbox.checked = !checkbox.checked;
      }
    });
  });

  lista.querySelectorAll('.admin-producto-form').forEach((form) => {
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const datos = new FormData(form);
      const id = form.dataset.id;
      const archivo = datos.get('archivo_imagen');

      const botonGuardar = form.querySelector('.admin-btn-guardar');
      botonGuardar.disabled = true;

      let imagenUrl = datos.get('imagen_url') || null;

      if (archivo && archivo.size > 0) {
        botonGuardar.textContent = 'Subiendo foto...';
        try {
          imagenUrl = await subirImagenR2({ archivo, carpeta: 'productos', nombreBase: id });
        } catch (error) {
          console.error('Error subiendo la imagen:', error);
          alert('No se pudo subir la foto. Se van a guardar los demás cambios sin actualizar la imagen.');
        }
      }

      botonGuardar.textContent = 'Guardando...';

      const cambios = {
        nombre: datos.get('nombre').trim(),
        descripcion: datos.get('descripcion').trim() || null,
        precio: parseFloat(datos.get('precio')),
        precio_anterior: datos.get('precio_anterior') ? parseFloat(datos.get('precio_anterior')) : null,
        salsas_a_elegir: parseInt(datos.get('salsas_a_elegir'), 10) || 0,
        imagen_url: imagenUrl,
      };

      const { error } = await supabase.from('productos').update(cambios).eq('id', id);

      if (error) {
        console.error('Error guardando producto:', error);
        alert('No se pudo guardar el producto.');
        botonGuardar.disabled = false;
        botonGuardar.textContent = 'Guardar';
        return;
      }

      await cargarProductos(container);
    });
  });
}

function iconoLapiz() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
}

function iconoFoto() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5-4 4-3-3-5 5"/></svg>`;
}