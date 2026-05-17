const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwTKKe_3DpFONr8nN4ZfuCt0kBqEcspB4_WXHnrtarNTqPlldpHBqba-FbqJcr7-nECZw/exec";

const FRONTEND_KEY = "PANDE_PUBLIC_2026";

let productos = [];

let carrito = [];

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

  function agregarCarrito(id){

  const producto = productos.find(
    p => p.id === id
  );

  if(!producto) return;

  carrito.push(producto);

  actualizarCarrito();

}

  function actualizarCarrito(){

  document.getElementById("cart-count")
    .innerText = carrito.length;

}

  const cont = document.getElementById("productos");

  cont.innerHTML = "";

  const categorias = {};

  productos.forEach(p=>{

    if(!categorias[p.categoria]){
      categorias[p.categoria] = [];
    }

    categorias[p.categoria].push(p);

  });

  Object.keys(categorias).forEach(cat=>{

        const nombresCategorias = {
      PedEsp: "Pedidos Especiales",
      Temporada: "Temporada",
      Muffin: "Muffins",
      Rebanada: "Rebanadas",
      Pan: "Panes"
    };

    const nombreVisual =
      nombresCategorias[cat] || cat;

    const catId = cat.replace(/\s+/g,'-');

    cont.innerHTML += `

      <section class="categoria-section">

        <h2 class="categoria-title">
          ${nombreVisual}
        </h2>

        <div class="categoria-grid" id="cat-${catId}">
        </div>

      </section>

    `;

    const grid = document.getElementById(`cat-${catId}`);

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

cargarCatalogo();
