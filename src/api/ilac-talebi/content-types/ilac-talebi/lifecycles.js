'use strict';

// Yeni ilaç talebi oluşturulduğunda ilaç talepleri için ayrılmış bota/gruba
// (haber-botu'ndan bağımsız) bildirim gönderir.
async function sendTelegramToDoctor(text) {
  const BOT_TOKEN = process.env.ILAC_TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.ILAC_TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    strapi.log.warn('ILAC_TELEGRAM_BOT_TOKEN / ILAC_TELEGRAM_CHAT_ID env eksik, bildirim gönderilemedi.');
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });

    if (!res.ok) {
      strapi.log.error(`Telegram gönderim hatası: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    strapi.log.error(`Telegram gönderim hatası: ${err.message}`);
  }
}

module.exports = {
  async afterCreate(event) {
    const entry = await strapi.entityService.findOne('api::ilac-talebi.ilac-talebi', event.result.id, {
      populate: ['ilaclar'],
    });
    const { adSoyad, ilaclar, hekimRaporu } = entry;

    const ilacListesi = (ilaclar || [])
      .map((item) => `- ${item.ilacAdi} (${item.mg})`)
      .join('\n');

    const text =
      `💊 <b>Yeni İlaç Talebi</b>\n\n` +
      `Ad Soyad: ${adSoyad}\n` +
      `İlaçlar:\n${ilacListesi}\n` +
      `Uzman Hekim Raporu: ${hekimRaporu === 'var' ? 'Var' : 'Yok'}`;

    await sendTelegramToDoctor(text);
  },
};
