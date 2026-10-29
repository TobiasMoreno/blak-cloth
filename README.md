# LM Studio – MVP E-commerce Frontend

Este proyecto es un **MVP de una tienda online de remeras artísticas y urbanas**, diseñadas por un artista independiente.
El objetivo es validar el producto y la marca sin backend ni pagos integrados.

---

## 🎯 Objetivo del proyecto

- Mostrar un catálogo de remeras (20–30 modelos)
- Brindar una experiencia visual moderna y minimalista
- Permitir que el usuario compre contactándose por WhatsApp
- Pensado solo para Argentina (inicialmente Córdoba)

---

## 🧠 Contexto de negocio

- Marca: **LM Studio (provisional)**
- Estilo: arte abstracto, urbano, streetwear, minimalista
- Público: 20–30 años, artístico / otaku / streetwear
- Venta solo por WhatsApp
- Pago por transferencia bancaria
- Envíos locales con costo fijo (Córdoba)

---

## 🧩 Alcance funcional (MVP)

### Incluye
- Home con identidad visual fuerte
- Listado de productos en grid
- Filtros por talle y color
- Página de detalle de producto
- **Carrito de compras** (agregar múltiples productos)
- Botón "Comprar por WhatsApp" con mensaje prearmado (individual o desde carrito)
- Sección "Sobre el artista"
- Información básica de envíos

### No incluye
- Backend
- Autenticación
- Pagos online
- Gestión de stock real

---

## 🛠 Stack tecnológico

- Angular (standalone components)
- PrimeNG (componentes UI)
- Tailwind CSS (utilidades de estilo)
- TypeScript
- Datos mockeados en archivos TS/JSON
- WhatsApp API (link)

### ⚠️ Estilos
- **NO usar CSS personalizado** (archivos `.css` en componentes)
- Usar **Tailwind utility classes** para todos los estilos
- Usar **PrimeNG** para componentes UI complejos
- Preferir clases de Tailwind sobre estilos inline

---

## 📁 Estructura sugerida
```
src/
 ├─ app/
 │   ├─ core/
 │   │   ├─ models/
 │   │   │   └─ product.model.ts
 │   │   ├─ services/
 │   │   │   ├─ product.service.ts
 │   │   │   └─ cart.service.ts
 │   │   ├─ constants/
 │   │   │   └─ whatsapp.constants.ts
 │   │   └─ data/
 │   │       └─ products.mock.ts
 │   ├─ features/
 │   │   ├─ home/
 │   │   │   ├─ home.component.ts
 │   │   │   └─ home.routes.ts
 │   │   ├─ products/
 │   │   │   ├─ products.component.ts
 │   │   │   └─ products.routes.ts
 │   │   ├─ product-detail/
 │   │   │   ├─ product-detail.component.ts
 │   │   │   └─ product-detail.routes.ts
 │   │   ├─ cart/
 │   │   │   ├─ cart.component.ts
 │   │   │   └─ cart.routes.ts
 │   │   └─ about/
 │   │       ├─ about.component.ts
 │   │       └─ about.routes.ts
 │   ├─ shared/
 │   │   ├─ components/
 │   │   │   └─ product-card/
 │   │   └─ pipes/
 │   ├─ layout/
 │   │   ├─ header/
 │   │   │   └─ header.component.ts
 │   │   └─ footer/
 │   │       └─ footer.component.ts
 │   ├─ app.routes.ts
 │   └─ app.ts
 │
public/
 └─ images/
     └─ products/

 ```

 
---

## 👕 Modelos de datos

### Producto
```ts
export interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  sizes: ('S' | 'M' | 'L' | 'XL')[];
  colors: string[];
  description: string;
}
```

### Item del Carrito
```ts
export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  size: 'S' | 'M' | 'L' | 'XL';
  color: string;
  image: string;
  quantity: number;
}
```
---
## 📲 WhatsApp – lógica de compra

### Configuración
- **Número de WhatsApp**: phoneNumber (configurar en `core/constants/whatsapp.constants.ts`)
- **Formato de link**: `https://wa.me/{{phoneNumber}}?text={{mensajeCodificado}}`
- El mensaje debe estar codificado con `encodeURIComponent()`

### Compra individual
El botón "Comprar ahora" debe redirigir a WhatsApp con mensaje prearmado:
```
Hola! Quiero comprar la remera:
- Modelo: {{name}}
- Talle: {{size}}
- Color: {{color}}
```

### Compra desde carrito
El botón "Finalizar compra" debe redirigir a WhatsApp con todos los productos del carrito:
```
Hola! Quiero comprar las siguientes remeras:

1. Modelo: {{name1}}
   - Talle: {{size1}}
   - Color: {{color1}}
   - Cantidad: {{quantity1}}

2. Modelo: {{name2}}
   - Talle: {{size2}}
   - Color: {{color2}}
   - Cantidad: {{quantity2}}

Total: ${{total}}
```
---

