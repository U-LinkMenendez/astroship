# Respaldos de Pande_Sheets

Actualizado: 2026-09-05.

## Alcance

El respaldo cubre la hoja productiva completa de PANDE y su proyecto Apps
Script vinculado. No modifica pedidos, clientes, inventario, catálogo,
usuarios, accesos o configuración.

## Capas

1. `crearRespaldoDriveDiario()` crea una copia nativa completa en la misma
   carpeta de Drive, con nombre `Pande_Sheets_RESPALDO_DIARIO_yyyyMMdd-HHmmss`.
2. `instalarRespaldoDriveDiario()` conserva un solo trigger diario para la
   función anterior, alrededor de las 03:00 en la zona horaria del proyecto.
3. `estadoRespaldoDriveDiario()` permite confirmar que existe exactamente un
   trigger sin leer datos de las hojas.
4. Una exportación XLSX independiente puede conservarse cifrada fuera de Google
   Drive para recuperación ante pérdida de la cuenta.

La automatización no elimina respaldos antiguos. Cualquier política de
retención destructiva requiere autorización independiente.

## Instalación

1. Agregar `Backup.gs` al proyecto Apps Script vinculado a `Pande_Sheets`.
2. Ejecutar manualmente `instalarRespaldoDriveDiario()` y aprobar únicamente
   los permisos de Drive y triggers solicitados por Google.
3. Ejecutar `crearRespaldoDriveDiario()` una vez.
4. Ejecutar `estadoRespaldoDriveDiario()` y confirmar `ok: true` y
   `triggers: 1`.
5. Verificar en Drive que la copia más reciente abre y conserva las hojas
   esperadas.

## Recuperación

Abrir una copia nativa verificada o importar el XLSX externo como una nueva
hoja. Nunca sobrescribir la hoja productiva durante una prueba de restauración.
