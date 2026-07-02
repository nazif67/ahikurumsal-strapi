'use strict';

const TR_MAP = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ş: 's', Ş: 's',
  ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ı: 'i', İ: 'i',
};

function slugify(text) {
  return String(text)
    .split('')
    .map((ch) => TR_MAP[ch] || ch)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function setPublicPermissions({ strapi }) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) return;

  const publicActions = [
    'api::blog.blog.find',
    'api::blog.blog.findOne',
    'api::blog.blog.view',
    'api::haber.haber.find',
    'api::haber.haber.findOne',
    'api::haber.haber.view',
    'api::duyuru.duyuru.find',
    'api::duyuru.duyuru.findOne',
    'api::duyuru.duyuru.view',
    'api::yorum.yorum.find',
    'api::hakkimda.hakkimda.find',
    'plugin::upload.content-api.find',
    'plugin::upload.content-api.findOne',
  ];

  for (const action of publicActions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });

    if (!existing) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id, enabled: true } });
    } else if (!existing.enabled) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .update({ where: { id: existing.id }, data: { enabled: true } });
    }
  }
}

// duyuru content-type'a slug alanı sonradan eklendi; eski kayıtların slug'ı
// olmadığı için title'dan otomatik üretip doldurur (ilk açılışta bir kere).
async function backfillDuyuruSlugs({ strapi }) {
  const entries = await strapi.db.query('api::duyuru.duyuru').findMany({
    where: { slug: { $null: true } },
  });

  if (!entries.length) return;

  const existingSlugs = new Set(
    (await strapi.db.query('api::duyuru.duyuru').findMany({ select: ['slug'] }))
      .map((e) => e.slug)
      .filter(Boolean)
  );

  for (const entry of entries) {
    const base = slugify(entry.title) || `duyuru-${entry.id}`;
    let slug = base;
    let i = 2;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${i}`;
      i += 1;
    }
    existingSlugs.add(slug);

    await strapi.db
      .query('api::duyuru.duyuru')
      .update({ where: { id: entry.id }, data: { slug } });
  }
}

// Next.js sunucu tarafının (yorum oluşturma vb.) kullandığı "Next.js Server"
// adlı full-access API token yoksa bir kere oluşturur ve değerini log'a yazar.
async function ensureServerApiToken({ strapi }) {
  const existing = await strapi.db
    .query('admin::api-token')
    .findOne({ where: { name: 'Next.js Server' } });

  if (existing) return;

  const created = await strapi.service('admin::api-token').create({
    name: 'Next.js Server',
    description: 'kisisel-site sunucu tarafı istekleri (yorum oluşturma vb.)',
    type: 'full-access',
    lifespan: null,
  });

  strapi.log.warn(
    `\n\n=== YENİ STRAPI API TOKEN OLUŞTURULDU ===\n` +
      `kisisel-site/.env.local dosyasındaki STRAPI_API_TOKEN değerini bununla değiştirin:\n` +
      `${created.accessKey}\n` +
      `==========================================\n\n`
  );
}

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    await setPublicPermissions({ strapi });
    await backfillDuyuruSlugs({ strapi });
    await ensureServerApiToken({ strapi });
  },
};
