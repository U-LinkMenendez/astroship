const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGxnv1CbQvLTF9fnQwa3kg6aICwHLWM4n05kGT6x5P7Osjt16-BIe2_AXZ0L-5MmR0/exec";

const FRONTEND_KEY = "PANDE_PUBLIC_2026";

let productos = [];
let tiendas = [];
let tiendaSeleccionada = null;

let carrito = [];
// estructura: [{id, cantidad, producto:{...}}]

const cartBtn =
  document.getElementById("cart-btn");

const cartDrawer =
  document.getElementById("cart-drawer");

const closeCart =
  document.getElementById("close-cart");

const overlay =
  document.getElementById("overlay");

const checkoutModal =
  document.getElementById("checkout-modal");

const closeCheckout =
  document.getElementById("close-checkout");

const storeName =
  document.getElementById("store-name");

const storeNote =
  document.getElementById("store-note");

const storeSelect =
  document.getElementById("store-select");

const btnLocation =
  document.getElementById("btn-location");

const checkoutTienda =
  document.getElementById("checkout-tienda");

const checkoutTiendaHelp =
  document.getElementById("checkout-tienda-help");

const productSearch =
  document.getElementById("product-search");

const specialOrderBtn =
  document.getElementById("btn-special-order");

const metodoPagoSelect =
  document.getElementById("metodo-pago");

const transferenciaInfo =
  document.getElementById("transferencia-info");

const receptorNombre =
  document.getElementById("receptor-nombre");

const clienteDireccion =
  document.getElementById("cliente-direccion");

const clienteUbicacion =
  document.getElementById("cliente-ubicacion");

const deliveryQuote =
  document.getElementById("delivery-quote");

const btnDeliveryLocation =
  document.getElementById("btn-delivery-location");

let busquedaProducto = "";

const CARRITO_STORAGE_KEY = "pande_carrito";

const LAVIN_COORDS = {
  lat: 21.0257978,
  lng: -89.6052832
};

cartBtn.addEventListener("click",()=>{
  cartDrawer.classList.add("open");
  overlay.classList.add("show");
});

if(specialOrderBtn){
  specialOrderBtn.addEventListener("click",()=>{
    abrirWhatsAppPedidoEspecial();
  });
}

if(metodoPagoSelect){
  metodoPagoSelect.addEventListener("change",()=>{
    actualizarDatosTransferencia();
  });
}

if(clienteUbicacion){
  clienteUbicacion.addEventListener("input",()=>{
    actualizarCotizacionEnvio();
  });
}

if(clienteDireccion){
  clienteDireccion.addEventListener("input",()=>{
    actualizarCotizacionEnvio();
  });
}

if(btnDeliveryLocation){
  btnDeliveryLocation.addEventListener("click",()=>{
    usarUbicacionParaEnvio();
  });
}

closeCart.addEventListener("click",()=>{
  cartDrawer.classList.remove("open");
  overlay.classList.remove("show");
});

overlay.addEventListener("click",()=>{
  cartDrawer.classList.remove("open");
  overlay.classList.remove("show");
});

function guardarCarrito(){
  localStorage.setItem(
    CARRITO_STORAGE_KEY,
    JSON.stringify(carrito)
  );
}

function cargarCarritoGuardado(){

  const guardado =
    localStorage.getItem(CARRITO_STORAGE_KEY);

  if(!guardado) return;

  try{
    const parsed = JSON.parse(guardado);

    if(Array.isArray(parsed)){
      carrito = parsed.filter(item =>
        item &&
        item.id &&
        Number(item.cantidad) > 0 &&
        item.producto
      );
    }
  }catch(_){
    carrito = [];
  }

  actualizarCarrito();
}

function vaciarCarrito(){

  if(carrito.length === 0) return;

  if(!confirm("Vaciar todo el carrito?")) return;

  carrito = [];
  actualizarCarrito();
}

function obtenerWhatsappDestino(){

  const tienda =
    tiendaSeleccionada || tiendas[0];

  if(tienda && tienda.whatsapp){
    return String(tienda.whatsapp).replace(/\D/g, "");
  }

  return "529992175116";
}

