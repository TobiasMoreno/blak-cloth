# Gestión interna con Firebase

La sección `/gestion` usa Firebase Authentication con Google y guarda el espacio de trabajo en el
documento `workspaces/blak` de Cloud Firestore. Google Drive ya no participa en las lecturas ni en
los guardados.

## Primer ingreso y migración

1. Entrar a `/gestion` y continuar con la cuenta de Google autorizada.
2. Si ya existían datos en Drive, descargar `blak-costos.json` y elegir **Importar datos de Drive**.
3. Si no hay datos anteriores, elegir **Crear espacio nuevo**.

La importación valida y conserva costos, proveedores, ofertas, configuración del cotizador y el
número de revisión. Después de importarlos, todos los cambios se guardan solamente en Firestore.

## Autorizar otra cuenta

Agregar su correo verificado a la función `isManagementAdmin` de `firestore.rules` y desplegar las
reglas. El workflow de `main` despliega automáticamente las reglas, los índices y Hosting.

## Seguridad

- Las reglas deniegan por defecto cualquier documento que no sea `workspaces/blak`.
- El documento de gestión requiere una sesión de Google con correo verificado y autorizado.
- La configuración web de Firebase es pública por diseño; la protección real está en
  `firestore.rules`.
