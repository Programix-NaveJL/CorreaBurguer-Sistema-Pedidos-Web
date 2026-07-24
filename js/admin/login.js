import { supabase } from '../supabaseClient.js';
import { render as renderPanel } from './panel.js';

export async function render(container) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const esAdmin = await verificarAdmin();
    if (esAdmin) {
      renderPanel(container, session);
      return;
    }
    // Sesión válida pero la cuenta no está en la tabla admins.
    await supabase.auth.signOut();
    renderFormulario(container, 'Esta cuenta no tiene permisos de administrador.');
    return;
  }

  renderFormulario(container);
}

function renderFormulario(container, errorInicial = '') {
  container.innerHTML = `
    <div class="pagina-login">
      <div class="login-card">
        <h1>Panel admin</h1>
        <p class="login-subtitulo">Correa Burguer 2025</p>

        <form id="form-login" class="form-checkout">
          <label class="campo">
            <span>Correo</span>
            <input type="email" name="email" required autocomplete="username">
          </label>
          <label class="campo">
            <span>Contraseña</span>
            <input type="password" name="password" required autocomplete="current-password">
          </label>

          <p class="login-error ${errorInicial ? '' : 'oculto'}" id="login-error">${errorInicial}</p>

          <button type="submit" class="btn-continuar" id="btn-login">Entrar</button>
        </form>

        <a href="#/menu" class="carrito-volver login-volver">&larr; Volver al menú</a>
      </div>
    </div>
  `;

  const form = container.querySelector('#form-login');
  const errorEl = container.querySelector('#login-error');
  const boton = container.querySelector('#btn-login');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    boton.disabled = true;
    boton.textContent = 'Entrando...';
    errorEl.classList.add('oculto');

    const datos = new FormData(form);
    const email = datos.get('email').trim();
    const password = datos.get('password');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = 'Correo o contraseña incorrectos.';
      errorEl.classList.remove('oculto');
      boton.disabled = false;
      boton.textContent = 'Entrar';
      return;
    }

    const esAdmin = await verificarAdmin();
    if (!esAdmin) {
      await supabase.auth.signOut();
      errorEl.textContent = 'Esta cuenta no tiene permisos de administrador.';
      errorEl.classList.remove('oculto');
      boton.disabled = false;
      boton.textContent = 'Entrar';
      return;
    }

    render(container);
  });
}

async function verificarAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error('Error verificando admin:', error);
    return false;
  }
  return data === true;
}