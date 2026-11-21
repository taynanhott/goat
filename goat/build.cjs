const fs = require('node:fs');
const path = require('node:path');
const { Script } = require('node:vm');
const root = __dirname;
const source = path.join(root, 'src');
const output = path.join(root, 'dist');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  });
}

const html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.{1,2}\/[^"#]+)"/g)) {
  const target = path.resolve(source, match[1]);
  const location = path.relative(root, target);
  if (location.startsWith('..') || path.isAbsolute(location) || !fs.existsSync(target)) {
    throw Error('Recurso inválido: ' + match[1]);
  }
}

for (const directory of [source, path.join(root, 'assets')]) {
  for (const file of files(directory).filter(file => file.endsWith('.js'))) {
    new Script(fs.readFileSync(file, 'utf8'), { filename: file });
  }
}

if (process.argv.includes('--check')) {
  console.log('JavaScript e referências dos arquivos separados válidos.');
} else {
  if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
    throw Error('Diretório de saída inválido.');
  }
  fs.rmSync(output, { recursive: true, force: true });
  fs.cpSync(source, output, { recursive: true });
  fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(output, 'index.html'), html.replaceAll('../assets/', './assets/'));
  fs.writeFileSync(path.join(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
  for (const file of files(output)) {
    if (fs.statSync(file).size > 25 * 1024 * 1024) throw Error('Arquivo excede 25 MiB: ' + file);
  }
  console.log('Versão web preparada em goat/dist, com recursos separados.');
}
