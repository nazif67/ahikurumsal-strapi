"use strict";

// Duyuru category enum: ["Genel","İK Duyurusu","Mevzuat","Etkinlik","Önemli"]
const RULES = [
  { cat: "Mevzuat",     kw: ["sgk","sigorta","mevzuat","kanun","yönetmelik","tebliğ","genelge","prim"] },
  { cat: "Etkinlik",    kw: ["etkinlik","toplantı","seminer","eğitim","kurs","panel","organizasyon"] },
  { cat: "Önemli",      kw: ["önemli","acil","ivedi","dikkat","uyarı","duyuru"] },
  { cat: "İK Duyurusu", kw: ["ik","insan kaynakları","personel","işe alım","mülakat","performans"] },
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
