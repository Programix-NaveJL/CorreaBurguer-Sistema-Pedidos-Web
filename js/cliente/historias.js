import { supabase } from '../supabaseClient.js';

export async function montarHistorias(container) {
  const contenedorReel = container.querySelector('#historias-reel');
  if (!contenedorReel) return;

  const { data: historias, error } = await supabase
    .from('historias')
    .select('*')
    .eq('activa', true)
    .gt('expira_en', new Date().toISOString())
    .order('orden', { ascending: true });

  if (error) {
    console.error('Error cargando historias:', error);
    contenedorReel.remove();
    return;
  }

  if (!historias || historias.length === 0) {
    // Sin historias activas: no dejamos ni el espacio vacío.
    contenedorReel.remove();
    return;
  }

  contenedorReel.innerHTML = historias
    .map(
      (historia, indice) => `
      <button class="historia-circulo" data-indice="${indice}" aria-label="Ver historia ${indice + 1}">
        <img src="${historia.imagen_url}" alt="${historia.texto ?? 'Promoción'}">
      </button>
    `
    )
    .join('');

  contenedorReel.querySelectorAll('.historia-circulo').forEach((boton) => {
    boton.addEventListener('click', () => abrirVisor(historias, Number(boton.dataset.indice)));
  });
}

const DURACION_MS = 5000;

function abrirVisor(historias, indiceInicial) {
  let indiceActual = indiceInicial;
  let temporizador = null;

  const overlay = document.createElement('div');
  overlay.className = 'historias-overlay';
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function render() {
    const historia = historias[indiceActual];

    overlay.innerHTML = `
      <div class="historias-barras">
        ${historias
          .map(
            (_, i) => `
          <div class="historia-barra">
            <div
              class="historia-barra-progreso ${i < indiceActual ? 'completa' : ''}"
              ${i === indiceActual ? 'id="barra-activa"' : ''}
            ></div>
          </div>
        `
          )
          .join('')}
      </div>

      <button class="historias-cerrar" id="historias-cerrar" aria-label="Cerrar">✕</button>

      <img src="${historia.imagen_url}" alt="${historia.texto ?? ''}" class="historias-imagen">

      ${historia.texto ? `<p class="historias-texto">${historia.texto}</p>` : ''}

      <div class="historias-zonas">
        <div class="historias-zona-izq" id="zona-anterior" aria-label="Historia anterior"></div>
        <div class="historias-zona-der" id="zona-siguiente" aria-label="Siguiente historia"></div>
      </div>
    `;

    overlay.querySelector('#historias-cerrar').addEventListener('click', cerrar);
    overlay.querySelector('#zona-anterior').addEventListener('click', anterior);
    overlay.querySelector('#zona-siguiente').addEventListener('click', siguiente);

    iniciarTemporizador();
  }

  function iniciarTemporizador() {
    clearTimeout(temporizador);
    const barra = overlay.querySelector('#barra-activa');
    if (barra) {
      barra.style.animation = 'none';
      void barra.offsetWidth; // fuerza reflow para poder reiniciar la animación
      barra.style.animation = `avanceHistoria ${DURACION_MS}ms linear forwards`;
    }
    temporizador = setTimeout(siguiente, DURACION_MS);
  }

  function siguiente() {
    if (indiceActual < historias.length - 1) {
      indiceActual += 1;
      render();
    } else {
      cerrar();
    }
  }

  function anterior() {
    if (indiceActual > 0) {
      indiceActual -= 1;
    }
    render();
  }

  function cerrar() {
    clearTimeout(temporizador);
    document.body.style.overflow = '';
    overlay.remove();
  }

  render();
}