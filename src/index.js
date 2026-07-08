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
    'api::kidem-tavan.kidem-tavan.find',
    'api::maas-parametre.maas-parametre.find',
    'api::arac-icerik.arac-icerik.find',
    'api::arac-icerik.arac-icerik.findOne',
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

// İK/PDKS modülleri: Employee (işveren) ve Worker (çalışan) rollerini oluşturur,
// config-sync rol dosyalarındaki izinleri (sadece İK modülleriyle sınırlı) yükler
// ve pozisyon/departman/sektör varsayılanlarını seed eder.
async function setupIkModules({ strapi }) {
  const fs = require('fs');
  const path = require('path');

  const INCLUDE = new Set([
    'worker', 'branch', 'institution', 'department', 'position', 'qr-code-session',
    'pdks-attendance', 'leave-request', 'task', 'decision', 'incoming-document',
    'outgoing-document', 'reminder', 'property', 'purchasing', 'vehicle',
    'company-profile', 'sector', 'demo-request', 'contact-form',
  ]);

  // Kariyer modüllerinin izinlerini ele; sadece İK api'leri + plugin aksiyonları kalsın
  const isAllowedAction = (action) => {
    if (action.startsWith('plugin::')) return true;
    const m = action.match(/^api::([^.]+)\./);
    return m ? INCLUDE.has(m[1]) : false;
  };

  const grant = async (roleId, actions) => {
    for (const action of actions) {
      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: roleId } });
      if (!existing) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .create({ data: { action, role: roleId, enabled: true } });
      } else if (!existing.enabled) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .update({ where: { id: existing.id }, data: { enabled: true } });
      }
    }
  };

  const roleByType = (type) =>
    strapi.db.query('plugin::users-permissions.role').findOne({ where: { type } });

  const ensureRole = async ({ name, description, type }) => {
    let role = await roleByType(type);
    if (!role) {
      role = await strapi.db
        .query('plugin::users-permissions.role')
        .create({ data: { name, description, type } });
    }
    return role;
  };

  // 1) İşveren (employee), çalışan (worker) ve platform yöneticisi (admin) rolleri
  const employeeRole = await ensureRole({
    name: 'Employee',
    description: 'Admin/Yönetici kullanıcı rolü',
    type: 'employee',
  });
  const workerRole = await ensureRole({
    name: 'Worker',
    description: 'Çalışan (PDKS) rolü',
    type: 'worker',
  });
  const adminRole = await ensureRole({
    name: 'Admin',
    description: 'Platform yöneticisi — şirket ve kurum yönetimi',
    type: 'admin',
  });

  // 2) config-sync rol dosyalarından izinler (İK ile sınırlı)
  const rolesDir = path.join(__dirname, 'seed', 'roles');
  const loadActions = (file) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(rolesDir, file), 'utf8'));
      return (data.permissions || []).map((p) => p.action).filter(isAllowedAction);
    } catch (e) {
      return [];
    }
  };

  const publicRole = await roleByType('public');
  const authRole = await roleByType('authenticated');

  if (publicRole) await grant(publicRole.id, loadActions('user-role.public.json'));
  if (authRole) await grant(authRole.id, loadActions('user-role.authenticated.json'));
  await grant(employeeRole.id, loadActions('user-role.employee.json'));

  // Employee (admin): Demo Talepleri yönetimi (config-sync dosyasında eksik)
  await grant(employeeRole.id, [
    'api::demo-request.demo-request.find',
    'api::demo-request.demo-request.findOne',
    'api::demo-request.demo-request.update',
    'api::demo-request.demo-request.delete',
  ]);

  // Worker (çalışan) rolü — config-sync dosyası yok. Panelin worker akışının
  // gerçekten çağırdığı endpoint'ler (custom handler'lar dahil):
  //  - QR okut/giriş-çıkış, kendi PDKS kayıtları, izin talebi, görevleri
  await grant(workerRole.id, [
    'plugin::users-permissions.user.me',
    'api::worker.worker.find', // fetchWorkerProfile (filters[user][id])
    'api::qr-code-session.qr-code-session.validateSession', // QR doğrula
    'api::pdks-attendance.pdks-attendance.check', // giriş-çıkış okut
    'api::pdks-attendance.pdks-attendance.getMyRecords', // kendi kayıtları
    'api::leave-request.leave-request.create', // izin talebi oluştur
    'api::leave-request.leave-request.getMyRequests', // izinlerim
    'api::leave-request.leave-request.getMyRemainingDays', // kalan izin
    'api::task.task.getMyTasks', // görevlerim
    'api::task.task.updateStatus', // görev durumunu güncelle
  ]);

  // Admin (platform yöneticisi) rolü — Employee izin setinin tamamı artı
  // şirketlere yetki verme (kullanıcı güncelleme employee setinde mevcut),
  // demo talepleri, iletişim formları ve kurum yönetimi.
  await grant(adminRole.id, loadActions('user-role.employee.json'));
  await grant(adminRole.id, [
    'api::demo-request.demo-request.find',
    'api::demo-request.demo-request.findOne',
    'api::demo-request.demo-request.update',
    'api::demo-request.demo-request.delete',
    'api::contact-form.contact-form.find',
    'api::contact-form.contact-form.findOne',
    'api::contact-form.contact-form.delete',
    'api::institution.institution.find',
    'api::institution.institution.findOne',
    'api::institution.institution.create',
    'api::institution.institution.update',
    'api::institution.institution.delete',
  ]);

  // 3) Varsayılan pozisyon / departman / sektör
  const seedDefaults = async (uid, items) => {
    for (const item of items) {
      const found = await strapi.db.query(uid).findOne({ where: { key: item.key } });
      if (!found) await strapi.entityService.create(uid, { data: item });
    }
  };

  await seedDefaults('api::position.position', [
    { key: 'top-manager', name: 'Üst Düzey Yönetici' },
    { key: 'middle-manager', name: 'Orta Düzey Yönetici' },
    { key: 'manager-candidate', name: 'Yönetici Adayı' },
    { key: 'expert', name: 'Uzman' },
    { key: 'beginner', name: 'Yeni Başlayan' },
    { key: 'freelancer', name: 'Serbest / Freelancer' },
    { key: 'worker', name: 'İşçi ve Mavi Yaka' },
    { key: 'intern', name: 'Stajyer' },
    { key: 'assistant-expert', name: 'Uzman Yardımcısı' },
    { key: 'employee', name: 'Eleman' },
    { key: 'service-personnel', name: 'Hizmet Personeli' },
  ]);

  await seedDefaults('api::department.department', [
    { key: 'hr', name: 'İnsan Kaynakları' },
    { key: 'sales', name: 'Satış' },
    { key: 'it', name: 'Bilgi Teknolojileri' },
    { key: 'finance', name: 'Finans' },
    { key: 'production', name: 'Üretim' },
    { key: 'marketing', name: 'Pazarlama' },
  ]);

  await seedDefaults('api::sector.sector', [
    { key: 'technology', name: 'Teknoloji' },
    { key: 'healthcare', name: 'Sağlık' },
    { key: 'education', name: 'Eğitim' },
    { key: 'construction', name: 'İnşaat' },
    { key: 'finance', name: 'Finans' },
  ]);
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

  // ─── Çalışan ve İşveren ───────────────────────────────────────────────────
  {
    category: 'Çalışan ve İşveren', order: 35,
    question: 'SGK işe giriş bildirimi ne zaman yapılmalıdır?',
    answer: '5510 sayılı Kanun\'un 8. maddesi uyarınca işveren, sigortalıyı işe başlamadan en geç bir gün önce e-Bildirge sistemi üzerinden SGK\'ya bildirmek zorundadır. İnşaat, tarım ve balıkçılık gibi sektörlerde işe başlama gününde bildirim yapılması kabul edilebilir. Süresinde yapılmayan bildirimler idari para cezasına yol açar.',
  },
  {
    category: 'Çalışan ve İşveren', order: 36,
    question: 'SGK prim oranları nelerdir?',
    answer: '5510 sayılı Kanun kapsamında SSK (4/a) sigortalıları için prim oranları şöyledir:\n\n• Uzun vadeli sigorta (malullük, yaşlılık, ölüm): İşçi %9, İşveren %11 (Toplam %20)\n• Kısa vadeli sigorta (iş kazası, meslek hastalığı): Yalnızca işveren (%1–6,5; risk grubuna göre değişir, standart %2)\n• Genel sağlık sigortası (GSS): İşçi %5, İşveren %7,5 (Toplam %12,5)\n• İşsizlik sigortası: İşçi %1, İşveren %2, Devlet %1\n\nNet olarak çalışanın maaşından kesilen SGK+işsizlik payı %15, işveren maliyeti ise %22,5\'tir.',
  },
  {
    category: 'Çalışan ve İşveren', order: 37,
    question: 'Aylık prim bildirgesi (APB) ne zamana kadar verilmelidir?',
    answer: 'SSK (4/a) kapsamındaki işyerleri için Aylık Prim ve Hizmet Belgesi, ilgili ayı takip eden ayın 23\'üne kadar e-Bildirge sistemi üzerinden SGK\'ya gönderilmelidir. Primlerin ödeme son tarihi ise aynı ayın 26\'sıdır. Süresinde verilmeyen bildirge için idari para cezası uygulanır.',
  },
  {
    category: 'Çalışan ve İşveren', order: 38,
    question: 'Prime esas kazanç alt ve üst sınırı nedir?',
    answer: 'SGK primlerinin hesaplanacağı ücret; alt sınır olarak aylık asgari ücret, üst sınır olarak ise aylık asgari ücretin 7,5 katı ile sınırlandırılmıştır. Bu eşiğin altında ücret bildirilmesi mümkün değildir; üst sınırı aşan kazanç kısmı prime tabi tutulmaz. Alt ve üst sınır değerleri asgari ücret artışlarıyla birlikte her yıl güncellenir.',
  },
  {
    category: 'Çalışan ve İşveren', order: 39,
    question: 'Eksik gün bildirimi ne zaman ve nasıl yapılır?',
    answer: 'Bir ayda 30 günden az çalışılan durumlarda (ücretsiz izin, istirahat, devamsızlık vb.) Aylık Prim ve Hizmet Belgesi\'nin yanı sıra Eksik Gün Bildirim Formu ve destekleyici belgelerin de SGK\'ya sunulması gerekir. Form, ilgili ayın belgesinin verilme süresiyle aynı tarihe kadar teslim edilmelidir.',
  },
  {
    category: 'Çalışan ve İşveren', order: 40,
    question: 'İşten ayrılan çalışan için SGK işten ayrılış bildirimi nasıl yapılır?',
    answer: 'İşveren, çalışanın iş sözleşmesinin sona ermesinden itibaren 10 gün içinde e-Bildirge sistemi üzerinden "İşten Ayrılış Bildirgesini" doldurmak zorundadır. Bildirgede işten ayrılış nedeninin doğru kodla (ör. 01=İstifa, 29=İşveren feshi) seçilmesi önemlidir; bu bilgi çalışanın işsizlik ödeneği hakkını doğrudan etkiler.',
  },
  {
    category: 'Çalışan ve İşveren', order: 41,
    question: 'İşsizlik ödeneğinden kimler ve ne kadar süre yararlanabilir?',
    answer: '4447 sayılı Kanun kapsamında işsizlik ödeneğinden yararlanabilmek için son 3 yılda en az 600 prim ödeme günü bulunması ve son 120 gün kesintisiz sigortalı çalışılmış olması gerekmektedir.\n\nÖdenek süresi prim ödeme gününe göre belirlenir:\n• 600–1199 gün: 180 gün (6 ay)\n• 1200–1799 gün: 270 gün (9 ay)\n• 1800 gün ve üzeri: 360 gün (12 ay)\n\nÖdenek miktarı, son 4 aylık brüt ücretin aylık ortalamasının %40\'ı kadardır; ancak aylık asgari ücretin %80\'ini geçemez.',
  },
  {
    category: 'Çalışan ve İşveren', order: 42,
    question: 'SGK e-Bildirge sistemi nedir ve nasıl kullanılır?',
    answer: 'e-Bildirge (ebildirge.sgk.gov.tr), işverenlerin tüm SGK yükümlülüklerini elektronik ortamda yerine getirebildiği resmi sistemdir. İşe giriş/çıkış bildirgesi, aylık prim belgesi, eksik gün bildirimi ve e-İdare işlemleri bu platform üzerinden yürütülür. Sisteme erişim için işyeri sicil numarası ve şifresi gerekmektedir.',
  },
  {
    category: 'Çalışan ve İşveren', order: 43,
    question: 'Stajyer öğrenciler SGK\'ya bildirilmeli midir?',
    answer: 'Evet. Zorunlu staj yapan öğrenciler, 5510 sayılı Kanun\'un 5. maddesi kapsamında "kısmen sigortalı" sayılır ve kısa vadeli sigorta kolları (iş kazası ve meslek hastalığı) ile genel sağlık sigortası kapsamında SGK\'ya bildirilmesi zorunludur. Söz konusu primler öğretim kurumu tarafından ödenir. Gönüllü (zorunlu olmayan) stajyerlerin bildirimi ise ayrı kurallara tabidir.',
  },
  {
    category: 'Çalışan ve İşveren', order: 44,
    question: 'SGK prim teşvikleri neler var?',
    answer: 'SGK, belirli gruplara yönelik işveren yükünü azaltan çeşitli prim teşvikleri sunmaktadır. Başlıca teşvikler şunlardır:\n\n• 5 puanlık Hazine desteği (4/a kapsamındaki tüm işverenler için işveren payında indirim)\n• Genç, kadın ve engelli istihdamına yönelik teşvikler\n• İşkur yönlendirmeli işe alımlarda ek destekler\n• Ar-Ge ve tasarım personeline yönelik gelir vergisi ve sigorta prim desteği\n\nHangi teşvikten yararlanılabileceği işyeri türüne, çalışan profiline ve istihdamın niteliğine göre değişir.',
  },
  {
    category: 'Çalışan ve İşveren', order: 45,
    question: 'SGK borcu olan işveren ihalelerden men edilir mi?',
    answer: 'Evet. 5510 sayılı Kanun gereğince kamu kurumları, ihaleye girecek işverenlerden SGK borcu bulunmadığına dair "SGK borcu yoktur yazısı" talep edebilir. Prim borcu olan işverenler kamu ihalelerine katılamaz, çeşitli devlet desteklerinden yararlanamaz ve hibe başvurularında sorunla karşılaşabilir.',
  },

  // ─── Emeklilik ────────────────────────────────────────────────────────────
  {
    category: 'Emeklilik', order: 46,
    question: 'Emeklilik için gerekli koşullar nelerdir?',
    answer: '5510 sayılı Kanun kapsamında yaşlılık aylığı bağlanabilmesi için yaş, prim gün sayısı ve sigortalılık süresi koşullarının birlikte sağlanması gerekir. Koşullar, sigortalılığa ilk giriş tarihine ve doğum yılına göre farklılık gösterir:\n\n• 1/1/2000 öncesi sigortalılık başlangıcı olanlar için geçiş hükümleri uygulanır.\n• 1/1/2000 ve sonrası ilk defa sigortalı olanlar için 65 yaş ve 7.200 prim günü koşulu aranır.\n\nKesin koşullarınızı öğrenmek için uygulandığınız kanun metnine veya SGK İl/İlçe Müdürlüklerine başvurmanız önerilir.',
  },
  {
    category: 'Emeklilik', order: 47,
    question: 'EYT (Emeklilikte Yaşa Takılanlar) düzenlemesi nedir?',
    answer: '7438 sayılı Kanun 15 Mart 2023 tarihinde Resmî Gazete\'de yayımlanarak yürürlüğe girmiştir. Bu düzenlemeyle 8 Eylül 1999 tarihinden önce SGK\'ya (SSK/Bağ-Kur) ilk kez tescil yaptıran ve prim gün şartını karşılayan sigortalılar yaş şartı aranmaksızın emekliye ayrılabilmiştir. EYT kapsamında başvurabilecek kişiler büyük ölçüde bu hakkı kullanmış durumdadır.',
  },
  {
    category: 'Emeklilik', order: 48,
    question: 'Emeklilik başvurusu nereye ve nasıl yapılır?',
    answer: 'Emeklilik başvurusu SGK\'nın dijital hizmet portalı olan "e-SGK" (eSGK.sgk.gov.tr) üzerinden veya herhangi bir SGK İl/İlçe Müdürlüğüne şahsen başvurularak yapılabilir. e-Devlet kapısı üzerinden başvuru seçeneği de sunulmaktadır. Başvurudan önce "Hizmet Dökümü"nün incelenmesi ve eksik primlerin tamamlanması tavsiye edilir.',
  },
  {
    category: 'Emeklilik', order: 49,
    question: 'Emeklilik maaşı nasıl hesaplanır?',
    answer: 'SSK (4/a) kapsamındaki emeklilik aylığı; sigortalılık süresi, toplam prim günü ve prime esas kazanç ortalaması esas alınarak hesaplanır. Aylık bağlama oranı, her 360 günlük prim için belirli bir yüzde olarak eklenir. Güncelleme katsayısı (enflasyon) yılda iki kez uygulanarak maaşlar TÜFE ve ücret artışlarıyla revize edilir. Kesin hesaplama için SGK\'nın emeklilik simülatörünü (sgk.gov.tr) kullanabilirsiniz.',
  },
  {
    category: 'Emeklilik', order: 50,
    question: 'Emekli olduktan sonra çalışmaya devam edebilir miyim?',
    answer: 'Evet. Emekli olduktan sonra çalışmak mümkündür; ancak SSK (4/a) kapsamında bir işte çalışanlardan Sosyal Güvenlik Destek Primi (SGDP) kesilir. 2024 itibarıyla SGDP oranı çalışan payı %7,5 ve işveren payı %22,5\'tir. Bu çalışma emekli aylığını kesmez; aylık ödenmeye devam eder.',
  },
  {
    category: 'Emeklilik', order: 51,
    question: 'Ölüm aylığı (dul ve yetim aylığı) nasıl bağlanır?',
    answer: '5510 sayılı Kanun\'un 34. maddesi uyarınca vefat eden sigortalının; eşine, çocuklarına ve belirli koşulları taşıyan ebeveynlerine ölüm aylığı bağlanabilir. Hak sahipliği için vefat eden sigortalının en az 1800 prim günü olması ya da malullük veya yaşlılık aylığı almakta olması gerekir. Başvuru, ölüm tarihinden itibaren gecikmeden SGK\'ya yapılmalıdır.',
  },
  {
    category: 'Emeklilik', order: 52,
    question: 'Eksik prim günlerini isteğe bağlı sigorta ile tamamlayabilir miyim?',
    answer: 'Evet. Sigortalılık süresi olan ancak prim ödeme gün sayısı yetersiz olanlar, isteğe bağlı sigorta yoluyla eksik günlerini tamamlayabilir. İsteğe bağlı sigorta için prim, alt sınır (asgari ücret) ile üst sınır arasında seçilen prime esas kazanç üzerinden hesaplanır. Başvuru e-SGK veya SGK müdürlüklerine yapılabilir.',
  },
  {
    category: 'Emeklilik', order: 53,
    question: 'Yurt dışında çalışılan süreler emeklilikte sayılır mı?',
    answer: 'Türkiye ile sosyal güvenlik sözleşmesi imzalanmış ülkelerde (Almanya, Fransa, Hollanda, ABD vb.) geçen çalışma süreleri, emeklilik hesabında dikkate alınabilir. Bunun için yurt dışı hizmet borçlanması yapılması gerekmektedir. Borçlanma, Türkiye\'ye döndükten sonra SGK\'ya başvurarak gerçekleştirilir; ödeme yapıldıktan sonra söz konusu süreler Türkiye\'deki prim günlerine eklenir.',
  },
  {
    category: 'Emeklilik', order: 54,
    question: 'Askerlik süresi emeklilik için borçlanılabilir mi?',
    answer: 'Evet. Er veya erbaş olarak silahaltında geçirilen askerlik süreleri, 5510 sayılı Kanun kapsamında borçlanılabilir. Borçlanma başvurusu SGK\'ya yapılır; prime esas kazanç olarak talep tarihindeki alt sınır (asgari ücret) ya da belirlenen bir tutar üzerinden hesaplama yapılır. Bu süre tamamlandığında prim gün sayısına eklenir.',
  },
  {
    category: 'Emeklilik', order: 55,
    question: 'Doğum borçlanması nedir, kimler yararlanabilir?',
    answer: '5510 sayılı Kanun\'un geçici 41. maddesi uyarınca sigortalı kadınlar, her çocuk için en fazla 2 yıl (toplam en fazla 3 çocuk için 6 yıl) üzere doğum borçlanması yapabilir. Borçlanma yapılabilmesi için doğum tarihi itibarıyla sigortalılık başlangıcının bulunması ve doğumdan önce en az 1 günlük sigortalılık kaydının mevcut olması gerekir. Bu borçlanma prim gün sayısını artırır ve emekliliği öne alabilir.',
  },

  // ─── Genel Sağlık Sigortası (GSS) ────────────────────────────────────────
  {
    category: 'Genel Sağlık Sigortası', order: 56,
    question: 'Genel Sağlık Sigortası (GSS) nedir, kimler kapsamındadır?',
    answer: '5510 sayılı Kanun\'un 4A bölümü kapsamında 1 Ocak 2012 itibarıyla zorunlu hale gelen GSS; SGK\'ya bağlı olarak çalışanlar, emekliler, Bağ-Kur\'lular ve gelir testine tabi tutulan bireyler dahil olmak üzere Türkiye\'de ikamet eden tüm vatandaşları kapsamaktadır. GSS ile kamu sağlık sistemi üzerinden muayene, ilaç, hastane ve ameliyat gibi hizmetlerden yararlanılabilir.',
  },
  {
    category: 'Genel Sağlık Sigortası', order: 57,
    question: 'Gelir testi nedir, başvurmazsam ne olur?',
    answer: 'Herhangi bir sosyal güvenlik kapsamında bulunmayan bireyler için aylık geliri belirlemek amacıyla yapılan İl Müdürlükleri ya da e-Devlet üzerinden gerçekleştirilen incelemedir. Gelir testi yaptırmayanlar, GSS primlerinin tespitinde asgari ücretin iki katı esas alınarak prime tabi tutulur. Bu nedenle testi zamanında yaptırmak gereksiz mali yük doğmasını önler.',
  },
  {
    category: 'Genel Sağlık Sigortası', order: 58,
    question: 'GSS prim tutarı ne kadardır?',
    answer: 'GSS prim oranı %12,5 olup işçi-işveren ayrımına göre şöyle paylaşılır: çalışan %5, işveren %7,5. Herhangi bir işte çalışmayanlar için aylık prim, gelir testi sonucuna göre belirlenen prime esas kazanç üzerinden hesaplanır. Asgari ücretin üçte birinin altında geliri olanların primleri devlet tarafından ödenir.',
  },
  {
    category: 'Genel Sağlık Sigortası', order: 59,
    question: 'GSS prim borcu sağlık hizmetlerine erişimi etkiler mi?',
    answer: 'Evet. GSS prim borcu 60 günü aşan kişiler acil servis, koruyucu sağlık hizmetleri ve iş kazası/meslek hastalığı dışındaki sağlık hizmetlerinden yararlanamaz. Borcun ödenmesi veya yapılandırılmasından sonra sağlık hizmetlerine erişim otomatik olarak yeniden başlar. Acil sağlık hizmetleri, prim borcundan bağımsız olarak her koşulda sunulmaktadır.',
  },
  {
    category: 'Genel Sağlık Sigortası', order: 60,
    question: '18 yaşını dolduran çocukların GSS güvencesi devam eder mi?',
    answer: '18 yaşını doldurmuş ve yükseköğretim kurumuna devam eden çocuklar, 25 yaşına kadar ebeveynleri üzerinden GSS kapsamında sağlık hizmetlerinden yararlanabilir. Öğrenim durumu bilgisi YÖKSİS üzerinden SGK ile paylaşıldığından ayrıca belge gerekmeyebilir; ancak okul kaydı sona erdiğinde veya 25 yaş aşıldığında bu güvence otomatik olarak kesilir ve bireysel kayıt yaptırılması gerekir.',
  },
  {
    category: 'Genel Sağlık Sigortası', order: 61,
    question: 'Muayene katılım payı nedir, hangi hizmetlerde uygulanır?',
    answer: 'Sağlık hizmetlerinde öngörülen katkı payı; muayene, ilaç reçetesi ve bazı tanı işlemlerinde uygulanır. Birinci basamak sağlık kuruluşuna (aile hekimi) direkt başvurularda katkı payı düşüktür; sevk zinciri dışında doğrudan hastaneye ya da özel sağlık kuruluşuna gidildiğinde oranlar artar. Belirli kronik hastalıklar, engellilik durumu ve yeşil kart kapsamındakiler katkı payından muaf tutulabilir.',
  },
  {
    category: 'Genel Sağlık Sigortası', order: 62,
    question: 'Tamamlayıcı sağlık sigortası (TSS) GSS ile nasıl çalışır?',
    answer: 'Tamamlayıcı sağlık sigortası, GSS\'nin karşılamadığı katılım paylarını, fark ücretlerini ve ek hizmet bedellerini güvence altına almak üzere SGK ile protokol imzalamış özel sigorta şirketleri aracılığıyla sunulan bir üst güvencedir. TSS poliçeleri, çalışan tarafından bireysel ya da işveren aracılığıyla grup olarak satın alınabilir. SGK sistemiyle entegre çalıştığından poliçenin sunduğu teminat kapsamı önceden dikkatli incelenmelidir.',
  },
  {
    category: 'Genel Sağlık Sigortası', order: 63,
    question: 'Yurt dışındaki Türk vatandaşları GSS kapsamında mıdır?',
    answer: 'Türkiye\'de ikamet etmeyen ve yurt dışında çalışan Türk vatandaşları, GSS primlerini ödeme yükümlülüğünden muaf tutulabilir. Geçici olarak yurt dışında bulunanların (turizm, tedavi vb.) mevcut GSS güvenceleri genellikle yurt içindeyken geçerlidir. Yurt dışında sağlık hizmeti alınması durumunda bedelini SGK\'nın karşılayabilmesi için ikili sosyal güvenlik sözleşmesi bulunması veya önceden onay alınması gerekmektedir.',
  },
];

