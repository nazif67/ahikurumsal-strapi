module.exports = {
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
  },
  rateLimit: {
    enabled: true,
    interval: 60000, // 1 dakika
    max: 1000, // Dakikada maksimum 1000 istek (önceden çok düşüktü)
    delayAfter: 500, // 500 istekten sonra gecikme ekle
    timeWait: 0, // Gecikme süresi 0 ms
    prefixKey: 'api', // Rate limit key prefix
    whitelist: [], // Rate limit'ten muaf IP'ler
    store: {
      prefix: 'rate_limit',
      options: {
        // Redis veya memory store ayarları
      },
    },
  },
};
