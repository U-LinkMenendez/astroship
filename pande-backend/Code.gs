// ============================================================
//  PANDÉ REPOSTERÍA — Apps Script Web App
//  Backend central del ecosistema
//  HTML ↔ Apps Script ↔ Google Sheets ↔ Kommo
// ============================================================

// ════════════════════════════════════════════════════════════
// CONFIG GENERAL
// ════════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();

const SH_CLI = () => SS.getSheetByName("Clientes");
const SH_PED = () => SS.getSheetByName("Pedidos");
const SH_CAT = () => SS.getSheetByName("Catalogo");
const SH_CFG = () => SS.getSheetByName("Config");
const SH_LOG = () => SS.getSheetByName("Logs");
const SH_TIE = () => SS.getSheetByName("Tiendas");
const SH_INV = () => SS.getSheetByName("Inventario");
const SH_USU = () => SS.getSheetByName("Usuarios");
const SH_APE = () => SS.getSheetByName("Aperturas_Diarias");
const SH_REP = () => SS.getSheetByName("Reporte_Mensual");

const DATA_ROW = 4;
const TZ = "America/Merida";

// Seguridad básica frontend
const FRONTEND_KEY = "PANDE_PUBLIC_2026";

// ════════════════════════════════════════════════════════════
// RESPUESTAS
// ════════════════════════════════════════════════════════════

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data = {}) {
  return json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...data
  });
}

function err(message, extra = {}) {
  return json({
    ok: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...extra
  });
}

// ════════════════════════════════════════════════════════════
// HELPERS GENERALES
// ════════════════════════════════════════════════════════════

function normalizePhone(phone) {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "").slice(-10);
}

function nowISO() {
  return new Date().toISOString();
}

function safeNumber(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function safeBoolean(value) {
  if (value === true) return true;

  const text = String(value)
    .trim()
    .toLowerCase();

  return (
    text === "true" ||
    text === "verdadero" ||
    text === "si" ||
    text === "sí" ||
    text === "1"
  );
}

function generarIdPedido() {
  const fecha = Utilities.formatDate(new Date(), TZ, "yyyyMMdd");
  const seq = String(Date.now()).slice(-5);
  return `P-${fecha}-${seq}`;
}

function getConfig(key) {
  const data = SH_CFG().getDataRange().getValues();

  for (let i = DATA_ROW - 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      return String(data[i][1]).trim();
    }
  }

  return "";
}

function hashAccessToken(token, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token || "") + String(salt || ""),
    Utilities.Charset.UTF_8
  );

  return Utilities.base64EncodeWebSafe(bytes);
}

function buscarSesionUsuario(token) {
  const sh = SH_USU();

  if (!sh || !token) return null;

  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (!row[0] || !safeBoolean(row[7])) continue;

    if (hashAccessToken(token, row[3]) !== String(row[2] || "")) {
      continue;
    }

    sh.getRange(i + 1, 10).setValue(new Date());

    return {
      ok: true,
      id_usuario: String(row[0]),
      nombre_usuario: String(row[1] || ""),
      rol: String(row[6] || "tienda").toLowerCase(),
      id_tienda: String(row[4] || ""),
      nombre_tienda: String(row[5] || "")
    };
  }

  return null;
}

function validarToken(token) {
  return token === getConfig("Token Seguridad Script");
}

function obtenerSesionAdmin(token) {

  if (
    token === getConfig("Token Admin Master") ||
    token === getConfig("Token Seguridad Script")
  ) {
    return {
      ok: true,
      rol: "master",
      id_usuario: "MASTER",
      nombre_usuario: "Karla",
      id_tienda: "",
      nombre_tienda: "Todas"
    };
  }

  const sesionUsuario = buscarSesionUsuario(token);

  if (sesionUsuario) {
    return sesionUsuario;
  }

  if (
    token === getConfig("Token Admin Dzitya")
  ) {
    return {
      ok: true,
      rol: "tienda",
      id_usuario: "LEGACY-DZITYA",
      nombre_usuario: "Acceso anterior Dzityá",
      id_tienda: "DZITYA",
      nombre_tienda: "Dzityá"
    };
  }

  if (
    token === getConfig("Token Admin Lavin")
  ) {
    return {
      ok: true,
      rol: "tienda",
      id_usuario: "LEGACY-LAVIN",
      nombre_usuario: "Acceso anterior García Lavín",
      id_tienda: "LAVIN",
      nombre_tienda: "García Lavín"
    };
  }

  if (
    token === getConfig("Token Admin Empleadas")
  ) {
    return {
      ok: true,
      rol: "tienda",
      id_usuario: "LEGACY-EMPLEADAS",
      nombre_usuario: "Acceso anterior empleadas",
      id_tienda: "LAVIN",
      nombre_tienda: "García Lavín"
    };
  }

  return {
    ok: false,
    rol: "",
    id_usuario: "",
    nombre_usuario: "",
    id_tienda: "",
    nombre_tienda: ""
  };
}

function validarTokenEmpleado(token) {
  return obtenerSesionAdmin(token).ok;
}

function validarTokenMaster(token) {
  return obtenerSesionAdmin(token).rol === "master";
}

// ════════════════════════════════════════════════════════════
// LOGGER
// ════════════════════════════════════════════════════════════

