import { supabase } from '../supabaseClient.js';
import { obtenerCarrito, calcularTotal, vaciarCarrito } from '../estado.js';
import { RESTAURANTE, calcularDistanciaKm } from '../utils/distancia.js';

const CLABE_NEGOCIO = '000000000000000000';
const WHATSAPP_NEGOCIO = '529934265708';

function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function render(container) {
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    container.innerHTML = `
      <div class="pagina-carrito">
        <p class="carrito-vacio-pagina">Tu carrito está vacío. <a href="#/menu">Ir al menú</a></p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="pagina-carrito">
      <a href="#/carrito" class="carrito-volver">&larr; Volver al carrito</a>
      <h1 style="margin-top:16px;">Confirmar pedido</h1>

      <form id="form-checkout" class="form-checkout">
        <label class="campo">
          <span>Tu nombre</span>
          <input type="text" name="nombre" required maxlength="60" placeholder="¿Cómo te llamas?">
        </label>

        <label class="campo">
          <span>Teléfono</span>
          <input type="tel" name="telefono" required maxlength="15" placeholder="993 000 0000">
        </label>

        <div class="campo">
          <span>¿Cómo lo quieres?</span>
          <div class="checkout-entrega-opciones">
            <label class="checkout-radio">
              <input type="radio" name="tipo_entrega" value="recoger" checked>
              Recoger en el local
            </label>
            <label class="checkout-radio">
              <input type="radio" name="tipo_entrega" value="domicilio">
              A domicilio
            </label>
          </div>
        </div>

        <div class="campo oculto" id="campo-colonia">
          <span>¿En qué colonia te encuentras?</span>
          <div class="checkout-colonia-opciones" id="colonia-opciones"></div>
        </div>

        <label class="campo oculto" id="campo-referencias">
          <span>Referencias de domicilio</span>
          <textarea name="direccion" maxlength="200" placeholder="Ej. Col. Espejo 1, casa azul, portón negro..."></textarea>
          <p class="checkout-colonia-aviso oculto" id="aviso-colonia"></p>
          <p class="checkout-ubicacion-nota oculto" id="ubicacion-nota"></p>
        </label>

        <div class="campo oculto" id="campo-distancia">
          <span>Distancia y costo de envío</span>
          <p class="checkout-distancia-info" id="distancia-info">Calculando tu ubicación…</p>
          <button type="button" class="btn-cancelar oculto" id="btn-reintentar-ubicacion">Reintentar ubicación</button>
        </div>

        <label class="campo">
          <span>Notas para tu pedido (opcional)</span>
          <textarea name="notas" maxlength="200" placeholder="Ej. sin cebolla..."></textarea>
        </label>

        <div class="campo">
          <span>¿Cómo vas a pagar?</span>
          <div class="checkout-entrega-opciones">
            <label class="checkout-radio">
              <input type="radio" name="metodo_pago" value="transferencia" checked>
              Transferencia
            </label>
            <label class="checkout-radio">
              <input type="radio" name="metodo_pago" value="efectivo">
              Efectivo
            </label>
          </div>
        </div>

        <label class="campo oculto" id="campo-efectivo">
          <span>¿Con cuánto vas a pagar?</span>
          <input type="number" name="monto_efectivo" min="0" step="1" placeholder="Ej. 200">
          <p class="checkout-cambio-info" id="cambio-info"></p>
        </label>

        <div class="checkout-total-fila">
          <span>Total a pagar</span>
          <span class="checkout-total-monto" id="checkout-total-monto">$${calcularTotal().toFixed(2)}</span>
        </div>

        <button type="submit" class="btn-continuar" id="btn-confirmar">Confirmar pedido</button>
      </form>

      <div id="resultado-pedido"></div>
    </div>
  `;

  const form = container.querySelector('#form-checkout');
  const resultado = container.querySelector('#resultado-pedido');
  const btnConfirmar = container.querySelector('#btn-confirmar');
  const campoColonia = container.querySelector('#campo-colonia');
  const coloniaOpciones = container.querySelector('#colonia-opciones');
  const campoReferencias = container.querySelector('#campo-referencias');
  const inputReferencias = campoReferencias.querySelector('textarea');
  const avisoColonia = container.querySelector('#aviso-colonia');
  const ubicacionNota = container.querySelector('#ubicacion-nota');
  const campoDistancia = container.querySelector('#campo-distancia');
  const distanciaInfo = container.querySelector('#distancia-info');
  const btnReintentar = container.querySelector('#btn-reintentar-ubicacion');
  const totalMontoEl = container.querySelector('#checkout-total-monto');
  const radiosEntrega = container.querySelectorAll('input[name="tipo_entrega"]');
  const radiosPago = container.querySelectorAll('input[name="metodo_pago"]');
  const campoEfectivo = container.querySelector('#campo-efectivo');
  const inputMontoEfectivo = campoEfectivo.querySelector('input[name="monto_efectivo"]');
  const cambioInfo = container.querySelector('#cambio-info');

  let zonas = [];
  let zonasColonia = [];
  let zonaSeleccionada = null; // zona elegida (colonia conocida) o encontrada (por distancia)
  let esOtraColonia = false;
  let clienteLat = null;
  let clienteLng = null;

  const { data: zonasData, error: errorZonas } = await supabase
    .from('zonas_entrega')
    .select('*')
    .eq('activa', true)
    .order('orden', { ascending: true });

  if (!errorZonas) {
    zonas = zonasData;
    zonasColonia = zonas.filter((z) => z.colonia_clave);
  }

  coloniaOpciones.innerHTML =
    zonasColonia
      .map(
        (zona) => `
      <label class="checkout-radio">
        <input type="radio" name="colonia" value="${zona.id}">
        ${zona.nombre} — $${Number(zona.costo).toFixed(2)}
      </label>
    `
      )
      .join('') +
    `
    <label class="checkout-radio">
      <input type="radio" name="colonia" value="otra">
      Mi colonia no está en la lista
    </label>
  `;

  function totalActual() {
    const costoEnvio = zonaSeleccionada ? Number(zonaSeleccionada.costo) : 0;
    return calcularTotal() + costoEnvio;
  }

  function actualizarTotalMostrado() {
    totalMontoEl.textContent = `$${totalActual().toFixed(2)}`;
    actualizarCambio();
  }

  function esEfectivoValido() {
    const metodoPago = container.querySelector('input[name="metodo_pago"]:checked')?.value;
    if (metodoPago !== 'efectivo') return true;

    const monto = parseFloat(inputMontoEfectivo.value);
    return !Number.isNaN(monto) && monto >= totalActual();
  }

  function actualizarCambio() {
    const metodoPago = container.querySelector('input[name="metodo_pago"]:checked')?.value;
    if (metodoPago !== 'efectivo') {
      cambioInfo.classList.add('oculto');
      return;
    }

    const monto = parseFloat(inputMontoEfectivo.value);
    if (Number.isNaN(monto)) {
      cambioInfo.textContent = '';
      cambioInfo.classList.add('oculto');
      return;
    }

    const total = totalActual();
    if (monto < total) {
      cambioInfo.textContent = `Te falta cubrir el total ($${total.toFixed(2)}) — ajusta el monto.`;
      cambioInfo.classList.remove('oculto', 'checkout-cambio-ok');
      cambioInfo.classList.add('checkout-cambio-error');
    } else {
      const cambio = monto - total;
      cambioInfo.textContent = cambio > 0 ? `Tu cambio será de $${cambio.toFixed(2)}.` : 'Pago exacto, sin cambio.';
      cambioInfo.classList.remove('oculto', 'checkout-cambio-error');
      cambioInfo.classList.add('checkout-cambio-ok');
    }
  }

  function verificarReferencias() {
    if (esOtraColonia || !zonaSeleccionada?.colonia_clave) {
      avisoColonia.classList.add('oculto');
      return true;
    }

    const texto = normalizarTexto(inputReferencias.value);
    const clave = normalizarTexto(zonaSeleccionada.colonia_clave);
    const coincide = texto.includes(clave);

    avisoColonia.textContent = coincide
      ? ''
      : `Tus referencias no mencionan "${zonaSeleccionada.nombre}" — agrégalo o corrige la colonia seleccionada.`;
    avisoColonia.classList.toggle('oculto', coincide);

    return coincide;
  }

  function actualizarEstadoBoton() {
    const esDomicilio = container.querySelector('input[name="tipo_entrega"]:checked')?.value === 'domicilio';
    let habilitado = true;

    if (esDomicilio) {
      const coloniaElegida = coloniaOpciones.querySelector('input[name="colonia"]:checked');
      if (!coloniaElegida) {
        habilitado = false;
      } else if (esOtraColonia) {
        habilitado = Boolean(zonaSeleccionada);
      } else {
        habilitado = verificarReferencias();
      }
    }

    if (habilitado) {
      habilitado = esEfectivoValido();
    }

    btnConfirmar.disabled = !habilitado;
  }

  function intentarUbicacionSilenciosa() {
    if (!navigator.geolocation) return;

    ubicacionNota.textContent = '📍 Obteniendo tu ubicación exacta para ayudar al repartidor…';
    ubicacionNota.classList.remove('oculto');

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        clienteLat = posicion.coords.latitude;
        clienteLng = posicion.coords.longitude;
        ubicacionNota.textContent = '📍 Ubicación exacta obtenida — ayuda al repartidor a encontrarte más fácil.';
      },
      (error) => {
        console.error('No se pudo obtener ubicación silenciosa:', error);
        ubicacionNota.textContent =
          '⚠️ No pudimos obtener tu ubicación exacta (puede estar bloqueada en tu navegador). No es obligatorio, pero ayuda al repartidor a encontrarte más rápido.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function solicitarUbicacion() {
    zonaSeleccionada = null;
    btnReintentar.classList.add('oculto');
    actualizarEstadoBoton();

    if (!navigator.geolocation) {
      distanciaInfo.textContent = 'Tu navegador no soporta ubicación automática. Contáctanos por WhatsApp para cotizar tu envío.';
      return;
    }

    distanciaInfo.textContent = 'Calculando tu distancia al local…';

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        clienteLat = posicion.coords.latitude;
        clienteLng = posicion.coords.longitude;

        const distanciaKm = calcularDistanciaKm(clienteLat, clienteLng, RESTAURANTE.lat, RESTAURANTE.lng);
        const zonaEncontrada = zonas
          .filter((z) => z.distancia_min != null && z.distancia_max != null)
          .find((z) => distanciaKm >= z.distancia_min && distanciaKm <= z.distancia_max);

        if (!zonaEncontrada) {
          distanciaInfo.textContent = `📍 Estás a ${distanciaKm.toFixed(1)} km, fuera de nuestras zonas de entrega configuradas. Contáctanos por WhatsApp para cotizar tu envío.`;
          actualizarEstadoBoton();
          return;
        }

        zonaSeleccionada = zonaEncontrada;
        distanciaInfo.textContent = `📍 Distancia detectada: ${distanciaKm.toFixed(1)} km — Costo de envío: $${Number(zonaEncontrada.costo).toFixed(2)} (${zonaEncontrada.nombre})`;
        actualizarTotalMostrado();
        actualizarEstadoBoton();
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        distanciaInfo.textContent = 'No pudimos obtener tu ubicación. La necesitamos para calcular el envío fuera de las colonias conocidas.';
        btnReintentar.classList.remove('oculto');
        actualizarEstadoBoton();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  btnReintentar.addEventListener('click', solicitarUbicacion);
  inputReferencias.addEventListener('input', () => {
    actualizarEstadoBoton();
  });

  radiosPago.forEach((radio) => {
    radio.addEventListener('change', () => {
      const esEfectivo = radio.value === 'efectivo' && radio.checked;
      if (!radio.checked) return;
      campoEfectivo.classList.toggle('oculto', !esEfectivo);
      inputMontoEfectivo.required = esEfectivo;
      actualizarCambio();
      actualizarEstadoBoton();
    });
  });

  inputMontoEfectivo.addEventListener('input', () => {
    actualizarCambio();
    actualizarEstadoBoton();
  });

  coloniaOpciones.querySelectorAll('input[name="colonia"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      esOtraColonia = radio.value === 'otra';
      campoDistancia.classList.toggle('oculto', !esOtraColonia);

      if (esOtraColonia) {
        zonaSeleccionada = null;
        solicitarUbicacion();
      } else {
        zonaSeleccionada = zonasColonia.find((z) => z.id === radio.value) ?? null;
        actualizarTotalMostrado();
      }
      actualizarEstadoBoton();
    });
  });

  radiosEntrega.forEach((radio) => {
    radio.addEventListener('change', () => {
      const esDomicilio = radio.value === 'domicilio' && radio.checked;
      if (!radio.checked) return;

      campoColonia.classList.toggle('oculto', !esDomicilio);
      campoReferencias.classList.toggle('oculto', !esDomicilio);
      campoDistancia.classList.add('oculto');
      inputReferencias.required = esDomicilio;

      if (esDomicilio) {
        intentarUbicacionSilenciosa();
      } else {
        zonaSeleccionada = null;
        esOtraColonia = false;
        coloniaOpciones.querySelectorAll('input[name="colonia"]').forEach((r) => (r.checked = false));
        avisoColonia.classList.add('oculto');
      }

      actualizarTotalMostrado();
      actualizarEstadoBoton();
    });
  });

  actualizarEstadoBoton();

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Enviando...';

    const datosForm = new FormData(form);
    const nombre = datosForm.get('nombre').trim();
    const telefono = datosForm.get('telefono').trim();
    const notas = datosForm.get('notas').trim() || null;
    const tipoEntrega = datosForm.get('tipo_entrega');
    const referencias = datosForm.get('direccion')?.trim() || null;
    const metodoPago = datosForm.get('metodo_pago');
    const montoEfectivo = metodoPago === 'efectivo' ? parseFloat(datosForm.get('monto_efectivo')) : null;

    const zonaEntregaId = tipoEntrega === 'domicilio' && !esOtraColonia ? zonaSeleccionada?.id ?? null : null;

    const items = obtenerCarrito();

    try {
      const { data, error } = await supabase.rpc('crear_pedido', {
        p_nombre: nombre,
        p_telefono: telefono,
        p_notas: notas,
        p_tipo_entrega: tipoEntrega,
        p_direccion: tipoEntrega === 'domicilio' ? referencias : null,
        p_zona_entrega_id: zonaEntregaId,
        p_cliente_lat: tipoEntrega === 'domicilio' ? clienteLat : null,
        p_cliente_lng: tipoEntrega === 'domicilio' ? clienteLng : null,
        p_metodo_pago: metodoPago,
        p_monto_efectivo: montoEfectivo,
        p_items: items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
      });

      if (error) throw error;

      const pedido = data[0];

      vaciarCarrito();
      form.style.display = 'none';
      resultado.innerHTML = renderConfirmacion(
        pedido,
        nombre,
        pedido.total,
        tipoEntrega,
        referencias,
        zonaSeleccionada,
        metodoPago,
        montoEfectivo,
        items
      );
      montarBotonesCopiar(resultado);
      montarBotonCaptura(resultado, pedido.codigo_pedido);
    } catch (error) {
      console.error('Error creando el pedido:', error);
      resultado.innerHTML = `<p class="checkout-error">${error.message || 'No se pudo enviar tu pedido. Intenta de nuevo.'}</p>`;
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar pedido';
    }
  });
}

