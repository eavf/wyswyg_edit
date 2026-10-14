// Náhrada za ngx-build-plus "singleBundle": application builder (esbuild) generuje ES moduly,
// tento krok ich prebalí na klasické skripty (IIFE), aby sa dali vložiť cez <script src>
// bez type="module" a nekolidovali s inými skriptmi na stránke.
// Použitie: node scripts/iife.mjs <výstupný priečinok>
import { build } from 'esbuild';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error(`iife: priečinok "${dir}" neexistuje`);
  process.exit(1);
}

// Lazy chunky by v jednom klasickom skripte nefungovali — radšej zlyhať, ako vydať rozbitý bundle.
const chunks = readdirSync(dir).filter(f => /^chunk-.*\.js$/.test(f));
if (chunks.length) {
  console.error(`iife: výstup obsahuje chunky (${chunks.join(', ')}), nedá sa zabaliť do jedného súboru`);
  process.exit(1);
}

for (const name of ['polyfills.js', 'main.js']) {
  const file = join(dir, name);
  if (!existsSync(file)) continue;
  await build({
    entryPoints: [file],
    outfile: file,
    allowOverwrite: true,
    format: 'iife',
    bundle: true,
    minifyWhitespace: true,
    sourcemap: existsSync(`${file}.map`) ? 'linked' : false,
    logLevel: 'warning',
  });
  console.log(`iife: ${file}`);
}
