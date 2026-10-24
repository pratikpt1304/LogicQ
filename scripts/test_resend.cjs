const { Resend } = require('../server/node_modules/resend');

const apiKey = 're_GqGbrzoo_DKfnUEBFnqipy7VCcz1Pn5DS';
const resend = new Resend(apiKey);

async function run() {
  console.log('Sending test email via Resend to thoratpratik2323@gmail.com...');
  const res = await resend.emails.send({
    from: 'LogicQ Arena <onboarding@resend.dev>',
    to: ['thoratpratik2323@gmail.com'],
    subject: '[LogicQ] Your Institutional Verification Code: 582194',
    html: '<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;"><h2 style="color: #06b6d4;">LogicQ Institutional Sign In</h2><p>Your 6-digit verification code is:</p><div style="background: #f1f5f9; padding: 15px; font-size: 26px; font-weight: bold; letter-spacing: 6px; color: #0f172a; border-radius: 8px; margin: 20px 0; text-align: center;">582194</div><p style="font-size: 13px; color: #64748b;">Valid for 10 minutes. Delivered via Resend HTTPS (Port 443).</p></div>'
  });
  console.log('Resend Response:', JSON.stringify(res, null, 2));
}

run().catch(console.error);
