const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwTKKe_3DpFONr8nN4ZfuCt0kBqEcspB4_WXHnrtarNTqPlldpHBqba-FbqJcr7-nECZw/exec";

const FRONTEND_KEY = "PANDE_PUBLIC_2026";

let productos = [];

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
    const res = await fetch(
      `${SCRIPT_URL}?action=getCatalogoPublico&key=${FRONTEND_KEY}`
    );
    const data = await res.json();
    productos = data.productos;
    render();
  }catch(err){
    console.error(err);
    alert("Error cargando catálogo");
  }
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
          <img src="${
            p.img_url ||
            'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1200&auto=format&fit=crop'
          }">
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

  }); // ← cierre que faltaba

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

  // Feedback visual
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
          'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1200&auto=format&fit=crop'
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

async function enviarPedido(){

  const nombre =
    document.getElementById("cliente-nombre").value;

  const telefono =
    document.getElementById("cliente-telefono").value;

  const entrega =
    document.getElementById("tipo-entrega").value;

  const pago =
    document.getElementById("metodo-pago").value;

  const notas =
    document.getElementById("cliente-notas").value;

  if(!nombre || !telefono){
    alert("Completa nombre y teléfono");
    return;
  }

  let total = 0;

  carrito.forEach(item=>{
    total +=
      Number(item.producto.precio) * item.cantidad;
  });

  const pedido = {
    action: "crearPedido",
    key: FRONTEND_KEY,
    cliente: nombre,
    telefono,
    entrega,
    metodo_pago: pago,
    notas,
    total,
    productos: carrito
  };

  try{

    const res = await fetch(SCRIPT_URL,{
      method: "POST",
      body: JSON.stringify(pedido)
    });

    const data = await res.json();

    if(data.ok){

      const resumen =
        carrito.map(item=>
          `• ${item.producto.nombre} x${item.cantidad} - $${Number(item.producto.precio) * item.cantidad}`
        ).join("%0A");

      const mensaje =
        `Hola Pandé 👋%0AQuiero confirmar mi pedido:%0A%0A${resumen}%0A%0ATotal: $${total}%0ANombre: ${nombre}%0AEntrega: ${entrega}%0APago: ${pago}%0ANotas: ${notas}`;

      window.open(
        `https://wa.me/529992175116?text=${mensaje}`,
        "_blank"
      );

      carrito = [];
      actualizarCarrito();
      cerrarCheckout();
      cartDrawer.classList.remove("open");
      overlay.classList.remove("show");
      alert("Pedido enviado correctamente");

    }else{
      alert("Error enviando pedido");
    }

  }catch(err){
    console.error(err);
    alert("Error de conexión");
  }

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
      behavior: "smooth",
      block: "start"
    });
  }

});

window.addEventListener("scroll",()=>{

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

  links.forEach(link=>{
    link.classList.remove("active");
    const target =
      link.getAttribute("data-target");
    if(target === current){
      link.classList.add("active");
      link.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  });

});

// Mostrar/ocultar dirección según tipo de entrega
document.getElementById("tipo-entrega")
  .addEventListener("change",(e)=>{
    const wrapper =
      document.getElementById("direccion-wrapper");
    if(e.target.value === "domicilio"){
      wrapper.classList.remove("hidden");
    }else{
      wrapper.classList.add("hidden");
    }
  });

// Validar y mostrar resumen
function validarPedido(){

  const nombre =
    document.getElementById("cliente-nombre");

  const telefono =
    document.getElementById("cliente-telefono");

  const entrega =
    document.getElementById("tipo-entrega").value;

  const direccion =
    document.getElementById("cliente-direccion");

  const errorTel =
    document.getElementById("error-telefono");

  let valido = true;

  // Limpiar errores previos
  [nombre, telefono, direccion].forEach(el=>{
    el.classList.remove("error");
  });

  errorTel.classList.remove("visible");

  // Validar nombre
  if(!nombre.value.trim()){
    nombre.classList.add("error");
    valido = false;
  }

  // Validar teléfono 10 dígitos
  if(!/^\d{10}$/.test(telefono.value.trim())){
    telefono.classList.add("error");
    errorTel.classList.add("visible");
    valido = false;
  }

  // Validar dirección solo si es domicilio
  if(
    entrega === "domicilio" &&
    !direccion.value.trim()
  ){
    direccion.classList.add("error");
    valido = false;
  }

  if(!valido) return;

  // Construir resumen
  const pago =
    document.getElementById("metodo-pago").value;

  const notas =
    document.getElementById("cliente-notas").value;

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
      ${entrega === "domicilio"
        ? `<div>
            <strong>Dirección:</strong>
            ${direccion.value.trim()}
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

// Enviar por WhatsApp
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

  if(entrega === "domicilio"){
    mensaje += `Direccion: ${direccion}\n`;
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

// Registrar pedido en Sheets
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
  
  window.open(
    `https://wa.me/529992175116?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );

  carrito = [];
  actualizarCarrito();
  cerrarCheckout();
  cartDrawer.classList.remove("open");
  overlay.classList.remove("show");

}

// Limpiar formulario al cerrar
function limpiarFormulario(){

  document.getElementById("cliente-nombre")
    .value = "";

  document.getElementById("cliente-telefono")
    .value = "";

  document.getElementById("cliente-direccion")
    .value = "";

  document.getElementById("cliente-notas")
    .value = "";

  document.getElementById("tipo-entrega")
    .value = "pickup";

  document.getElementById("metodo-pago")
    .value = "Efectivo";

  document.getElementById("direccion-wrapper")
    .classList.add("hidden");

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
