const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));

const headersList = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()'
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups'
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'credentialless'
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' https://apis.google.com https://accounts.google.com; worker-src 'self' blob:; manifest-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://accounts.google.com https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.onrender.com https://api.resend.com; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'self';"
  }
];

config.hosting.headers[0].headers = headersList;

fs.writeFileSync('firebase.json', JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log('firebase.json updated successfully with strict A+ security headers!');