function logEvent(tipo, payload, respuesta = "") {
  try {
    SH_LOG().appendRow([
      new Date(),
      tipo,
      JSON.stringify(payload),
      typeof respuesta === "string"
        ? respuesta
        : JSON.stringify(respuesta)
    ]);
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════
// doGet
// ════════════════════════════════════════════════════════════

function doGet(e) {

  try {

    const params = e.parameter;
    const action = params.action || "ping";

    if (params.pande_sid) {
  return responderAccesoPorSid(params);
}

    if (action === "ping") {
      return ok({
        msg: "Pandé backend activo"
      });
    }

    if (action === "getAdminSession") {

      const sesion =
        obtenerSesionAdmin(params.token);

      if (!sesion.ok) {
        return err("Token inválido");
      }

      return ok({
        sesion
      });
    }

    // Catálogo público

    // Tiendas públicas
    if (action === "getTiendas") {

      if (params.key !== FRONTEND_KEY) {
        return err("Frontend key inválida");
      }

      return ok({
        tiendas: leerTiendas()
      });
    }

    if (action === "cotizarRuta") {
      if (params.key !== FRONTEND_KEY) {
        return err("Frontend key inválida");
      }

      return cotizarRuta(params);
    }

    if (action === "getCatalogoPublico") {

      if (params.key !== FRONTEND_KEY) {
        return err("Frontend key inválida");
      }

      const cache = CacheService.getScriptCache();
const cached = cache.get("catalogo_publico");

if (cached) {
  return ok({
    productos: JSON.parse(cached)
  });
}

    

const productos = leerCatalogoPublico();

cache.put(
  "catalogo_publico",
  JSON.stringify(productos),
  300
);

return ok({
  productos
});
    }

    if (action === "getCatalogoPorTienda") {

      if (params.key !== FRONTEND_KEY) {
        return err("Frontend key inválida");
      }

      if (!params.id_tienda) {
        return err("ID de tienda requerido");
      }

      return ok({
        productos: leerCatalogoPorTienda(params.id_tienda),
        tiendas: leerTiendas(),
        id_tienda: params.id_tienda
      });
    }

    // Acciones para tiendas y master
    if (
      action === "getPedidos" ||
      action === "getPedidosPendientes" ||
      action === "getHistorial7Dias" ||
      action === "getHistorial30Dias"
    ) {
      const sesion =
        obtenerSesionAdmin(params.token);

      if (!sesion.ok) {
        return err("Token inválido");
      }

      let pedidos = [];

      if (action === "getPedidos") {
        pedidos = leerPedidos(params.fecha || null);
      }

      if (action === "getPedidosPendientes") {
        pedidos = leerPedidos(null, [
          "Nuevo",
          "Confirmado",
          "Listo",
          "En camino"
        ]);
      }

      if (action === "getHistorial7Dias") {
        pedidos = leerHistorial7Dias();
      }

      if (action === "getHistorial30Dias") {
        if (sesion.rol !== "master") {
          return err("El historial completo es exclusivo de Master");
        }

        pedidos = leerHistorialDias(30);
      }

      const pedidosFiltrados =
        sesion.rol === "master"
          ? pedidos
          : pedidos.filter(p =>
              p.id_tienda === sesion.id_tienda ||
              (
                !p.id_tienda &&
                p.nombre_tienda === sesion.nombre_tienda
              )
            );

      return ok({
        pedidos: pedidosFiltrados,
        sesion
      });
    }

    // Catálogo e inventario para empleadas y master
    if (
      action === "getCatalogo" ||
      action === "getInventario" ||
      action === "getTiendasAdmin"
    ) {
      if (!validarTokenEmpleado(params.token)) {
        return err("Token inválido");
      }

      if (action === "getCatalogo") {
        return ok({
          productos: leerCatalogo()
        });
      }

      if (action === "getInventario") {
        const sesion = obtenerSesionAdmin(params.token);
        const inventario = leerInventario();

        return ok({
          inventario: sesion.rol === "master"
            ? inventario
            : inventario.filter(item => item.id_tienda === sesion.id_tienda),
          sesion
        });
      }

      return ok({
        tiendas: leerTiendas()
      });
    }

    // Acciones solo master
    if (
      action === "getClientes" ||
      action === "getUsuarios" ||
      action === "getReporteMensual"
    ) {
      if (!validarTokenMaster(params.token)) {
        return err("Token inválido");
      }

      if (action === "getUsuarios") {
        return ok({ usuarios: leerUsuarios() });
      }

      if (action === "getReporteMensual") {
        return ok({ reporte: construirReporteMensual(params.mes) });
      }

      return ok({
        clientes: leerClientes()
      });
    }

    return err("Acción no reconocida");

  } catch (error) {

    logEvent("ERROR_DOGET", {}, error.toString());

    return err("Error interno", {
      detail: error.toString()
    });
  }
}

// ════════════════════════════════════════════════════════════
// doPost
// ════════════════════════════════════════════════════════════

function doPost(e) {

  try {

    const body = JSON.parse(e.postData.contents || "{}");

    const action = body.action || "";

       const publicActions = [
      "registrarPedido",
      "registrarLead"
    ];

    const empleadoActions = [
      "actualizarEstatus",
      "updateDisponible",
      "guardarInventarioDiario"
    ];

    const masterActions = [
      "aprobarPago",
      "aprobarEntrega",
      "actualizarPerfil",
      "updateProducto",
      "crearProducto",
      "crearTienda",
      "updateTienda",
      "crearUsuario",
      "updateUsuario",
      "asignarSucursalSalida"
    ];

    if (publicActions.includes(action)) {
      // Puede continuar sin token
    } else if (empleadoActions.includes(action)) {
      if (!validarTokenEmpleado(body.token)) {
        return err("Token inválido");
      }
    } else if (masterActions.includes(action)) {
      if (!validarTokenMaster(body.token)) {
        return err("Token inválido");
      }
    } else {
      return err("Acción no reconocida");
    }

    switch (action) {

      case "registrarPedido":
        return registrarPedido(body);

      case "registrarLead":
        return registrarLead(body);

            case "actualizarEstatus":
        return actualizarEstatus(body);

      case "aprobarPago":
        return aprobarPago(body);

      case "aprobarEntrega":
        return aprobarEntrega(body);

      case "actualizarPerfil":
        return actualizarPerfil(body);

      case "updateDisponible":
        return updateDisponible(body);

      case "guardarInventarioDiario":
        return guardarInventarioDiario(body);

      case "updateProducto":
        return updateProducto(body);

      case "crearProducto":
        return crearProducto(body);

              case "crearTienda":
        return crearTienda(body);

      case "updateTienda":
        return updateTienda(body);

      case "crearUsuario":
        return crearUsuario(body);

      case "updateUsuario":
        return updateUsuario(body);

      case "asignarSucursalSalida":
        return asignarSucursalSalida(body);

      default:
        return err("Acción no reconocida");
    }

  } catch (error) {

    logEvent("ERROR_DOPOST", {}, error.toString());

    return err("Error interno", {
      detail: error.toString()
    });
  }
  
}

// ════════════════════════════════════════════════════════════
// REGISTRAR PEDIDO
// ════════════════════════════════════════════════════════════

function prepararProductosPedido(productosSolicitados, idTienda) {
  const catalogo = leerCatalogo();
  const inventario = leerInventario();
  const productos = [];

  for (let i = 0; i < productosSolicitados.length; i++) {
    const solicitado = productosSolicitados[i];
    const producto = catalogo.find(p => p.id === solicitado.id);
    const cantidad = Math.floor(safeNumber(solicitado.qty));

    if (!producto || cantidad < 1 || producto.disponible !== true) {
      throw new Error("Producto inválido o no disponible: " + (solicitado.id || ""));
    }

    if (producto.pedido_especial === true || producto.categoria === "PedEsp") {
      throw new Error("Los pedidos especiales se atienden por teléfono");
    }

    const stock = inventario.find(item =>
      item.id_tienda === idTienda && item.id_producto === producto.id
    );

    if (!stock || stock.disponible !== true) {
      throw new Error("Producto agotado: " + producto.nombre);
    }

    if (stock.cantidad !== null && stock.cantidad < cantidad) {
      throw new Error("Cantidad insuficiente de " + producto.nombre);
    }

    productos.push({
      id: producto.id,
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: safeNumber(producto.precio),
      qty: cantidad
    });
  }

  return productos;
}

function descontarInventarioPedido(productos, idTienda) {
  const sh = SH_INV();
  const data = sh.getDataRange().getValues();

  productos.forEach(producto => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] !== idTienda || data[i][1] !== producto.id) continue;

      if (data[i][3] === "" || data[i][3] === null) return;

      const nuevaCantidad = Math.max(0, safeNumber(data[i][3]) - producto.qty);
      sh.getRange(i + 1, 3, 1, 3).setValues([[
        nuevaCantidad > 0,
        nuevaCantidad,
        new Date()
      ]]);
      return;
    }
  });
}