async function seedSSSData({ strapi }) {
  try {
    const existing = await strapi.entityService.findMany('api::sss.sss', {
      fields: ['order'],
      pagination: { pageSize: 500 },
    });
    const existingOrders = new Set((existing || []).map((e) => e.order));

    const toAdd = SSS_DATA.filter((item) => !existingOrders.has(item.order));

    if (toAdd.length === 0) {
      strapi.log.info(`SSS seed: tüm ${SSS_DATA.length} kayıt zaten mevcut, ekleme yapılmadı.`);
      return;
    }

    for (const item of toAdd) {
      await strapi.entityService.create('api::sss.sss', {
        data: { ...item, publishedAt: new Date() },
      });
    }
    strapi.log.info(`SSS seed: ${toAdd.length} yeni soru eklendi (toplam ${SSS_DATA.length}).`);
  } catch (err) {
    strapi.log.error(`SSS seed hatası: ${err.message}`);
  }
}

async function deduplicateSSSData({ strapi }) {
  try {
    const all = await strapi.db.query('api::sss.sss').findMany({
      select: ['id', 'order'],
      orderBy: { id: 'asc' },
      limit: -1,
    });

    strapi.log.info(`SSS dedup: veritabanında toplam ${(all || []).length} kayıt bulundu.`);

    const seen = new Map();
    const toDelete = [];

    for (const item of (all || [])) {
      const key = item.order != null ? item.order : `null_${item.id}`;
      if (seen.has(key)) {
        toDelete.push(item.id);
      } else {
        seen.set(key, item.id);
      }
    }

    if (toDelete.length === 0) {
      strapi.log.info('SSS dedup: tekrar eden kayıt yok.');
      return;
    }

    for (const id of toDelete) {
      await strapi.db.query('api::sss.sss').delete({ where: { id } });
    }
    strapi.log.info(`SSS dedup: ${toDelete.length} tekrar eden kayıt silindi.`);
  } catch (err) {
    strapi.log.error(`SSS dedup hatası: ${err.message}`);
  }
}

