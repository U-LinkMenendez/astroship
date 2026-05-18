const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwTKKe_3DpFONr8nN4ZfuCt0kBqEcspB4_WXHnrtarNTqPlldpHBqba-FbqJcr7-nECZw/exec";

const FRONTEND_KEY = "PANDE_PUBLIC_2026";

let productos = [];

let carrito = [];

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

      <a href="#cat-${catId}">
        ${nombreVisual}
      </a>

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

            <div class="nombre">
              ${p.nombre}
            </div>

            <div class="desc">
              ${p.descripcion || ''}
            </div>

            <div class="precio">
              $${p.precio}
            </div>

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

  const producto = productos.find(
    p => p.id === id
  );

  if(!producto){

    return;

  }

  carrito.push(producto);

  actualizarCarrito();

}

function actualizarCarrito(){

  document.getElementById("cart-count")
    .innerText = carrito.length;

  const cartItems =
    document.getElementById("cart-items");

  const cartTotal =
    document.getElementById("cart-total");

  cartItems.innerHTML = "";

  let total = 0;

  carrito.forEach((p,index)=>{

    total += Number(p.precio);

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

          <div class="cart-item-price">
            $${p.precio}
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

function eliminarDelCarrito(index){

  carrito.splice(index,1);

  actualizarCarrito();

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

}

document.querySelector(".checkout-btn")
  .addEventListener("click",abrirCheckout);

closeCheckout.addEventListener(
  "click",
  cerrarCheckout
);

function finalizarPedido(){

  const nombre =
    document.getElementById("cliente-nombre").value;

  const telefono =
    document.getElementById("cliente-telefono").value;

  const tipoEntrega =
    document.getElementById("tipo-entrega").value;

  const direccion =
    document.getElementById("cliente-direccion").value;

  if(!nombre || !telefono){

    alert("Completa nombre y teléfono");

    return;

  }

  let mensaje =
`🧁 *Nuevo pedido Pandé* %0A%0A`;

  mensaje +=
`👤 Cliente: ${nombre}%0A`;

  mensaje +=
`📱 Teléfono: ${telefono}%0A`;

  mensaje +=
`🚚 Entrega: ${tipoEntrega}%0A`;

  if(tipoEntrega === "domicilio"){

    mensaje +=
`📍 Dirección: ${direccion}%0A`;

  }

  mensaje += `%0A🛒 *Productos:*%0A`;

  let total = 0;

  carrito.forEach(p=>{

    mensaje +=
`- ${p.nombre} ($${p.precio})%0A`;

    total += Number(p.precio);

  });

  mensaje += `%0A💰 Total: $${total}`;

  const telefonoNegocio =
    "529992175116";

  const url =
`https://wa.me/${telefonoNegocio}?text=${mensaje}`;

  window.open(url,"_blank");

}

cargarCatalogo();

window.addEventListener("scroll",()=>{

  const sections =
    document.querySelectorAll(
      ".categoria-section"
    );

  const links =
    document.querySelectorAll(
      ".category-link"
    );

  let current = "";

  sections.forEach(section=>{

    const top =
      section.offsetTop - 180;

    if(scrollY >= top){

      current =
        section.id;

    }

  });

  links.forEach(link=>{

    link.classList.remove("active");

    const href =
      link.getAttribute("href");

    if(href === `#${current}`){

      link.classList.add("active");

    }

  });

});

function abrirCheckout(){

  if(carrito.length === 0){

    alert("Tu carrito está vacío");

    return;

  }

  checkoutModal.classList.add("show");

}

function cerrarCheckout(){

  checkoutModal.classList.remove("show");

}

closeCheckout.addEventListener("click", cerrarCheckout);

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

  carrito.forEach(p=>{

    total += Number(p.precio);

  });

  const pedido = {

    action:"crearPedido",

    key:FRONTEND_KEY,

    cliente:nombre,

    telefono:telefono,

    entrega:entrega,

    metodo_pago:pago,

    notas:notas,

    total:total,

    productos:carrito

  };

  try{

    const res = await fetch(SCRIPT_URL,{

      method:"POST",

      body:JSON.stringify(pedido)

    });

    const data = await res.json();

    if(data.ok){

      const resumen =
        carrito.map(p=>
          `• ${p.nombre} - $${p.precio}`
        ).join("%0A");

      const mensaje =

`Hola Pandé 👋

Quiero confirmar mi pedido:

${resumen}

Total: $${total}

Nombre:
${nombre}

Entrega:
${entrega}

Pago:
${pago}

Notas:
${notas}`;

      const whatsapp =
`https://wa.me/529992175116?text=${mensaje}`;

      window.open(whatsapp,"_blank");

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