function registrarPedido(b) {

  const lock = LockService.getScriptLock();

  try {

    if (!lock.tryLock(10000)) {
      return err("La tienda está procesando otro pedido. Intenta nuevamente.");
    }

    // VALIDACIONES

    if (!b.nombre) {
      return err("Nombre requerido");
    }

    if (!b.telefono) {
      return err("Teléfono requerido");
    }

    if (!b.productos || !b.productos.length) {
      return err("Productos vacíos");
    }

    const telefono = normalizePhone(b.telefono);

    if (telefono.length !== 10) {
      return err("Teléfono inválido");
    }

    if (!b.id_tienda) {
      return err("Sucursal elegida requerida");
    }

    const productosPedido = prepararProductosPedido(
      b.productos,
      String(b.id_tienda)
    );

    const subtotal = productosPedido.reduce(
      (total, p) => total + p.precio * p.qty,
      0
    );
    const envio = safeNumber(b.costo_envio);
    const total = subtotal + envio;

    if (total <= 0) {
      return err("Total inválido");
    }

    const sh = SH_PED();

    const idPedido = generarIdPedido();

    // Buscar cliente

    let idCliente = buscarClientePorTel(telefono);

    if (!idCliente) {

      idCliente = registrarLeadInterno({
        nombre: b.nombre,
        telefono,
        email: b.email || "",
        colonia: b.colonia || "",
        canal: "Catalogo",
        dieta: b.perfil_dieta || "",
        ocasion: b.ocasion || ""
      });
    }

    // Productos

    const productosResumen = productosPedido
      .map(p => `${p.nombre} x${p.qty}`)
      .join(", ");

    const categorias = [
      ...new Set(
        productosPedido.map(p => p.categoria || "")
      )
    ].join(", ");

    const cantidadItems = productosPedido.reduce(
      (acc, p) => acc + safeNumber(p.qty),
      0
    );

    const pedidoEspecial = productosPedido.some(
      p => p.pedido_especial === true
    );

    const diaSemana = Utilities.formatDate(
      new Date(),
      TZ,
      "EEEE"
    );

const notasConAcceso = [
  b.notas || "",
  b.sid_acceso ? "SID acceso: " + b.sid_acceso : "",
  b.lead_id ? "Lead Kommo: " + b.lead_id : "",
  b.contact_id ? "Contacto Kommo: " + b.contact_id : ""
].filter(Boolean).join(" | ");


    // APPEND

    const metodoPago =
      b.metodo_pago || "Efectivo";

    const estatusPago =
      metodoPago === "Transferencia"
        ? "Pendiente"
        : "Pago en tienda";

    const fechaEntrega =
      b.fecha_entrega || "";

    const horaEntrega =
      b.hora_entrega || "";

    const esProgramado =
      Boolean(fechaEntrega);

    const esPersonalizado =
      Boolean(b.es_personalizado) ||
      pedidoEspecial;

    const anticipoRequerido =
      esPersonalizado
        ? total * 0.5
        : 0;

    const anticipoPagado =
      safeNumber(b.anticipo_pagado);

    sh.appendRow([
      idPedido,                         // A
      new Date(),                       // B
      idCliente,                        // C
      b.nombre || "",                   // D
      b.nombre_tienda || b.sucursal || "Lavin", // E
      b.tipo_entrega || "Recoger",      // F
      b.direccion_entrega || "",        // G
      productosResumen,                 // H
      JSON.stringify(productosPedido),  // I
      subtotal,                         // J
      envio,                            // K
      total,                            // L
      metodoPago,                       // M
      estatusPago,                      // N
      "Nuevo",                          // O
      "",                               // P
      "",                               // Q
      "",                               // R
      diaSemana,                        // S
      pedidoEspecial,                   // T
      notasConAcceso,                    // U
      b.id_kommo || b.lead_id || "",                 // V
      categorias,                       // W
      cantidadItems,                    // X
      b.id_tienda || "",                // Y
      b.nombre_tienda || "",            // Z
      fechaEntrega,                     // AA
      horaEntrega,                      // AB
      esProgramado,                     // AC
      esPersonalizado,                  // AD
      anticipoRequerido,                // AE
      anticipoPagado,                   // AF
      envio,                            // AG
      b.ubicacion_url || "",            // AH
      b.nombre_receptor || "",          // AI
      safeNumber(b.distancia_envio_km), // AJ
      safeBoolean(b.envio_sujeto_confirmacion), // AK
      "",                               // AL ID tienda salida interna
      "",                               // AM Nombre tienda salida interna
      "",                               // AN Anulado por
      "",                               // AO Motivo anulación
      "",                               // AP Fecha anulación
      "Sistema"                         // AQ Último cambio
    ]);

    descontarInventarioPedido(productosPedido, String(b.id_tienda));

    actualizarFechaCompra(idCliente);

    logEvent("PEDIDO_REGISTRADO", b, {
      idPedido
    });

    return ok({
      id_pedido: idPedido,
      id_cliente: idCliente,
      total
    });

  } catch (error) {

    logEvent("ERROR_REGISTRAR_PEDIDO", b, error.toString());

    return err("Error registrando pedido", {
      detail: error.toString()
    });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// ════════════════════════════════════════════════════════════
// REGISTRAR LEAD
// ════════════════════════════════════════════════════════════

function registrarLead(b) {

  try {

    const telefono = normalizePhone(b.telefono);

    if (!telefono) {
      return err("Teléfono requerido");
    }

    const existente = buscarClientePorTel(telefono);

    if (existente) {

      if (b.id_kommo) {
        actualizarCampoCliente(existente, 18, b.id_kommo);
      }

      return ok({
        id_cliente: existente,
        nuevo: false
      });
    }

    const id = registrarLeadInterno({
      ...b,
      telefono
    });

    logEvent("LEAD_REGISTRADO", b, {
      id
    });

    return ok({
      id_cliente: id,
      nuevo: true
    });

  } catch (error) {

    logEvent("ERROR_REGISTRAR_LEAD", b, error.toString());

    return err("Error registrando lead");
  }
}

function registrarLeadInterno(b) {

  const sh = SH_CLI();

  const id = "CLI-" +
    Utilities.getUuid()
      .substring(0, 8)
      .toUpperCase();

  sh.appendRow([
    id,
    b.nombre || "",
    normalizePhone(b.telefono),
    b.email || "",
    b.colonia || "",
    inferirZona(b.colonia),
    inferirSucursal(b.colonia),
    b.dieta || "",
    b.ocasion || "",
    b.canal || "WhatsApp",
    new Date(),
    "",
    0,
    0,
    "",
    0,
    true,
    b.id_kommo || "",
    b.notas || ""
  ]);

  return id;
}

// ════════════════════════════════════════════════════════════
// ACTUALIZAR ESTATUS
// ════════════════════════════════════════════════════════════

function actualizarEstatus(b) {

  try {

    const fila = buscarFilaPedido(b.id_pedido);

    if (!fila) {
      return err("Pedido no encontrado");
    }

    const sh = SH_PED();
    const sesion = obtenerSesionAdmin(b.token);
    const row = sh.getRange(fila, 1, 1, 43).getValues()[0];
    const estatusActual = String(row[14] || "Nuevo");
    const nuevoEstatus = String(b.estatus_pedido || "");
    const idTiendaPedido = String(row[24] || "");

    if (sesion.rol !== "master" && idTiendaPedido !== sesion.id_tienda) {
      return err("El pedido pertenece a otra sucursal");
    }

    const transiciones = {
      "Nuevo": "Confirmado",
      "Confirmado": "Listo",
      "Listo": "En camino",
      "En camino": "Entregado"
    };

    if (
      nuevoEstatus === "Cancelado" &&
      (sesion.rol !== "master" || !String(b.motivo_anulacion || "").trim())
    ) {
      return err("Solo Master puede anular e indicar el motivo");
    }

    if (
      sesion.rol !== "master" &&
      nuevoEstatus &&
      transiciones[estatusActual] !== nuevoEstatus
    ) {
      return err("Cambio de estado no permitido");
    }

    if (nuevoEstatus) {
      sh.getRange(fila, 15).setValue(nuevoEstatus);

      if (nuevoEstatus === "Cancelado") {
        sh.getRange(fila, 40, 1, 3).setValues([[
          sesion.nombre_usuario || "Master",
          String(b.motivo_anulacion).trim(),
          new Date()
        ]]);
      }
    }

    if (b.estatus_pago) {
      sh.getRange(fila, 14).setValue(b.estatus_pago);
    }

    if (b.comprobante_url) {
      sh.getRange(fila, 16).setValue(b.comprobante_url);
    }

    sh.getRange(fila, 43).setValue(
      sesion.nombre_usuario || sesion.nombre_tienda || "Sistema"
    );

    logEvent("ESTATUS_ACTUALIZADO", b);

    return ok({
      fila
    });

  } catch (error) {

    logEvent("ERROR_ESTATUS", b, error.toString());

    return err("Error actualizando estatus");
  }
}

// ════════════════════════════════════════════════════════════
// APROBAR PAGO
// ════════════════════════════════════════════════════════════

function aprobarPago(b) {

  try {

    const fila = buscarFilaPedido(b.id_pedido);

    if (!fila) {
      return err("Pedido no encontrado");
    }

    const sh = SH_PED();

    sh.getRange(fila, 14).setValue("Pagado");

    logEvent("PAGO_APROBADO", b);

    return ok({
      id_pedido: b.id_pedido
    });

  } catch (error) {

    logEvent("ERROR_APROBAR_PAGO", b, error.toString());

    return err("Error aprobando pago");
  }
}


// ════════════════════════════════════════════════════════════
// APROBAR ENTREGA
// ════════════════════════════════════════════════════════════

function aprobarEntrega(b) {

  try {

    const fila = buscarFilaPedido(b.id_pedido);

    if (!fila) {
      return err("Pedido no encontrado");
    }

    const sh = SH_PED();

    sh.getRange(fila, 15).setValue("Listo");
    sh.getRange(fila, 14).setValue("Pagado");
    sh.getRange(fila, 17).setValue(
      b.aprobado_por || "Karla"
    );
    sh.getRange(fila, 18).setValue(
      new Date()
    );

    logEvent("ENTREGA_APROBADA", b);

    return ok({
      id_pedido: b.id_pedido
    });

  } catch (error) {

    logEvent("ERROR_APROBAR", b, error.toString());

    return err("Error aprobando entrega");
  }
}

// ════════════════════════════════════════════════════════════
// ACTUALIZAR PERFIL
// ════════════════════════════════════════════════════════════

function actualizarPerfil(b) {

  try {

    const id =
      b.id_cliente ||
      buscarClientePorTel(b.telefono);

    if (!id) {
      return err("Cliente no encontrado");
    }

    if (b.dieta) {
      actualizarCampoCliente(id, 8, b.dieta);
    }

    if (b.ocasion) {
      actualizarCampoCliente(id, 9, b.ocasion);
    }

    if (b.colonia) {

      actualizarCampoCliente(id, 5, b.colonia);

      actualizarCampoCliente(
        id,
        6,
        inferirZona(b.colonia)
      );

      actualizarCampoCliente(
        id,
        7,
        inferirSucursal(b.colonia)
      );
    }

    if (b.id_kommo) {
      actualizarCampoCliente(id, 18, b.id_kommo);
    }

    return ok({
      id_cliente: id
    });

  } catch (error) {

    logEvent("ERROR_PERFIL", b, error.toString());

    return err("Error actualizando perfil");
  }
}

// ════════════════════════════════════════════════════════════
// DISPONIBILIDAD CATÁLOGO
// ════════════════════════════════════════════════════════════

function updateDisponible(b) {

  try {

    const sesion = obtenerSesionAdmin(b.token);

    if (
      b.id_tienda &&
      sesion.rol !== "master" &&
      String(b.id_tienda) !== sesion.id_tienda
    ) {
      return err("No puedes modificar el inventario de otra sucursal");
    }

    if (b.id_tienda) {

      const sh = SH_INV();
      const data = sh.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {

        if (
          data[i][0] === b.id_tienda &&
          data[i][1] === b.id_producto
        ) {

          sh.getRange(i + 1, 3)
            .setValue(Boolean(b.disponible));

          CacheService
            .getScriptCache()
            .remove("catalogo_publico");

          return ok({
            id_tienda: b.id_tienda,
            id_producto: b.id_producto,
            disponible: b.disponible
          });
        }
      }

      sh.appendRow([
        b.id_tienda,
        b.id_producto,
        Boolean(b.disponible)
      ]);

      CacheService
        .getScriptCache()
        .remove("catalogo_publico");

      return ok({
        id_tienda: b.id_tienda,
        id_producto: b.id_producto,
        disponible: b.disponible
      });
    }

    const sh = SH_CAT();
    const data = sh.getDataRange().getValues();

    for (let i = DATA_ROW - 1; i < data.length; i++) {

      if (data[i][0] === b.id_producto) {

        sh.getRange(i + 1, 6)
          .setValue(Boolean(b.disponible));

        CacheService
          .getScriptCache()
          .remove("catalogo_publico");

        return ok({
          id_producto: b.id_producto,
          disponible: b.disponible
        });
      }
    }

    return err("Producto no encontrado");

  } catch (error) {

    logEvent("ERROR_DISPONIBLE", b, error.toString());

    return err("Error actualizando producto");
  }
}

function guardarInventarioDiario(b) {
  try {
    const sesion = obtenerSesionAdmin(b.token);
    const idTienda = sesion.rol === "master"
      ? String(b.id_tienda || "")
      : sesion.id_tienda;
    const productos = Array.isArray(b.productos) ? b.productos : [];

    if (!idTienda || !productos.length) {
      return err("Sucursal e inventario requeridos");
    }

    const catalogo = leerCatalogo();
    const idsEsperados = catalogo
      .filter(p => p.disponible === true && p.pedido_especial !== true && p.categoria !== "PedEsp")
      .map(p => p.id);
    const cantidades = {};

    productos.forEach(item => {
      cantidades[String(item.id_producto || item.id || "")] = Math.max(
        0,
        Math.floor(safeNumber(item.cantidad))
      );
    });

    const faltantes = idsEsperados.filter(id => cantidades[id] === undefined);

    if (faltantes.length) {
      return err("Debes capturar todos los productos", { faltantes });
    }

    const sh = SH_INV();
    const data = sh.getDataRange().getValues();
    const ahora = new Date();

    idsEsperados.forEach(idProducto => {
      const cantidad = cantidades[idProducto];
      let fila = 0;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === idTienda && data[i][1] === idProducto) {
          fila = i + 1;
          break;
        }
      }

      const valores = [[
        cantidad > 0,
        cantidad,
        ahora,
        sesion.id_usuario || "MASTER",
        sesion.nombre_usuario || "Karla"
      ]];

      if (fila) {
        sh.getRange(fila, 3, 1, 5).setValues(valores);
      } else {
        sh.appendRow([idTienda, idProducto].concat(valores[0]));
      }
    });

    const tienda = leerTiendas().find(t => t.id_tienda === idTienda);
    SH_APE().appendRow([
      Utilities.formatDate(ahora, TZ, "yyyy-MM-dd"),
      idTienda,
      tienda ? tienda.nombre : idTienda,
      sesion.id_usuario || "MASTER",
      sesion.nombre_usuario || "Karla",
      ahora,
      idsEsperados.length,
      "Completa"
    ]);

    CacheService.getScriptCache().remove("catalogo_publico");
    logEvent("INVENTARIO_DIARIO", {
      id_tienda: idTienda,
      id_usuario: sesion.id_usuario,
      productos: idsEsperados.length
    });

    return ok({
      id_tienda: idTienda,
      productos_capturados: idsEsperados.length,
      apertura_completa: true
    });
  } catch (error) {
    logEvent("ERROR_INVENTARIO_DIARIO", b, error.toString());
    return err("Error guardando inventario diario", { detail: error.toString() });
  }
}

