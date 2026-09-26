export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'invoiceflow-theme'

/**
 * Runs before first paint (inlined in <head>) so the page never flashes the wrong theme.
 * Kept dependency-free and wrapped in try/catch: storage can be unavailable.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||((!p||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`
