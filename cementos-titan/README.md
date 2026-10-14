# Cementos TITAN · Inventario visual (demo)

Demo web que simula una aplicación de **inventario por reconocimiento de imágenes** para bodegas,
centros de distribución y patios de una cementera: cemento ensacado y **productos prefabricados de concreto**
(tubería, bloques, cajas de inspección, conos reductores y bordillos). No requiere servidor ni instalación: todo corre en
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
   Con **Analizar imagen**, el "modelo" recorre su proceso (preprocesado → detección de estibas → clasificación
   del producto → conteo de unidades → conciliación) y dibuja cada detección con producto, cantidad y confianza.
   La zona **Patio principal** analiza una foto aérea real del patio de prefabricados (`img/patio-titan.webp`).
3. **Revisión humana**: las detecciones con baja confianza (por ejemplo, una estiba tapada por la grúa pórtico
   o por una columna) se marcan en ámbar. Las cantidades se pueden corregir antes de confirmar.
4. **Conciliación**: compara el conteo con el sistema. Puede *Confirmar conteo* o *Confirmar y ajustar sistema*
   (genera un movimiento de ajuste).
5. **Inventario**: tabla por zona y producto con sistema, físico, diferencia, toneladas, estado, ajuste por fila
   y exportación a CSV.
6. **Historial**: cada captura guarda la imagen analizada con sus detecciones como evidencia.

El estado se guarda en el navegador (`localStorage`). **Reiniciar demo** (pestaña Inventario) vuelve a los datos iniciales.

## Cómo funciona la simulación

- Las *fotos de ejemplo* de bodegas y patios se generan por código a partir del stock en sistema de la zona,
  con variaciones aleatorias (faltantes, sobrantes, unidades sueltas). Como se sabe qué contiene la imagen, las
  detecciones son coherentes con lo que se ve.
- La *foto aérea* del patio principal trae detecciones anotadas a mano (agrupaciones de tubos, bloques, cajas,
  conos y bordillos) con cantidades estimadas.
- Sobre *fotos propias* se generan detecciones sintéticas, repetibles para la misma imagen, y se avisa en pantalla.

## Catálogo ficticio

| Familia | SKU | Producto | Presentación | Estiba estándar |
|---------|-----|----------|--------------|-----------------|
| Cemento ensacado | TT-UG50 | Cemento Uso General | Saco 50 kg | 8 niveles × 5 = 40 sacos |
| Cemento ensacado | TT-ES425 | Cemento Estructural | Saco 42.5 kg | 8 niveles × 5 = 40 sacos |
| Cemento ensacado | TT-AR50 | Cemento Alta Resistencia | Saco 50 kg | 8 niveles × 5 = 40 sacos |
| Cemento ensacado | TT-MO25 | Mortero | Saco 25 kg | 7 niveles × 8 = 56 sacos |
| Cemento ensacado | TT-BB15 | Cemento a granel | Big bag 1.5 t | 2 por estiba |
| Tubería de concreto | TT-TC30 | Tubo de concreto 300 mm | Ø 300 mm × 2.5 m | Pirámide 5-4-3-2-1 = 15 |
| Tubería de concreto | TT-TC60 | Tubo reforzado 600 mm | Ø 600 mm × 2.5 m | Pirámide 4-3-2-1 = 10 |
| Tubería de concreto | TT-TC90 | Tubo reforzado 900 mm | Ø 900 mm × 2.5 m | Pirámide 3-2-1 = 6 |
| Bloques de concreto | TT-BL15 | Bloque 15 cm | 15 × 20 × 40 cm | 6 niveles × 15 = 90 |
| Bloques de concreto | TT-BL20 | Bloque 20 cm | 20 × 20 × 40 cm | 6 niveles × 12 = 72 |
| Prefabricados | TT-CJ60 | Caja de inspección | 60 × 60 × 60 cm | 2 × 2 = 4 |
| Prefabricados | TT-CN12 | Cono reductor para pozo | Ø 1.2 m → 0.6 m | 2 por grupo |
| Prefabricados | TT-BD100 | Bordillo de concreto | Tipo A · 1.0 m | 5 niveles × 4 = 20 |

Zonas: Patio principal (foto aérea), Patio de tubería, Patio de bloques, Patio de prefabricados, Bodega de cemento,
CD Norte y Patio de despacho de big bags. Para cambiar productos, zonas, stock inicial o mínimos, edite `PRODUCTS`,
`ZONES` y `PHOTO` al inicio de `app.js`.

## Próximo paso sugerido

Reemplazar `detectScene` / `detectUpload` en `app.js` por la llamada a un modelo real (un detector de objetos
entrenado con fotos de la operación, o un modelo de visión vía API) que devuelva la misma estructura:
`{ id, sku, count, conf, detail, box: { x, y, w, h } }`.
