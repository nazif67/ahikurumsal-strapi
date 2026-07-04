"use strict";

// Blog category: serbest string — excerpt'in ilk ":" öncesi phrase olarak türetilir
const RULES = [
  { cat: "SGK & Sigorta",       kw: ["sgk","sosyal güvenlik","sigorta","prim","emeklilik"] },
  { cat: "İş Hukuku",           kw: ["iş kanunu","iş hukuku","kıdem","ihbar","fesih","iş sözleşmesi"] },
  { cat: "Mevzuat",             kw: ["mevzuat","yönetmelik","tebliğ","genelge","resmi gazete"] },
  { cat: "Ücret & Tazminat",    kw: ["ücret","tazminat","asgari ücret","maaş","fazla mesai","bordro"] },
  { cat: "İşe Alım",            kw: ["işe alım","mülakat","aday","kariyer","başvuru","cv"] },
  { cat: "Performans",          kw: ["performans","değerlendirme","hedef","kpi","okr"] },
  { cat: "Çalışan Deneyimi",    kw: ["çalışan","motivasyon","bağlılık","refah","mutluluk","wellbeing"] },
  { cat: "Liderlik",            kw: ["liderlik","yönetici","yönetim","takım","mentor"] },
];

function derive(excerpt) {
  if (!excerpt) return null;
  // "Kategori: açıklama" formatı varsa doğrudan al
  const colonIdx = excerpt.indexOf(":");
  if (colonIdx > 0 && colonIdx <= 35) {
    return excerpt.slice(0, colonIdx).trim();
  }
  const low = excerpt.toLowerCase();
  for (const { cat, kw } of RULES) {
    if (kw.some((k) => low.includes(k))) return cat;
  }
  return null;
}

module.exports = {
  beforeCreate(event) {
    const { data } = event.params;
    if (data.excerpt && !data.category) {
      const cat = derive(data.excerpt);
      if (cat) data.category = cat;
    }
  },
  beforeUpdate(event) {
    const { data } = event.params;
    if (data.excerpt !== undefined) {
      const cat = derive(data.excerpt);
      if (cat) data.category = cat;
    }
  },
};