function abrirWhatsAppPedidoEspecial(){

  const tienda =
    tiendaSeleccionada || tiendas[0];

  const mensaje =
    `Hola Pande, quiero hacer un pedido especial.${
      tienda ? `\nSucursal sugerida: ${tienda.nombre}` : ""
    }`;

  window.open(
    `https://wa.me/${obtenerWhatsappDestino()}?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );
}

function actualizarDatosTransferencia(){

  if(!metodoPagoSelect || !transferenciaInfo) return;

  if(metodoPagoSelect.value === "Transferencia"){
    transferenciaInfo.classList.remove("hidden");
  }else{
    transferenciaInfo.classList.add("hidden");
  }
}

function obtenerSubtotalCarrito(){

  return carrito.reduce(
    (acc, item) =>
      acc + Number(item.producto.precio) * item.cantidad,
    0
  );
}

function obtenerCoordenadasTiendaDelivery(){

  const lavin =
    tiendas.find(t => t.id_tienda === "LAVIN");

  return {
    lat: Number(lavin && lavin.lat) || LAVIN_COORDS.lat,
    lng: Number(lavin && lavin.lng) || LAVIN_COORDS.lng
  };
}

function extraerCoordenadasUbicacion(valor){

  const crudo =
    String(valor || "").trim();

  let texto = crudo;

  try{
    texto = decodeURIComponent(crudo);
  }catch(_){}

  if(!texto) return null;

  const patrones = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/
  ];

  for(const patron of patrones){
    const match = texto.match(patron);
    if(!match) continue;

    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if(
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ){
      return { lat, lng };
    }
  }

  return null;
}

function usarUbicacionParaEnvio(){

  if(!navigator.geolocation){
    alert("Tu navegador no permite compartir ubicacion.");
    return;
  }

  if(btnDeliveryLocation){
    btnDeliveryLocation.disabled = true;
    btnDeliveryLocation.textContent = "Detectando ubicacion...";
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);

      if(clienteUbicacion){
        clienteUbicacion.value =
          `https://maps.google.com/?q=${lat},${lng}`;
      }

      actualizarCotizacionEnvio();

      if(btnDeliveryLocation){
        btnDeliveryLocation.disabled = false;
        btnDeliveryLocation.textContent =
          "Actualizar ubicacion para cotizar envio";
      }
    },
    () => {
      if(btnDeliveryLocation){
        btnDeliveryLocation.disabled = false;
        btnDeliveryLocation.textContent =
          "Usar mi ubicacion para cotizar envio";
      }

      alert("No pudimos tomar tu ubicacion. Revisa permisos del navegador o pega un link con coordenadas.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

function calcularCostoEnvioPorKm(distanciaKm){

  if(!Number.isFinite(distanciaKm)){
    return {
      costo: 0,
      distanciaKm: null,
      sujetoConfirmacion: true,
      faltaUbicacion: true
    };
  }

  if(distanciaKm > 20){
    return {
      costo: 0,
      distanciaKm,
      sujetoConfirmacion: true,
      faltaUbicacion: false
    };
  }

  const costo =
    distanciaKm <= 5.5
      ? 40
      : 40 + Math.ceil((distanciaKm - 5.5) / 0.5) * 5;

  return {
    costo,
    distanciaKm,
    sujetoConfirmacion: false,
    faltaUbicacion: false
  };
}

function obtenerCotizacionEnvio(){

  const entrega =
    document.getElementById("tipo-entrega").value;

  if(entrega !== "domicilio"){
    return {
      costo: 0,
      distanciaKm: null,
      sujetoConfirmacion: false,
      faltaUbicacion: false
    };
  }

  const coordsCliente =
    extraerCoordenadasUbicacion(
      clienteUbicacion ? clienteUbicacion.value : ""
    );

  if(!coordsCliente){
    return calcularCostoEnvioPorKm(NaN);
  }

  const coordsTienda =
    obtenerCoordenadasTiendaDelivery();

  const distanciaKm =
    calcularDistanciaKm(
      coordsTienda.lat,
      coordsTienda.lng,
      coordsCliente.lat,
      coordsCliente.lng
    );

  return calcularCostoEnvioPorKm(distanciaKm);
}

function actualizarCotizacionEnvio(){

  if(!deliveryQuote) return;

  const entrega =
    document.getElementById("tipo-entrega").value;

  if(entrega !== "domicilio"){
    deliveryQuote.classList.add("hidden");
    return;
  }

  const subtotal =
    obtenerSubtotalCarrito();

  const cotizacion =
    obtenerCotizacionEnvio();

  deliveryQuote.classList.remove("hidden");
  deliveryQuote.classList.toggle(
    "warning",
    cotizacion.sujetoConfirmacion
  );

  if(cotizacion.faltaUbicacion){
    deliveryQuote.innerHTML = `
      <strong>Envio por cotizar</strong>
      <span>Usa el boton de ubicacion para calcular el envio automaticamente.</span>
      <span>Los links cortos de Google Maps pueden quedar sujetos a confirmacion.</span>
      <span>Productos: $${subtotal}</span>
    `;
    return;
  }

  if(cotizacion.sujetoConfirmacion){
    deliveryQuote.innerHTML = `
      <strong>Envio sujeto a confirmacion</strong>
      <span>Distancia aproximada: ${cotizacion.distanciaKm.toFixed(1)} km</span>
      <span>Productos: $${subtotal}</span>
    `;
    return;
  }

  deliveryQuote.innerHTML = `
    <strong>Cotizacion de envio</strong>
    <span>Productos: $${subtotal}</span>
    <span>Envio: $${cotizacion.costo}</span>
    <span>Total estimado: $${subtotal + cotizacion.costo}</span>
  `;
}

function precargarClienteDesdeUrl(){

  const params =
    new URLSearchParams(window.location.search);

  const nombre =
    params.get("nombre") ||
    params.get("name") ||
    params.get("cliente");

  const telefono =
    params.get("telefono") ||
    params.get("phone") ||
    params.get("whatsapp") ||
    params.get("tel");

  if(nombre){
    document.getElementById("cliente-nombre").value =
      nombre.trim();
  }

  if(telefono){
    document.getElementById("cliente-telefono").value =
      telefono.replace(/\D/g, "").slice(-10);
  }
}

async function cargarCatalogo(){

  try{

    const tiendaCache =
      localStorage.getItem("pande_tiendas_cache");

    if(tiendaCache){
      try{
        tiendas = JSON.parse(tiendaCache);
        pintarSelectTiendas();
      }catch(_){}
    }
    
    const tiendasRes = await fetch(
      `${SCRIPT_URL}?action=getTiendas&key=${FRONTEND_KEY}`
    );

    const tiendasData = await tiendasRes.json();

    tiendas = tiendasData.tiendas || [];

        localStorage.setItem(
      "pande_tiendas_cache",
      JSON.stringify(tiendas)
    );

    pintarSelectTiendas();

    const tiendaGuardada =
      localStorage.getItem("pande_tienda");

    if(
      tiendaGuardada &&
      tiendas.some(t => t.id_tienda === tiendaGuardada)
    ){
      await seleccionarTienda(tiendaGuardada, false);
      return;
    }

    localStorage.removeItem("pande_tienda");

    if(tiendas.length){
      tiendaSeleccionada =
        tiendas.find(t => t.id_tienda === "LAVIN") ||
        tiendas[0];

      actualizarVistaTienda(
        "Sucursal predeterminada. Puedes cambiarla."
      );

      await cargarCatalogoPorTienda(
        tiendaSeleccionada.id_tienda
      );
    }

    detectarTiendaCercana();

  }catch(err){
    console.error(err);
    alert("Error cargando catalogo");
  }
}

function pintarSelectTiendas(){

  if(!storeSelect || !checkoutTienda) return;

  storeSelect.innerHTML = "";
  checkoutTienda.innerHTML = "";

  tiendas.forEach(tienda=>{

    const option = document.createElement("option");
    option.value = tienda.id_tienda;
    option.textContent = tienda.nombre;
    storeSelect.appendChild(option);

    const checkoutOption =
      document.createElement("option");
    checkoutOption.value = tienda.id_tienda;
    checkoutOption.textContent = tienda.nombre;
    checkoutTienda.appendChild(checkoutOption);

  });
}

async function seleccionarTienda(idTienda, guardar = true){

  const tienda =
    tiendas.find(t => t.id_tienda === idTienda);

  if(!tienda) return;

  tiendaSeleccionada = tienda;

  if(guardar){
    localStorage.setItem(
      "pande_tienda",
      tienda.id_tienda
    );
  }

  actualizarVistaTienda(
    "Puedes cambiarla si prefieres otra sucursal."
  );

  await cargarCatalogoPorTienda(tienda.id_tienda);
}

function actualizarVistaTienda(nota){

  if(!tiendaSeleccionada) return;

  if(storeName){
    storeName.textContent =
      `Te sugerimos ${tiendaSeleccionada.nombre}`;
  }

  if(storeNote){
    storeNote.textContent = nota;
  }

  if(storeSelect){
    storeSelect.value =
      tiendaSeleccionada.id_tienda;
  }

  if(checkoutTienda){
    checkoutTienda.value =
      tiendaSeleccionada.id_tienda;
  }
}

async function cargarCatalogoPorTienda(idTienda){

  const cacheKey =
    `pande_catalogo_${idTienda}`;

  const cache =
    localStorage.getItem(cacheKey);

  if(cache){
    try{
      productos = JSON.parse(cache);
      render();
    }catch(_){}
  }

  const res = await fetch(
    `${SCRIPT_URL}?action=getCatalogoPorTienda&key=${FRONTEND_KEY}&id_tienda=${idTienda}`
  );

  const data = await res.json();

  productos = data.productos || [];

  localStorage.setItem(
    cacheKey,
    JSON.stringify(productos)
  );

  render();
}

function detectarTiendaCercana(){

  if(!navigator.geolocation || !tiendas.length){
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      let mejor = null;
      let mejorDistancia = Infinity;

      tiendas.forEach(tienda=>{

        const distancia = calcularDistanciaKm(
          lat,
          lng,
          Number(tienda.lat),
          Number(tienda.lng)
        );

        if(distancia < mejorDistancia){
          mejor = tienda;
          mejorDistancia = distancia;
        }
      });

      if(mejor){
        tiendaSeleccionada = mejor;

        localStorage.setItem(
          "pande_tienda",
          mejor.id_tienda
        );

        actualizarVistaTienda(
          "Es la sucursal mas cercana segun tu ubicacion."
        );

        cargarCatalogoPorTienda(mejor.id_tienda);
      }

    },
    () => {
      if(storeNote){
        storeNote.textContent =
          "No pudimos detectar tu ubicacion. Puedes elegir sucursal manualmente.";
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 600000
    }
  );
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2){

  const R = 6371;
  const dLat = gradosARadianes(lat2 - lat1);
  const dLon = gradosARadianes(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(gradosARadianes(lat1)) *
    Math.cos(gradosARadianes(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function gradosARadianes(grados){
  return grados * (Math.PI / 180);
}

function normalizarTexto(valor){
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarCategoria(categoria){

  const original =
    String(categoria || "").trim();

  const limpia =
    normalizarTexto(original);

  if(!limpia) return "Individual";

  if(
    limpia === "individual" ||
    limpia === "muffin" ||
    limpia === "pan"
  ){
    return "Individual";
  }

  if(
    limpia === "para compartir" ||
    limpia === "paracompartir" ||
    limpia === "pedesp"
  ){
    return "Para compartir";
  }

  if(
    limpia === "frios" ||
    limpia === "fr?os" ||
    (
      limpia.startsWith("fr") &&
      limpia.endsWith("os") &&
      limpia.length <= 7
    ) ||
    limpia === "rebanada"
  ){
    return "Frios";
  }

  if(
    limpia === "de temporada" ||
    limpia === "temporada"
  ){
    return "De temporada";
  }

  return original;
}

function crearCategoriaId(categoria){

  const idsCategorias = {
    Individual: "Individual",
    "Para compartir": "Para-compartir",
    Frios: "Frios",
    "De temporada": "De-temporada"
  };

  if(idsCategorias[categoria]){
    return idsCategorias[categoria];
  }

  return normalizarTexto(categoria)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function render(){

  const cont =
    document.getElementById("productos");

  cont.innerHTML = "";

  const categoryNav =
    document.getElementById("category-nav");

  categoryNav.innerHTML = "";

  const categorias = {};

  const productosVisibles =
    productos.filter(p=>{
      if(!busquedaProducto) return true;

      return [
        p.nombre,
        p.descripcion,
        p.categoria,
        p.linea
      ].some(valor =>
        String(valor || "")
          .toLowerCase()
          .includes(busquedaProducto)
      );
    });

  if(productosVisibles.length === 0){
    cont.innerHTML = `
      <div class="empty-products">
        No encontramos productos con esa busqueda.
      </div>
    `;
    return;
  }

  productosVisibles.forEach(p=>{

    const categoria =
      normalizarCategoria(p.categoria);

    if(!categorias[categoria]){
      categorias[categoria] = [];
    }

    categorias[categoria].push(p);
  });

  const nombresCategorias = {
    Individual: "Individual",
    "Para compartir": "Para compartir",
    Frios: "Fr&iacute;os",
    "De temporada": "De temporada",
    PedEsp: "Para compartir",
    Temporada: "De temporada",
    Muffin: "Individual",
    Rebanada: "Fr&iacute;os",
    Pan: "Individual"
  };

  const titulosCategorias = {
    Individual: "Panader&iacute;a y reposter&iacute;a individual",
    "Para compartir": "Panader&iacute;a y reposter&iacute;a para compartir",
    Frios: "Fr&iacute;os",
    "De temporada": "De temporada"
  };

  const ordenCategorias = [
    "Individual",
    "Para compartir",
    "Frios",
    "De temporada"
  ];

  const categoriasOrdenadas =
    Object.keys(categorias).sort((a,b)=>{
      const indexA = ordenCategorias.indexOf(a);
      const indexB = ordenCategorias.indexOf(b);

      return (
        (indexA === -1 ? 999 : indexA) -
        (indexB === -1 ? 999 : indexB)
      );
    });

  categoriasOrdenadas.forEach(cat=>{

    const nombreVisual =
      nombresCategorias[cat] || cat;

    const tituloVisual =
      titulosCategorias[cat] || nombreVisual;

    const catId =
      crearCategoriaId(cat);

    categoryNav.innerHTML += `
      <button
        class="category-link"
        data-target="cat-${catId}"
      >
        ${nombreVisual}
      </button>
    `;

    cont.innerHTML += `
      <section
        class="categoria-section"
        id="cat-${catId}"
      >
        <h2 class="categoria-title">
          ${tituloVisual}
        </h2>
        <div class="categoria-grid"></div>
      </section>
    `;

    const grid =
      cont.querySelector(
        `#cat-${catId} .categoria-grid`
      );

    categorias[cat].forEach(p=>{

      grid.innerHTML += `
        <div class="card">
          <img
            src="${
              p.img_url ||
              'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800&auto=format&fit=crop'
            }"
            loading="lazy"
            decoding="async"
          >
          <div class="info">
            <div class="nombre">${p.nombre}</div>
            <div class="desc">${p.descripcion || ''}</div>
            <div class="precio">$${p.precio}</div>
            <button
              type="button"
              onclick="agregarCarrito('${p.id}')"
            >
              Agregar
            </button>
          </div>
        </div>
      `;

    });

  });

  categoryNav.innerHTML += `
    <button
      class="category-link"
      data-target="cat-pedidos-personalizados"
    >
      Pedidos personalizados
    </button>
  `;

}

function agregarCarrito(id){

  const producto =
    productos.find(p => p.id === id);

  if(!producto) return;

  const existente =
    carrito.find(item => item.id === id);

  if(existente){
    existente.cantidad++;
  }else{
    carrito.push({
      id,
      cantidad: 1,
      producto
    });
  }

  actualizarCarrito();

  const botones = document.querySelectorAll(
    `.card button[onclick="agregarCarrito('${id}')"]`
  );

  botones.forEach(btn => {
    btn.textContent = "Agregado";
    btn.classList.add("agregado");
    setTimeout(()=>{
      btn.textContent = "Agregar";
      btn.classList.remove("agregado");
    }, 1000);
  });

}

function cambiarCantidad(index, delta){

  carrito[index].cantidad += delta;

  if(carrito[index].cantidad <= 0){
    carrito.splice(index, 1);
  }

  actualizarCarrito();

}

function eliminarDelCarrito(index){
  carrito.splice(index, 1);
  actualizarCarrito();
}

function actualizarCarrito(){

  const totalItems =
    carrito.reduce(
      (acc, item) => acc + item.cantidad,
      0
    );

  document.getElementById("cart-count")
    .innerText = totalItems;

  const cartItems =
    document.getElementById("cart-items");

  const cartTotal =
    document.getElementById("cart-total");

  cartItems.innerHTML = "";

  let total = 0;

  carrito.forEach((item, index)=>{

    const p = item.producto;
    const subtotal =
      Number(p.precio) * item.cantidad;

    total += subtotal;

    cartItems.innerHTML += `
      <div class="cart-item">
        <img src="${
          p.img_url ||
          'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800&auto=format&fit=crop'
        }">
        <div class="cart-item-info">
          <div class="cart-item-name">
            ${p.nombre}
          </div>
          <div class="qty-controls">
            <button
              class="qty-btn"
              onclick="cambiarCantidad(${index},-1)"
            >-</button>
            <span>${item.cantidad}</span>
            <button
              class="qty-btn"
              onclick="cambiarCantidad(${index},1)"
            >+</button>
          </div>
          <div class="cart-item-price">
            $${subtotal}
          </div>
          <button
            class="remove-btn"
            onclick="eliminarDelCarrito(${index})"
          >
            Eliminar
          </button>
        </div>
      </div>
    `;

  });

  cartTotal.innerText = `$${total}`;

  guardarCarrito();
  actualizarCotizacionEnvio();

}

function carritoTienePedidoEspecial(){

  return carrito.some(item =>
    item.producto.pedido_especial === true ||
    item.producto.categoria === "PedEsp"
  );
}

function abrirCheckout(){
  if(carrito.length === 0){
    alert("Tu carrito esta vacio");
    return;
  }

  const aviso =
    document.getElementById("pedido-especial-aviso");

  const tipoFecha =
    document.getElementById("tipo-fecha");

  const fechaWrapper =
    document.getElementById("fecha-wrapper");

  if(carritoTienePedidoEspecial()){
    aviso.classList.remove("hidden");
    tipoFecha.value = "programado";
    fechaWrapper.classList.remove("hidden");
  }else{
    aviso.classList.add("hidden");
  }

  actualizarCotizacionEnvio();
  checkoutModal.classList.add("show");
}

function cerrarCheckout(){
  checkoutModal.classList.remove("show");
  limpiarFormulario();
}

document.querySelector(".checkout-btn")
  .addEventListener("click", abrirCheckout);

closeCheckout.addEventListener(
  "click",
  cerrarCheckout
);

if(storeSelect){
  storeSelect.addEventListener("change", e=>{
    seleccionarTienda(e.target.value);
  });
}

if(checkoutTienda){
  checkoutTienda.addEventListener("change", e=>{
    seleccionarTienda(e.target.value);
  });
}

if(btnLocation){
  btnLocation.addEventListener("click", ()=>{
    localStorage.removeItem("pande_tienda");
    detectarTiendaCercana();
  });
}

if(productSearch){
  productSearch.addEventListener("input", e=>{
    busquedaProducto =
      e.target.value.trim().toLowerCase();
    render();
  });
}

document.addEventListener("click",(e)=>{

  const quickBtn =
    e.target.closest(".quick-category");

  if(quickBtn){
    if(productSearch){
      productSearch.value = "";
    }

    busquedaProducto = "";
    render();

    requestAnimationFrame(()=>{
      const quickSection =
        document.getElementById(quickBtn.dataset.quickTarget);

      if(quickSection){
        quickSection.scrollIntoView({
          behavior: "auto",
          block: "start"
        });
      }
    });

    return;
  }

  const btn =
    e.target.closest(".category-link");

  if(!btn) return;

  const target = btn.dataset.target;

  const section =
    document.getElementById(target);

  if(section){
    section.scrollIntoView({
      behavior: "auto",
      block: "start"
    });
  }

});

let categoriaActiva = "";
let scrollPendiente = false;

window.addEventListener("scroll",()=>{

  if(scrollPendiente) return;

  scrollPendiente = true;

  requestAnimationFrame(()=>{

    const sections =
      document.querySelectorAll(".categoria-section");

    const links =
      document.querySelectorAll(".category-link");

    let current = "";

    sections.forEach(section=>{
      const top = section.offsetTop - 180;
      if(scrollY >= top){
        current = section.id;
      }
    });

    if(current && current !== categoriaActiva){

      categoriaActiva = current;

      links.forEach(link=>{
        link.classList.remove("active");

        const target =
          link.getAttribute("data-target");

        if(target === current){
          link.classList.add("active");
          link.scrollIntoView({
            behavior: "auto",
            inline: "center",
            block: "nearest"
          });
        }
      });

    }

    scrollPendiente = false;

  });

});

document.getElementById("tipo-fecha")
  .addEventListener("change",(e)=>{

    const wrapper =
      document.getElementById("fecha-wrapper");

    if(e.target.value === "programado"){
      wrapper.classList.remove("hidden");
    }else{
      wrapper.classList.add("hidden");
    }
  });

document.getElementById("tipo-entrega")
  .addEventListener("change",(e)=>{

    const wrapper =
      document.getElementById("direccion-wrapper");

    const tiendaWrapper =
      document.getElementById("checkout-tienda-wrapper");

    if(e.target.value === "domicilio"){

      wrapper.classList.remove("hidden");

      if(tiendaWrapper){
        tiendaWrapper.classList.add("hidden");
      }

      seleccionarTienda("LAVIN");

      if(checkoutTiendaHelp){
        checkoutTiendaHelp.textContent =
          "El servicio a domicilio solo esta disponible desde Garcia Lavin.";
      }

    }else{

      wrapper.classList.add("hidden");

      if(tiendaWrapper){
        tiendaWrapper.classList.remove("hidden");
      }

      if(checkoutTiendaHelp){
        checkoutTiendaHelp.textContent =
          "Elige la sucursal donde recogeras tu pedido.";
      }
    }

    actualizarCotizacionEnvio();
  });

function validarPedido(){

  const nombre =
    document.getElementById("cliente-nombre");

  const telefono =
    document.getElementById("cliente-telefono");

  const entrega =
    document.getElementById("tipo-entrega").value;

  const tipoFecha =
    document.getElementById("tipo-fecha").value;

  const fechaEntrega =
    document.getElementById("fecha-entrega");

  const horaEntrega =
    document.getElementById("hora-entrega");

  const receptor =
    document.getElementById("receptor-nombre");

  const direccion =
    document.getElementById("cliente-direccion");

  const ubicacion =
    document.getElementById("cliente-ubicacion");

  const errorTel =
    document.getElementById("error-telefono");

  let valido = true;

  [nombre, telefono, receptor, direccion].forEach(el=>{
    if(el) el.classList.remove("error");
  });

  fechaEntrega.classList.remove("error");
  horaEntrega.classList.remove("error");
  errorTel.classList.remove("visible");

  if(!nombre.value.trim()){
    nombre.classList.add("error");
    valido = false;
  }

  if(!/^\d{10}$/.test(telefono.value.trim())){
    telefono.classList.add("error");
    errorTel.classList.add("visible");
    valido = false;
  }

  if(entrega === "domicilio"){
    if(receptor && !receptor.value.trim()){
      receptor.classList.add("error");
      valido = false;
    }

    if(!direccion.value.trim()){
      direccion.classList.add("error");
      valido = false;
    }
  }

  if(tipoFecha === "programado"){
    if(!fechaEntrega.value){
      fechaEntrega.classList.add("error");
      valido = false;
    }

    if(!horaEntrega.value){
      horaEntrega.classList.add("error");
      valido = false;
    }
  }

  if(carritoTienePedidoEspecial()){
    if(!fechaEntrega.value){
      fechaEntrega.classList.add("error");
      valido = false;
    }else{
      const fecha = new Date(`${fechaEntrega.value}T00:00:00`);
      const minima = new Date();
      minima.setHours(0,0,0,0);
      minima.setDate(minima.getDate() + 3);

      if(fecha < minima){
        alert("Los pedidos personalizados requieren minimo 3 dias de anticipacion.");
        fechaEntrega.classList.add("error");
        valido = false;
      }
    }
  }

  if(!valido) return;

  const pago =
    document.getElementById("metodo-pago").value;

  const notas =
    document.getElementById("cliente-notas").value;

  const tienda =
    tiendaSeleccionada ||
    tiendas.find(t => t.id_tienda === checkoutTienda.value);

  const total =
    obtenerSubtotalCarrito();

  const cotizacionEnvio =
    obtenerCotizacionEnvio();

  const costoEnvio =
    entrega === "domicilio" &&
    !cotizacionEnvio.sujetoConfirmacion
      ? cotizacionEnvio.costo
      : 0;

  const totalFinal =
    total + costoEnvio;

  let itemsHtml = "";

  carrito.forEach(item=>{
    const subtotal =
      Number(item.producto.precio) * item.cantidad;
    itemsHtml += `
      <div>
        ${item.producto.nombre}
        x${item.cantidad} -
        <strong>$${subtotal}</strong>
      </div>
    `;
  });

  const envioHtml =
    entrega === "domicilio"
      ? `<div>
          <strong>Recibe:</strong>
          ${receptor ? receptor.value.trim() : ""}
         </div>
         <div>
          <strong>Direccion:</strong>
          ${direccion.value.trim()}
         </div>
         ${ubicacion.value.trim()
           ? `<div>
                <strong>Ubicacion:</strong>
                ${ubicacion.value.trim()}
              </div>`
           : ""}
         ${cotizacionEnvio.sujetoConfirmacion
           ? `<div>
                <strong>Envio:</strong>
                Sujeto a confirmacion por Pande
              </div>`
           : `<div>
                <strong>Distancia aprox.:</strong>
                ${cotizacionEnvio.distanciaKm.toFixed(1)} km
              </div>
              <div>
                <strong>Envio:</strong>
                $${costoEnvio}
              </div>`}`
      : "";

  document.getElementById("resumen-contenido")
    .innerHTML = `
      <div>
        <strong>Cliente:</strong>
        ${nombre.value.trim()}
      </div>
      <div>
        <strong>WhatsApp:</strong>
        ${telefono.value.trim()}
      </div>
      <div>
        <strong>Entrega:</strong>
        ${entrega === "domicilio"
          ? "A domicilio"
          : "Recoger en tienda"}
      </div>
      <div>
        <strong>Sucursal:</strong>
        ${tienda ? tienda.nombre : "-"}
      </div>
      ${tipoFecha === "programado" || carritoTienePedidoEspecial()
        ? `<div>
            <strong>Fecha:</strong>
            ${fechaEntrega.value || "-"}
           </div>
           <div>
            <strong>Hora:</strong>
            ${horaEntrega.value || "-"}
           </div>`
        : ""}
      ${carritoTienePedidoEspecial()
        ? `<div>
            <strong>Anticipo requerido:</strong>
            $${total * 0.5}
           </div>`
        : ""}
      ${envioHtml}
      <div>
        <strong>Pago:</strong> ${pago}
      </div>
      <hr style="margin:8px 0;border:none;border-top:1px solid #ddd">
      ${itemsHtml}
      <div style="margin-top:6px">
        <strong>Productos: $${total}</strong>
      </div>
      ${entrega === "domicilio" && !cotizacionEnvio.sujetoConfirmacion
        ? `<div><strong>Total estimado: $${totalFinal}</strong></div>`
        : `<div><strong>Total: $${total}</strong></div>`}
      ${notas
        ? `<div><strong>Notas:</strong> ${notas}</div>`
        : ""}
    `;

  document.getElementById("resumen-pedido")
    .classList.remove("hidden");

  document.getElementById("btn-whatsapp")
    .classList.remove("hidden");

  document.getElementById("btn-confirmar")
    .classList.add("hidden");
}

function enviarPorWhatsapp(){

  const nombre =
    document.getElementById("cliente-nombre")
      .value.trim();

  const telefono =
    document.getElementById("cliente-telefono")
      .value.trim();

  const entrega =
    document.getElementById("tipo-entrega").value;

    const tipoFecha =
    document.getElementById("tipo-fecha").value;

  const fechaEntrega =
    document.getElementById("fecha-entrega").value;

  const horaEntrega =
    document.getElementById("hora-entrega").value;

  const esEspecial =
    carritoTienePedidoEspecial();

  const direccion =
    document.getElementById("cliente-direccion")
      .value.trim();

  const ubicacion =
    document.getElementById("cliente-ubicacion")
      .value.trim();

  const receptor =
    document.getElementById("receptor-nombre")
      .value.trim();

  const tienda =
    tiendaSeleccionada ||
    tiendas.find(t => t.id_tienda === checkoutTienda.value);

  const pago =
    document.getElementById("metodo-pago").value;

  const notas =
    document.getElementById("cliente-notas")
      .value.trim();

  const cotizacionEnvio =
    obtenerCotizacionEnvio();

  const costoEnvio =
    entrega === "domicilio" &&
    !cotizacionEnvio.sujetoConfirmacion
      ? cotizacionEnvio.costo
      : 0;

  const envioPorConfirmar =
    entrega === "domicilio" &&
    cotizacionEnvio.sujetoConfirmacion;

  let mensaje = `*Nuevo pedido Pande*\n\n`;
  mensaje += `Cliente: ${nombre}\n`;
  mensaje += `WhatsApp: ${telefono}\n`;
  mensaje += `Entrega: ${
    entrega === "domicilio"
      ? "A domicilio"
      : "Recoger en tienda"
  }\n`;
  mensaje += `Sucursal: ${
    tienda ? tienda.nombre : "No seleccionada"
  }\n`;

    if(tipoFecha === "programado" || esEspecial){
    mensaje += `Fecha: ${fechaEntrega || "Por confirmar"}\n`;
    mensaje += `Hora: ${horaEntrega || "Por confirmar"}\n`;
  }

  if(esEspecial){
    mensaje += `Anticipo requerido: 50%\n`;
  }

  if(entrega === "domicilio"){
    mensaje += `Recibe: ${receptor}\n`;
    mensaje += `Direccion: ${direccion}\n`;
    if(ubicacion){
      mensaje += `Ubicacion: ${ubicacion}\n`;
    }
    if(envioPorConfirmar){
      mensaje += `Envio: sujeto a confirmacion por Pande.\n`;
    }else{
      mensaje += `Envio: $${costoEnvio}\n`;
      mensaje += `Distancia aprox.: ${cotizacionEnvio.distanciaKm.toFixed(1)} km\n`;
    }
  }

  mensaje += `Pago: ${pago}\n`;
  mensaje += `\n*Productos:*\n`;

  let total = 0;

  carrito.forEach(item=>{
    const subtotal =
      Number(item.producto.precio) * item.cantidad;
    mensaje +=
      `- ${item.producto.nombre} x${item.cantidad} ($${subtotal})\n`;
    total += subtotal;
  });

  if(entrega === "domicilio" && !envioPorConfirmar){
    mensaje += `\nProductos: $${total}`;
    mensaje += `\nEnvio: $${costoEnvio}`;
    mensaje += `\n*Total estimado: $${total + costoEnvio}*`;
  }else if(envioPorConfirmar){
    mensaje += `\n*Productos: $${total}*`;
    mensaje += `\nEnvio sujeto a confirmacion.`;
  }else{
    mensaje += `\n*Total: $${total}*`;
  }

  if(notas){
    mensaje += `\n\nNotas: ${notas}`;
  }

  const notasPedido = [
    notas,
    entrega === "domicilio" && receptor
      ? `Recibe: ${receptor}`
      : "",
    envioPorConfirmar
      ? "Envio sujeto a confirmacion"
      : ""
  ].filter(Boolean).join(" | ");

  try{
    fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registrarPedido",
        nombre: nombre,
        telefono: telefono,
        tipo_entrega: entrega === "domicilio"
          ? "Domicilio"
          : "Recoger",
        direccion_entrega: direccion,
        nombre_receptor: receptor,
        id_tienda: tienda ? tienda.id_tienda : "",
        nombre_tienda: tienda ? tienda.nombre : "",
        ubicacion_url: ubicacion,
        distancia_envio_km: cotizacionEnvio.distanciaKm,
        envio_sujeto_confirmacion: envioPorConfirmar,
        fecha_entrega: fechaEntrega,
        hora_entrega: horaEntrega,
        es_personalizado: esEspecial,
        anticipo_pagado: 0,
        metodo_pago: pago,
        notas: notasPedido,
        subtotal: total,
        costo_envio: costoEnvio,
        productos: carrito.map(item => ({
          id: item.id,
          nombre: item.producto.nombre,
          categoria: item.producto.categoria,
          precio: item.producto.precio,
          qty: item.cantidad
        }))
      })
    });
  }catch(_){}

  window.open(
    `https://wa.me/${obtenerWhatsappDestino()}?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );

  carrito = [];
  actualizarCarrito();
  cerrarCheckout();
  cartDrawer.classList.remove("open");
  overlay.classList.remove("show");

}

function limpiarFormulario(){

  document.getElementById("cliente-nombre")
    .value = "";

  document.getElementById("cliente-telefono")
    .value = "";

  document.getElementById("receptor-nombre")
    .value = "";

  document.getElementById("cliente-direccion")
    .value = "";

  document.getElementById("cliente-ubicacion")
    .value = "";

    document.getElementById("tipo-fecha")
    .value = "hoy";

  document.getElementById("fecha-entrega")
    .value = "";

  actualizarTextoFecha();
  
  document.getElementById("hora-entrega")
    .value = "";

  document.getElementById("fecha-wrapper")
    .classList.add("hidden");

  document.getElementById("pedido-especial-aviso")
    .classList.add("hidden");

  document.getElementById("cliente-notas")
    .value = "";

  document.getElementById("tipo-entrega")
    .value = "pickup";

  document.getElementById("metodo-pago")
    .value = "Efectivo";

  actualizarDatosTransferencia();

  document.getElementById("direccion-wrapper")
    .classList.add("hidden");

  actualizarCotizacionEnvio();

  document.getElementById("checkout-tienda-wrapper")
    .classList.remove("hidden");

  document.getElementById("resumen-pedido")
    .classList.add("hidden");

  document.getElementById("btn-whatsapp")
    .classList.add("hidden");

  document.getElementById("btn-confirmar")
    .classList.remove("hidden");

  ["cliente-nombre","cliente-telefono","receptor-nombre","cliente-direccion"]
    .forEach(id=>{
      document.getElementById(id)
        .classList.remove("error");
    });

  document.getElementById("error-telefono")
    .classList.remove("visible");

}

function abrirCalendarioFecha(){

  const input =
    document.getElementById("fecha-entrega");

  if(!input) return;

  if(typeof input.showPicker === "function"){
    input.showPicker();
  }else{
    input.focus();
    input.click();
  }
}

function actualizarTextoFecha(){

  const input =
    document.getElementById("fecha-entrega");

  const placeholder =
    document.getElementById("fecha-placeholder");

  const field =
    document.getElementById("fecha-field");

  if(!input || !placeholder || !field) return;

  if(!input.value){
    placeholder.textContent = "Selecciona la fecha";
    field.classList.remove("has-value");
    return;
  }

  const [year, month, day] =
    input.value.split("-");

  placeholder.textContent =
    `${day}/${month}/${year}`;

  field.classList.add("has-value");
}

function cargarOpcionesHorario(){

  const select =
    document.getElementById("hora-entrega");

  if(!select) return;

  select.innerHTML =
    '<option value="">Selecciona horario</option>';

  const inicio = 8 * 60;
  const fin = 20 * 60 + 30;

  for(let minutos = inicio; minutos <= fin; minutos += 30){

    const hora24 =
      Math.floor(minutos / 60);

    const minuto =
      minutos % 60;

    const value =
      `${String(hora24).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

    const hora12 =
      hora24 > 12 ? hora24 - 12 : hora24;

    const periodo =
      hora24 >= 12 ? "pm" : "am";

    const texto =
      `${hora12}:${String(minuto).padStart(2, "0")} ${periodo}`;

    select.innerHTML += `
      <option value="${value}">
        ${texto}
      </option>
    `;
  }
}

cargarOpcionesHorario();

precargarClienteDesdeUrl();

cargarCarritoGuardado();

actualizarDatosTransferencia();

cargarCatalogo();