// Maaş hesaplama parametreleri single type'ı boşsa 2026 varsayılanlarıyla
// bir kere doldurur. Kayıt varsa dokunmaz (panelden değiştirilen değerler korunur).
async function seedMaasParametre({ strapi }) {
  try {
    const existing = await strapi.db
      .query('api::maas-parametre.maas-parametre')
      .findOne({});

    if (existing) {
      strapi.log.info('Maaş parametre seed: kayıt zaten mevcut, ekleme yapılmadı.');
      return;
    }

    await strapi.db.query('api::maas-parametre.maas-parametre').create({
      data: {
        yil: 2026,
        asgari_brut: 33030,
        sgk_tavan: 297270,
        dilim1_ust: 190000,
        dilim2_ust: 400000,
        dilim3_ust: 1500000,
        dilim4_ust: 5300000,
        engellilik1: 12000,
        engellilik2: 7000,
        engellilik3: 3000,
        isveren_sgk_yok: 0.2175,
        isveren_sgk_genel: 0.1975,
        isveren_sgk_imalat: 0.1675,
        publishedAt: new Date(),
      },
    });
    strapi.log.info('Maaş parametre seed: 2026 varsayılan değerleri eklendi.');
  } catch (err) {
    strapi.log.error(`Maaş parametre seed hatası: ${err.message}`);
  }
}