// ════════════════════════════════════════════════════════════
// ACTUALIZAR PRODUCTO
// ════════════════════════════════════════════════════════════

function updateProducto(b) {

  try {

    const sh = SH_CAT();
    const data = sh.getDataRange().getValues();

    for (let i = DATA_ROW - 1; i < data.length; i++) {

      if (data[i][0] === b.id_producto) {

        if (b.nombre !== undefined) {
          sh.getRange(i + 1, 2).setValue(b.nombre);
        }

        if (b.categoria !== undefined) {
          sh.getRange(i + 1, 3).setValue(b.categoria);
        }

        if (b.linea !== undefined) {
          sh.getRange(i + 1, 4).setValue(b.linea);
        }

        if (b.precio !== undefined) {
          sh.getRange(i + 1, 5).setValue(safeNumber(b.precio));
        }

        if (b.disponible !== undefined) {
          sh.getRange(i + 1, 6).setValue(Boolean(b.disponible));
        }

        if (b.pedido_especial !== undefined) {
          sh.getRange(i + 1, 7).setValue(Boolean(b.pedido_especial));
        }

        if (b.delivery_ok !== undefined) {
          sh.getRange(i + 1, 8).setValue(Boolean(b.delivery_ok));
        }

        if (b.descripcion !== undefined) {
          sh.getRange(i + 1, 9).setValue(b.descripcion);
        }

        if (b.img_url !== undefined) {
          sh.getRange(i + 1, 10).setValue(b.img_url);
        }

        CacheService
          .getScriptCache()
          .remove("catalogo_publico");

        logEvent("PRODUCTO_ACTUALIZADO", b);

        return ok({
          id_producto: b.id_producto
        });
      }
    }

    return err("Producto no encontrado");

  } catch (error) {

    logEvent("ERROR_UPDATE_PRODUCTO", b, error.toString());

    return err("Error actualizando producto");
  }
}

