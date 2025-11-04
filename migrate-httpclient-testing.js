const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GLOB_ENDING = '.service.spec.ts';

const HTTP_PKG = "@angular/common/http";
const HTTP_TEST_PKG = "@angular/common/http/testing";

const read = f => fs.readFileSync(f, 'utf8');
const write = (f, d) => fs.writeFileSync(f, d, 'utf8');

/* --- helpers for import manipulation --- */
function removeNamedImports(src, modulePath, namesToRemove) {
  const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`, 'g');
  return src.replace(re, (m, inside) => {
    const kept = inside
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(n => !namesToRemove.includes(n.replace(/\s+as\s+.*/, '').trim()));
    if (!kept.length) return '';
    return `import { ${kept.join(', ')} } from '${modulePath}';`;
  });
}

function addNamedImports(src, modulePath, namesToAdd) {
  const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`);
  if (re.test(src)) {
    return src.replace(re, (m, inside) => {
      const have = new Set(inside.split(',').map(s => s.trim()).filter(Boolean));
      namesToAdd.forEach(n => have.add(n));
      return `import { ${Array.from(have).join(', ')} } from '${modulePath}';`;
    });
  }
  return `import { ${namesToAdd.join(', ')} } from '${modulePath}';\n` + src;
}

/* --- TestBed manipulation --- */
function removeFromImportsArray(block) {
  return block.replace(/imports\s*:\s*\[([\s\S]*?)\]/g, (m, inner) => {
    const items = inner
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(x => !/^HttpClient(Module|TestingModule)$/.test(x));
    return `imports: [ ${items.join(', ')} ]`;
  });
}

function ensureProviders(block, providersToAdd) {
  if (providersToAdd.length === 0) return block;
  const hasProviders = /providers\s*:\s*\[([\s\S]*?)\]/.test(block);

  if (hasProviders) {
    return block.replace(/providers\s*:\s*\[([\s\S]*?)\]/, (m, inner) => {
      const raw = inner.split(',').map(s => s.trim()).filter(Boolean);
      const have = new Set(raw);
      providersToAdd.forEach(w => have.add(w));
      return `providers: [ ${Array.from(have).join(', ')} ]`;
    });
  }

  if (/imports\s*:/.test(block)) {
    return block.replace(
      /(imports\s*:\s*\[[\s\S]*?\])\s*(,?)/,
      (m, imp) => `${imp}, providers: [ ${providersToAdd.join(', ')} ]`
    );
  }
  return block.replace(/^\s*/, lead => `${lead}providers: [ ${providersToAdd.join(', ')} ], `);
}

/* --- Extract injected services from the .service.ts file --- */
function detectInjectedServices(servicePath) {
  if (!fs.existsSync(servicePath)) return [];
  const src = read(servicePath);

  const services = new Set();

  // constructor-based injection
  const ctorMatch = src.match(/constructor\s*\(([^)]*)\)/);
  if (ctorMatch && ctorMatch[1]) {
    const params = ctorMatch[1].split(',');
    for (const p of params) {
      const typeMatch = p.match(/:\s*([A-Z][A-Za-z0-9_]+)/);
      if (typeMatch) services.add(typeMatch[1]);
    }
  }

  // inject() function syntax (Angular 14+)
  const injectCalls = [...src.matchAll(/inject\s*\(\s*([A-Z][A-Za-z0-9_]+)/g)];
  injectCalls.forEach(m => services.add(m[1]));

  return Array.from(services);
}

/* --- Build providers from detected services --- */
function buildProviders(services) {
  const providers = [];
  const lower = s => s.toLowerCase();

  for (const svc of services) {
    if (svc === 'HttpClient') {
      providers.push('provideHttpClient()', 'provideHttpClientTesting()');
    } else {
      providers.push(svc); // assume standard Angular DI class
    }
  }
  return providers;
}

/* --- Main transform --- */
function transformSpec(src, providers) {
  const reCfg = /TestBed\.configureTestingModule\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  let found = false;
  let out = src.replace(reCfg, (m, obj) => {
    found = true;
    let newObj = removeFromImportsArray(obj);
    newObj = ensureProviders(newObj, providers);
    return `TestBed.configureTestingModule({${newObj}})`;
  });

  if (!found) return { updated: false, content: src };

  // Update imports if HttpClient involved
  if (providers.some(p => p.includes('provideHttpClient'))) {
    out = removeNamedImports(out, HTTP_PKG, ['HttpClientModule']);
    out = removeNamedImports(out, HTTP_TEST_PKG, ['HttpClientTestingModule']);
    out = addNamedImports(out, HTTP_PKG, ['provideHttpClient']);
    out = addNamedImports(out, HTTP_TEST_PKG, ['provideHttpClientTesting']);
  }

  return { updated: out !== src, content: out };
}

/* --- Walk --- */
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir)) {
    const fp = path.join(dir, e);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, acc);
    else if (fp.endsWith(GLOB_ENDING)) acc.push(fp);
  }
  return acc;
}

/* --- Entry --- */
(function main() {
  const specs = walk(ROOT);
  if (!specs.length) return console.log('Aucun fichier *.service.spec.ts trouvé.');
  console.log(`🔍 ${specs.length} fichier(s) trouvé(s).`);

  for (const spec of specs) {
    const servicePath = spec.replace(/\.service\.spec\.ts$/, '.service.ts');
    const injected = detectInjectedServices(servicePath);
    const providers = buildProviders(injected);

    const original = read(spec);
    const { updated, content } = transformSpec(original, providers);

    if (!updated) {
      console.log(`⚠️  Ignored: ${spec} (no change)`);
      continue;
    }

    write(spec, content);
    console.log(`✅ Updated: ${spec} (${providers.length ? 'added providers: ' + providers.join(', ') : 'clean only'})`);
  }

  console.log('🎉 Migration terminée.');
})();
