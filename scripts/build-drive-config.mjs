// Genera public/config/google-drive.json desde variables de entorno (Netlify) para no versionarlo.
// Sin variables se respeta el archivo local existente. Corre antes de `npm start` y `npm run build`.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUTPUT = 'public/config/google-drive.json';
const { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_APP_ID } = process.env;

if (GOOGLE_CLIENT_ID && GOOGLE_API_KEY && GOOGLE_APP_ID) {
  const config = { clientId: GOOGLE_CLIENT_ID, apiKey: GOOGLE_API_KEY, appId: GOOGLE_APP_ID };
  mkdirSync('public/config', { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(config, null, 2) + '\n');
  console.log(`[drive] Configuración generada desde variables de entorno → ${OUTPUT}`);
} else if (existsSync(OUTPUT)) {
  console.log(`[drive] Usando ${OUTPUT} local`);
} else {
  console.warn(`[drive] Faltan GOOGLE_CLIENT_ID, GOOGLE_API_KEY o GOOGLE_APP_ID; /gestion quedará sin Drive`);
}