// ════════════════════════════════════════════════════════════
// CREAR PRODUCTO
// ════════════════════════════════════════════════════════════

function crearProducto(b) {

  try {

    const sh = SH_CAT();

    if (!b.id_producto) {
      return err("ID requerido");
    }

    if (!b.nombre) {
      return err("Nombre requerido");
    }

    if (!b.categoria) {
      return err("Categoría requerida");
    }

    if (buscarProductoPorId(b.id_producto)) {
      return err("Ya existe un producto con ese ID");
    }

    sh.appendRow([
      b.id_producto,
      b.nombre || "",
      b.categoria || "",
      b.linea || "",
      safeNumber(b.precio),
      b.disponible !== false,
      Boolean(b.pedido_especial),
      b.delivery_ok !== false,
      b.descripcion || "",
      b.img_url || ""
    ]);

    CacheService
      .getScriptCache()
      .remove("catalogo_publico");

    logEvent("PRODUCTO_CREADO", b);

    return ok({
      id_producto: b.id_producto
    });

  } catch (error) {

    logEvent("ERROR_CREAR_PRODUCTO", b, error.toString());

    return err("Error creando producto");
  }
}

function buscarProductoPorId(idProducto) {

  const data = SH_CAT()
    .getDataRange()
    .getValues();

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    if (data[i][0] === idProducto) {
      return true;
    }
  }

  return false;
}


// ════════════════════════════════════════════════════════════
// TIENDAS
// ════════════════════════════════════════════════════════════

function crearTienda(b) {

  try {

    if (!b.id_tienda) {
      return err("ID de tienda requerido");
    }

    if (!b.nombre) {
      return err("Nombre requerido");
    }

    if (buscarTiendaPorId(b.id_tienda)) {
      return err("Ya existe una tienda con ese ID");
    }

    const sh = SH_TIE();

    sh.appendRow([
      b.id_tienda,
      b.nombre || "",
      b.direccion || "",
      safeNumber(b.lat),
      safeNumber(b.lng),
      b.whatsapp || "",
      b.activa !== false,
      b.delivery_ok === true
    ]);

    crearInventarioParaTienda(b.id_tienda);

    logEvent("TIENDA_CREADA", b);

    return ok({
      id_tienda: b.id_tienda
    });

  } catch (error) {

    logEvent("ERROR_CREAR_TIENDA", b, error.toString());

    return err("Error creando tienda");
  }
}

function updateTienda(b) {

  try {

    const sh = SH_TIE();
    const data = sh.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {

      if (data[i][0] === b.id_tienda) {

        if (b.nombre !== undefined) {
          sh.getRange(i + 1, 2).setValue(b.nombre);
        }

        if (b.direccion !== undefined) {
          sh.getRange(i + 1, 3).setValue(b.direccion);
        }

        if (b.lat !== undefined) {
          sh.getRange(i + 1, 4).setValue(safeNumber(b.lat));
        }

        if (b.lng !== undefined) {
          sh.getRange(i + 1, 5).setValue(safeNumber(b.lng));
        }

        if (b.whatsapp !== undefined) {
          sh.getRange(i + 1, 6).setValue(b.whatsapp);
        }

        if (b.activa !== undefined) {
          sh.getRange(i + 1, 7).setValue(Boolean(b.activa));
        }

        if (b.delivery_ok !== undefined) {
          sh.getRange(i + 1, 8).setValue(Boolean(b.delivery_ok));
        }

        logEvent("TIENDA_ACTUALIZADA", b);

        return ok({
          id_tienda: b.id_tienda
        });
      }
    }

    return err("Tienda no encontrada");

  } catch (error) {

    logEvent("ERROR_UPDATE_TIENDA", b, error.toString());

    return err("Error actualizando tienda");
  }
}

function buscarTiendaPorId(idTienda) {

  const data = SH_TIE()
    .getDataRange()
    .getValues();

  for (let i = 1; i < data.length; i++) {

    if (data[i][0] === idTienda) {
      return true;
    }
  }

  return false;
}

function crearInventarioParaTienda(idTienda) {

  const catalogo = leerCatalogo();

  const sh = SH_INV();

  catalogo.forEach(p => {
    sh.appendRow([
      idTienda,
      p.id,
      true
    ]);
  });
}


// ════════════════════════════════════════════════════════════
// LECTURAS
// ════════════════════════════════════════════════════════════

function leerTiendas() {

  const data = SH_TIE()
    .getDataRange()
    .getValues();

  const result = [];

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (!row[0]) continue;
   if (!safeBoolean(row[6])) continue;

    result.push({
      id_tienda: row[0],
      nombre: row[1],
      direccion: row[2],
      lat: safeNumber(row[3]),
      lng: safeNumber(row[4]),
      whatsapp: row[5],
      activa: row[6],
      delivery_ok: safeBoolean(row[7])
    });
  }

  return result;
}

function leerInventario() {

  const data = SH_INV()
    .getDataRange()
    .getValues();

  const result = [];

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (!row[0] || !row[1]) continue;

    result.push({
      id_tienda: row[0],
      id_producto: row[1],
      disponible: row[3] === "" || row[3] === null
        ? safeBoolean(row[2])
        : safeNumber(row[3]) > 0,
      cantidad: row[3] === "" || row[3] === null
        ? null
        : safeNumber(row[3]),
      fecha_actualizacion: row[4] || "",
      id_usuario: row[5] || "",
      nombre_usuario: row[6] || ""
    });
  }

  return result;
}

function productoDisponibleEnTienda(idTienda, idProducto) {

  const data = SH_INV()
    .getDataRange()
    .getValues();

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (
      row[0] === idTienda &&
      row[1] === idProducto
    ) {
      return row[3] === "" || row[3] === null
        ? safeBoolean(row[2])
        : safeNumber(row[3]) > 0;
    }
  }

  return false;
}

function leerCatalogoPorTienda(idTienda) {

  const catalogo = leerCatalogoPublico();

  return catalogo.filter(p =>
    p.pedido_especial !== true &&
    p.categoria !== "PedEsp" &&
    productoDisponibleEnTienda(idTienda, p.id)
  );
}

function leerCatalogoPublico() {

  const data = SH_CAT()
    .getDataRange()
    .getValues();

  const result = [];

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    const row = data[i];

    if (!row[0]) continue;
    if (row[5] !== true) continue;

    result.push({
      id: row[0],
      nombre: row[1],
      categoria: row[2],
      linea: row[3],
      precio: row[4],
      disponible: row[5],
      pedido_especial: row[6],
      delivery_ok: row[7],
      descripcion: row[8],
      img_url: row[9]
    });
  }

  return result;
}

function leerCatalogo() {

  const data = SH_CAT()
    .getDataRange()
    .getValues();

  const result = [];

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    const row = data[i];

    if (!row[0]) continue;

    result.push({
      id: row[0],
      nombre: row[1],
      categoria: row[2],
      linea: row[3],
      precio: row[4],
      disponible: row[5],
      pedido_especial: row[6],
      delivery_ok: row[7],
      descripcion: row[8],
      img_url: row[9]
    });
  }

  return result;
}

