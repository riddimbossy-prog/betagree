/** Club vs Cercle Brugge, Inter vs Inter Miami — never treat a shared city token as the same club. */

export function tokens(name, aliasFn = (s) => s) {
  return String(aliasFn(name) || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(fc|cf|sc|afc|cfc|fk|sk|ac|cd|the|de|do|da|di|football|calcio|ss|ud|sd|rcd|rc|kv|ksv)\b/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function namesMatch(a, b, aliasFn = (s) => s) {
  const na = String(aliasFn(a) || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const nb = String(aliasFn(b) || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = new Set(tokens(a, aliasFn));
  const tb = new Set(tokens(b, aliasFn));
  if (!ta.size || !tb.size) return false;
  const onlyA = [...ta].filter((t) => !tb.has(t));
  const onlyB = [...tb].filter((t) => !ta.has(t));
  if (onlyA.length && onlyB.length) return false;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  const shorter = Math.min(ta.size, tb.size);
  const longer = Math.max(ta.size, tb.size);
  if (shorter === 1 && longer > 1) return false;
  return hit === shorter && hit / longer >= 0.67;
}
