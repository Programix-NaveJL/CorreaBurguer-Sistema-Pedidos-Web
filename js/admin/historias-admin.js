import { supabase } from '../supabaseClient.js';
import { subirImagenR2 } from '../utils/subirImagenR2.js';

export async function render(container) {
  container.innerHTML = `
    <h2 class="admin-seccion-titulo">Historias</h2>

    <form id="form-nueva-historia" class="admin-historia-form">
      <label class="campo">
        <span>Foto de la historia</span>
        <input type="file" name="archivo_imagen" accept="image/*" required>
      </label>
      <label class="campo">
        <span>Texto (opcional)</span>
        <input type="text" name="texto" maxlength="80" placeholder="Ej. Boneles a $100">
      </label>
      <label class="campo">
        <span>Duración (horas)</span>
        <input type="number" name="horas" value="24" min="1" max="72" required>
      </label>
      <button type="submit" class="btn-continuar" id="btn-crear-historia">Publicar historia</button>
    </form>

    <div id="lista-historias" class="admin-historias-lista">
      <p class="menu-cargando">Cargando historias…</p>
    </div>
  `;

  container.querySelector('#form-nueva-historia').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = container.querySelector('#btn-crear-historia');
    boton.disabled = true;

    const datos = new FormData(evento.target);
    const archivo = datos.get('archivo_imagen');

    if (!archivo || archivo.size === 0) {
      alert('Selecciona una imagen.');
      boton.disabled = false;
      return;
    }

    // Se genera el id desde el navegador porque necesitamos nombrar el
    // archivo en R2 (historias/{id}.webp) antes de insertar la fila.
    const id = crypto.randomUUID();

    boton.textContent = 'Subiendo foto...';
    let imagenUrl;
    try {
      imagenUrl = await subirImagenR2({ archivo, carpeta: 'historias', nombreBase: id });
    } catch (error) {
      console.error('Error subiendo la imagen:', error);
      alert('No se pudo subir la foto.');
      boton.disabled = false;
      boton.textContent = 'Publicar historia';
      return;
    }

    boton.textContent = 'Publicando...';

    const horas = parseInt(datos.get('horas'), 10);
    const expiraEn = new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('historias').insert({
      id,
      imagen_url: imagenUrl,
      texto: datos.get('texto').trim() || null,
      expira_en: expiraEn,
    });

    if (error) {
      console.error('Error publicando historia:', error);
      alert('No se pudo publicar la historia.');
    } else {
      evento.target.reset();
      evento.target.querySelector('[name="horas"]').value = 24;
    }

    boton.disabled = false;
    boton.textContent = 'Publicar historia';
    await cargarHistorias(container);
  });

  await cargarHistorias(container);
}

async function cargarHistorias(container) {
  const lista = container.querySelector('#lista-historias');
  if (!lista) return;

  const { data: historias, error } = await supabase
    .from('historias')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    lista.innerHTML = '<p class="menu-error">No se pudieron cargar las historias.</p>';
    console.error('Error cargando historias:', error);
    return;
  }

  if (historias.length === 0) {
    lista.innerHTML = '<p class="admin-vacio">Todavía no has publicado ninguna historia.</p>';
    return;
  }

  lista.innerHTML = historias.map(renderFilaHistoria).join('');
  montarEventosHistoria(container, lista);
}

function renderFilaHistoria(historia) {
  const vencida = new Date(historia.expira_en) < new Date();
  const expira = new Date(historia.expira_en).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <div class="admin-historia-fila ${historia.activa && !vencida ? '' : 'admin-historia-inactiva'}">
      <img src="${historia.imagen_url}" alt="${historia.texto ?? ''}" class="admin-historia-thumb">
      <div class="admin-historia-info">
        <p class="admin-historia-texto">${historia.texto ?? '(sin texto)'}</p>
        <p class="admin-historia-expira">${vencida ? 'Vencida' : `Expira: ${expira}`}</p>
      </div>
      <label class="admin-toggle" title="Activa">
        <input type="checkbox" class="input-historia-activa" data-id="${historia.id}" ${historia.activa ? 'checked' : ''}>
        <span class="admin-toggle-slider"></span>
      </label>
      <button class="btn-cancelar btn-borrar-historia" data-id="${historia.id}">Borrar</button>
    </div>
  `;
}

function montarEventosHistoria(container, lista) {
  lista.querySelectorAll('.input-historia-activa').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const { error } = await supabase
        .from('historias')
        .update({ activa: checkbox.checked })
        .eq('id', checkbox.dataset.id);

      if (error) {
        console.error('Error actualizando historia:', error);
        alert('No se pudo actualizar.');
        checkbox.checked = !checkbox.checked;
      }
    });
  });

  lista.querySelectorAll('.btn-borrar-historia').forEach((boton) => {
    boton.addEventListener('click', async () => {
      if (!confirm('¿Borrar esta historia? Esto no borra la imagen del bucket, solo el registro.')) return;

      const { error } = await supabase.from('historias').delete().eq('id', boton.dataset.id);

      if (error) {
        console.error('Error borrando historia:', error);
        alert('No se pudo borrar.');
        return;
      }

      await cargarHistorias(container);
    });
  });
}