function renderConfirmacion(pedido, nombre, totalRaw, tipoEntrega, referencias, zonaSeleccionada, metodoPago, montoEfectivo, items) {
  const total = Number(totalRaw);

  const filaEntrega =
    tipoEntrega === 'domicilio'
      ? `<p class="checkout-entrega-resumen"><strong>Entrega a domicilio (${zonaSeleccionada?.nombre ?? ''}, +$${Number(zonaSeleccionada?.costo ?? 0).toFixed(2)}):</strong> ${referencias}</p>`
      : `<p class="checkout-entrega-resumen"><strong>Para recoger en el local.</strong></p>`;

  const detalleItems = `
    <div class="checkout-detalle-pedido">
      <p class="checkout-detalle-titulo">Tu pedido</p>
      <ul class="checkout-detalle-lista">
        ${items
          .map(
            (item) => `
          <li>
            <span>${item.cantidad}× ${item.nombre}</span>
            <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
          </li>
        `
          )
          .join('')}
      </ul>
    </div>
  `;

  const botonCaptura = `
    <button type="button" class="btn-continuar btn-captura no-captura" id="btn-guardar-captura">
      📸 Guardar captura del pedido
    </button>
  `;

  if (metodoPago === 'efectivo') {
    const cambio = montoEfectivo - total;
    return `
      <div class="checkout-confirmacion">
        <h2 class="checkout-codigo">${pedido.codigo_pedido}</h2>
        ${filaEntrega}
        <p class="checkout-instrucciones">Pagas en efectivo ${tipoEntrega === 'domicilio' ? 'al repartidor' : 'al recoger'}.</p>

        <div class="checkout-clabe">
          <span>Pagas con $${montoEfectivo.toFixed(2)} — tu cambio: $${cambio.toFixed(2)}</span>
        </div>

        ${detalleItems}

        <p class="checkout-total-final">Total: $${total.toFixed(2)}</p>

        ${botonCaptura}

        <a href="#/menu" class="carrito-volver no-captura" style="display:block; text-align:center; margin-top:16px;">
          Hacer otro pedido
        </a>
      </div>
    `;
  }

  const concepto = `Pedido ${pedido.codigo_pedido}`;
  const mensaje = `Hola, soy ${nombre}, mi pedido es ${pedido.codigo_pedido} por $${total.toFixed(2)}, aquí está mi comprobante`;

  return `
    <div class="checkout-confirmacion">
      <h2 class="checkout-codigo">${pedido.codigo_pedido}</h2>
      ${filaEntrega}
      <p class="checkout-instrucciones">Transfiere el total a esta cuenta y comparte tu comprobante por WhatsApp:</p>

      <div class="checkout-clabe">
        <span>${CLABE_NEGOCIO}</span>
        <button type="button" class="btn-copiar no-captura" data-copiar="${CLABE_NEGOCIO}">Copiar CLABE</button>
      </div>

      <label class="campo">
        <span>Concepto de transferencia</span>
        <div class="checkout-caja-copiar">
          <input type="text" readonly value="${concepto}">
          <button type="button" class="btn-copiar no-captura" data-copiar="${concepto}">Copiar</button>
        </div>
      </label>

      <label class="campo">
        <span>Mensaje para WhatsApp</span>
        <div class="checkout-caja-copiar">
          <textarea readonly>${mensaje}</textarea>
          <button type="button" class="btn-copiar no-captura" data-copiar="${mensaje}">Copiar</button>
        </div>
      </label>

      ${detalleItems}

      <p class="checkout-total-final">Total: $${total.toFixed(2)}</p>

      <a class="btn-continuar btn-whatsapp no-captura" href="https://wa.me/${WHATSAPP_NEGOCIO}" target="_blank" rel="noopener">
        Abrir WhatsApp
      </a>

      ${botonCaptura}

      <a href="#/menu" class="carrito-volver no-captura" style="display:block; text-align:center; margin-top:16px;">
        Hacer otro pedido
      </a>
    </div>
  `;
}

