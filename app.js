import { supabase } from "./supabaseClient.js";

// ─────────────────────────────────────────
// FAVORITOS - lógica con Supabase
// ─────────────────────────────────────────
let favoritosCache = new Set();
let usuarioActual = null;

async function cargarFavoritos() {
  const { data: { user } } = await supabase.auth.getUser();
  usuarioActual = user;
  if (!user) return;

  const { data } = await supabase
    .from("favoritos")
    .select("producto_id")
    .eq("user_id", user.id);

  if (data) favoritosCache = new Set(data.map((f) => String(f.producto_id)));
}

async function toggleFavorito(productoId, producto) {
  if (!usuarioActual) {
    mostrarToast("⚠️ Inicia sesión para guardar favoritos");
    setTimeout(() => { window.location.href = "perfil.html"; }, 1500);
    return;
  }

  if (favoritosCache.has(String(productoId))) {
    await supabase.from("favoritos").delete()
      .eq("user_id", usuarioActual.id).eq("producto_id", productoId);
    favoritosCache.delete(String(productoId));
    mostrarToast("Eliminado de favoritos");
  } else {
    await supabase.from("favoritos").insert({
      user_id: usuarioActual.id,
      producto_id: productoId,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen_url: producto.imagen_url,
      categoria: producto.categoria || "",
    });
    favoritosCache.add(String(productoId));
    mostrarToast("❤️ Agregado a favoritos");
  }

  actualizarBotonesFav();
  actualizarBadgeCorazon();
  renderizarPanelFavoritos();
}

function actualizarBotonesFav() {
  document.querySelectorAll(".btn-fav-tarjeta").forEach((btn) => {
    const activo = favoritosCache.has(String(btn.dataset.id));
    btn.classList.toggle("activo", activo);
    btn.querySelector(".material-icons-outlined").textContent =
      activo ? "favorite" : "favorite_border";
  });
}

function actualizarBadgeCorazon() {
  const badge = document.querySelector(".heart-wrapper .badge-count");
  if (!badge) return;
  const count = favoritosCache.size;
  badge.textContent = count;
  badge.classList.toggle("visible", count > 0);
}

// ─────────────────────────────────────────
// PANEL LATERAL DE FAVORITOS
// ─────────────────────────────────────────
function inyectarPanelFavoritos() {
  if (document.getElementById("favoritos-panel")) return;

  const overlay = document.createElement("div");
  overlay.className = "favoritos-overlay";
  overlay.id = "favoritos-overlay";
  overlay.addEventListener("click", cerrarPanel);

  const panel = document.createElement("div");
  panel.className = "favoritos-panel";
  panel.id = "favoritos-panel";
  panel.innerHTML = `
    <div class="favoritos-panel-header">
      <h3>❤️ Mis Favoritos</h3>
      <button class="btn-cerrar-panel" id="btn-cerrar-panel">
        <span class="material-icons-outlined">close</span>
      </button>
    </div>
    <div class="favoritos-lista" id="favoritos-lista"></div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  document.getElementById("btn-cerrar-panel").addEventListener("click", cerrarPanel);
}

function abrirPanel() {
  renderizarPanelFavoritos();
  document.getElementById("favoritos-overlay").classList.add("visible");
  document.getElementById("favoritos-panel").classList.add("abierto");
}

function cerrarPanel() {
  document.getElementById("favoritos-overlay").classList.remove("visible");
  document.getElementById("favoritos-panel").classList.remove("abierto");
}

async function renderizarPanelFavoritos() {
  const lista = document.getElementById("favoritos-lista");
  if (!lista) return;

  const vacio = (msg, sub) => `
    <div class="favoritos-vacio">
      <div class="fav-icono-circulo">
        <span class="material-icons-outlined">favorite_border</span>
      </div>
      <h4>${msg}</h4>
      <p>${sub}</p>
    </div>`;

  if (!usuarioActual) {
    lista.innerHTML = vacio("Inicia sesión", "Para guardar tus productos favoritos");
    return;
  }

  if (favoritosCache.size === 0) {
    lista.innerHTML = vacio("Sin favoritos aún", "Toca el corazón en un producto para guardarlo aquí");
    return;
  }

  const { data } = await supabase.from("favoritos").select("*").eq("user_id", usuarioActual.id);

  if (!data || data.length === 0) {
    lista.innerHTML = vacio("Sin favoritos aún", "Toca el corazón en un producto para guardarlo aquí");
    return;
  }

  lista.innerHTML = data.map((f) => `
    <div class="fav-item" data-id="${f.producto_id}">
      <img src="${f.imagen_url}" alt="${f.nombre}" />
      <div class="fav-item-info">
        <h4>${f.nombre}</h4>
        <p class="fav-cat">${f.categoria || "Ropa"}</p>
        <p class="fav-precio">$${f.precio} MXN</p>
      </div>
      <button class="btn-quitar-fav" data-id="${f.producto_id}">
        <span class="material-icons-outlined">favorite</span>
      </button>
    </div>
  `).join("");

  lista.querySelectorAll(".fav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.closest(".btn-quitar-fav")) return;
      window.location.href = `detalle.html?id=${item.dataset.id}`;
    });
  });

  lista.querySelectorAll(".btn-quitar-fav").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await supabase.from("favoritos").delete()
        .eq("user_id", usuarioActual.id).eq("producto_id", id);
      favoritosCache.delete(id);
      actualizarBotonesFav();
      actualizarBadgeCorazon();
      renderizarPanelFavoritos();
      mostrarToast("Eliminado de favoritos");
    });
  });
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function mostrarToast(msg) {
  let toast = document.getElementById("toast-app");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-app";
    toast.style.cssText = `
      position:fixed;bottom:90px;left:50%;
      transform:translateX(-50%) translateY(20px);
      background:#1a1a1a;border:1px solid #333;color:white;
      padding:12px 24px;border-radius:30px;font-size:0.9rem;
      opacity:0;transition:all 0.3s;z-index:300;white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
  }, 2500);
}

