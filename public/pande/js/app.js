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

cartBtn.addEventListener("click",()=>{
  cartDrawer.classList.add("open");
  overlay.classList.add("show");
});

closeCart.addEventListener("click",()=>{
  cartDrawer.classList.remove("open");
  overlay.classList.remove("show");
});

overlay.addEventListener("click",()=>{
  cartDrawer.classList.remove("open");
  overlay.classList.remove("show");
});

async function cargarCatalogo(){

  try{

    const tiendasRes = await fetch(
      `${SCRIPT_URL}?action=getTiendas&key=${FRONTEND_KEY}`
    );

    const tiendasData = await tiendasRes.json();

    tiendas = tiendasData.tiendas || [];

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
    alert("Error cargando catálogo");
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

  const res = await fetch(
    `${SCRIPT_URL}?action=getCatalogoPorTienda&key=${FRONTEND_KEY}&id_tienda=${idTienda}`
  );

  const data = await res.json();

  productos = data.productos || [];

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
          "Es la sucursal más cercana según tu ubicación."
        );

        cargarCatalogoPorTienda(mejor.id_tienda);
      }

    },
    () => {
      if(storeNote){
        storeNote.textContent =
          "No pudimos detectar tu ubicación. Puedes elegir sucursal manualmente.";
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

function render(){

  const cont =
    document.getElementById("productos");

  cont.innerHTML = "";

  const categoryNav =
    document.getElementById("category-nav");

  categoryNav.innerHTML = "";

  const categorias = {};

  productos.forEach(p=>{
    if(!categorias[p.categoria]){
      categorias[p.categoria] = [];
    }
    categorias[p.categoria].push(p);
  });

  const nombresCategorias = {
    PedEsp: "Pedidos Especiales",
    Temporada: "Temporada",
    Muffin: "Muffins",
    Rebanada: "Rebanadas",
    Pan: "Panes"
  };

  Object.keys(categorias).forEach(cat=>{

    const nombreVisual =
      nombresCategorias[cat] || cat;

    const catId =
      cat.replace(/\s+/g,'-');

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
          ${nombreVisual}
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
            <button onclick="agregarCarrito('${p.id}')">
              Agregar
            </button>
          </div>
        </div>
      `;

    });

  });

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
    btn.textContent = "✓ Agregado";
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
            >−</button>
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

}

function abrirCheckout(){
  if(carrito.length === 0){
    alert("Tu carrito está vacío");
    return;
  }
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

document.addEventListener("click",(e)=>{

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
          "El servicio a domicilio solo está disponible desde García Lavín.";
      }

    }else{

      wrapper.classList.add("hidden");

      if(tiendaWrapper){
        tiendaWrapper.classList.remove("hidden");
      }

      if(checkoutTiendaHelp){
        checkoutTiendaHelp.textContent =
          "Elige la sucursal donde recogerás tu pedido.";
      }
    }
  });

function validarPedido(){

  const nombre =
    document.getElementById("cliente-nombre");

  const telefono =
    document.getElementById("cliente-telefono");

  const entrega =
    document.getElementById("tipo-entrega").value;

  const direccion =
    document.getElementById("cliente-direccion");

  const ubicacion =
    document.getElementById("cliente-ubicacion");

  const errorTel =
    document.getElementById("error-telefono");

  let valido = true;

  [nombre, telefono, direccion].forEach(el=>{
    el.classList.remove("error");
  });

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

  if(
    entrega === "domicilio" &&
    !direccion.value.trim()
  ){
    direccion.classList.add("error");
    valido = false;
  }

  if(!valido) return;

  const pago =
    document.getElementById("metodo-pago").value;

  const notas =
    document.getElementById("cliente-notas").value;

  const tienda =
    tiendaSeleccionada ||
    tiendas.find(t => t.id_tienda === checkoutTienda.value);

  let total = 0;
  let itemsHtml = "";

  carrito.forEach(item=>{
    const subtotal =
      Number(item.producto.precio) * item.cantidad;
    total += subtotal;
    itemsHtml += `
      <div>
        ${item.producto.nombre}
        x${item.cantidad} —
        <strong>$${subtotal}</strong>
      </div>
    `;
  });

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
        ${tienda ? tienda.nombre : "—"}
      </div>
      ${entrega === "domicilio"
        ? `<div>
            <strong>Dirección:</strong>
            ${direccion.value.trim()}
           </div>
           ${ubicacion.value.trim()
             ? `<div>
                  <strong>Ubicación:</strong>
                  ${ubicacion.value.trim()}
                </div>`
             : ""}
           <div>
             <strong>Envío:</strong>
             Servicio externo. Costo mínimo de $40, varía según la zona.
           </div>`
        : ""}
      <div>
        <strong>Pago:</strong> ${pago}
      </div>
      <hr style="margin:8px 0;border:none;border-top:1px solid #ddd">
      ${itemsHtml}
      <div style="margin-top:6px">
        <strong>Total: $${total}</strong>
      </div>
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

  const direccion =
    document.getElementById("cliente-direccion")
      .value.trim();

  const ubicacion =
    document.getElementById("cliente-ubicacion")
      .value.trim();

  const tienda =
    tiendaSeleccionada ||
    tiendas.find(t => t.id_tienda === checkoutTienda.value);

  const pago =
    document.getElementById("metodo-pago").value;

  const notas =
    document.getElementById("cliente-notas")
      .value.trim();

  let mensaje = `*Nuevo pedido Pandé*\n\n`;
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

  if(entrega === "domicilio"){
    mensaje += `Direccion: ${direccion}\n`;
    if(ubicacion){
      mensaje += `Ubicacion: ${ubicacion}\n`;
    }
    mensaje +=
      `Envio: Servicio externo, costo minimo de $40. Varia segun la zona.\n`;
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

  mensaje += `\n*Total: $${total}*`;

  if(notas){
    mensaje += `\n\nNotas: ${notas}`;
  }

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
        id_tienda: tienda ? tienda.id_tienda : "",
        nombre_tienda: tienda ? tienda.nombre : "",
        ubicacion_url: ubicacion,
        metodo_pago: pago,
        notas: notas,
        subtotal: carrito.reduce(
          (acc, item) =>
            acc + Number(item.producto.precio) * item.cantidad,
          0
        ),
        costo_envio: entrega === "domicilio" ? 40 : 0,
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

  const whatsappDestino =
    tienda && tienda.whatsapp
      ? String(tienda.whatsapp).replace(/\D/g, "")
      : "529992175116";

  window.open(
    `https://wa.me/${whatsappDestino}?text=${encodeURIComponent(mensaje)}`,
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

  document.getElementById("cliente-direccion")
    .value = "";

  document.getElementById("cliente-ubicacion")
    .value = "";

  document.getElementById("cliente-notas")
    .value = "";

  document.getElementById("tipo-entrega")
    .value = "pickup";

  document.getElementById("metodo-pago")
    .value = "Efectivo";

  document.getElementById("direccion-wrapper")
    .classList.add("hidden");

  document.getElementById("checkout-tienda-wrapper")
    .classList.remove("hidden");

  document.getElementById("resumen-pedido")
    .classList.add("hidden");

  document.getElementById("btn-whatsapp")
    .classList.add("hidden");

  document.getElementById("btn-confirmar")
    .classList.remove("hidden");

  ["cliente-nombre","cliente-telefono","cliente-direccion"]
    .forEach(id=>{
      document.getElementById(id)
        .classList.remove("error");
    });

  document.getElementById("error-telefono")
    .classList.remove("visible");

}

cargarCatalogo();
