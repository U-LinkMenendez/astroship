// ============================================================
//  PANDÉ — RESPALDO PROGRAMADO DE GOOGLE SHEETS
//  Este archivo no elimina copias ni modifica datos operativos.
// ============================================================

const PANDE_BACKUP_HANDLER = "crearRespaldoDriveDiario";
const PANDE_BACKUP_PREFIX = "Pande_Sheets_RESPALDO_DIARIO_";

function crearRespaldoDriveDiario() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error("Otra operación está usando la hoja. El respaldo no se duplicó.");
  }

  try {
    const hoja = SpreadsheetApp.getActiveSpreadsheet();
    if (!hoja) {
      throw new Error("El proyecto no está vinculado a una hoja de cálculo");
    }

    const archivo = DriveApp.getFileById(hoja.getId());
    const marca = Utilities.formatDate(new Date(), TZ, "yyyyMMdd-HHmmss");
    const nombre = PANDE_BACKUP_PREFIX + marca;
    const padres = archivo.getParents();
    const copia = padres.hasNext()
      ? archivo.makeCopy(nombre, padres.next())
      : archivo.makeCopy(nombre);

    console.log(JSON.stringify({
      evento: "pande_respaldo_drive_creado",
      fecha: new Date().toISOString(),
      nombre: copia.getName(),
      id: copia.getId()
    }));

    return {
      ok: true,
      id: copia.getId(),
      nombre: copia.getName(),
      url: copia.getUrl(),
      fecha: new Date().toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}

function instalarRespaldoDriveDiario() {
  const eliminados = [];

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() !== PANDE_BACKUP_HANDLER) return;
    ScriptApp.deleteTrigger(trigger);
    eliminados.push(trigger.getUniqueId());
  });

  ScriptApp.newTrigger(PANDE_BACKUP_HANDLER)
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();

  return {
    ...estadoRespaldoDriveDiario(),
    triggers_reemplazados: eliminados.length
  };
}

function estadoRespaldoDriveDiario() {
  const triggers = ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === PANDE_BACKUP_HANDLER);

  return {
    ok: triggers.length === 1,
    handler: PANDE_BACKUP_HANDLER,
    triggers: triggers.length,
    horario_aproximado: "03:00-04:00",
    zona_horaria: Session.getScriptTimeZone(),
    elimina_respaldos: false
  };
}
