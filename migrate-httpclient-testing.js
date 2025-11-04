const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GLOB_ENDING = '.service.spec.ts';

const HTTP_PKG = "@angular/common/http";
const HTTP_TEST_PKG = "@angular/common/http/testing";

/* ---------- FS helpers ---------- */
const read = f => fs.readFileSync(f, 'utf8');
const write = (f, d) => fs.writeFileSync(f, d, 'utf8');

/* ---------- Import helpers ---------- */
function removeNamedImports(src, modulePath, namesToRemove) {
  const re = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`,
    'g'
  );
  return src.replace(re, (m, inside) => {
    const kept = inside
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(n => !namesToRemove.includes(n.replace(/\s+as\s+.*/,'').trim()));
    if (!kept.length) return ''; // supprime toute la ligne si vide
    return `import { ${kept.join(', ')} } from '${modulePath}';`;
  });
}

function addNamedImports(src, modulePath, namesToAdd) {
  const re = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`
  );
  if (re.test(src)) {
    return src.replace(re, (m, inside) => {
      const have = new Set(inside.split(',').map(s => s.trim()).filter(Boolean));
      namesToAdd.forEach(n => have.add(n));
      return `import { ${Array.from(have).join(', ')} } from '${modulePath}';`;
    });
  }
  return `import { ${namesToAdd.join(', ')} } from '${modulePath}';\n` + src;
}

/* ---------- TestBed object helpers ---------- */
function removeFromImportsArray(configBlock) {
  return configBlock.replace(/imports\s*:\s*\[([\s\S]*?)\]/g, (m, inner) => {
    const items = inner
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(x => !/^HttpClientModule$/.test(x))
      .filter(x => !/^HttpClientTestingModule$/.test(x));
    return `imports: [ ${items.join(', ')} ]`;
  });
}

function ensureProvidersIfNeeded(configBlock, needProviders) {
  if (!needProviders) return configBlock;

  const want = ['provideHttpClient()', 'provideHttpClientTesting()'];
  const hasProviders = /providers\s*:\s*\[([\s\S]*?)\]/.test(configBlock);

  if (hasProviders) {
    return configBlock.replace(/providers\s*:\s*\[([\s\S]*?)\]/, (m, inner) => {
      const raw = inner.split(',').map(s => s.trim()).filter(Boolean);
      const have = new Set(raw);
      want.forEach(w => have.add(w));
      return `providers: [ ${Array.from(have).join(', ')} ]`;
    });
  }

  // insérer après imports si présent, sinon au début de l’objet
  if (/imports\s*:/.test(configBlock)) {
    return configBlock.replace(
      /(imports\s*:\s*\[[\s\S]*?\])\s*(,?)/,
      (m, imp) => `${imp}, providers: [ ${want.join(', ')} ]`
    );
  }
  return configBlock.replace(/^\s*/, lead => `${lead}providers: [ ${want.join(', ')} ], `);
}

/* ---------- Detect HttpClient usage in the service ---------- */
function serviceUsesHttpClient(servicePath) {
  if (!fs.existsSync(servicePath)) return false;
  const s = read(servicePath);

  // heuristiques sûres :
  // 1) import de HttpClient
  const hasImport =
    /import\s*\{[^}]*\bHttpClient\b[^}]*\}\s*from\s*['"]@angular\/common\/http['"]/.test(s);

  // 2) HttpClient typé dans le constructeur
  const inCtor = /constructor\s*\([^)]*\bHttpClient\b[^)]*\)/.test(s);

  // 3) Utilisation explicite comme type ou membre
  const typed = /\bHttpClient\b/.test(s) && (/private|public|readonly/.test(s) || inCtor);

  return hasImport || inCtor || typed;
}

/* ---------- Transform a single spec file ---------- */
function transformSpec(src, needProviders) {
  // 1) TestBed blocks
  const reCfg = /TestBed\.configureTestingModule\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  let touchedCfg = false;

  let out = src.replace(reCfg, (m, objInner) => {
    touchedCfg = true;
    let obj = removeFromImportsArray(objInner);
    obj = ensureProvidersIfNeeded(obj, needProviders);
    return `TestBed.configureTestingModule({${obj}})`;
  });

  if (!touchedCfg) return { updated: false, content: src, reason: 'no TestBed.configureTestingModule found' };

  // 2) Imports split: on retire modules dépréciés; on ajoute les providers seulement si needed
  out = removeNamedImports(out, HTTP_PKG, ['HttpClientModule']);
  out = removeNamedImports(out, HTTP_TEST_PKG, ['HttpClientTestingModule']);

  if (needProviders) {
    out = addNamedImports(out, HTTP_PKG, ['provideHttpClient']);
    out = addNamedImports(out, HTTP_TEST_PKG, ['provideHttpClientTesting']);
  }

  return { updated: out !== src, content: out };
}

/* ---------- Walk ---------- */
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir)) {
    const fp = path.join(dir, e);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, acc);
    else if (fp.endsWith(GLOB_ENDING)) acc.push(fp);
  }
  return acc;
}

/* ---------- Main ---------- */
(function main () {
  const files = walk(ROOT);
  if (!files.length) {
    console.log('Aucun fichier *.service.spec.ts trouvé.');
    return;
  }
  console.log(`🔍 ${files.length} fichier(s) trouvé(s).`);

  for (const spec of files) {
    const svc = spec.replace(/\.service\.spec\.ts$/, '.service.ts');
    const needProviders = serviceUsesHttpClient(svc);

    const original = read(spec);
    const { updated, content, reason } = transformSpec(original, needProviders);

    if (!updated) {
      console.log(`⚠️  Ignored: ${spec}${reason ? ` (${reason})` : ''}`);
      continue;
    }

    // backup
    write(spec + '.bak', original);
    write(spec, content);

    console.log(
      `✅ Migrated: ${spec} ${needProviders ? '(providers ajoutés)' : '(modules nettoyés, pas de providers nécessaires)'}`
    );
  }

  console.log('🎉 Fini.');
})();