## 🎨 Lineamientos de diseño

- Diseño minimalista
- Mucho espacio en blanco
- Tipografía sans moderna
- Paleta neutra + 1 color de acento
- Cards limpias, foco en imágenes
- Evitar sobrecarga visual

### 🎨 Implementación de estilos
- **Solo Tailwind utility classes** (ej: `flex`, `p-4`, `bg-white`, `rounded-lg`)
- **PrimeNG components** para elementos complejos (botones, inputs, modales, etc.)
- **NO crear archivos CSS** personalizados
- Usar `[class]` binding en lugar de `ngClass` para clases dinámicas
- **Diseño responsive**: Mobile-first, adaptado para tablet y desktop

---

## 🗺️ Rutas de la aplicación

- `/` - Home
- `/products` - Listado de productos con filtros
- `/product/:id` - Detalle de producto
- `/cart` - Carrito de compras
- `/about` - Sobre el artista

---

## 🛒 Carrito de compras

### Funcionalidades
- **Agregar productos**: Desde la página de detalle, seleccionando talle y color
- **Modificar cantidad**: Aumentar/disminuir cantidad desde el carrito
- **Eliminar items**: Botón para remover productos del carrito
- **Items separados**: El mismo producto con diferente talle/color se agrega como items separados
- **Persistencia**: El carrito se guarda en `localStorage` y persiste al recargar la página
- **Validación**: No se puede agregar al carrito sin seleccionar talle y color

### Estado del carrito
- Gestionado con signals en `cart.service.ts`
- Sincronizado automáticamente con `localStorage`
- Contador de items visible en el header

---

## 🔍 Filtros de productos

### Ubicación y funcionamiento
- Los filtros se muestran en la página de **listado de productos** (`/products`)
- Filtros disponibles:
  - **Por talle**: S, M, L, XL (selección múltiple)
  - **Por color**: Filtro por colores disponibles (selección múltiple)
- **Comportamiento**: Los filtros funcionan de forma combinada (AND lógico)
  - Si seleccionas "M" y "Negro", muestra productos que tengan talle M Y color Negro
- **UI**: Usar PrimeNG Select o Checkbox para los filtros
- **Estado**: Los filtros se mantienen mientras navegas (opcional, puede resetearse)

---

## 💰 Formato de precios

- **Moneda**: ARS (Pesos Argentinos)
- **Formato**: Sin decimales
- **Ejemplos**: `$15.000`, `$8.500`, `$12.000`
- **Pipe personalizado**: Crear pipe `currency-ars.pipe.ts` en `shared/pipes/` para formatear

---

## 🖼️ Imágenes de productos: cómo agregar una remera nueva

Cada remera vive en su propia carpeta, junto con sus fotos:

```
public/products/
 └─ <slug>/            ← ej: medusa, stitch-art (minúsculas, sin espacios ni tildes)
     ├─ index.json     ← datos de la remera
     ├─ mockup.jpeg    ← foto con la espalda y el frente juntos
     ├─ frente.png     ← (opcional) foto sola del frente
     └─ espalda.png    ← (opcional) foto sola de la espalda
```

El `slug` (el nombre de la carpeta) es el identificador de la remera: aparece en la URL (`/product/<slug>`), en el carrito y en favoritos. **No lo cambies una vez publicada.**

### Opción A: desde el panel (recomendado)

1. Corré el panel en local: `npx decap-server` en una terminal y `npm start` en otra.
2. Abrí `http://localhost:4200/admin/` → **Remeras** → **Nueva remera**.
3. Completá los datos y subí las fotos en **Fotos**: *Frente*, *Espalda* y/o *Mockup*.
4. Guardá. El panel crea la carpeta, el `index.json` y copia las fotos dentro.

### Opción B: a mano

1. Creá la carpeta `public/products/<slug>/` y copiá ahí las fotos.
2. Creá `index.json` en esa carpeta. Las rutas de `images` son **solo el nombre del archivo** (relativas a la carpeta):

```json
{
  "name": "Medusa",
  "collection": "",
  "price": 30000,
  "createdAt": "2026-10-22",
  "featured": false,
  "description": "Descripción de la remera.",
  "images": {
    "mockup": "mockup.jpeg",
    "front": "frente.png",
    "back": "espalda.png"
  },
  "variants": [
    { "size": "M", "color": "Negro", "available": true },
    { "size": "L", "color": "Negro", "available": true }
  ]
}
```

`front`, `back` y `mockup` son opcionales, pero tiene que haber **al menos una** foto. Si no usás alguna, borrá la línea; no la dejes vacía.

3. Regenerá el catálogo: `npm run catalog`. También corre solo con `npm start` y `npm run build`. El script junta todos los `index.json` en `public/data/products.json`, que es lo que lee la web.

