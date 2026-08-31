import { createElement, Fragment, type ReactNode } from "react";

// expo-share-intent es un módulo nativo puro (Share Extension/Share Intent no
// existen en web) y su build actual rompe la resolución del bundler de Metro
// específicamente en la plataforma web (confirmado: `expo export -p android`
// funciona sin problema, sólo falla `--web`). Metro resuelve automáticamente
// este archivo .web.ts en vez de shareIntent.ts al compilar para web, así
// que el resto de la app puede importar de "@/lib/shareIntent" sin
// preocuparse de la plataforma.
const EMPTY_SHARE_INTENT = {
  meta: null,
  text: null,
  files: null,
  type: null as null,
  webUrl: null,
};

export function ShareIntentProvider({ children }: { children: ReactNode; options?: unknown }) {
  return createElement(Fragment, null, children);
}

export function useShareIntentContext() {
  return {
    isReady: true,
    hasShareIntent: false,
    shareIntent: EMPTY_SHARE_INTENT,
    resetShareIntent: (_clearNativeModule?: boolean) => {},
    error: null as string | null,
  };
}
