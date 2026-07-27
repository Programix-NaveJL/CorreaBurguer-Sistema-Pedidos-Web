import { supabase } from '../supabaseClient.js';
import { RESTAURANTE, calcularDistanciaKm } from '../utils/distancia.js';

// Estados en los que un pedido a domicilio ya vale la pena mostrarle
// al repartidor (todavía no cancelado ni ya entregado).
const ESTADOS_ACTIVOS = ['pago_confirmado', 'preparando', 'listo'];

const ETIQUETA_ESTADO = {
  pago_confirmado: 'Pago confirmado',
  preparando: 'Preparando',
  listo: 'Listo para salir',
};

let canalRealtime = null;

export async function render(container) {
  container.innerHTML = `
    <h2 class="admin-seccion-titulo">Repartidor</h2>
    <div id="lista-repartidor"><p class="menu-cargando">Cargando entregas…</p></div>
  `;

  await cargarEntregas(container);
  suscribirRealtime(container);
}

async function cargarEntregas(container) {
  const lista = container.querySelector('#lista-repartidor');
  if (!lista) return;

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, pedido_items(*)')
    .eq('tipo_entrega', 'domicilio')
    .in('estado', ESTADOS_ACTIVOS)
    .order('created_at', { ascending: true });

  if (error) {
    lista.innerHTML = '<p class="menu-error">No se pudieron cargar las entregas.</p>';
    console.error('Error cargando entregas:', error);
    return;
  }

  if (pedidos.length === 0) {
    lista.innerHTML = '<p class="admin-vacio">No hay entregas pendientes en este momento.</p>';
    return;
  }

  lista.innerHTML = pedidos.map(renderTarjetaEntrega).join('');
  montarEventos(lista);
}

function renderTarjetaEntrega(pedido) {
  const itemsHtml = (pedido.pedido_items || [])
    .map((item) => `<li>${item.cantidad}× ${item.nombre_producto}</li>`)
    .join('');

  const destinoMaps =
    pedido.cliente_lat && pedido.cliente_lng
      ? `${pedido.cliente_lat},${pedido.cliente_lng}`
      : encodeURIComponent(pedido.direccion ?? '');

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinoMaps}`;

  const distanciaTexto =
    pedido.cliente_lat && pedido.cliente_lng
      ? `${calcularDistanciaKm(pedido.cliente_lat, pedido.cliente_lng, RESTAURANTE.lat, RESTAURANTE.lng).toFixed(1)} km del local`
      : null;

  return `
    <article class="pedido-card">
      <div class="pedido-card-header">
        <span class="pedido-codigo">${pedido.codigo_pedido}</span>
        <span class="pedido-badge pedido-badge-${pedido.estado}">${ETIQUETA_ESTADO[pedido.estado]}</span>
      </div>

      <p class="pedido-cliente">${pedido.nombre_cliente}${pedido.telefono ? ` · ${pedido.telefono}` : ''}</p>
      ${distanciaTexto ? `<p class="pedido-distancia">🚗 ${distanciaTexto}</p>` : ''}
      <p class="pedido-entrega">📍 ${pedido.direccion ?? ''}</p>
      ${
        !pedido.cliente_lat
          ? `<p class="pedido-notas">⚠️ El cliente no compartió su ubicación exacta — el link abre según la dirección escrita.</p>`
          : ''
      }
      ${pedido.zona_entrega ? `<p class="pedido-entrega">Zona: ${pedido.zona_entrega} (+$${Number(pedido.costo_envio).toFixed(2)})</p>` : ''}
      ${pedido.notas ? `<p class="pedido-notas">📝 ${pedido.notas}</p>` : ''}

      <ul class="pedido-items">${itemsHtml}</ul>

      <p class="pedido-total">Total: $${Number(pedido.total).toFixed(2)}</p>
      ${
        pedido.metodo_pago === 'efectivo'
          ? `<p class="pedido-notas">💵 Lleva cambio: paga con $${Number(pedido.monto_efectivo).toFixed(2)}, cambio $${Number(pedido.cambio).toFixed(2)}</p>`
          : `<p class="pedido-notas">💳 Ya pagó por transferencia</p>`
      }

      <div class="pedido-acciones">
        <a class="btn-avanzar" href="${mapsUrl}" target="_blank" rel="noopener">Abrir en Google Maps</a>
        ${
          pedido.telefono
            ? `<a class="btn-cancelar btn-llamar" href="https://wa.me/52${pedido.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener">💬 WhatsApp</a>`
            : ''
        }
        ${
          pedido.estado === 'listo'
            ? `<button class="btn-cancelar btn-entregado" data-id="${pedido.id}">Marcar entregado</button>`
            : ''
        }
      </div>
    </article>
  `;
}

function montarEventos(lista) {
  lista.querySelectorAll('.btn-entregado').forEach((boton) => {
    boton.addEventListener('click', async () => {
      const { error } = await supabase.from('pedidos').update({ estado: 'entregado' }).eq('id', boton.dataset.id);
      if (error) {
        console.error('Error marcando entregado:', error);
        alert('No se pudo actualizar el pedido.');
      }
    });
  });
}

function suscribirRealtime(container) {
  limpiarCanalAnterior();

  canalRealtime = supabase
    .channel('admin-repartidor')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarEntregas(container))
    .subscribe();

  window.addEventListener('hashchange', limpiarCanalAnterior, { once: true });
}

function limpiarCanalAnterior() {
  if (canalRealtime) {
    supabase.removeChannel(canalRealtime);
    canalRealtime = null;
  }
}