// Araç sayfalarının SEO içerikleri — koddaki mevcut içeriğin panelden
// düzenlenebilir kopyası. Yalnızca ilgili slug yoksa oluşturulur; var olan
// kayda dokunulmaz (panelden yapılan düzenlemeler korunur).
const ARAC_ICERIK_SEED = [
  {
    slug: 'brutten-nete-maas-hesaplama',
    ad: 'Brütten Nete / Netten Brüte Maaş',
    h1: 'Brütten Nete ve Netten Brüte Maaş Hesaplama (2026)',
    kart: 'Brüt maaştan net ele geçeni, net maaştan brütü ve işveren maliyetini 12 ay bazında hesaplayın.',
    meta_baslik: 'Brütten Nete Maaş Hesaplama 2026 | Netten Brüte & İşveren Maliyeti',
    meta_aciklama:
      '2026 güncel mevzuatına göre brütten nete ve netten brüte maaş hesaplama. SGK, gelir vergisi, damga vergisi kesintileri, asgari ücret istisnası ve işveren maliyeti 12 aylık tabloda.',
    keywords:
      'brütten nete maaş hesaplama, netten brüte maaş hesaplama, 2026 maaş hesaplama, net maaş hesaplama, işveren maliyeti hesaplama, bordro hesaplama',
    icerik:
      '**Brütten nete maaş hesaplama** aracı, brüt ücretinizi girerek elinize geçecek net maaşı; **netten brüte** modu ise hedeflediğiniz net maaşa karşılık gelen brüt ücreti bulmanızı sağlar. Hesaplama 2026 güncel mevzuatına göre yapılır; SGK işçi payı (%14), işsizlik payı (%1), kümülatif gelir vergisi dilimleri, asgari ücret gelir vergisi istisnası ve damga vergisi dikkate alınır.\n\nAracın en güçlü yanı 12 aylık hesaplama yapmasıdır. Gelir vergisi kümülatif matrah üzerinden hesaplandığından, brüt sabit kalsa bile net ücret yıl içinde dilim atladıkça düşebilir. Araç bu değişimi ay ay tabloda gösterir, işveren maliyetini (teşvik seçenekli) ve tüm bordro kırılımlarını sunar; sonuçları Excel’e aktarabilirsiniz.',
    sss: [
      {
        soru: 'Brütten nete maaş nasıl hesaplanır?',
        cevap:
          'Brüt ücretten önce %15 SGK ve işsizlik işçi payı (%14 SGK + %1 işsizlik) düşülür. Kalan tutar gelir vergisi matrahını oluşturur; bu matraha kümülatif gelir vergisi dilimleri uygulanır ve asgari ücret gelir vergisi istisnası düşülür. Son olarak damga vergisi (asgari ücrete isabet eden kısmı istisna) çıkarılır. Geriye kalan tutar net ele geçen maaştır.',
      },
      {
        soru: 'Aynı maaşta net ücret neden yıl içinde düşüyor?',
        cevap:
          'Gelir vergisi yıl boyunca biriken kümülatif matrah üzerinden hesaplanır. Matrah arttıkça çalışan bir üst gelir vergisi dilimine geçer (%15’ten %20’ye, sonra %27’ye…). Bu nedenle brüt sabit olsa bile ilerleyen aylarda gelir vergisi artar ve net maaş bir miktar düşer.',
      },
      {
        soru: 'İşveren maliyeti nasıl hesaplanır?',
        cevap:
          'Toplam işveren maliyeti; brüt ücrete işveren SGK primi ve işveren işsizlik priminin eklenmesiyle bulunur. Teşvik yoksa toplam yük yaklaşık %23,75, genel 5510 teşvikinde %21,75, imalat sektöründe %18,75 seviyesindedir.',
      },
    ],
  },
  {
    slug: 'kidem-tazminati-hesaplama',
    ad: 'Kıdem Tazminatı',
    h1: 'Kıdem Tazminatı Hesaplama (2026)',
    kart: 'Çalışma sürenize ve brüt maaşınıza göre kıdem tazminatınızı tavan uygulamasıyla hesaplayın.',
    meta_baslik: 'Kıdem Tazminatı Hesaplama 2026 | Güncel Tavan ile',
    meta_aciklama:
      'Kıdem tazminatı hesaplama aracı: brüt maaş ve çalışma sürenizi girin, güncel kıdem tazminatı tavanı uygulanarak tahmini tutarı anında görün.',
    keywords:
      'kıdem tazminatı hesaplama, kıdem tazminatı nasıl hesaplanır, 2026 kıdem tazminatı tavanı, kıdem tazminatı ne kadar',
    icerik:
      '**Kıdem tazminatı**, iş sözleşmesi belirli koşullarla sona eren ve aynı işverende en az 1 yıl çalışmış işçiye ödenen bir tazminattır. Çalışanın her tam hizmet yılı için 30 günlük giydirilmiş brüt ücreti tutarında hesaplanır; bir yıldan artan süreler oranlanır. Ödenecek yıllık tutar, yasal **kıdem tazminatı tavanını** aşamaz.\n\n**Kıdem tazminatı hesaplama** aracımızla brüt aylık ücretinizi ve çalışma sürenizi (yıl ve ay) girerek tahmini kıdem tazminatınızı anında görebilirsiniz. Güncel tavan otomatik uygulanır; brütünüz tavanı aşarsa hesaplamada bu durum belirtilir.',
    sss: [
      {
        soru: 'Kıdem tazminatı nasıl hesaplanır?',
        cevap:
          'Her tam hizmet yılı için 30 günlük giydirilmiş brüt ücret esas alınır; yıldan artan süreler oranlanır. Hesaplanan tutar dönemin yasal kıdem tazminatı tavanını aşamaz. Kıdem tazminatına hak kazanmak için aynı işverende en az 1 yıl çalışmış olmak gerekir.',
      },
      {
        soru: '2026 kıdem tazminatı tavanı ne kadar?',
        cevap:
          'Kıdem tazminatı tavanı her yıl ocak ve temmuz aylarında memur maaş katsayılarına göre güncellenir. Bir çalışanın yıllık kıdem tazminatı o dönem geçerli tavanı aşamaz. Aracımız güncel tavanı otomatik uygular ve hesaplama ekranında gösterir.',
      },
      {
        soru: 'Kıdem tazminatı kimlere ödenir?',
        cevap:
          'Aynı işverende en az 1 yıl çalışan işçiye; işveren tarafından haklı neden dışında fesih, işçinin haklı nedenle feshi, askerlik, emeklilik, evlilik (kadın işçi için 1 yıl içinde) ve ölüm gibi durumlarda kıdem tazminatı ödenir.',
      },
    ],
  },
  {
    slug: 'ihbar-tazminati-hesaplama',
    ad: 'İhbar Tazminatı',
    h1: 'İhbar Tazminatı Hesaplama (2026)',
    kart: 'Kıdeminize göre bildirim sürenizi ve ihbar tazminatı tutarını hesaplayın.',
    meta_baslik: 'İhbar Tazminatı Hesaplama 2026 | Bildirim Süresi ve Tutar',
    meta_aciklama:
      'İhbar tazminatı hesaplama aracı: çalışma sürenize göre bildirim süresini (2–8 hafta) ve brüt ücret üzerinden ihbar tazminatı tutarını hesaplayın.',
    keywords:
      'ihbar tazminatı hesaplama, ihbar tazminatı kaç gün, ihbar süresi hesaplama, ihbar tazminatı nasıl hesaplanır',
    icerik:
      '**İhbar tazminatı**, iş sözleşmesini yasal bildirim süresine uymadan fesheden tarafın karşı tarafa ödediği tazminattır. Bildirim süresi çalışma kıdemine göre değişir: 6 aydan az için 2 hafta, 6 ay–1,5 yıl için 4 hafta, 1,5–3 yıl için 6 hafta, 3 yıldan fazla için 8 haftalık brüt ücret.\n\n**İhbar tazminatı hesaplama** aracıyla brüt aylık ücretinizi ve çalışma sürenizi girerek uygulanacak bildirim süresini ve ödenecek/alacak tutarı kolayca öğrenebilirsiniz.',
    sss: [
      {
        soru: 'İhbar tazminatı kaç gün / kaç hafta olur?',
        cevap:
          'Çalışma süresine bağlıdır: 6 aydan az için 2 hafta, 6 ay–1,5 yıl için 4 hafta, 1,5–3 yıl için 6 hafta, 3 yıldan fazla için 8 haftalık brüt ücret tutarındadır.',
      },
      {
        soru: 'İhbar tazminatını kim öder?',
        cevap:
          'Bildirim süresine uymadan iş sözleşmesini fesheden taraf (işveren ya da işçi) karşı tarafa ihbar tazminatı öder. Yani hem işçi hem işveren duruma göre ihbar tazminatı ödeyebilir.',
      },
      {
        soru: 'İhbar tazminatı ile kıdem tazminatı aynı mı?',
        cevap:
          'Hayır. Kıdem tazminatı çalışma yılına göre 30 günlük ücret esasına dayanır ve tavan uygulanır. İhbar tazminatı ise bildirim süresine uyulmamasının karşılığıdır ve tavan uygulanmaz.',
      },
    ],
  },
  {
    slug: 'fazla-mesai-hesaplama',
    ad: 'Fazla Mesai',
    h1: 'Fazla Mesai Ücreti Hesaplama (2026)',
    kart: 'Brüt maaşınıza göre %50 zamlı fazla mesai saat ücretinizi ve toplam tutarı hesaplayın.',
    meta_baslik: 'Fazla Mesai Hesaplama 2026 | %50 Zamlı Saat Ücreti',
    meta_aciklama:
      'Fazla mesai hesaplama aracı: brüt maaş ve fazla çalışılan saati girin, %50 zamlı fazla mesai saat ücretini ve toplam fazla mesai ücretini hesaplayın.',
    keywords:
      'fazla mesai hesaplama, fazla mesai ücreti nasıl hesaplanır, fazla mesai saat ücreti, mesai ücreti hesaplama',
    icerik:
      'Haftalık 45 saati aşan çalışmalar **fazla mesai** sayılır ve her fazla mesai saati için normal saatlik ücretin %50 fazlası ödenir. Saatlik ücret, aylık brüt ücretin 225’e bölünmesiyle (30 gün × 7,5 saat) bulunur; yıllık fazla çalışma sınırı 270 saattir. **Fazla mesai hesaplama** aracıyla brüt ücretinizi ve fazla çalıştığınız saati girerek hak ettiğiniz ücreti hesaplayabilirsiniz.',
    sss: [
      {
        soru: 'Fazla mesai ücreti nasıl hesaplanır?',
        cevap:
          'Saatlik ücret aylık brüt ücretin 225’e bölünmesiyle bulunur. Her fazla mesai saati için bu ücretin %50 fazlası (1,5 katı) ödenir. Toplam fazla mesai ücreti = saatlik ücret × 1,5 × fazla mesai saati.',
      },
      {
        soru: 'Yılda en fazla kaç saat fazla mesai yapılabilir?',
        cevap:
          'İş Kanunu’na göre fazla çalışma süresi yılda 270 saati aşamaz. Ayrıca fazla mesai için işçinin yazılı onayı gerekir.',
      },
    ],
  },
  {
    slug: 'maas-zammi-hesaplama',
    ad: 'Maaş Zammı',
    h1: 'Maaş Zammı Hesaplama (2026)',
    kart: 'Zam oranını girin, zam sonrası brüt ve tahmini net maaşınızı görün.',
    meta_baslik: 'Maaş Zammı Hesaplama 2026 | Zam Sonrası Net Maaş',
    meta_aciklama:
      'Maaş zammı hesaplama aracı: mevcut brüt maaş ve zam oranını girin, zam sonrası brüt ve tahmini net maaşınızı hemen hesaplayın.',
    keywords:
      'maaş zammı hesaplama, zam sonrası maaş hesaplama, yüzde zam hesaplama, maaş artışı hesaplama',
    icerik:
      '**Maaş zammı hesaplama** aracı, mevcut brüt maaşınıza uygulanan zam oranını girerek zam sonrası brüt maaşı ve tahmini net maaşınızı gösterir. Böylece yüzdesel zammın net ücretinize gerçek yansımasını (SGK ve gelir vergisi kesintileri sonrası) önceden görebilirsiniz.',
    sss: [
      {
        soru: 'Zam sonrası net maaş nasıl hesaplanır?',
        cevap:
          'Önce yeni brüt maaş bulunur (mevcut brüt × (1 + zam oranı)). Ardından bu brüt üzerinden SGK, gelir vergisi ve damga vergisi kesintileri düşülerek tahmini net maaş hesaplanır. Net artış, brüt artıştan daha düşük olabilir çünkü kesintiler de artar.',
      },
    ],
  },
  {
    slug: 'yillik-izin-hesaplama',
    ad: 'Yıllık İzin',
    h1: 'Yıllık İzin Hesaplama (2026)',
    kart: 'İşe başlama tarihinize göre yıllık ücretli izin hakkınızı ve kalan izninizi hesaplayın.',
    meta_baslik: 'Yıllık İzin Hesaplama 2026 | İzin Hakkı Gün Sayısı',
    meta_aciklama:
      'Yıllık izin hesaplama aracı: işe başlama tarihinizi girin, kıdeminize göre yıllık ücretli izin hakkınızı (14–26 gün) ve kalan izninizi öğrenin.',
    keywords:
      'yıllık izin hesaplama, yıllık izin hakkı kaç gün, izin günü hesaplama, yıllık ücretli izin',
    icerik:
      '**Yıllık ücretli izin** hakkı, 1 yılını dolduran çalışanın kıdemine göre belirlenir: 1–5 yıl için 14, 5–15 yıl için 20, 15 yıl ve üzeri için 26 iş günü. 18 yaşından küçük ve 50 yaşından büyük çalışanlara kıdemine bakılmaksızın en az 20 iş günü izin verilir. **Yıllık izin hesaplama** aracıyla işe başlama tarihinizi girerek hak ettiğiniz ve kalan izin gününüzü öğrenebilirsiniz.',
    sss: [
      {
        soru: 'Yıllık ücretli izin hakkı kaç gündür?',
        cevap:
          '1–5 yıl kıdem için 14 iş günü, 5–15 yıl için 20 iş günü, 15 yıl ve üzeri için 26 iş günüdür. 18 yaş altı ve 50 yaş üstü çalışanlara en az 20 iş günü izin verilir.',
      },
      {
        soru: 'Yıllık izne ne zaman hak kazanılır?',
        cevap:
          'Çalışan, işe başladığı tarihten itibaren en az 1 yıl çalışmasını tamamladığında yıllık ücretli izne hak kazanır. İlk yıl dolmadan yasal yıllık izin hakkı doğmaz.',
      },
    ],
  },
];

async function seedAracIcerik({ strapi }) {
  try {
    let eklenen = 0;
    for (const item of ARAC_ICERIK_SEED) {
      const mevcut = await strapi.db
        .query('api::arac-icerik.arac-icerik')
        .findOne({ where: { slug: item.slug } });
      if (mevcut) continue;

      await strapi.entityService.create('api::arac-icerik.arac-icerik', {
        data: { ...item, publishedAt: new Date() },
      });
      eklenen += 1;
    }
    if (eklenen > 0) {
      strapi.log.info(`Araç içeriği seed: ${eklenen} araç sayfası eklendi.`);
    } else {
      strapi.log.info('Araç içeriği seed: tüm kayıtlar mevcut, ekleme yapılmadı.');
    }
  } catch (err) {
    strapi.log.error(`Araç içeriği seed hatası: ${err.message}`);
  }
}

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    await setPublicPermissions({ strapi });
    await setupIkModules({ strapi });
    await backfillDuyuruSlugs({ strapi });
    await ensureServerApiToken({ strapi });
    await deduplicateSSSData({ strapi });
    await seedSSSData({ strapi });
    await seedMaasParametre({ strapi });
    await seedAracIcerik({ strapi });
  },
};
