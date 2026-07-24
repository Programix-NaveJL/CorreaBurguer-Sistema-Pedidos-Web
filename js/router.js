// Router basado en hash. No usamos History API porque GitHub Pages
// sirviendo desde una subcarpeta complica las rutas "limpias" — el hash
// evita cualquier problema de path y funciona igual en cualquier hosting.

const app = document.getElementById('app');

// Cada entrada mapea un hash a un módulo que se importa DINÁMICAMENTE.
// Esto es clave: el cliente nunca descarga el código del panel admin
// (ni al revés) porque el import solo ocurre cuando esa ruta se visita.
const rutas = {
  '#/menu': () => import('./cliente/menu.js'),
  '#/carrito': () => import('./cliente/carrito.js'),
  '#/checkout': () => import('./cliente/checkout.js'),
  '#/admin': () => import('./admin/login.js'),
};

const RUTA_POR_DEFECTO = '#/menu';

async function render() {
  const hash = window.location.hash || RUTA_POR_DEFECTO;
  const cargarModulo = rutas[hash];

  if (!cargarModulo) {
    // Hash desconocido: regresa a la ruta por defecto en vez de mostrar
    // una pantalla en blanco.
    window.location.hash = RUTA_POR_DEFECTO;
    return;
  }

  app.innerHTML = '<p class="cargando">Cargando…</p>';

  try {
    const modulo = await cargarModulo();
    // Cada módulo de vista exporta una función `render(container)` que
    // se encarga de pintar su propio contenido dentro de #app.
    await modulo.render(app);
  } catch (error) {
    console.error('Error cargando la vista:', error);
    app.innerHTML = '<p class="error">Algo salió mal cargando esta sección. Intenta recargar la página.</p>';
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);