function leerPedidos(fecha = null, estatusFiltro = null) {

  const data = SH_PED()
    .getDataRange()
    .getValues();

  const result = [];

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    const row = data[i];

    if (!row[0]) continue;

    if (fecha) {

      const fPedido = Utilities.formatDate(
        new Date(row[1]),
        TZ,
        "yyyy-MM-dd"
      );

      if (fPedido !== fecha) continue;
    }

    if (
      estatusFiltro &&
      !estatusFiltro.includes(row[14])
    ) continue;

    result.push({
      id_pedido: row[0],
      fecha_pedido: row[1],
      nombre_cliente: row[3],
      sucursal: row[4],
      productos: row[7],
      total: row[11],
      metodo_pago: row[12],
      estatus_pago: row[13],
      estatus_pedido: row[14],
      id_tienda: row[24],
      nombre_tienda: row[25],
      fecha_entrega: row[26],
      hora_entrega: row[27],
      es_programado: row[28],
      es_personalizado: row[29],
      anticipo_requerido: row[30],
      anticipo_pagado: row[31],
      costo_envio_estimado: row[32],
      ubicacion_url: row[33],
      nombre_receptor: row[34],
      distancia_envio_km: row[35],
      envio_sujeto_confirmacion: safeBoolean(row[36]),
      id_tienda_salida_interna: row[37],
      nombre_tienda_salida_interna: row[38]
    });
  }

  return result;
}

function leerHistorial7Dias() {

  return leerHistorialDias(7);
}

function leerHistorialDias(dias) {

  const data = SH_PED()
    .getDataRange()
    .getValues();

  const result = [];

  const ahora = new Date();
  const limite = new Date();
  limite.setDate(ahora.getDate() - Math.max(1, safeNumber(dias)));

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    const row = data[i];

    if (!row[0]) continue;
    if (!row[1]) continue;

    const fechaPedido = new Date(row[1]);

    if (fechaPedido < limite) continue;

    result.push({
      id_pedido: row[0],
      fecha_pedido: row[1],
      nombre_cliente: row[3],
      sucursal: row[4],
      productos: row[7],
      total: row[11],
      metodo_pago: row[12],
      estatus_pago: row[13],
      estatus_pedido: row[14],
      id_tienda: row[24],
      nombre_tienda: row[25],
      fecha_entrega: row[26],
      hora_entrega: row[27],
      es_programado: row[28],
      es_personalizado: row[29],
      anticipo_requerido: row[30],
      anticipo_pagado: row[31],
      costo_envio_estimado: row[32],
      ubicacion_url: row[33],
      nombre_receptor: row[34],
      distancia_envio_km: row[35],
      envio_sujeto_confirmacion: safeBoolean(row[36]),
      id_tienda_salida_interna: row[37],
      nombre_tienda_salida_interna: row[38],
      anulado_por: row[39],
      motivo_anulacion: row[40],
      fecha_anulacion: row[41],
      usuario_ultimo_cambio: row[42]
    });
  }

  return result.reverse();
}

function responderAccesoPorSid(params) {

  const callback = params.callback || "";
  const sid = String(params.pande_sid || "").trim();

  const respuesta = buscarAccesoPorSid(sid);

  if (callback) {
    return ContentService
      .createTextOutput(
        callback + "(" + JSON.stringify(respuesta) + ")"
      )
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json(respuesta);
}

function buscarAccesoPorSid(sid) {

  if (!sid) {
    return {
      ok: false,
      error: "SID requerido"
    };
  }

  const sh =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("accesos");

  if (!sh) {
    return {
      ok: false,
      error: "Hoja accesos no encontrada"
    };
  }

  const data = sh.getDataRange().getValues();

  if (data.length < 2) {
    return {
      ok: false,
      error: "No hay accesos registrados"
    };
  }

  const headers =
    data[0].map(h => String(h).trim());

  const col = name =>
    headers.indexOf(name);

  const cSid = col("sid");
  const cNombre = col("nombre_original");
  const cTelefono = col("telefono");
  const cEstatus = col("estatus");
  const cVencimiento = col("fecha_vencimiento");
  const cUltimoAcceso = col("fecha_ultimo_acceso");

  if (cSid === -1) {
    return {
      ok: false,
      error: "Columna sid no encontrada"
    };
  }

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (String(row[cSid]).trim() !== sid) {
      continue;
    }

    const estatus =
      cEstatus >= 0
        ? String(row[cEstatus]).trim().toLowerCase()
        : "activo";

    if (estatus && estatus !== "activo") {
      return {
        ok: false,
        error: "Acceso inactivo",
        sid,
        estatus
      };
    }

if (cVencimiento >= 0) {
  const nuevoVencimiento =
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  sh.getRange(i + 1, cVencimiento + 1)
    .setValue(nuevoVencimiento);

  row[cVencimiento] = nuevoVencimiento;
}

    if (cUltimoAcceso >= 0) {
      sh.getRange(i + 1, cUltimoAcceso + 1)
        .setValue(new Date());
    }

    const nombreCompleto =
      cNombre >= 0
        ? String(row[cNombre] || "").trim()
        : "";

    const primerNombre =
      nombreCompleto.split(" ")[0] || nombreCompleto;

    return {
      ok: true,
      sid,
      nombre: primerNombre,
      nombre_completo: nombreCompleto,
      telefono: cTelefono >= 0
        ? String(row[cTelefono] || "").replace(/\D/g, "")
        : "",
      estatus: "activo",
      fecha_vencimiento: cVencimiento >= 0 && row[cVencimiento]
        ? new Date(row[cVencimiento]).toISOString()
        : ""
    };
  }

  return {
    ok: false,
    error: "SID no encontrado",
    sid
  };
}

function leerClientes() {

  const data = SH_CLI()
    .getDataRange()
    .getValues();

  const result = [];

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    const row = data[i];

    if (!row[0]) continue;

    result.push({
      id_cliente: row[0],
      nombre: row[1],
      telefono: row[2],
      colonia: row[4],
      sucursal_pref: row[6],
      perfil_dieta: row[7]
    });
  }

  return result;
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function buscarClientePorTel(tel) {

  const telefono = normalizePhone(tel);

  const data = SH_CLI()
    .getDataRange()
    .getValues();

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    const t = normalizePhone(data[i][2]);

    if (t === telefono) {
      return data[i][0];
    }
  }

  return null;
}

function buscarFilaPedido(idPedido) {

  const data = SH_PED()
    .getDataRange()
    .getValues();

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    if (data[i][0] === idPedido) {
      return i + 1;
    }
  }

  return null;
}

function actualizarCampoCliente(idCliente, col, valor) {

  const sh = SH_CLI();

  const data = sh
    .getDataRange()
    .getValues();

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    if (data[i][0] === idCliente) {

      sh.getRange(i + 1, col)
        .setValue(valor);

      return;
    }
  }
}

function actualizarFechaCompra(idCliente) {

  const sh = SH_CLI();

  const data = sh
    .getDataRange()
    .getValues();

  for (let i = DATA_ROW - 1; i < data.length; i++) {

    if (
      data[i][0] === idCliente &&
      !data[i][11]
    ) {

      sh.getRange(i + 1, 12)
        .setValue(new Date());

      return;
    }
  }
}

// ════════════════════════════════════════════════════════════
// ZONAS / SUCURSALES
// ════════════════════════════════════════════════════════════

function inferirZona(colonia) {

  if (!colonia) return "Centro";

  const c = colonia.toLowerCase();

  const NORTE = [
    "temozon",
    "montebello",
    "altabrisa",
    "dzitya",
    "cholul",
    "cabo norte",
    "country"
  ];

  const SUR = [
    "brisas",
    "san jose",
    "centro",
    "garcia gineres"
  ];

  if (NORTE.some(z => c.includes(z))) {
    return "Norte";
  }

  if (SUR.some(z => c.includes(z))) {
    return "Sur";
  }

  return "Centro";
}

function inferirSucursal(colonia) {

  if (!colonia) return "Lavin";

  const c = colonia.toLowerCase();

  const DZITYA = [
    "dzitya",
    "temozon",
    "tamanché",
    "cabo norte"
  ];

  if (DZITYA.some(z => c.includes(z))) {
    return "Dzitya";
  }

  return "Lavin";
}

// ════════════════════════════════════════════════════════════
// USUARIOS, RUTAS Y REPORTES
// ════════════════════════════════════════════════════════════

