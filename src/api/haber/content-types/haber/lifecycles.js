"use strict";

// Haber category enum: ["Genel","İş Hukuku","Mevzuat","SGK & Sigorta","Ücret & Tazminat","İşe Alım"]
const RULES = [
  { cat: "SGK & Sigorta",    kw: ["sgk","sosyal güvenlik","sigorta","prim","emeklilik","4/a","4/b"] },
  { cat: "Mevzuat",          kw: ["mevzuat","yönetmelik","tebliğ","genelge","resmi gazete","kanun no"] },
  { cat: "İş Hukuku",        kw: ["iş kanunu","iş hukuku","kıdem","ihbar","fesih","işten çıkarma","iş sözleşmesi"] },
  { cat: "Ücret & Tazminat", kw: ["ücret","tazminat","asgari ücret","maaş","fazla mesai","bordro","ikramiye"] },
  { cat: "İşe Alım",         kw: ["işe alım","mülakat","aday","kariyer","özgeçmiş","cv","ilan","başvuru"] },
];

function derive(excerpt) {
  if (!excerpt) return "Genel";
  const low = excerpt.toLowerCase();
  for (const { cat, kw } of RULES) {
    if (kw.some((k) => low.includes(k))) return cat;
  }
  return "Genel";
}

module.exports = {
  beforeCreate(event) {
    const { data } = event.params;
    if (data.excerpt) data.category = derive(data.excerpt);
  },
  beforeUpdate(event) {
    const { data } = event.params;
    if (data.excerpt !== undefined) data.category = derive(data.excerpt);
  },
};
