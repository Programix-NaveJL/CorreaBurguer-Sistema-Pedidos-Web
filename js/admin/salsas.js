import { supabase } from '../supabaseClient.js';

export async function render(container) {
  container.innerHTML = `
    <h2 class="admin-seccion-titulo">Salsas</h2>
    <p class="admin-nota">
      Este es el catálogo que ve el cliente al elegir salsas en productos como Burger Chicken, Alitas o Boneles.
    </p>

    <form id="form-nueva-salsa" class="admin-historia-form">
      <label class="campo">
        <span>Nombre de la salsa</span>
        <input type="text" name="nombre" required maxlength="40" placeholder="Ej. Mango habanero">
      </label>
      <button type="submit" class="btn-continuar" id="btn-crear-salsa">Agregar salsa</button>
    </form>

    <div id="lista-salsas"><p class="menu-cargando">Cargando salsas…</p></div>
  `;

  container.querySelector('#form-nueva-salsa').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = container.querySelector('#btn-crear-salsa');
    boton.disabled = true;
    boton.textContent = 'Agregando...';

    const datos = new FormData(evento.target);

    const { data: existentes } = await supabase
      .from('salsas')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(1);
    const siguienteOrden = existentes?.[0]?.orden ? existentes[0].orden + 1 : 1;

    const { error } = await supabase.from('salsas').insert({
      nombre: datos.get('nombre').trim(),
      orden: siguienteOrden,
    });

    if (error) {
      console.error('Error creando salsa:', error);
      alert('No se pudo agregar la salsa.');
    } else {
      evento.target.reset();
    }

    boton.disabled = false;
    boton.textContent = 'Agregar salsa';
    await cargarSalsas(container);
  });

  await cargarSalsas(container);
}

async function cargarSalsas(container) {
  const lista = container.querySelector('#lista-salsas');
  if (!lista) return;

  const { data: salsas, error } = await supabase.from('salsas').select('*').order('orden', { ascending: true });

  if (error) {
    lista.innerHTML = '<p class="menu-error">No se pudieron cargar las salsas.</p>';
    console.error('Error cargando salsas:', error);
    return;
  }

  if (salsas.length === 0) {
    lista.innerHTML = '<p class="admin-vacio">Todavía no hay salsas configuradas.</p>';
    return;
  }

  lista.innerHTML = salsas.map(renderFilaSalsa).join('');
  montarEventosSalsa(lista);
}

function renderFilaSalsa(salsa) {
  return `
    <div class="admin-zona-fila ${salsa.activa ? '' : 'admin-historia-inactiva'}">
      <div class="admin-zona-vista">
        <span class="admin-zona-nombre">${salsa.nombre}</span>
        <label class="admin-toggle" title="Activa">
          <input type="checkbox" class="input-salsa-activa" data-id="${salsa.id}" ${salsa.activa ? 'checked' : ''}>
          <span class="admin-toggle-slider"></span>
        </label>
      </div>
    </div>
  `;
}

function montarEventosSalsa(lista) {
  lista.querySelectorAll('.input-salsa-activa').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const { error } = await supabase
        .from('salsas')
        .update({ activa: checkbox.checked })
        .eq('id', checkbox.dataset.id);
      if (error) {
        console.error('Error actualizando salsa:', error);
        alert('No se pudo actualizar.');
        checkbox.checked = !checkbox.checked;
      }
    });
  });
}