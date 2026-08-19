export type FoldMode = "cover" | "inner" | "flex" | "";

export function readFoldMode(): FoldMode {
  if (typeof window === "undefined") return "";
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ua = navigator.userAgent || "";
  const samsungFold = /SM-F\d|Fold/i.test(ua);
  if (w >= 600 && h <= 560) return "flex";
  if (samsungFold && w < 520) return "cover";
  if (samsungFold && w >= 600 && w < 1100 && h > 560) return "inner";
  if (!samsungFold && w >= 640 && w <= 980 && h >= 580 && h / Math.max(w, 1) < 1.45) return "inner";
  return "";
}

export function applyFoldMode() {
  const mode = readFoldMode();
  const html = document.documentElement;
  if (mode) html.setAttribute("data-fold", mode);
  else html.removeAttribute("data-fold");
  return mode;
}

export const FOLD_BOOT = `(()=>{try{var w=innerWidth,h=innerHeight,u=navigator.userAgent||"",f=/SM-F\\d|Fold/i.test(u),m="";if(w>=600&&h<=560)m="flex";else if(f&&w<520)m="cover";else if(f&&w>=600&&w<1100&&h>560)m="inner";if(m)document.documentElement.setAttribute("data-fold",m);}catch(e){}})();`;
