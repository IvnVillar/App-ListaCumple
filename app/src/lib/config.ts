export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// El enlace para compartir (`/l/{token}`) lo sirve la APP (universal link en
// producción), no el backend — son orígenes distintos. En nativo no hay
// window.location, así que hace falta un dominio propio configurado aquí
// antes de publicar (ver spec 8.1: universal link / app link a un dominio
// propio con apple-app-site-association / assetlinks.json).
export const APP_BASE_URL = process.env.EXPO_PUBLIC_APP_URL ?? "https://app.tudominio.example";
