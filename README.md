<div align="center">

  <!-- Logo del Negocio -->
  <img src="https://programix-navejl.github.io/CorreaBurguer-Sistema-PedidosWeb/assets/logo.webp" alt="Correa Burguer Logo" width="160" style="border-radius: 50%;" />

  <h1>Correa Burguer - Sistema de Pedidos Web & Comandera Digital</h1>

  <p>
    <b>Plataforma web interactiva para la gestión de pedidos en línea, menú digital dinámico y panel de administración en tiempo real con integración directa a WhatsApp para negocios locales.</b>
  </p>

  <p>
    <a href="https://programix-navejl.github.io/CorreaBurguer-Sistema-PedidosWeb/" target="_blank">
      <img src="https://img.shields.io/badge/🚀_Ver_Demo_En_Vivo-Ver_Sitio-brightgreen?style=for-the-badge" alt="Demo en Vivo" />
    </a>
  </p>

  <!-- Badges Tecnológicos -->
  <p>
    <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
    <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/GitHub_Pages-222222?style=flat-square&logo=github&logoColor=white" alt="GitHub Pages" />
  </p>

</div>

---

## 📌 Descripción del Proyecto

**CorreaBurguer-Sistema-PedidosWeb** es una solución digital integral desarrollada para optimizar el flujo de ventas y atención al cliente en establecimientos gastronómicos locales. 

El sistema elimina la fricción de la toma manual de comandas mediante WhatsApp, proporcionando una experiencia fluida al cliente para explorar el menú, personalizar su orden y calcular costos totales (producto + servicio a domicilio) de forma automatizada, redirigiendo la confirmación estructurada al canal del negocio.

---

## 🚀 Características Principales

### 🛒 Módulo del Cliente (Menú Interactivo)
* **Catálogo Visual Dinámico:** Visualización clara de productos con fotografías, precios y descripciones.
* **Carrito de Compras en Tiempo Real:** Cálculo automático de subtotales, costo de envío y monto total a pagar.
* **Checkout Inteligente:** Generación de folio único de pedido (`CB-XXXX`), datos de transferencia bancaria (CLABE) y copia rápida de comprobantes.
* **Integración con WhatsApp API:** Envío automático del desglose estructurado del pedido directamente al chat del establecimiento.
* **Sección de Historias:** Módulo estilo redes sociales para la difusión de promociones y avisos del día.

### ⚙️ Módulo de Administración (Panel de Control)
* **Comandera Digital:** Recepción y seguimiento en tiempo real de los pedidos entrantes.
* **Gestión de Menú (CRUD):** Control de catálogo para actualizar precios, modificar imágenes y habilitar/deshabilitar productos agotados.
* **Gestión de Historias:** Publicación y administración de avisos o promociones temporales.
* **Autenticación Segura:** Acceso restringido al panel de gestión mediante credenciales de administrador.

---

## 🛠️ Arquitectura y Stack Tecnológico

* **Frontend:** HTML5 Semántico, CSS3 (Variables, Flexbox, CSS Grid) y JavaScript ES6+ (Modular).
* **Backend & Base de Datos:** Supabase (Autenticación, Base de datos PostgreSQL y Realtime).
* **Despliegue & Hosting:** GitHub Pages.

---

## 📂 Estructura del Proyecto

```text
CORREA_BURGER_WEB/
├── assets/             # Logotipos e imágenes estáticas
├── css/                # Hojas de estilo (base, menú, admin)
├── js/
│   ├── admin/          # Lógica del panel de administración
│   ├── cliente/        # Lógica del carrito, menú y checkout
│   └── utils/          # Cliente Supabase, router y utilidades
├── index.html          # Punto de entrada de la aplicación
└── README.md           # Documentación del repositorio