// ─────────────────────────────────────────
// RENDERIZAR PRODUCTOS con paginación
// ─────────────────────────────────────────
const PRODUCTOS_POR_PAGINA = 8; // 4 columnas x 2 filas
const paginaActual = {}; // { contenedorID: numeroPagina }

function renderizarProductos(productos, contenedorID) {
  const contenedor = document.getElementById(contenedorID);
  if (!contenedor) return;

  if (productos.length === 0) {
    contenedor.innerHTML = '<p style="color:gray;padding:20px;grid-column:1/-1;">No hay productos aquí aún. 🦦</p>';
    return;
  }

  // Inicializar página si no existe
  if (!paginaActual[contenedorID]) paginaActual[contenedorID] = 1;
  const pagina = paginaActual[contenedorID];
  const inicio = 0;
  const fin = pagina * PRODUCTOS_POR_PAGINA;
  const visibles = productos.slice(inicio, fin);
  const hayMas = fin < productos.length;

  contenedor.innerHTML = visibles.map((p) => `
    <div class="tarjeta" data-id="${p.id}" style="cursor:pointer;">
      <div class="img-placeholder">
        <img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy" />
      </div>
      <button class="btn-fav-tarjeta ${favoritosCache.has(String(p.id)) ? "activo" : ""}" data-id="${p.id}">
        <span class="material-icons-outlined">
          ${favoritosCache.has(String(p.id)) ? "favorite" : "favorite_border"}
        </span>
      </button>
      <div class="info-producto">
        <h4>${p.nombre}</h4>
        <p class="talla">${p.talla || "Unitalla"}</p>
        <p class="precio">$${p.precio} MXN</p>
      </div>
    </div>
  `).join("");

  // Botón "Ver más" si hay más productos
  if (hayMas) {
    const btnVerMas = document.createElement("div");
    btnVerMas.style.cssText = "grid-column:1/-1;display:flex;justify-content:center;padding:10px 0 4px;";
    btnVerMas.innerHTML = `
      <button id="btn-ver-mas-${contenedorID}" style="
        background:#1a1a1a;border:1px solid #333;color:white;
        padding:10px 28px;border-radius:20px;font-size:0.85rem;
        font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;
        transition:background 0.2s;
      ">
        <span class="material-icons-outlined" style="font-size:1rem;">expand_more</span>
        Ver más productos (${productos.length - fin} restantes)
      </button>`;
    contenedor.appendChild(btnVerMas);

    document.getElementById(`btn-ver-mas-${contenedorID}`).addEventListener("click", () => {
      paginaActual[contenedorID] = pagina + 1;
      renderizarProductos(productos, contenedorID);
      // Scroll suave al primer producto nuevo
      const tarjetas = contenedor.querySelectorAll(".tarjeta");
      if (tarjetas[fin]) tarjetas[fin].scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Navegar al detalle
  contenedor.querySelectorAll(".tarjeta").forEach((tarjeta) => {
    tarjeta.addEventListener("click", (e) => {
      if (e.target.closest(".btn-fav-tarjeta")) return;
      window.location.href = `detalle.html?id=${tarjeta.dataset.id}`;
    });
  });

  // Toggle favorito
  contenedor.querySelectorAll(".btn-fav-tarjeta").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const producto = productos.find((p) => String(p.id) === btn.dataset.id);
      toggleFavorito(btn.dataset.id, producto);
    });
  });
}

