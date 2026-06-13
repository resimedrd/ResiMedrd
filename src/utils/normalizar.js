function normalizarTema(tema) {
  if (!tema) return "";
  const t = tema.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Quitar acentos
  
  if (t.includes("pediatria") || t.includes("pediatra")) return "pediatria";
  if (t.includes("ginecologia") || t.includes("obstetricia") || t.includes("gineco")) return "ginecologia";
  if (t.includes("cirugia") || t.includes("quirur")) return "cirugia";
  if (t.includes("interna")) return "interna";
  if (t.includes("basica") || t.includes("fisiologia") || t.includes("anatomia") || t.includes("farmacologia") || t.includes("embriologia") || t.includes("histologia") || t.includes("microbiologia") || t.includes("parasitologia") || t.includes("bioquimica") || t.includes("genetica")) return "basicas";
  if (t.includes("cardio")) return "cardiologia";
  if (t.includes("neumo") || t.includes("respirato") || t.includes("pulmonar")) return "neumologia";
  if (t.includes("gastro") || t.includes("digestiv")) return "gastro";
  if (t.includes("neuro")) return "neurologia";
  if (t.includes("nefro") || t.includes("urolo")) return "nefro";
  if (t.includes("infecto") || t.includes("virologia") || t.includes("bacteriologia")) return "infectologia";
  if (t.includes("trauma") || t.includes("orto")) return "trauma";
  if (t.includes("psiquia") || t.includes("salud mental") || t.includes("psiquic")) return "psiquiatria";
  if (t.includes("salud publica") || t.includes("epidemio") || t.includes("preventiva") || t.includes("bioestadistica") || t === "salud") return "salud";
  
  if (t.includes("pediat")) return "pediatria";
  if (t.includes("obstet") || t.includes("ginec")) return "ginecologia";
  if (t.includes("cirug")) return "cirugia";
  
  return t; // Fallback
}

module.exports = {
  normalizarTema
};
