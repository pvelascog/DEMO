# Cemento TITAN · Inventario visual (demo)

Demo web que simula una aplicación de **inventario por reconocimiento de imágenes** para bodegas,
centros de distribución y patios de una cementera. No requiere servidor ni instalación: todo corre en
el navegador.

> El reconocimiento es **simulado**. Productos, zonas y cifras son ficticios y sirven solo para ilustrar el flujo.

## Cómo abrirla

- Abra `index.html` en el navegador, o
- sírvala localmente: `python3 -m http.server 8080` y entre a http://localhost:8080.
- También funciona publicada como sitio estático (por ejemplo, GitHub Pages).

## Flujo de la demo

1. **Panel**: stock en sistema (ERP) frente al conteo físico, exactitud de inventario, diferencia neta en
   toneladas, cobertura de conteo por zona y alertas (diferencias, bajo mínimo, zonas sin contar).
2. **Captura**: elija una zona y use **Foto de ejemplo**, **Subir foto** o **Cámara** (en el móvil abre la cámara trasera).
   Con **Analizar imagen**, el "modelo" recorre su proceso (preprocesado → detección de pallets → clasificación
   del empaque → conteo de capas → conciliación) y dibuja cada detección con producto, cantidad y confianza.
3. **Revisión humana**: las detecciones con baja confianza (por ejemplo, un pallet tapado por una columna) se
   marcan en ámbar. Las cantidades se pueden corregir antes de confirmar.
4. **Conciliación**: compara el conteo con el sistema. Puede *Confirmar conteo* o *Confirmar y ajustar sistema*
   (genera un movimiento de ajuste).
5. **Inventario**: tabla por zona y producto con sistema, físico, diferencia, toneladas, estado, ajuste por fila
   y exportación a CSV.
6. **Historial**: cada captura guarda la imagen analizada con sus detecciones como evidencia.

El estado se guarda en el navegador (`localStorage`). **Reiniciar demo** (pestaña Inventario) vuelve a los datos iniciales.

## Cómo funciona la simulación

- Las *fotos de ejemplo* se generan por código a partir del stock en sistema de la zona, con variaciones
  aleatorias (faltantes, sobrantes, sacos sueltos). Como se sabe qué contiene la imagen, las detecciones son
  coherentes con lo que se ve.
- Sobre *fotos propias* se generan detecciones sintéticas, repetibles para la misma imagen, y se avisa en pantalla.

## Catálogo ficticio

| SKU | Producto | Presentación | Pallet estándar |
|-----|----------|--------------|-----------------|
| TT-UG50 | TITAN Uso General | Saco 50 kg | 8 capas × 5 = 40 sacos |
| TT-ES425 | TITAN Estructural | Saco 42.5 kg | 8 capas × 5 = 40 sacos |
| TT-AR50 | TITAN Alta Resistencia | Saco 50 kg | 8 capas × 5 = 40 sacos |
| TT-MO25 | TITAN Mortero | Saco 25 kg | 7 capas × 8 = 56 sacos |
| TT-BB15 | TITAN Big Bag | Big bag 1.5 t | 2 por estiba |

Para cambiar productos, zonas, stock inicial o mínimos, edite `PRODUCTS` y `ZONES` al inicio de `app.js`.

## Próximo paso sugerido

Reemplazar `detectScene` / `detectUpload` en `app.js` por la llamada a un modelo real (un detector de objetos
entrenado con fotos de la operación, o un modelo de visión vía API) que devuelva la misma estructura:
`{ id, sku, count, conf, box: { x, y, w, h } }`.
