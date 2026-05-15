const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwTKKe_3DpFONr8nN4ZfuCt0kBqEcspB4_WXHnrtarNTqPlldpHBqba-FbqJcr7-nECZw/exec";
const FRONTEND_KEY = "PANDE_PUBLIC_2026";

let productos = [];

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

  const cont = document.getElementById("productos");

  cont.innerHTML = "";

  productos.forEach(p=>{

    cont.innerHTML += `

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

          <button>
            Agregar
          </button>

        </div>

      </div>

    `;

  });

}

cargarCatalogo();
