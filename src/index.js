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
    'api::sss.sss.find',
    'api::sss.sss.findOne',
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

const SSS_DATA = [
  // İzin Türleri
  {
    category: 'İzin Türleri', order: 1,
    question: 'Çalışma izni nedir?',
    answer: '6735 sayılı Uluslararası İşgücü Kanunu kapsamında Çalışma ve Sosyal Güvenlik Bakanlığı tarafından yabancılara verilen, belirli süre için Türkiye\'de çalışma ve ikamet hakkı sağlayan resmi belgedir.',
  },
  {
    category: 'İzin Türleri', order: 2,
    question: 'Çalışma izni ikamet izni yerine geçer mi?',
    answer: 'Evet. 6735 sayılı Kanun kapsamında düzenlenen çalışma izinleri, Yabancılar ve Uluslararası Koruma Kanunu\'nun 27. maddesi gereğince ikamet izni yerine geçer. Ancak uluslararası koruma başvurucuları, şartlı mülteciler ve geçici koruma kapsamındakiler bu hükmün dışındadır.',
  },
  {
    category: 'İzin Türleri', order: 3,
    question: 'Süreli (bağımlı) çalışma izni nedir?',
    answer: 'Belirli bir işverene ve işyerine bağlı olarak düzenlenen, iş sözleşmesi süresini aşmamak kaydıyla ilk başvuruda en fazla 1 yıl geçerli olan çalışma izni türüdür.',
  },
  {
    category: 'İzin Türleri', order: 4,
    question: 'Süresiz çalışma izni nedir?',
    answer: 'Türkiye\'de uzun dönem ikamet iznine sahip olan ya da en az 8 yıl kesintisiz kanuni çalışma iznine sahip yabancılara, işverenden bağımsız olarak verilen ve süresiz çalışma ve ikamet hakkı tanıyan izin türüdür.',
  },
  {
    category: 'İzin Türleri', order: 5,
    question: 'Bağımsız çalışma izni nedir?',
    answer: 'Yabancının eğitim düzeyi, mesleki deneyimi ve bilimsel katkısı gibi kriterler gözetilerek kendi adına ve hesabına çalışmasına olanak tanıyan, belirli bir süre için düzenlenen çalışma iznidir.',
  },
  // Başvuru Süreci
  {
    category: 'Başvuru Süreci', order: 6,
    question: 'Çalışma iznine nasıl başvurulur?',
    answer: 'Yurt içinden veya yurt dışından olmak üzere iki farklı yöntemle e-İzin sistemi üzerinden elektronik başvuru yapılır. Aracı kuruluş kullanmak zorunlu değildir; tüm işlemler Bakanlık\'ın online sistemi üzerinden gerçekleştirilebilir.',
  },
  {
    category: 'Başvuru Süreci', order: 7,
    question: 'Yurt içinden nasıl başvurulur?',
    answer: 'Geçerli ikamet iznine sahip yabancılar ya da Bakanlıkça belirlenen istisnai durumlardakiler, calismaizni.gov.tr adresi üzerinden e-Devlet sistemi ile doğrudan Bakanlığa başvurabilir.',
  },
  {
    category: 'Başvuru Süreci', order: 8,
    question: 'Yurt dışından nasıl başvurulur?',
    answer: 'İki aşamalıdır. Önce yabancı, bulunduğu ülkedeki Türk büyükelçiliği veya konsolosluğuna başvurarak 16 haneli referans numarası alır. Ardından Türkiye\'deki işveren, bu referans numarasıyla e-İzin sistemi üzerinden başvuruyu tamamlar.',
  },
  {
    category: 'Başvuru Süreci', order: 9,
    question: 'Başvurular ne kadar sürede sonuçlanır?',
    answer: 'Başvurular, belirlenen kriterler ve uluslararası işgücü politikası çerçevesinde 30 gün içinde değerlendirilir. Gerektiğinde ilgili kamu kurumlarına görüş sorulabilir.',
  },
  {
    category: 'Başvuru Süreci', order: 10,
    question: 'Başvuru sonucu nasıl öğrenilir?',
    answer: 'Bakanlık kararı, başvuru sahibinin kayıtlı e-posta adresine iletilir. Yurt dışı başvurularında ayrıca ilgili diplomatik temsilciliğe bildirim yapılır. Sonuç e-İzin sistemi üzerinden de takip edilebilir.',
  },
  {
    category: 'Başvuru Süreci', order: 11,
    question: 'Başvurum reddedilirse ne yapabilirim?',
    answer: 'Tebliğ tarihinden itibaren 30 gün içinde e-İzin sistemi üzerinden itiraz başvurusunda bulunabilirsiniz. İtirazın da reddi halinde idari yargı yoluna başvurma hakkınız saklıdır.',
  },
  {
    category: 'Başvuru Süreci', order: 12,
    question: 'Reddedilen başvuru için tekrar başvurabilir miyim?',
    answer: 'Evet. Eksikliklerin giderilmesi kaydıyla yeniden başvuru yapılabilir. Red kararı, ileride yapılacak başvuruları engellemez.',
  },
  {
    category: 'Başvuru Süreci', order: 13,
    question: 'Çalışma izni uzatması nasıl yapılır?',
    answer: 'Uzatma başvurusu, iznin bitiş tarihinden en az 60 gün önce ve geçerlilik süresi dolmadan online sistem üzerinden yapılmalıdır. Süresi dolan izin için uzatma başvurusu kabul edilmez.',
  },
  {
    category: 'Başvuru Süreci', order: 14,
    question: 'Uzatılan izinlerde süre ne kadardır?',
    answer: 'İlk uzatmada en fazla 2 yıl, sonraki uzatmalarda ise en fazla 3 yıl süre verilebilir.',
  },
  // Onay Sonrası İşlemler
  {
    category: 'Onay Sonrası İşlemler', order: 15,
    question: 'Yurt dışı başvurularında onay sonrası ne yapılmalıdır?',
    answer: 'Çalışma ve ikamet izni harçları ile vize ücreti bulunulan ülkedeki Türk temsilciliğine ödenir. Çalışma izni kartı PTT Kargo aracılığıyla işveren adresine gönderilir. Türkiye\'ye girişten itibaren 20 iş günü içinde adres kaydı yaptırılması zorunludur.',
  },
  {
    category: 'Onay Sonrası İşlemler', order: 16,
    question: 'Uzatma başvurusu beklenirken çalışmaya devam edilebilir mi?',
    answer: 'Evet. Aynı işverende, aynı işyerinde çalışmak kaydıyla iznin sona erdiği tarihten itibaren 90 güne kadar çalışılmaya devam edilebilir.',
  },
  {
    category: 'Onay Sonrası İşlemler', order: 17,
    question: 'Çalışma izni kartım kaybolursa ne yapmalıyım?',
    answer: 'e-İzin sistemi üzerinden "Başvuru İşlemleri → Tamamlanan Başvurular → İzin Sonrası İşlemler → Yeni Kart Talebi" adımlarını takip ederek yeni kart talebinde bulunabilirsiniz. İlgili harçların ödenmesi gerekir.',
  },
  {
    category: 'Onay Sonrası İşlemler', order: 18,
    question: 'SGK yükümlülüğü ne zaman başlamalıdır?',
    answer: 'Yurt içi başvurularda iznin başlangıç tarihinden itibaren 1 ay içinde; yurt dışı başvurularda ise Türkiye\'ye girişten itibaren 1 ay ya da iznin başlangıcından itibaren 6 ay içinde (hangisi önce geliyorsa) SGK\'ya bildirim yapılmalıdır.',
  },
  // Haklar ve Yükümlülükler
  {
    category: 'Haklar ve Yükümlülükler', order: 19,
    question: 'İzinsiz çalışmanın sonuçları nelerdir?',
    answer: 'Yetkisiz çalışan yabancı ve işverene idari para cezası uygulanır. Çalışma izni olmaksızın çalıştığı tespit edilen yabancı, İçişleri Bakanlığı\'na bildirilerek sınır dışı etme işlemi başlatılabilir.',
  },
  {
    category: 'Haklar ve Yükümlülükler', order: 20,
    question: 'İkamet izni çalışma hakkı sağlar mı?',
    answer: 'Hayır. 6735 sayılı Kanun kapsamında düzenlenmemiş ikamet izinleri, tek başına çalışma hakkı vermez. Çalışmak için ayrıca çalışma izni alınması zorunludur.',
  },
  {
    category: 'Haklar ve Yükümlülükler', order: 21,
    question: 'Yabancılar her meslekte çalışabilir mi?',
    answer: 'Hayır. Özel güvenlik görevliliği, gümrük müşavirliği, eczacılık, veterinerlik ve avukatlık gibi bazı meslekler Türk vatandaşlarına ayrılmıştır. Yabancılar bu mesleklerde çalışma izni alamaz.',
  },
  {
    category: 'Haklar ve Yükümlülükler', order: 22,
    question: 'İşveren bildirim yükümlülüğü nedir?',
    answer: 'İşverenler, yabancı çalışanın işe başladığı, işten ayrıldığı veya iznin iptal edildiği tarihten itibaren 15 gün içinde Bakanlığa bildirimde bulunmak zorundadır.',
  },
  {
    category: 'Haklar ve Yükümlülükler', order: 23,
    question: 'Yabancı işçi sendikaya üye olabilir mi?',
    answer: 'Evet. Kanuni çalışma iznine sahip yabancı işçilerin sendika üyeliğine herhangi bir yasal engel bulunmamaktadır.',
  },
  {
    category: 'Haklar ve Yükümlülükler', order: 24,
    question: 'İzin sahibi işyerini veya işverenini değiştirebilir mi?',
    answer: 'Hayır. Süreli (bağımlı) çalışma izni belirli bir işveren ve işyerine bağlıdır. Farklı bir işverende ya da işyerinde çalışmak için yeni çalışma izni alınması zorunludur.',
  },
  // Özel Durumlar
  {
    category: 'Özel Durumlar', order: 25,
    question: 'Uluslararası koruma başvurucuları çalışma izni alabilir mi?',
    answer: 'Evet, ancak yalnızca başvurudan itibaren 6 ay geçtikten sonra başvuru yapabilirler. Şartlı mülteci statüsündekiler de çalışmaya başlamadan önce çalışma izni almak zorundadır.',
  },
  {
    category: 'Özel Durumlar', order: 26,
    question: 'Ev hizmetlerinde yabancı istihdam edilebilir mi?',
    answer: 'Evet, çalışma izni alınması koşuluyla yaşlı bakımı, engelli bakımı, çocuk bakımı veya hasta refakatçiliği amacıyla yabancı çalıştırılabilir.',
  },
  {
    category: 'Özel Durumlar', order: 27,
    question: 'Doğrudan yabancı yatırımcılar işçi kotasına tabi midir?',
    answer: 'Hayır. Belirli kriterleri karşılayan doğrudan yabancı yatırımlar kapsamındaki kilit personel, standart 5\'e 1 Türk-yabancı işçi oranı kuralına tabi tutulmaz.',
  },
  {
    category: 'Özel Durumlar', order: 28,
    question: 'Pasaport süresi çalışma iznini etkiler mi?',
    answer: 'Evet. Çalışma izni süresi, pasaportun bitiş tarihinden 60 gün öncesine kadar olan süre esas alınarak belirlenir. Bu nedenle pasaport geçerlilik süresinin yeterli olmasına dikkat edilmelidir.',
  },
  {
    category: 'Özel Durumlar', order: 29,
    question: 'Yabancı ortaklar veya yönetim kurulu üyeleri çalışma izni almak zorunda mıdır?',
    answer: 'Genel kural olarak evet. Ancak Türkiye\'de ikamet etmeyen yönetim kurulu üyeleri ile şirkette yönetici pozisyonunda bulunmayan ortaklar bu zorunluluktan muaf tutulabilir.',
  },
  // e-İzin Sistemi
  {
    category: 'e-İzin Sistemi', order: 30,
    question: 'e-İzin sisteminde hangi tarayıcı önerilir?',
    answer: 'Google Chrome kullanılması önerilir. Elektronik imza işlemlerinin sorunsuz çalışması için tarayıcının açılır pencere (pop-up) izninin aktif hale getirilmesi gerekmektedir.',
  },
  {
    category: 'e-İzin Sistemi', order: 31,
    question: 'Yüklenen belgeler için boyut ve format zorunluluğu var mıdır?',
    answer: 'Evet. Tüm belgeler PDF formatında ve en fazla 2 MB boyutunda olmalıdır. Bu sınırı aşan veya farklı formattaki belgeler sisteme yüklenemez.',
  },
  {
    category: 'e-İzin Sistemi', order: 32,
    question: 'Fotoğraf için teknik gereksinimler nelerdir?',
    answer: 'Fotoğraf; JPEG, PNG, GIF veya JPG formatında, renkli, ön cepheden çekilmiş, kişiyi net biçimde tanımlar nitelikte, beyaz arka planlı ve son 6 ay içinde çekilmiş olmalıdır.',
  },
  {
    category: 'e-İzin Sistemi', order: 33,
    question: 'Eksik belgeler başvuru değerlendirme aşamasında yüklenebilir mi?',
    answer: 'Evet. "Başvuru Takip → Değerlendirmedeki Başvurular" menüsünden ilgili başvurunuz seçilerek eksik belgeler PDF formatında yüklenebilir ve elektronik imzayla işlem tamamlanabilir.',
  },
  {
    category: 'e-İzin Sistemi', order: 34,
    question: 'Çalışma izninin iptali veya sona erdirilmesi nasıl yapılır?',
    answer: 'İşverenler, e-İzin sistemi üzerinden "İzin Sonrası İşlemler → İzin İptal Talebi" adımlarını takip ederek elektronik imzayla iptal talebinde bulunabilir.',
  },
];

async function seedSSSData({ strapi }) {
  const count = await strapi.db.query('api::sss.sss').count();
  if (count > 0) return;

  for (const item of SSS_DATA) {
    await strapi.db.query('api::sss.sss').create({
      data: { ...item, publishedAt: new Date() },
    });
  }
  strapi.log.info(`SSS: ${SSS_DATA.length} soru başarıyla eklendi.`);
}

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    await setPublicPermissions({ strapi });
    await backfillDuyuruSlugs({ strapi });
    await ensureServerApiToken({ strapi });
    await seedSSSData({ strapi });
  },
};
