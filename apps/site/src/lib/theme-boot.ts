import {
  THEME_DEFAULT,
  THEME_STORAGE_KEY,
} from "@/components/theme-provider"

/**
 * THE PRE-PAINT THEME SCRIPT.
 *
 * It runs before React and before the body exists, stamping the palette
 * class so the first frame is already correct. That matters more in a
 * prerendered site than it did in the SPA: the static document has no
 * stored choice baked into it at all, so without this every visitor whose
 * theme differs from the default sees a flash.
 *
 * THE COPY IS GONE. In the SPA this script lived in index.html, which
 * cannot import — so the key and the default were restated there and kept
 * honest by a checker. As a TypeScript module it simply IMPORTS them, and
 * the two can no longer disagree. Removing the possibility beats checking
 * for it, which is what the checker now asserts.
 */
export const THEME_BOOT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(THEME_DEFAULT)};
var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.add(d?"dark":"light");
}catch(e){}})()`
