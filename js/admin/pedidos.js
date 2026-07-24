import { supabase } from '../supabaseClient.js';

const ETIQUETA_ESTADO = {
  pendiente_pago: 'Pendiente de pago',
  pago_confirmado: 'Pago confirmado',
  preparando: 'Preparando',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const SIGUIENTE_ESTADO = {
  pendiente_pago: { estado: 'pago_confirmado', etiqueta: 'Confirmar pago' },
  pago_confirmado: { estado: 'preparando', etiqueta: 'Iniciar preparación' },
  preparando: { estado: 'listo', etiqueta: 'Marcar listo' },
  listo: { estado: 'entregado', etiqueta: 'Marcar entregado' },
};

let canalRealtime = null;

export async function render(container) {
  container.innerHTML = `
    <div class="admin-pedidos">
      <h2 class="admin-seccion-titulo">Pedidos</h2>
      <div id="lista-pedidos"><p class="menu-cargando">Cargando pedidos…</p></div>
    </div>
  `;

  await cargarPedidos(container);
  suscribirRealtime(container);
}

async function cargarPedidos(container) {
  const lista = container.querySelector('#lista-pedidos');
  if (!lista) return; // el admin cambió de pestaña antes de que esto terminara

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, pedido_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    lista.innerHTML = '<p class="menu-error">No se pudieron cargar los pedidos.</p>';
    console.error('Error cargando pedidos:', error);
    return;
  }

  if (pedidos.length === 0) {
    lista.innerHTML = '<p class="admin-vacio">Todavía no hay pedidos.</p>';
    return;
  }

  lista.innerHTML = pedidos.map(renderTarjetaPedido).join('');
  montarBotonesEstado(lista);
}

function renderTarjetaPedido(pedido) {
  const activo = pedido.estado !== 'entregado' && pedido.estado !== 'cancelado';
  const siguiente = SIGUIENTE_ESTADO[pedido.estado];
  const hora = new Date(pedido.created_at).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsHtml = (pedido.pedido_items || [])
    .map((item) => `<li>${item.cantidad}× ${item.nombre_producto}</li>`)
    .join('');

  const entregaHtml =
    pedido.tipo_entrega === 'domicilio'
      ? `<p class="pedido-entrega">📍 Domicilio: ${pedido.direccion ?? ''}</p>`
      : `<p class="pedido-entrega">🏪 Recoger en el local</p>`;

  return `
    <article class="pedido-card ${activo ? '' : 'pedido-card-cerrado'}">
      <div class="pedido-card-header">
        <span class="pedido-codigo">${pedido.codigo_pedido}</span>
        <span class="pedido-badge pedido-badge-${pedido.estado}">${ETIQUETA_ESTADO[pedido.estado]}</span>
      </div>

      <p class="pedido-cliente">${pedido.nombre_cliente}${pedido.telefono ? ` · ${pedido.telefono}` : ''}</p>
      <p class="pedido-hora">${hora}</p>

      ${entregaHtml}
      ${pedido.notas ? `<p class="pedido-notas">📝 ${pedido.notas}</p>` : ''}

      <ul class="pedido-items">${itemsHtml}</ul>

      <p class="pedido-total">Total: $${Number(pedido.total).toFixed(2)}</p>

      ${
        activo
          ? `
        <div class="pedido-acciones">
          ${
            siguiente
              ? `<button class="btn-avanzar" data-id="${pedido.id}" data-estado="${siguiente.estado}">${siguiente.etiqueta}</button>`
              : ''
          }
          <button class="btn-cancelar" data-id="${pedido.id}">Cancelar</button>
        </div>
      `
          : ''
      }
    </article>
  `;
}

function montarBotonesEstado(lista) {
  lista.querySelectorAll('.btn-avanzar').forEach((boton) => {
    boton.addEventListener('click', () => actualizarEstado(boton.dataset.id, boton.dataset.estado));
  });
  lista.querySelectorAll('.btn-cancelar').forEach((boton) => {
    boton.addEventListener('click', () => {
      if (confirm('¿Cancelar este pedido?')) {
        actualizarEstado(boton.dataset.id, 'cancelado');
      }
    });
  });
}

async function actualizarEstado(pedidoId, nuevoEstado) {
  const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId);
  if (error) {
    console.error('Error actualizando estado:', error);
    alert('No se pudo actualizar el pedido.');
  }
  // No hace falta recargar manualmente: la suscripción de Realtime
  // recibe el cambio y vuelve a pintar la lista sola.
}

function suscribirRealtime(container) {
  limpiarCanalAnterior();

  canalRealtime = supabase
    .channel('admin-pedidos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarPedidos(container))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => cargarPedidos(container))
    .subscribe();

  // Si el admin navega a otra pestaña o sale del panel, cerramos el canal
  // para no dejar una suscripción de Realtime abierta sin usarse.
  window.addEventListener('hashchange', limpiarCanalAnterior, { once: true });
}

function limpiarCanalAnterior() {
  if (canalRealtime) {
    supabase.removeChannel(canalRealtime);
    canalRealtime = null;
  }
}