### Qué foto se usa en cada lugar

| Lugar | Qué muestra |
|---|---|
| Tarjeta del catálogo y detalle | La primera que exista, en este orden: `front` → `back` → `mockup` |
| Hover de la tarjeta | La `back`, solo si hay `front` **y** `back` |
| Perchero 3D del inicio | Ver la sección siguiente |
| Vista previa al compartir el link | `front` → `mockup` → `back` |

### Fotos para el perchero 3D (inicio)

El perchero arma cada remera en 3D y le "pega" encima la zona del torso de tus fotos. Para que la estampa quede bien ubicada, las fotos tienen que respetar una de estas dos plantillas:

**1. Mockup (`mockup`): dos remeras colgadas en una misma foto**
- **Izquierda: la espalda**, que es la estampa principal. **Derecha: el frente.**
- Las dos remeras centradas en su mitad, ocupando casi todo el alto de la foto, con un margen arriba para las perchas. Es la misma plantilla de los mockups actuales (`public/products/medusa/mockup.jpeg` es una buena referencia).
- Fondo liso o pared clara, sin objetos encima de las remeras.
- Formato horizontal 3:2, por ejemplo 2560×1706 o 1600×1066.

**2. Fotos sueltas (`front` + `back`): una remera por foto**
- Una sola remera centrada, que ocupe casi todo el alto, en vertical (por ejemplo 800×1110).
- Si hay `front` y `back`, el perchero usa estas fotos en vez del mockup: `back` como estampa principal y `front` como frente.

**Recomendaciones generales**
- Que la parte de abajo del torso sea tela lisa, sin estampa: de ahí se toma el color real de la remera.
- El primer color de `variants` define en qué grupo cuelga la remera: **Negras**, **Blancas** o **Color**.
- Si la estampa queda corrida o cortada en el 3D, casi siempre es porque la foto no sigue la plantilla. Las zonas que se recortan están en `src/app/features/home/rack/shirt-texture.ts` (`MOCKUP_LEFT`, `MOCKUP_RIGHT` y `SINGLE_PHOTO`, en fracciones de la imagen).
- Excepción conocida: en `naruto-y-kurama` el mockup tiene la estampa principal a la derecha, y eso está resuelto con un caso especial en ese mismo archivo. Para remeras nuevas, mejor respetá la plantilla que agregar otra excepción.

### Peso y formato
- JPG o WebP para mockups (fotos), PNG solo si hace falta transparencia.
- Lado más largo de hasta ~2560 px y, si se puede, menos de 500 KB por foto. Optimizalas antes de subirlas (por ejemplo con [Squoosh](https://squoosh.app)).
- En los componentes se usan con `NgOptimizedImage` (`ngSrc`), que se encarga de la carga diferida.

---

## 📊 Datos mockeados

### Ubicación
- **Archivo**: `core/data/products.mock.ts`
- **Formato**: Array de objetos `Product[]` exportado como constante
- **Cantidad inicial**: 5-10 productos para el MVP (luego expandir a 20-30)

### Estructura del archivo
```ts
import { Product } from '../models/product.model';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '001',
    name: 'Remera Abstracta 01',
    price: 15000,
    images: ['images/products/product-001-1.jpg'],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Negro', 'Blanco'],
    description: 'Descripción del producto...'
  },
  // ... más productos
];
```

---

## 🧭 Layout y navegación

### Header
- **Logo**: LM Studio (texto o imagen)
- **Navegación**: Links a Home, Productos, Sobre nosotros
- **Icono de carrito**: Con contador de items (badge)
- **Estilo**: Minimalista, fijo en la parte superior (sticky)

### Footer
- **Información de contacto**: WhatsApp, email (opcional)
- **Enlaces**: Políticas, términos (opcional para MVP)
- **Copyright**: LM Studio
- **Estilo**: Simple, con mucho espacio en blanco

---

## ✅ Validaciones

### Página de detalle de producto
- **Talle y color obligatorios**: Mostrar mensaje si intenta agregar al carrito sin seleccionar
- **Botones deshabilitados**: "Agregar al carrito" y "Comprar ahora" deshabilitados hasta seleccionar ambos

### Carrito
- **Carrito vacío**: Mostrar mensaje amigable si no hay productos
- **Cantidad mínima**: 1 (no permitir 0 o negativos)
- **Cantidad máxima**: Sin límite (o definir uno si es necesario)

---

## 📱 Responsive Design

- **Mobile-first**: Diseño pensado primero para móviles
- **Breakpoints Tailwind**:
  - Mobile: `< 768px`
  - Tablet: `768px - 1024px`
  - Desktop: `> 1024px`
- **Grid de productos**: 
  - Mobile: 1 columna
  - Tablet: 2 columnas
  - Desktop: 3-4 columnas
- **Navegación**: Menú hamburguesa en mobile, horizontal en desktop