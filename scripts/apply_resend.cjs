const fs = require('fs');
const path = require('path');

const apiKey = 're_GqGbrzoo_DKfnUEBFnqipy7VCcz1Pn5DS';

// 1. Update server/.env
const envPath = path.join(__dirname, '..', 'server', '.env');
if (fs.existsSync(envPath)) {
  let env = fs.readFileSync(envPath, 'utf8');
  if (env.includes('RESEND_API_KEY')) {
    env = env.replace(/RESEND_API_KEY=.*/g, `RESEND_API_KEY="${apiKey}"`);
  } else {
    env += `\nRESEND_API_KEY="${apiKey}"\nRESEND_FROM="LogicQ Arena <onboarding@resend.dev>"\nMAIL_PROVIDER="resend"\n`;
  }
  fs.writeFileSync(envPath, env, 'utf8');
  console.log('Updated server/.env');
}

// 2. Update server/src/config/env.ts
const configEnvPath = path.join(__dirname, '..', 'server', 'src', 'config', 'env.ts');
let configContent = fs.readFileSync(configEnvPath, 'utf8');
if (!configContent.includes('RESEND_API_KEY')) {
  configContent = configContent.replace(
    '  // Mail\n',
    `  // Mail\n  RESEND_API_KEY: process.env.RESEND_API_KEY || '${apiKey}',\n  RESEND_FROM: process.env.RESEND_FROM || 'LogicQ Arena <onboarding@resend.dev>',\n`
  ).replace(
    '  // Mail\r\n',
    `  // Mail\r\n  RESEND_API_KEY: process.env.RESEND_API_KEY || '${apiKey}',\r\n  RESEND_FROM: process.env.RESEND_FROM || 'LogicQ Arena <onboarding@resend.dev>',\r\n`
  );
  fs.writeFileSync(configEnvPath, configContent, 'utf8');
  console.log('Updated server/src/config/env.ts');
}

// 3. Verify server/src/services/mail.service.ts defaults
const mailServicePath = path.join(__dirname, '..', 'server', 'src', 'services', 'mail.service.ts');
let mailContent = fs.readFileSync(mailServicePath, 'utf8');
mailContent = mailContent.replace(
  "const resendApiKey = process.env.RESEND_API_KEY || (ENV as any).RESEND_API_KEY;",
  `const resendApiKey = process.env.RESEND_API_KEY || (ENV as any).RESEND_API_KEY || '${apiKey}';`
);
fs.writeFileSync(mailServicePath, mailContent, 'utf8');
console.log('Updated server/src/services/mail.service.ts');

console.log('All Resend configurations applied successfully.');
