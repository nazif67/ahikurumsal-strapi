module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'https://ahikurumsal.com',
        'https://www.ahikurumsal.com',
        'https://admin.ahikurumsal.com',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '3mb', // Maksimum form boyutu
      jsonLimit: '3mb', // Maksimum JSON boyutu
      textLimit: '3mb', // Maksimum text boyutu
      formidable: {
        maxFileSize: 3 * 1024 * 1024, // 3MB in bytes
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
