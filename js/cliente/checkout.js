import { supabase } from '../supabaseClient.js';
import { obtenerCarrito, calcularTotal, vaciarCarrito } from '../estado.js';

// Datos del negocio para la transferencia. Cuando tengas número de
// WhatsApp real, actualízalo aquí (formato: código de país + número, sin +).
const CLABE_NEGOCIO = '000000000000000000';
const WHATSAPP_NEGOCIO = '529934265708';

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
          <span>Teléfono (opcional)</span>
          <input type="tel" name="telefono" maxlength="15" placeholder="993 000 0000">
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

        <label class="campo oculto" id="campo-direccion">
          <span>Dirección de entrega</span>
          <textarea name="direccion" maxlength="200" placeholder="Calle, número, colonia, referencias..."></textarea>
        </label>

        <label class="campo">
          <span>Notas para tu pedido (opcional)</span>
          <textarea name="notas" maxlength="200" placeholder="Ej. sin cebolla, tocarle bien la puerta..."></textarea>
        </label>

        <div class="checkout-total-fila">
          <span>Total a pagar</span>
          <span class="checkout-total-monto">$${calcularTotal().toFixed(2)}</span>
        </div>

        <button type="submit" class="btn-continuar" id="btn-confirmar">Confirmar pedido</button>
      </form>

      <div id="resultado-pedido"></div>
    </div>
  `;

  const form = container.querySelector('#form-checkout');
  const resultado = container.querySelector('#resultado-pedido');
  const btnConfirmar = container.querySelector('#btn-confirmar');
  const campoDireccion = container.querySelector('#campo-direccion');
  const inputDireccion = campoDireccion.querySelector('textarea');
  const radiosEntrega = container.querySelectorAll('input[name="tipo_entrega"]');

  radiosEntrega.forEach((radio) => {
    radio.addEventListener('change', () => {
      const esDomicilio = radio.value === 'domicilio' && radio.checked;
      if (radio.checked) {
        campoDireccion.classList.toggle('oculto', !esDomicilio);
        inputDireccion.required = esDomicilio;
      }
    });
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Enviando...';

    const datosForm = new FormData(form);
    const nombre = datosForm.get('nombre').trim();
    const telefono = datosForm.get('telefono').trim() || null;
    const notas = datosForm.get('notas').trim() || null;
    const tipoEntrega = datosForm.get('tipo_entrega');
    const direccion = datosForm.get('direccion')?.trim() || null;
    const total = calcularTotal();
    const items = obtenerCarrito();

    try {
      const { data, error } = await supabase.rpc('crear_pedido', {
        p_nombre: nombre,
        p_telefono: telefono,
        p_notas: notas,
        p_tipo_entrega: tipoEntrega,
        p_direccion: tipoEntrega === 'domicilio' ? direccion : null,
        p_items: items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
      });

      if (error) throw error;

      // La función regresa un arreglo con una sola fila: { id, codigo_pedido, total }
      const pedido = data[0];

      // 3. Todo salió bien: vaciar el carrito y mostrar CLABE + cajas de copiar
      vaciarCarrito();
      form.style.display = 'none';
      resultado.innerHTML = renderConfirmacion(pedido, nombre, pedido.total, tipoEntrega, direccion);
      montarBotonesCopiar(resultado);
    } catch (error) {
      console.error('Error creando el pedido:', error);
      resultado.innerHTML = `<p class="checkout-error">No se pudo enviar tu pedido. Intenta de nuevo en un momento.</p>`;
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar pedido';
    }
  });
}

function renderConfirmacion(pedido, nombre, totalRaw, tipoEntrega, direccion) {
  const total = Number(totalRaw);
  const concepto = `Pedido ${pedido.codigo_pedido}`;
  const mensaje = `Hola, soy ${nombre}, mi pedido es ${pedido.codigo_pedido} por $${total.toFixed(2)}, aquí está mi comprobante`;

  const filaEntrega =
    tipoEntrega === 'domicilio'
      ? `<p class="checkout-entrega-resumen"><strong>Entrega a domicilio:</strong> ${direccion}</p>`
      : `<p class="checkout-entrega-resumen"><strong>Para recoger en el local.</strong></p>`;

  return `
    <div class="checkout-confirmacion">
      <h2 class="checkout-codigo">${pedido.codigo_pedido}</h2>
      ${filaEntrega}
      <p class="checkout-instrucciones">Transfiere el total a esta cuenta y comparte tu comprobante por WhatsApp:</p>

      <div class="checkout-clabe">
        <span>${CLABE_NEGOCIO}</span>
        <button type="button" class="btn-copiar" data-copiar="${CLABE_NEGOCIO}">Copiar CLABE</button>
      </div>

      <label class="campo">
        <span>Concepto de transferencia</span>
        <div class="checkout-caja-copiar">
          <input type="text" readonly value="${concepto}">
          <button type="button" class="btn-copiar" data-copiar="${concepto}">Copiar</button>
        </div>
      </label>

      <label class="campo">
        <span>Mensaje para WhatsApp</span>
        <div class="checkout-caja-copiar">
          <textarea readonly>${mensaje}</textarea>
          <button type="button" class="btn-copiar" data-copiar="${mensaje}">Copiar</button>
        </div>
      </label>

      <a
        class="btn-continuar btn-whatsapp"
        href="https://wa.me/${WHATSAPP_NEGOCIO}"
        target="_blank"
        rel="noopener"
      >
        Abrir WhatsApp
      </a>

      <a href="#/menu" class="carrito-volver" style="display:block; text-align:center; margin-top:16px;">
        Hacer otro pedido
      </a>
    </div>
  `;
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