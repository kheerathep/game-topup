const fs = require('fs');
const https = require('https');
const path = require('path');

const urls = [
  { name: '1_buy_games.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzYyMjMwYTNkYWEyYzRiZDM4ZjIyYTE2M2ZkNTE3YjQ2EgsSBxDmsN34iBwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0MjM2Mjg0MTE1OTA3NDExMg&filename=&opi=89354086' },
  { name: '2_secure_checkout.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzJhZDNiOGNmMGFhODQxM2NhZThjMGU2ZDVmYTRlMzMyEgsSBxDmsN34iBwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0MjM2Mjg0MTE1OTA3NDExMg&filename=&opi=89354086' },
  { name: '3_item_detail.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzFhYTRkOGFmMGZkZTQzMzI5ZjU4N2NmMWU5YzAwOTllEgsSBxDmsN34iBwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0MjM2Mjg0MTE1OTA3NDExMg&filename=&opi=89354086' },
  { name: '4_game_topup.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzUyZTk5ZWZmMWRkNjQyNWJhMTcxN2FiMjQ4N2MxNDNhEgsSBxDmsN34iBwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0MjM2Mjg0MTE1OTA3NDExMg&filename=&opi=89354086' },
  { name: '5_marketplace_home.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzE0MzVlZDc2NmMzYjRkMTA5ZmJkOTJjNjA0MjkwZGM1EgsSBxDmsN34iBwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0MjM2Mjg0MTE1OTA3NDExMg&filename=&opi=89354086' },
  { name: '6_item_listing.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzRhZGFiMjU3NDQwNzRlY2M5MTk1YjBjYzUwMGVkNTY5EgsSBxDmsN34iBwYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0MjM2Mjg0MTE1OTA3NDExMg&filename=&opi=89354086' },
];

if (!fs.existsSync('.scratch')) fs.mkdirSync('.scratch');
if (!fs.existsSync('.scratch/stitch')) fs.mkdirSync('.scratch/stitch');

urls.forEach(item => {
  const dest = path.join('.scratch', 'stitch', item.name);
  https.get(item.url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
       fs.writeFileSync(dest, data);
       console.log('Downloaded', item.name);
    });
  }).on('error', err => console.error(err));
});
