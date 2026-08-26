/* eslint-disable @typescript-eslint/no-require-imports -- legacy CJS script, executed directly with node */
const fs = require('fs');
const path = require('path');

const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Png, 'base64');

const dir = path.join(__dirname, '../public/custom');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('Created public/custom directory');
}

const files = [
  'jenis.png',
  'finishing.png',
  'strap.png',
  'ukuran.png',
  'motif-busa.png',
  'bahan.png',
  'aksesoris.png'
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  fs.writeFileSync(filePath, buffer);
  console.log(`Created placeholder: ${filePath}`);
});

console.log('All placeholders created successfully.');
