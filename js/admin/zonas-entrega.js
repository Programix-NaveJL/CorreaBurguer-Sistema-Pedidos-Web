import { supabase } from '../supabaseClient.js';

export async function render(container) {
  container.innerHTML = `
    <h2 class="admin-seccion-titulo">Zonas de entrega</h2>
    <p class="admin-nota">
      El km "mínimo" y "máximo" son los que usa el sistema para detectar la zona automáticamente
      según la distancia del cliente. Si los dejas vacíos, esa zona no se asigna sola — tendrás
      que definir su rango para que funcione.
    </p>

    <form id="form-nueva-zona" class="admin-historia-form">
      <div class="admin-form-fila">
        <label class="campo">
          <span>Nombre de la zona</span>
          <input type="text" name="nombre" required maxlength="60" placeholder="Ej. Espejo 3...">
        </label>
        <label class="campo">
          <span>Costo</span>
          <input type="number" step="0.01" name="costo" required min="0">
        </label>
      </div>
      <div class="admin-form-fila">
        <label class="campo">
          <span>Desde (km)</span>
          <input type="number" step="0.01" name="distancia_min" min="0" placeholder="Ej. 0">
        </label>
        <label class="campo">
          <span>Hasta (km)</span>
          <input type="number" step="0.01" name="distancia_max" min="0" placeholder="Ej. 4">
        </label>
      </div>
      <label class="campo">
        <span>Palabra clave de colonia (opcional, para que el cliente la pueda elegir de la lista)</span>
        <input type="text" name="colonia_clave" maxlength="60" placeholder="Ej. espejo 1">
      </label>
      <button type="submit" class="btn-continuar" id="btn-crear-zona">Agregar zona</button>
    </form>

    <div id="lista-zonas"><p class="menu-cargando">Cargando zonas…</p></div>
  `;

  container.querySelector('#form-nueva-zona').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = container.querySelector('#btn-crear-zona');
    boton.disabled = true;
    boton.textContent = 'Agregando...';

    const datos = new FormData(evento.target);

    const { data: existentes } = await supabase
      .from('zonas_entrega')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(1);
    const siguienteOrden = existentes?.[0]?.orden ? existentes[0].orden + 1 : 1;

    const { error } = await supabase.from('zonas_entrega').insert({
      nombre: datos.get('nombre').trim(),
      costo: parseFloat(datos.get('costo')),
      distancia_min: datos.get('distancia_min') ? parseFloat(datos.get('distancia_min')) : null,
      distancia_max: datos.get('distancia_max') ? parseFloat(datos.get('distancia_max')) : null,
      colonia_clave: datos.get('colonia_clave')?.trim() || null,
      orden: siguienteOrden,
    });

    if (error) {
      console.error('Error creando zona:', error);
      alert('No se pudo agregar la zona.');
    } else {
      evento.target.reset();
    }

    boton.disabled = false;
    boton.textContent = 'Agregar zona';
    await cargarZonas(container);
  });

  await cargarZonas(container);
}

async function cargarZonas(container) {
  const lista = container.querySelector('#lista-zonas');
  if (!lista) return;

  const { data: zonas, error } = await supabase
    .from('zonas_entrega')
    .select('*')
    .order('orden', { ascending: true });

  if (error) {
    lista.innerHTML = '<p class="menu-error">No se pudieron cargar las zonas.</p>';
    console.error('Error cargando zonas:', error);
    return;
  }

  if (zonas.length === 0) {
    lista.innerHTML = '<p class="admin-vacio">Todavía no hay zonas configuradas.</p>';
    return;
  }

  lista.innerHTML = zonas.map(renderFilaZona).join('');
  montarEventosZona(container, lista);
}

