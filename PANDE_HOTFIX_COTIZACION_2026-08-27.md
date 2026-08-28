# Pandé — Hotfix de cotización de envío

Fecha de publicación: 27 de agosto de 2026

## Resultado

- La interfaz desecha respuestas tardías de rutas anteriores.
- La cotización se invalida al cambiar sucursal, ubicación o tipo de entrega.
- La confirmación queda bloqueada mientras se recalcula la ruta.
- Pantalla, resumen, Sheets y WhatsApp comparten una sola cotización congelada.
- Apps Script valida que la sucursal y el precio correspondan con la distancia.
- El backend registra sucursal, distancia, costo, origen, destino y clave de cotización para auditoría.

## Publicación verificada

- Frontend: `https://pande.vinculo.lat/pande/`
- Commit: `62b4adc` (`fix(pande): keep delivery quote consistent`)
- Apps Script productivo: versión 27
- Deployment ID conservado: `AKfycbwGxnv1CbQvLTF9fnQwa3kg6aICwHLWM4n05kGT6x5P7Osjt16-BIe2_AXZ0L-5MmR0`
- Prueba de ruta: Dzityá a `21.040970,-89.645272`
- Resultado: 5.17 km, envío de $40, método `recorrido_en_calles`

## Reversión de Apps Script

1. Abrir el proyecto de Apps Script con `ulinkchatbots@gmail.com`.
2. Seleccionar **Deploy > Manage deployments**.
3. Elegir el despliegue activo cuyo ID termina en `5MmR0`.
4. Presionar **Edit**.
5. Seleccionar **Version 26**.
6. Presionar **Deploy**.

El Deployment ID y la URL pública no cambian durante esta reversión.

## Reversión del frontend

Revertir el commit `62b4adc` mediante un nuevo commit de reversión y publicar nuevamente `main`. No borrar historial ni usar `git reset --hard`.

## Comprobación operativa pendiente

Realizar un pedido marcado claramente como prueba y confirmar que el mismo importe de envío aparezca en la pantalla, el resumen, WhatsApp, la fila de `Pedidos` y el evento `COTIZACION_ENVIO_APLICADA` de `Logs`.
