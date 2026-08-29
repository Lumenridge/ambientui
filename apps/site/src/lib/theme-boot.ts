/**
 * THE PRE-PAINT THEME SCRIPT, as a string.
 *
 * It runs before React and before the body exists, stamping the palette
 * class so the first frame is already correct. That matters more here than
 * in the SPA: a prerendered document has no stored choice baked into it at
 * all, so without this every visitor sees the default theme flash.
 *
 * The key and the default are restated from theme-provider.tsx because a
 * blocking inline script cannot import. scripts/check-theme-boot.mjs fails
 * the gate if the two ever disagree.
 */
export const THEME_STORAGE_KEY = "ambientui-theme"
export const THEME_DEFAULT = "dark"

export const THEME_BOOT = `(function(){try{
var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"${THEME_DEFAULT}";
var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.add(d?"dark":"light");
}catch(e){}})()`