function leerUsuarios() {
  const sh = SH_USU();

  if (!sh) return [];

  const data = sh.getDataRange().getValues();

  return data.slice(1).filter(row => row[0]).map(row => ({
    id_usuario: row[0],
    nombre: row[1],
    id_tienda: row[4],
    nombre_tienda: row[5],
    rol: row[6],
    activo: safeBoolean(row[7]),
    fecha_alta: row[8],
    ultimo_acceso: row[9]
  }));
}

function generarCodigoAcceso() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function crearUsuario(b) {
  try {
    const nombre = String(b.nombre || "").trim();
    const rol = String(b.rol || "tienda").toLowerCase();
    const idTienda = rol === "master" ? "" : String(b.id_tienda || "");
    const tienda = idTienda
      ? leerTiendas().find(t => t.id_tienda === idTienda)
      : null;

    if (!nombre || (rol !== "master" && !tienda)) {
      return err("Nombre y sucursal válidos son requeridos");
    }

    const codigo = String(b.codigo_acceso || generarCodigoAcceso()).trim();
    const salt = Utilities.getUuid();
    const idUsuario = "USR-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    SH_USU().appendRow([
      idUsuario,
      nombre,
      hashAccessToken(codigo, salt),
      salt,
      idTienda,
      tienda ? tienda.nombre : "Todas",
      rol,
      true,
      new Date(),
      ""
    ]);

    logEvent("USUARIO_CREADO", {
      id_usuario: idUsuario,
      nombre,
      id_tienda: idTienda,
      rol
    });

    return ok({
      usuario: {
        id_usuario: idUsuario,
        nombre,
        id_tienda: idTienda,
        nombre_tienda: tienda ? tienda.nombre : "Todas",
        rol,
        activo: true
      },
      codigo_acceso: codigo
    });
  } catch (error) {
    return err("Error creando usuario", { detail: error.toString() });
  }
}

function updateUsuario(b) {
  try {
    const sh = SH_USU();
    const data = sh.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) !== String(b.id_usuario)) continue;

      if (b.nombre !== undefined) sh.getRange(i + 1, 2).setValue(String(b.nombre));

      if (b.id_tienda !== undefined) {
        const tienda = leerTiendas().find(t => t.id_tienda === String(b.id_tienda));
        if (!tienda) return err("Sucursal inválida");
        sh.getRange(i + 1, 5, 1, 2).setValues([[tienda.id_tienda, tienda.nombre]]);
      }

      if (b.activo !== undefined) sh.getRange(i + 1, 8).setValue(safeBoolean(b.activo));

      let codigo = "";

      if (safeBoolean(b.restablecer_acceso)) {
        codigo = generarCodigoAcceso();
        const salt = Utilities.getUuid();
        sh.getRange(i + 1, 3, 1, 2).setValues([[hashAccessToken(codigo, salt), salt]]);
      }

      logEvent("USUARIO_ACTUALIZADO", {
        id_usuario: b.id_usuario,
        id_tienda: b.id_tienda,
        activo: b.activo,
        restablecer_acceso: Boolean(codigo)
      });

      return ok({ id_usuario: b.id_usuario, codigo_acceso: codigo || undefined });
    }

    return err("Usuario no encontrado");
  } catch (error) {
    return err("Error actualizando usuario", { detail: error.toString() });
  }
}

function asignarSucursalSalida(b) {
  const fila = buscarFilaPedido(b.id_pedido);
  const tienda = leerTiendas().find(t => t.id_tienda === String(b.id_tienda_salida || ""));

  if (!fila || !tienda) return err("Pedido o sucursal no encontrados");

  SH_PED().getRange(fila, 38, 1, 2).setValues([[tienda.id_tienda, tienda.nombre]]);
  SH_PED().getRange(fila, 43).setValue("Karla");
  logEvent("SUCURSAL_SALIDA_ASIGNADA", b);

  return ok({
    id_pedido: b.id_pedido,
    id_tienda_salida: tienda.id_tienda,
    nombre_tienda_salida: tienda.nombre
  });
}

function cotizarRuta(params) {
  try {
    const idTienda = String(params.id_tienda || "");
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const tienda = leerTiendas().find(t => t.id_tienda === idTienda);

    if (!tienda || !isFinite(lat) || !isFinite(lng)) {
      return err("Sucursal y destino válidos son requeridos");
    }

    if (tienda.delivery_ok !== true) {
      return err("La sucursal elegida no está habilitada para entregas");
    }

    const directions = Maps.newDirectionFinder()
      .setOrigin(tienda.lat + "," + tienda.lng)
      .setDestination(lat + "," + lng)
      .setMode(Maps.DirectionFinder.Mode.DRIVING)
      .getDirections();
    const leg = directions.routes[0].legs[0];
    const distanciaKm = leg.distance.value / 1000;
    const costo = distanciaKm <= 5.5
      ? 40
      : 40 + Math.ceil((distanciaKm - 5.5) / 0.5) * 5;

    return ok({
      id_tienda: tienda.id_tienda,
      distancia_km: Math.round(distanciaKm * 100) / 100,
      costo_envio: costo,
      origen: tienda.nombre,
      metodo: "recorrido_en_calles"
    });
  } catch (error) {
    logEvent("ERROR_COTIZAR_RUTA", params, error.toString());
    return err("No fue posible calcular el recorrido", { detail: error.toString() });
  }
}

function construirReporteMensual(mes) {
  const mesReporte = /^\d{4}-\d{2}$/.test(String(mes || ""))
    ? String(mes)
    : Utilities.formatDate(new Date(), TZ, "yyyy-MM");
  const data = SH_PED().getDataRange().getValues();
  const productos = {};
  const horarios = {};
  const dias = {};
  const sucursales = {};
  let ingresos = 0;
  let pedidos = 0;
  let unidades = 0;

  const acumular = (grupo, clave, cantidad, ingreso) => {
    if (!grupo[clave]) grupo[clave] = { pedidos: 0, unidades: 0, ingresos: 0 };
    grupo[clave].pedidos += 1;
    grupo[clave].unidades += cantidad;
    grupo[clave].ingresos += ingreso;
  };

  for (let i = DATA_ROW - 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] || !row[1] || String(row[14]) !== "Entregado") continue;

    const fecha = new Date(row[1]);
    if (Utilities.formatDate(fecha, TZ, "yyyy-MM") !== mesReporte) continue;

    const metodo = String(row[12] || "").toLowerCase();
    const estatusPago = String(row[13] || "").toLowerCase();
    const requierePrepago = metodo.indexOf("transfer") >= 0 || metodo.indexOf("linea") >= 0;
    if (requierePrepago && estatusPago !== "pagado") continue;

    let detalle = [];
    try { detalle = JSON.parse(String(row[8] || "[]")); } catch (_) {}

    let unidadesPedido = 0;
    let ingresoPedido = 0;

    detalle.forEach(item => {
      const cantidad = Math.max(0, safeNumber(item.qty));
      const ingreso = cantidad * safeNumber(item.precio);
      const clave = String(item.id || item.nombre || "Sin ID");

      if (!productos[clave]) {
        productos[clave] = {
          id: item.id || "",
          nombre: item.nombre || clave,
          cantidad: 0,
          ingresos: 0,
          pedidos: 0
        };
      }

      productos[clave].cantidad += cantidad;
      productos[clave].ingresos += ingreso;
      productos[clave].pedidos += 1;
      unidadesPedido += cantidad;
      ingresoPedido += ingreso;
    });

    ingresos += ingresoPedido;
    unidades += unidadesPedido;
    pedidos += 1;

    const hora = Utilities.formatDate(fecha, TZ, "HH") + ":00-" +
      Utilities.formatDate(fecha, TZ, "HH") + ":59";
    const dia = Utilities.formatDate(fecha, TZ, "EEEE");
    const sucursal = String(row[25] || row[4] || "Sin sucursal");
    acumular(horarios, hora, unidadesPedido, ingresoPedido);
    acumular(dias, dia, unidadesPedido, ingresoPedido);
    acumular(sucursales, sucursal, unidadesPedido, ingresoPedido);
  }

  const porProducto = Object.keys(productos).map(key => productos[key])
    .sort((a, b) => b.ingresos - a.ingresos);
  const aLista = grupo => Object.keys(grupo).map(clave => ({ clave, ...grupo[clave] }));
  const porHorario = aLista(horarios).sort((a, b) => a.clave.localeCompare(b.clave));
  const porDia = aLista(dias).sort((a, b) => b.ingresos - a.ingresos);
  const porSucursal = aLista(sucursales).sort((a, b) => b.ingresos - a.ingresos);
  const liderCantidad = porProducto.slice().sort((a, b) => b.cantidad - a.cantidad)[0] || null;

  return {
    mes: mesReporte,
    resumen: {
      ingresos_productos: ingresos,
      pedidos_entregados_pagados: pedidos,
      ticket_promedio: pedidos ? ingresos / pedidos : 0,
      unidades_vendidas: unidades,
      producto_lider_cantidad: liderCantidad,
      producto_lider_ingresos: porProducto[0] || null,
      horario_mayores_ventas: porHorario.slice().sort((a, b) => b.ingresos - a.ingresos)[0] || null,
      dia_mayores_ventas: porDia[0] || null
    },
    por_producto: porProducto,
    por_horario: porHorario,
    por_dia_semana: porDia,
    por_sucursal_elegida: porSucursal
  };
}

