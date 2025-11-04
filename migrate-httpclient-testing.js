const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const GLOB_ENDING = '.service.spec.ts';
const HTTP_PKG = "@angular/common/http";
const HTTP_TEST_PKG = "@angular/common/http/testing";

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, data) { fs.writeFileSync(file, data, 'utf8'); }

// ---------- utils: import manipulation ----------
function removeNamedImports(src, modulePath, namesToRemove) {
  const re = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`,
    'g'
  );
  return src.replace(re, (m, inside) => {
    const list = inside
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(n => !namesToRemove.includes(n.replace(/\s+as\s+.*/,'').trim()));
    if (list.length === 0) return ''; // remove whole line if empty
    return `import { ${list.join(', ')} } from '${modulePath}';`;
  });
}

function addNamedImports(src, modulePath, namesToAdd) {
  // If an import line exists, merge; else create a new one.
  const re = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`
  );
  if (re.test(src)) {
    src = src.replace(re, (m, inside) => {
      const have = new Set(
        inside.split(',').map(s => s.trim()).filter(Boolean)
      );
      namesToAdd.forEach(n => have.add(n));
      return `import { ${Array.from(have).join(', ')} } from '${modulePath}';`;
    });
  } else {
    src = `import { ${namesToAdd.join(', ')} } from '${modulePath}';\n` + src;
  }
  return src;
}

// ---------- utils: TestBed config manipulation ----------
function removeFromImportsArray(configBlock) {
  // configBlock includes the object inside configureTestingModule({...})
  return configBlock.replace(/imports\s*:\s*\[([\s\S]*?)\]/g, (m, inner) => {
    // split by commas but keep simple (works for identifiers list)
    const items = inner
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(x => !/^HttpClientModule$/.test(x))
      .filter(x => !/^HttpClientTestingModule$/.test(x));

    const pretty = items.length ? `imports: [ ${items.join(', ')} ]` : 'imports: []';
    return pretty;
  });
}

function ensureProviders(configBlock) {
  const hasProviders = /providers\s*:\s*\[([\s\S]*?)\]/.test(configBlock);
  const want = ['provideHttpClient()', 'provideHttpClientTesting()'];

  if (hasProviders) {
    configBlock = configBlock.replace(/providers\s*:\s*\[([\s\S]*?)\]/, (m, inner) => {
      const raw = inner.split(',').map(s => s.trim()).filter(Boolean);
      const have = new Set(raw);
      want.forEach(w => have.add(w));
      return `providers: [ ${Array.from(have).join(', ')} ]`;
    });
  } else {
    // Insert providers after imports if imports exists, else at the start of the object
    if (/imports\s*:/.test(configBlock)) {
      configBlock = configBlock.replace(
        /(imports\s*:\s*\[[\s\S]*?\])\s*(,?)/,
        (m, imp, comma) => `${imp}, providers: [ ${want.join(', ')} ]`
      );
    } else {
      // add at beginning
      configBlock = configBlock.replace(/^\s*/, (lead) =>
        `${lead}providers: [ ${want.join(', ')} ], `
      );
    }
  }
  return configBlock;
}

function alreadyMigrated(content) {
  return /providers\s*:\s*\[[^\]]*provideHttpClientTesting\(\)/.test(content);
}

function transformFile(src) {
  if (alreadyMigrated(src)) return { updated: false, content: src, reason: 'already migrated' };

  // 1) Update TestBed.configureTestingModule({...})
  const reCfg = /TestBed\.configureTestingModule\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  let anyCfg = false;
  src = src.replace(reCfg, (m, objInner) => {
    anyCfg = true;
    let newObj = removeFromImportsArray(objInner);
    newObj = ensureProviders(newObj);
    return `TestBed.configureTestingModule({${newObj}})`;
  });

  if (!anyCfg) return { updated: false, content: src, reason: 'no TestBed.configureTestingModule found' };

  // 2) Imports: remove deprecated modules, add new providers
  src = removeNamedImports(src, HTTP_PKG, ['HttpClientModule']);
  src = removeNamedImports(src, HTTP_TEST_PKG, ['HttpClientTestingModule']);

  src = addNamedImports(src, HTTP_PKG, ['provideHttpClient']);
  src = addNamedImports(src, HTTP_TEST_PKG, ['provideHttpClientTesting']);

  return { updated: true, content: src };
}

// ---------- walk ----------
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir)) {
    const fp = path.join(dir, entry);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, acc);
    else if (fp.endsWith(GLOB_ENDING)) acc.push(fp);
  }
  return acc;
}

// ---------- main ----------
(function main() {
  const files = walk(ROOT);
  if (files.length === 0) {
    console.log('Aucun fichier *.service.spec.ts trouvé.');
    return;
  }
  console.log(`🔍 ${files.length} fichier(s) trouvé(s).`);

  for (const f of files) {
    const original = read(f);
    const { updated, content, reason } = transformFile(original);

    if (!updated) {
      console.log(`⚠️  Ignored: ${f}${reason ? ` (${reason})` : ''}`);
      continue;
    }

    // backup simple
    fs.writeFileSync(f + '.bak', original, 'utf8');
    write(f, content);
    console.log(`✅ Migrated: ${f}`);
  }
  console.log('🎉 Migration terminée.');
})();
