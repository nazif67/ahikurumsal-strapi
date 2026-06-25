export const dynamic = 'force-dynamic';
import Image from "next/image";
import Link from "next/link";
import Footer from "./componants/footer";
import Navbar from "./componants/navbar";
import ScrollTop from "./componants/scrollTop";
import HeroTabs from "./componants/heroTabs";

import { FiClock, FiMapPin } from "./assets/icons/vander";

export async function generateMetadata() {
    return {
        title: 'AHİ-İK 360 | Modern İnsan Kaynakları Platformu',
        description: 'Çalışan yaşam döngüsünü dijitalleştiren, hız optimizasyonu yapılmış AHİ-İK 360 ile İK süreçlerinizi tek ekrandan yönetin.',
        keywords: 'dijital ik, insan kaynakları yazılımı, izin yönetimi, görev yönetimi, şube yönetimi, departman yönetimi',
        robots: 'index, follow',
        openGraph: {
            title: 'AHİ-İK 360 | Modern İnsan Kaynakları Platformu',
            description: 'Çalışan yaşam döngüsünü dijitalleştiren, hız optimizasyonu yapılmış AHİ-İK 360 ile İK süreçlerinizi tek ekrandan yönetin.',
            type: 'website',
            locale: 'tr_TR',
        },
    };
}

const moduleHighlights = [
    {
        title: 'Dijital İK Merkezi',
        description: 'Çalışan yaşam döngüsünü uçtan uca planlayın. İşe alımdan ayrışa kadar her adım tek kronolojide.',
        image: '/images/hero/bg4.jpg',
    },
    {
        title: 'Çalışanlar',
        description: 'Ekibinizi kart görünümleriyle izleyin. Rol, yetkinlik ve hedefleri birlikte görün.',
        image: '/images/team/02.jpg',
    },
    {
        title: 'İşten Ayrılanlar',
        description: 'Ayrılış süreçlerini standartlaştırın. Devir teslim listeleri ve bilgi paylaşım notları kaybolmasın.',
        image: '/images/work/04.jpg',
    },
    {
        title: 'İzin Takip Sistemi',
        description: 'İzin hakedişleri otomatik hesaplanır. Onay akışlarını şeffaf biçimde tüm ekip takip eder.',
        image: '/images/work/03.jpg',
    },
    {
        title: 'Görev Yönetimi',
        description: 'Takımlara göre görev havuzları oluşturun. İlerleyişi durum etiketleriyle izleyin.',
        image: '/images/work/01.jpg',
    },
    {
        title: 'Şubelerim & Departmanlarım',
        description: 'Çok lokasyonlu yapılarda bile veriyi filtreleyin. Şube skor kartlarıyla performansı kıyaslayın.',
        image: '/images/work/06.jpg',
    },
];

const experienceHighlights = [
    {
        title: 'Sürükleyici Dashboard',
        description: 'Yalın tipografi ve geniş boşluklar sayesinde kritik metrikler ilk bakışta anlaşılır.',
    },
    {
        title: 'Tepkisel Tasarım',
        description: 'Laptop, tablet ve mobilde aynı deneyim. Hafif grid sistemi ile hızlı yüklenir.',
    },
    {
        title: 'Yapılandırılabilir Akışlar',
        description: 'Departman bazlı izin akışları, görev şablonları ve onay kurguları birkaç adımda hazır.',
    },
];

const promiseStats = [
    { label: 'İşten Çıkış Süreçlerinde Tasarruf', value: '%58' },
    { label: 'İzin Onay Yanıt Süresi', value: '3 saat' },
    { label: 'Aktif Kullanıcı Memnuniyeti', value: '%94' },
];