// ════════════════════════════════════════════════════════════
// MIGRACIÓN CONTROLADA DE ESTRUCTURA — OPERACIÓN V2
// Ejecutar una sola vez desde el editor de Apps Script.
// Primero crea una copia completa del archivo de Sheets en Drive.
// ════════════════════════════════════════════════════════════

function crearRespaldoDriveAntesMigracion() {
  const archivo = DriveApp.getFileById(SS.getId());
  const marca = Utilities.formatDate(new Date(), TZ, "yyyyMMdd-HHmmss");
  const nombre = "Pande_Sheets_RESPALDO_PRE_MIGRACION_" + marca;
  const padres = archivo.getParents();
  const copia = padres.hasNext()
    ? archivo.makeCopy(nombre, padres.next())
    : archivo.makeCopy(nombre);

  return {
    id: copia.getId(),
    nombre: copia.getName(),
    url: copia.getUrl()
  };
}

function verificarAccesosMigracionV2() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet();

  if (!hoja) {
    throw new Error("El proyecto no está vinculado a una hoja de cálculo");
  }

  const archivo = DriveApp.getFileById(hoja.getId());

  return {
    ok: true,
    spreadsheet_id: hoja.getId(),
    nombre_archivo: archivo.getName()
  };
}

function asegurarHojaMigracion(nombre, filaEncabezados, encabezados) {
  let sh = SS.getSheetByName(nombre);

  if (!sh) sh = SS.insertSheet(nombre);

  if (sh.getMaxColumns() < encabezados.length) {
    sh.insertColumnsAfter(
      sh.getMaxColumns(),
      encabezados.length - sh.getMaxColumns()
    );
  }

  sh.getRange(filaEncabezados, 1, 1, encabezados.length)
    .setValues([encabezados])
    .setFontWeight("bold")
    .setBackground("#1f2937")
    .setFontColor("#ffffff");
  sh.setFrozenRows(filaEncabezados);

  return sh;
}

function actualizarTiendaMigracion(idTienda, cambios) {
  const sh = SH_TIE();
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() !== idTienda) continue;

    Object.keys(cambios).forEach(columna => {
      sh.getRange(i + 1, Number(columna)).setValue(cambios[columna]);
    });

    return i + 1;
  }

  return 0;
}

function migrarEstructuraOperacionV2() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error("Otra operación está usando la hoja. Intenta nuevamente.");
  }

  try {
    const respaldo = crearRespaldoDriveAntesMigracion();

    const pedidos = [
      "ID_Pedido", "Fecha_Pedido", "ID_Cliente", "Nombre_Cliente",
      "Sucursal", "Tipo_Entrega", "Direccion_Entrega", "Productos_Resumen",
      "Productos_JSON", "Subtotal", "Costo_Envio", "Total", "Metodo_Pago",
      "Estatus_Pago", "Estatus_Pedido", "Comprobante_URL", "Aprobado_Por",
      "Fecha_Aprobacion", "Dia_Semana", "Es_Pedido_Esp", "Notas_Pedido",
      "ID_Kommo_Lead", "Categorias", "Cantidad_Items", "ID_Tienda",
      "Nombre_Tienda", "Fecha_Entrega", "Hora_Entrega", "Es_Programado",
      "Es_Personalizado", "Anticipo_Requerido", "Anticipo_Pagado",
      "Costo_Envio_Estimado", "Ubicacion_URL", "Nombre_Receptor",
      "Distancia_Envio_Km", "Envio_Sujeto_Confirmacion",
      "ID_Tienda_Salida_Interna", "Nombre_Tienda_Salida_Interna",
      "Anulado_Por", "Motivo_Anulacion", "Fecha_Anulacion",
      "Usuario_Ultimo_Cambio"
    ];

    asegurarHojaMigracion("Pedidos", 2, pedidos);
    asegurarHojaMigracion("Inventario", 1, [
      "ID_Tienda", "ID_Producto", "Disponible", "Cantidad",
      "Fecha_Actualizacion", "ID_Usuario", "Nombre_Usuario"
    ]);
    asegurarHojaMigracion("Tiendas", 1, [
      "ID_Tienda", "Nombre", "Direccion", "Lat", "Lng", "WhatsApp",
      "Activa", "Delivery_OK", "Comision_Porcentaje"
    ]);
    asegurarHojaMigracion("Usuarios", 1, [
      "ID_Usuario", "Nombre", "Token_Hash", "Salt", "ID_Tienda",
      "Nombre_Tienda", "Rol", "Activo", "Fecha_Alta", "Ultimo_Acceso"
    ]);
    asegurarHojaMigracion("Aperturas_Diarias", 1, [
      "Fecha", "ID_Tienda", "Nombre_Tienda", "ID_Usuario",
      "Nombre_Usuario", "Fecha_Hora_Confirmacion", "Productos_Capturados",
      "Estado"
    ]);
    asegurarHojaMigracion("Logs", 1, [
      "Fecha", "Tipo", "Payload", "Respuesta"
    ]);
    asegurarHojaMigracion("Reporte_Mensual", 1, [
      "Mes", "Generado_En", "Ingresos_Productos",
      "Pedidos_Entregados_Pagados", "Ticket_Promedio", "Unidades_Vendidas",
      "Producto_Lider_Cantidad", "Producto_Lider_Ingresos",
      "Horario_Mayores_Ventas", "Dia_Mayores_Ventas"
    ]);

    actualizarTiendaMigracion("LAVIN", {
      6: "529995433776",
      8: true
    });
    actualizarTiendaMigracion("DZITYA", {
      6: "529994393976",
      8: false
    });

    const temozon = actualizarTiendaMigracion("TEMOZON", {
      2: "Temozón",
      3: "Plaza comercial (ubicación aproximada pendiente de alta en Google Maps)",
      4: 21.0612,
      5: -89.6280271,
      7: false,
      8: true
    });

    if (!temozon) {
      SH_TIE().appendRow([
        "TEMOZON",
        "Temozón",
        "Plaza comercial (ubicación aproximada pendiente de alta en Google Maps)",
        21.0612,
        -89.6280271,
        "",
        false,
        true,
        ""
      ]);
    }

    CacheService.getScriptCache().remove("catalogo_publico");
    SpreadsheetApp.flush();
    logEvent("MIGRACION_OPERACION_V2", {
      respaldo_id: respaldo.id,
      hojas: [
        "Pedidos", "Inventario", "Tiendas", "Usuarios",
        "Aperturas_Diarias", "Logs", "Reporte_Mensual"
      ]
    });

    return {
      ok: true,
      respaldo: respaldo,
      mensaje: "Migración V2 completada"
    };
  } finally {
    lock.releaseLock();
  }
}
