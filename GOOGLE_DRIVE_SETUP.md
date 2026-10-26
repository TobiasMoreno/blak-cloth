# Google Drive para Costos y Cotizador

La sección `/gestion` guarda un único archivo `blak-costos.json` dentro de una carpeta visible
`BLAK CLOTH` en Google Drive. El archivo no contiene credenciales y solo resulta accesible para las
cuentas con las que se comparta.

## Configuración de Google Cloud

1. Crear o elegir un proyecto en Google Cloud Console.
2. Habilitar **Google Drive API** y **Google Picker API**.
3. Configurar la pantalla de consentimiento OAuth. Durante las pruebas, agregar las dos cuentas de
   Google como usuarios de prueba.
4. Crear un cliente OAuth de tipo **Aplicación web** y registrar estos orígenes JavaScript:
   - `http://localhost:4200`
   - el dominio real publicado en Netlify, por ejemplo `https://sitio.netlify.app`
5. Crear una clave de API y restringirla a Google Picker API y a los mismos dominios.
6. Copiar el número del proyecto de Google Cloud; ese número es el `appId` de Google Picker.
7. En local, copiar `public/config/google-drive.example.json` a `public/config/google-drive.json`
   (está en `.gitignore`) y completarlo. En Netlify, definir las variables `GOOGLE_CLIENT_ID`,
   `GOOGLE_API_KEY` y `GOOGLE_APP_ID`; `scripts/build-drive-config.mjs` genera el archivo al compilar.

```json
{
  "clientId": "CLIENTE.apps.googleusercontent.com",
  "apiKey": "CLAVE_PUBLICA_DE_API",
  "appId": "NUMERO_DEL_PROYECTO"
}
```

El cliente OAuth, la clave restringida y el número de proyecto son identificadores públicos del
navegador. No agregar un `client_secret`, tokens de acceso ni contraseñas al repositorio.

## Primer uso con dos personas

1. La primera persona entra a `/gestion`, conecta su cuenta y crea el espacio de trabajo.
2. Desde el enlace **Abrir carpeta en Drive**, comparte la carpeta `BLAK CLOTH` con permiso de editor.
3. La segunda persona entra con su cuenta, elige **Vincular archivo compartido** y selecciona
   `blak-costos.json`.
4. En los siguientes accesos la aplicación encuentra ese archivo automáticamente para cada cuenta.

Antes de cada guardado se comprueba la versión remota. Si otra persona guardó primero, la aplicación
no sobrescribe el cambio: solicita recargar la versión más reciente.