function renderFilaZona(zona) {
  let rangoTexto;
  if (zona.distancia_min !== null && zona.distancia_max !== null) {
    rangoTexto = `Se asigna por distancia: ${zona.distancia_min} a ${zona.distancia_max} km`;
  } else if (zona.colonia_clave) {
    rangoTexto = 'Se asigna por colonia (no necesita rango de km)';
  } else {
    rangoTexto = '⚠️ Sin colonia ni rango de km — esta zona nunca se va a asignar sola';
  }
  const coloniaTexto = zona.colonia_clave ? ` · Colonia: "${zona.colonia_clave}"` : '';

  return `
    <div class="admin-zona-fila ${zona.activa ? '' : 'admin-historia-inactiva'}" data-id="${zona.id}">
      <div class="admin-zona-vista">
        <div>
          <span class="admin-zona-nombre">${zona.nombre}</span>
          <p class="admin-zona-rango">${rangoTexto}${coloniaTexto}</p>
        </div>
        <span class="admin-zona-costo">$${Number(zona.costo).toFixed(2)}</span>
        <label class="admin-toggle" title="Activa">
          <input type="checkbox" class="input-zona-activa" data-id="${zona.id}" ${zona.activa ? 'checked' : ''}>
          <span class="admin-toggle-slider"></span>
        </label>
        <button class="btn-editar" data-id="${zona.id}" aria-label="Editar ${zona.nombre}">${iconoLapiz()}</button>
      </div>

      <form class="admin-zona-form oculto" data-id="${zona.id}">
        <div class="admin-form-fila">
          <label class="campo">
            <span>Nombre</span>
            <input type="text" name="nombre" value="${zona.nombre}" required>
          </label>
          <label class="campo">
            <span>Costo</span>
            <input type="number" step="0.01" name="costo" value="${zona.costo}" required min="0">
          </label>
        </div>
        <div class="admin-form-fila">
          <label class="campo">
            <span>Desde (km)</span>
            <input type="number" step="0.01" name="distancia_min" value="${zona.distancia_min ?? ''}" min="0">
          </label>
          <label class="campo">
            <span>Hasta (km)</span>
            <input type="number" step="0.01" name="distancia_max" value="${zona.distancia_max ?? ''}" min="0">
          </label>
        </div>
        <label class="campo">
          <span>Palabra clave de colonia (opcional)</span>
          <input type="text" name="colonia_clave" value="${zona.colonia_clave ?? ''}" maxlength="60">
        </label>
        <div class="admin-form-acciones">
          <button type="submit" class="btn-continuar admin-btn-guardar">Guardar</button>
          <button type="button" class="btn-cancelar btn-cancelar-edicion" data-id="${zona.id}">Cancelar</button>
        </div>
      </form>
    </div>
  `;
}

function montarEventosZona(container, lista) {
  lista.querySelectorAll('.btn-editar').forEach((boton) => {
    boton.addEventListener('click', () => {
      const fila = lista.querySelector(`.admin-zona-fila[data-id="${boton.dataset.id}"]`);
      fila.querySelector('.admin-zona-form').classList.toggle('oculto');
    });
  });

  lista.querySelectorAll('.btn-cancelar-edicion').forEach((boton) => {
    boton.addEventListener('click', () => {
      const fila = lista.querySelector(`.admin-zona-fila[data-id="${boton.dataset.id}"]`);
      fila.querySelector('.admin-zona-form').classList.add('oculto');
    });
  });

  lista.querySelectorAll('.input-zona-activa').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const { error } = await supabase
        .from('zonas_entrega')
        .update({ activa: checkbox.checked })
        .eq('id', checkbox.dataset.id);
      if (error) {
        console.error('Error actualizando zona:', error);
        alert('No se pudo actualizar.');
        checkbox.checked = !checkbox.checked;
      }
    });
  });

  lista.querySelectorAll('.admin-zona-form').forEach((form) => {
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const datos = new FormData(form);
      const id = form.dataset.id;

      const cambios = {
        nombre: datos.get('nombre').trim(),
        costo: parseFloat(datos.get('costo')),
        distancia_min: datos.get('distancia_min') ? parseFloat(datos.get('distancia_min')) : null,
        distancia_max: datos.get('distancia_max') ? parseFloat(datos.get('distancia_max')) : null,
        colonia_clave: datos.get('colonia_clave')?.trim() || null,
      };

      const boton = form.querySelector('.admin-btn-guardar');
      boton.disabled = true;
      boton.textContent = 'Guardando...';

      const { error } = await supabase.from('zonas_entrega').update(cambios).eq('id', id);

      if (error) {
        console.error('Error guardando zona:', error);
        alert('No se pudo guardar la zona.');
        boton.disabled = false;
        boton.textContent = 'Guardar';
        return;
      }

      await cargarZonas(container);
    });
  });
}

function iconoLapiz() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
}