// ─────────────────────────────────────────
// CARGAR PRODUCTOS
// ─────────────────────────────────────────
let todosLosProductos = []; // caché local para búsqueda
let categoriaActual = "todos";

async function cargarDatos(categoria = "todos") {
  categoriaActual = categoria;

  // Solo va a Supabase una vez — después todo es filtrado local
  if (todosLosProductos.length === 0) {
    const { data, error } = await supabase.from("productos").select("*");
    if (error) { console.error("Error en Supabase:", error); return; }
    todosLosProductos = data;
  }

  filtrarYMostrar();
}

// Filtra por texto de búsqueda Y categoría, muestra resultado
function filtrarYMostrar() {
  const buscador = document.querySelector(".search-bar");
  const termino = buscador ? buscador.value.trim().toLowerCase() : "";

  let resultado = todosLosProductos;

  // Filtro por categoría
  if (categoriaActual !== "todos") {
    resultado = resultado.filter(p =>
      p.categoria?.toLowerCase() === categoriaActual.toLowerCase()
    );
  }

  // Filtro por texto
  if (termino.length > 0) {
    resultado = resultado.filter(p =>
      p.nombre?.toLowerCase().includes(termino) ||
      p.categoria?.toLowerCase().includes(termino) ||
      p.talla?.toLowerCase().includes(termino)
    );
  }

  // Resetear paginación al filtrar
  paginaActual["lista-productos"] = 1;
  paginaActual["lista-categorias"] = 1;

  renderizarProductos(resultado, "lista-productos");
  renderizarProductos(resultado, "lista-categorias");

  const contador = document.getElementById("contador-productos");
  if (contador) {
    contador.textContent = resultado.length === 0
      ? "Sin resultados"
      : `${resultado.length} producto${resultado.length !== 1 ? "s" : ""}`;
  }
}

// ─────────────────────────────────────────
// BUSCADOR
// ─────────────────────────────────────────
function configurarBuscador() {
  const buscador = document.querySelector(".search-bar");
  if (!buscador) return;

  let debounceTimer;

  buscador.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Si hay categoría activa distinta a todos, recarga esa categoría primero
      if (categoriaActual !== "todos" && todosLosProductos.length === 0) {
        cargarDatos(categoriaActual);
      } else {
        filtrarYMostrar();
      }
    }, 250); // espera 250ms después de que el usuario deje de escribir
  });

  // Limpiar al presionar Escape
  buscador.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      buscador.value = "";
      filtrarYMostrar();
      buscador.blur();
    }
  });
}

// ─────────────────────────────────────────
// FILTROS DE CATEGORÍA
// ─────────────────────────────────────────
function configurarFiltros() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelector(".chip.active")?.classList.remove("active");
      chip.classList.add("active");

      categoriaActual = chip.getAttribute("data-categoria");

      // Limpiar buscador al cambiar categoría
      const buscador = document.querySelector(".search-bar");
      if (buscador) buscador.value = "";

      // Filtrar localmente sin nueva llamada a Supabase
      filtrarYMostrar();
    });
  });
}

// ─────────────────────────────────────────
// MOTOR PRINCIPAL
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  inyectarPanelFavoritos();
  await cargarFavoritos();
  await cargarDatos("todos");
  actualizarBadgeCorazon();
  configurarBuscador();

  const heartWrapper = document.querySelector(".heart-wrapper");
  if (heartWrapper) heartWrapper.addEventListener("click", abrirPanel);

  if (document.querySelector(".category-chips")) configurarFiltros();
});
