/**
 * Download Stitch HTML for auth screens (same project as fetch.cjs).
 * If you get 404, open Stitch → screen → Export → copy the hosted download URL
 * and paste it below in OVERRIDES, or set STITCH_LOGIN_URL / STITCH_REGISTER_URL.
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const TEMPLATE =
  'CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzYyMjMwYTNkYWEyYzRiZDM4ZjIyYTE2M2ZkNTE3YjQ2EgsSBxDmsN34iBwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0MjM2Mjg0MTE1OTA3NDExMg';
const PLACEHOLDER_HTML_ID = 'html_62230a3daa2c4bd38f22a163fd517b46';

/** Login Page (v3) — screen id de091e728aec4475a9a290f75c85e697 */
const LOGIN_HTML_ID = 'html_de091e728aec4475a9a290f75c85e697';
/** Registration Page (v3) — screen id 528f9b98ee1e4bc18ca9f865b6d0d5c0 */
const REGISTER_HTML_ID = 'html_528f9b98ee1e4bc18ca9f865b6d0d5c0';

const OVERRIDES = {
  login: process.env.STITCH_LOGIN_URL || '',
  register: process.env.STITCH_REGISTER_URL || '',
};

function buildContributionUrl(htmlId) {
  const buf = Buffer.from(TEMPLATE, 'base64');
  const s = buf.toString('latin1');
  const nb = Buffer.from(s.split(PLACEHOLDER_HTML_ID).join(htmlId), 'latin1');
  const c = encodeURIComponent(nb.toString('base64'));
  return `https://contribution.usercontent.google.com/download?c=${c}&filename=&opi=89354086`;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url.slice(0, 80)}…`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync('.scratch')) fs.mkdirSync('.scratch');
  if (!fs.existsSync('.scratch/stitch')) fs.mkdirSync('.scratch/stitch', { recursive: true });

  const tasks = [
    {
      name: '7_login_page_v3.html',
      built: buildContributionUrl(LOGIN_HTML_ID),
      override: OVERRIDES.login,
    },
    {
      name: '8_registration_page_v3.html',
      built: buildContributionUrl(REGISTER_HTML_ID),
      override: OVERRIDES.register,
    },
  ];

  for (const t of tasks) {
    const dest = path.join('.scratch', 'stitch', t.name);
    const url = t.override || t.built;
    process.stdout.write(`Fetching ${t.name}… `);
    try {
      await download(url, dest);
      const st = fs.statSync(dest);
      console.log(`ok (${st.size} bytes)`);
    } catch (e) {
      console.log('failed:', e.message);
      console.log('  Fallback URL (protobuf):', t.built);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
