import { supabase } from '../supabaseClient.js';

const TABS = [
  { id: 'pedidos', etiqueta: 'Pedidos', modulo: () => import('./pedidos.js') },
  { id: 'repartidor', etiqueta: 'Repartidor', modulo: () => import('./repartidor.js') },
  { id: 'productos', etiqueta: 'Productos', modulo: () => import('./productos.js') },
  { id: 'zonas', etiqueta: 'Zonas de entrega', modulo: () => import('./zonas-entrega.js') },
  { id: 'historias', etiqueta: 'Historias', modulo: () => import('./historias-admin.js') },
];

export async function render(container, session) {
  container.innerHTML = `
    <div class="pagina-admin">
      <header class="admin-header">
        <h1>Panel admin</h1>
        <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
      </header>

      <p class="admin-bienvenida">Sesión iniciada como ${session.user.email}</p>

      <nav class="admin-tabs" id="admin-tabs"></nav>
      <div id="admin-contenido"></div>
    </div>
  `;

  const tabsNav = container.querySelector('#admin-tabs');
  const contenido = container.querySelector('#admin-contenido');

  tabsNav.innerHTML = TABS.map(
    (tab, i) => `<button class="admin-tab ${i === 0 ? 'activo' : ''}" data-id="${tab.id}">${tab.etiqueta}</button>`
  ).join('');

  async function activarTab(id) {
    tabsNav.querySelectorAll('.admin-tab').forEach((btn) => {
      btn.classList.toggle('activo', btn.dataset.id === id);
    });

    const tab = TABS.find((t) => t.id === id);
    contenido.innerHTML = '<p class="menu-cargando">Cargando…</p>';

    const modulo = await tab.modulo();
    await modulo.render(contenido);
  }

  tabsNav.querySelectorAll('.admin-tab').forEach((boton) => {
    boton.addEventListener('click', () => activarTab(boton.dataset.id));
  });

  container.querySelector('#btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  await activarTab(TABS[0].id);
}