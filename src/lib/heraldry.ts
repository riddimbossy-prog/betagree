export type ShieldCut = "heater" | "iberian" | "french";
export type Ordinary =
  | "chief"
  | "pale"
  | "fess"
  | "bend"
  | "bend-sinister"
  | "chevron"
  | "cross"
  | "saltire"
  | "per-pale"
  | "per-fess"
  | "quarterly"
  | "gyronny";
export type Charge = "mullet" | "crescent" | "bezant" | "annulet" | "crosslet" | "none";

export type Tincture = {
  fill: string;
  metal: boolean;
};

export type Arms = {
  cut: ShieldCut;
  field: Tincture;
  ink: Tincture;
  ordinary: Ordinary;
  charge: Charge;
};

export const CUTS: Record<ShieldCut, string> = {
  heater:
    "M40 3.2 C60 3.2 73.2 12.4 73.2 26.5 V49.5 C73.2 71 56.5 85.2 40 93.2 C23.5 85.2 6.8 71 6.8 49.5 V26.5 C6.8 12.4 20 3.2 40 3.2 Z",
  iberian:
    "M14.5 5.2 H65.5 C72.4 5.2 73.6 12 73.6 19.6 V52 C73.6 76.4 56.8 88.6 40 93.4 C23.2 88.6 6.4 76.4 6.4 52 V19.6 C6.4 12 7.6 5.2 14.5 5.2 Z",
  french:
    "M11 5 H69 C74.6 5 74.8 12.4 74.8 17.6 V50 C74.8 66 64.5 80.5 40 91.6 C15.5 80.5 5.2 66 5.2 50 V17.6 C5.2 12.4 5.4 5 11 5 Z",
};

export const OR: Tincture = { fill: "var(--tincture-or)", metal: true };
export const ARGENT: Tincture = { fill: "var(--tincture-argent)", metal: true };
export const GULES: Tincture = { fill: "var(--tincture-gules)", metal: false };
export const AZURE: Tincture = { fill: "var(--tincture-azure)", metal: false };
export const SABLE: Tincture = { fill: "var(--tincture-sable)", metal: false };
export const VERT: Tincture = { fill: "var(--tincture-vert)", metal: false };
export const PURPURE: Tincture = { fill: "var(--tincture-purpure)", metal: false };

const PAIRS: [Tincture, Tincture][] = [
  [GULES, OR],
  [GULES, ARGENT],
  [AZURE, OR],
  [AZURE, ARGENT],
  [SABLE, OR],
  [SABLE, ARGENT],
  [VERT, OR],
  [VERT, ARGENT],
  [PURPURE, OR],
  [PURPURE, ARGENT],
  [OR, GULES],
  [OR, AZURE],
  [OR, SABLE],
  [ARGENT, GULES],
  [ARGENT, AZURE],
  [ARGENT, VERT],
];

const ORDINARIES: Ordinary[] = [
  "chief",
  "pale",
  "fess",
  "bend",
  "bend-sinister",
  "chevron",
  "cross",
  "saltire",
  "per-pale",
  "per-fess",
  "quarterly",
  "gyronny",
];

const CHARGES: Charge[] = ["mullet", "crescent", "bezant", "annulet", "crosslet", "none"];
const SHIELDS: ShieldCut[] = ["heater", "iberian", "french"];

function hashName(name: string) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function blazon(name: string): Arms {
  const key = name.trim().toLowerCase();
  if (key === "betagree") {
    return { cut: "heater", field: PURPURE, ink: OR, ordinary: "pale", charge: "mullet" };
  }
  const seed = hashName(key || "club");
  const [field, ink] = PAIRS[seed % PAIRS.length];
  const ordinary = ORDINARIES[(seed >>> 8) % ORDINARIES.length];
  const busy =
    ordinary === "cross" ||
    ordinary === "saltire" ||
    ordinary === "quarterly" ||
    ordinary === "gyronny" ||
    ordinary === "chevron";
  return {
    cut: SHIELDS[(seed >>> 4) % SHIELDS.length],
    field,
    ink,
    ordinary,
    charge: busy ? "none" : CHARGES[(seed >>> 12) % CHARGES.length],
  };
}

export function lettersOf(name: string) {
  const parts = name
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((p) => p && !/^(fc|cf|sc|afc|cfc|fk|sk|ac|the)$/i.test(p));
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || name).slice(0, 2).toUpperCase();
}