export default function Index() {
    return (
        <>
            <Navbar navClass="defaultscroll sticky" navLight={true}/>

            <main>
                <section
                    className="py-5 py-lg-5 position-relative overflow-hidden text-white"
                    style={{
                        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #312E81 100%)',
                    }}
                >
                    <div className="container">
                        <div className="row align-items-center justify-content-between g-5">
                            <div className="col-lg-6">
                                <div className="mb-4">
                                    <span className="badge bg-light text-dark rounded-pill px-4 py-2">
                                        Yeni Nesil Bulut Tabanlı İK Platformu
                                    </span>
                                </div>
                                <h1 className="display-5 fw-semibold mb-4">
                                    AHİ-İK 360 ile çalışan deneyimini 360° yönetin.
                                </h1>
                                <p className="fs-5 text-white-50 mb-4">
                                    Dijital İK, çalışan yönetimi, izin takip sistemi, görev yönetimi ve şube-departman
                                    ağınızı tek ekranda birleştirin. Performansı düşürmeden hızlanın.
                                </p>
                                <div className="d-flex flex-wrap gap-3">
                                    <Link href="/demo" className="btn btn-light btn-lg px-4">
                                        Hemen Deneyimleyin
                                    </Link>
                                    <Link href="/fiyatlandirma" className="btn btn-outline-light btn-lg px-4">
                                        Planları Keşfedin
                                    </Link>
                                </div>
                            </div>
                            <div className="col-lg-5">
                                <div className="bg-white rounded-4 shadow-lg p-3 p-lg-4">
                                    <Image
                                        src="/images/hero1.png"
                                        width={520}
                                        height={380}
                                        className="img-fluid rounded-3"
                                        alt="AHİ-İK 360 arayüz önizlemesi"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section bg-white">
                    <div className="container">
                        <div className="row justify-content-between align-items-end mb-5">
                            <div className="col-lg-7">
                                <h2 className="fw-semibold mb-3">Her modül kaydırdığınızda farklı bir hikâye anlatır</h2>
                                <p className="text-muted mb-0">
                                    Apple benzeri sade blok yapısı ve güçlü tipografi ile her bölümde yeni bir görsel
                                    ve senaryo karşınıza çıkar. Animasyon yok; hız odaklı, net deneyim.
                                </p>
                            </div>
                            <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                                <Link href="/insan-kaynaklari" className="btn btn-primary px-4">
                                    Modülleri İncele
                                </Link>
                            </div>
                        </div>

                        <div className="row g-4">
                            {moduleHighlights.map((item) => (
                                <div key={item.title} className="col-md-6 col-xl-4">
                                    <div className="card h-100 border-0 shadow-sm">
                                        <div className="position-relative">
                                            <Image
                                                src={item.image}
                                                alt={item.title}
                                                width={560}
                                                height={360}
                                                className="card-img-top rounded-top"
                                            />
                                        </div>
                                        <div className="card-body">
                                            <h5 className="fw-semibold mb-2">{item.title}</h5>
                                            <p className="text-muted mb-0">{item.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="section" style={{ backgroundColor: '#f5f7fb' }}>
                    <div className="container">
                        <div className="row align-items-center g-5">
                            <div className="col-lg-6">
                                <div className="rounded-4 overflow-hidden bg-white shadow-sm p-3">
                                    <Image
                                        src="/images/hero/bg5.jpg"
                                        alt="Mobil ve masaüstü deneyimi"
                                        width={640}
                                        height={420}
                                        className="img-fluid rounded-3"
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6">
                                <span className="text-uppercase text-primary fw-semibold">Kullanıcı Deneyimi</span>
                                <h2 className="fw-semibold mt-3 mb-4">
                                    Her ekran net, odaklı ve yükleme süresi 1 saniyenin altında kalacak şekilde optimize edildi.
                                </h2>
                                <p className="text-muted mb-4">
                                    Aposkal ve Apple örneklerinde olduğu gibi gereksiz animasyonlar yok. Net kontrast, büyük tipografi
                                    ve modüler ızgara yapısı sayesinde bölümler arasında kayarken yeni görsellerle tanışırsınız.
                                </p>
                                <div className="row g-4">
                                    {experienceHighlights.map((item) => (
                                        <div key={item.title} className="col-sm-6">
                                            <div className="h-100">
                                                <h5 className="fw-semibold mb-2">{item.title}</h5>
                                                <p className="text-muted mb-0">{item.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section bg-white">
                    <div className="container">
                        <div className="row justify-content-center mb-5">
                            <div className="col-lg-8 text-center">
                                <h2 className="fw-semibold mb-3">İK ekibinizin her sorusu için hazır panolar</h2>
                                <p className="text-muted mb-0">
                                    Dijital bordro upload’larından, çıkış görüşme notlarına kadar her şey bulut üzerinde tutulur.
                                    Şube ve departman sekmelerine tek tıkla geçerek filtreleyin, raporları XLSX olarak dışa aktarın.
                                </p>
                            </div>
                        </div>

                        <div className="row g-4">
                            {promiseStats.map((item) => (
                                <div key={item.label} className="col-md-4">
                                    <div className="bg-dark text-white rounded-4 p-4 p-lg-5 h-100 d-flex flex-column justify-content-between">
                                        <h3 className="display-6 fw-semibold mb-3">{item.value}</h3>
                                        <p className="mb-0 text-white-50">{item.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="section" style={{ backgroundColor: '#0f172a' }}>
                    <div className="container">
                        <div className="row align-items-center g-5 text-white">
                            <div className="col-lg-6">
                                <h2 className="fw-semibold mb-3">Kaynaklarınızı büyütürken hızdan ödün vermeyin</h2>
                                <p className="text-white-50 mb-4">
                                    AHİ-İK 360, Next.js altyapısı ve optimize görselleriyle yüksek hız puanları verir.
                                    Dinamik bileşenler yerine yalın içerik blokları kullanarak sayfalarınızın açılış süresini düşük tutar.
                                </p>
                                <ul className="list-unstyled text-white-50 mb-4">
                                    <li className="mb-2">•  WebP ve optimize JPEG görsellerle hızlı yükleme</li>
                                    <li className="mb-2">•  Lazy-loading yerine kritik içerikler önceden çizilir</li>
                                    <li className="mb-2">•  Sunucu tarafı render ile SEO ve performans birlikte ilerler</li>
                                </ul>
                                <Link href="/iletisim" className="btn btn-light px-4">
                                    İK Ekibinizle Tanıştırın
                                </Link>
                            </div>
                            <div className="col-lg-6">
                                <div className="bg-dark rounded-4 p-4 shadow-lg">
                                    <Image
                                        src="/images/work/05.jpg"
                                        alt="Performans raporu ekranı"
                                        width={640}
                                        height={420}
                                        className="img-fluid rounded-3"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section bg-white">
                    <div className="container">
                        <div className="row justify-content-center text-center">
                            <div className="col-lg-8">
                                <h2 className="fw-semibold mb-3">Tüm modülleri kaydırarak deneyimleyin</h2>
                                <p className="text-muted mb-4">
                                    Çalışanlar, işten ayrılanlar, izin takip sistemi, görev yönetimi, şubelerim, departmanlarım...
                                    Hepsi modern bir hikâye akışıyla ziyaretçilere tanıtılır.
                                </p>
                                <div className="d-flex flex-wrap justify-content-center gap-3">
                                    <Link href="/demo" className="btn btn-primary px-4">
                                        Canlı Demo Talep Et
                                    </Link>
                                    <Link href="/hakkimizda" className="btn btn-outline-secondary px-4">
                                        Neden AHİ-İK 360?
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer/>
            <ScrollTop/>
        </>
    );
}