function montarBotonCaptura(container, codigoPedido) {
  const boton = container.querySelector('#btn-guardar-captura');
  if (!boton) return;

  boton.addEventListener('click', async () => {
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Generando imagen...';

    try {
      const { default: html2canvas } = await import('https://esm.sh/html2canvas@1.4.1');
      const elemento = container.querySelector('.checkout-confirmacion');

      const canvas = await html2canvas(elemento, {
        backgroundColor: '#1A1613',
        scale: 2,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('.no-captura').forEach((el) => {
            el.style.display = 'none';
          });
        },
      });

      const enlace = document.createElement('a');
      enlace.download = `pedido-${codigoPedido}.png`;
      enlace.href = canvas.toDataURL('image/png');
      enlace.click();
    } catch (error) {
      console.error('No se pudo generar la captura:', error);
      alert('No se pudo generar la captura. Intenta de nuevo o toma un screenshot manual.');
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
}

function montarBotonesCopiar(container) {
  container.querySelectorAll('.btn-copiar').forEach((boton) => {
    boton.addEventListener('click', async () => {
      const texto = boton.dataset.copiar;
      try {
        await navigator.clipboard.writeText(texto);
        const original = boton.textContent;
        boton.textContent = '¡Copiado!';
        setTimeout(() => (boton.textContent = original), 1500);
      } catch (error) {
        console.error('No se pudo copiar:', error);
      }
    });
  });
}