# Pandé — revisión editorial del catálogo

Fecha de aplicación: 27 de agosto de 2026  
Cuenta operadora: `ulinkchatbots@gmail.com`

## Resultado

- Se revisaron los 42 productos publicados.
- Se aplicaron correcciones inequívocas a 31 productos.
- Se modificaron 49 celdas del catálogo: nombres, categorías o descripciones.
- No se modificaron precios, disponibilidad, inventario, imágenes, indicadores de pedido especial ni entrega.
- Los 11 productos con textos truncados, genéricos o comercialmente ambiguos quedaron sin cambios, pendientes de validación de Karla.

## Respaldo y control

- Pestaña de respaldo creada dentro de la hoja productiva: `Catalogo_backup_textos_20260827_221348`.
- Libro de revisión local: `Revision_Catalogo_Pande_42_productos.xlsx`.
- Evento de auditoría: `CORRECCION_CATALOGO_SEGURA_20260827`.

## Productos actualizados

`C01`, `K01`, `K07`, `K08`, `M02`, `M03`, `M04`, `M06`, `P01`, `T02`, `T03`, `T04`, `T05`, `T06`, `T07`, `T08`, `R01`, `R02`, `R03`, `R04`, `R05`, `R06`, `S02`, `S03`, `S04`, `B01`, `BEB01`, `BEB02`, `X01`, `M05`, `T09`.

En `R03`, `BEB01`, `BEB02` y `X01` sólo se corrigieron campos independientes y seguros; sus descripciones permanecieron intactas.

## Pendientes de Karla

Las descripciones de los siguientes productos requieren aprobación antes de cambiarse:

`K02`, `K03`, `K04`, `M01`, `P02`, `R03`, `BEB01`, `BEB02`, `S05`, `X01`, `X02`.

## Verificación

- El API productivo devolvió 42 productos.
- Se compararon 50 valores esperados del lote seguro contra el catálogo productivo y no hubo diferencias.
- Se confirmó que las 11 descripciones pendientes conservaron exactamente su texto anterior.
- La caché pública `catalogo_publico` fue invalidada al terminar la aplicación.

## Reversión

Si se necesita revertir, copiar únicamente las columnas `Nombre`, `Categoría` y `Descripción` desde `Catalogo_backup_textos_20260827_221348` hacia `Catalogo`, haciendo coincidir cada fila por su ID de producto. Después, invalidar la caché `catalogo_publico` o guardar cualquier producto desde el panel Master para forzar su actualización.

No se debe sustituir toda la hoja ni restaurar precios, inventario o disponibilidad, porque esos datos pueden haber cambiado después de este respaldo.
