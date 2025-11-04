const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GLOB_ENDING = '.service.spec.ts';
const HTTP_PKG = "@angular/common/http";
const HTTP_TEST_PKG = "@angular/common/http/testing";

const read = f => fs.readFileSync(f, 'utf8');
const write = (f, d) => fs.writeFileSync(f, d, 'utf8');

/* ---------------- Detect dependencies in the service file ---------------- */
function getInjectedServices(servicePath) {
  if (!fs.existsSync(servicePath)) return [];

  const src = read(servicePath);
  const deps = new Set();

  // From constructor(private api: ApiService, private http: HttpClient)
  const ctorMatch = src.match(/constructor\s*\(([\s\S]*?)\)/);
  if (ctorMatch) {
    const params = ctorMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    for (const p of params) {
      const type = (p.match(/:\s*([\w$]+)/) || [])[1];
      if (type) deps.add(type);
    }
  }

  // From inject(FooService)
  const injectCalls = [...src.matchAll(/inject\s*\(\s*([\w$]+)\s*\)/g)];
  for (const m of injectCalls) deps.add(m[1]);

  return [...deps];
}

/* ---------------- Helpers for imports and config ---------------- */
function removeNamedImports(src, modulePath, names) {
  const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`, 'g');
  return src.replace(re, (m, inside) => {
    const kept = inside
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(n => !names.includes(n.replace(/\s+as\s+.*/,'').trim()));
    return kept.length ? `import { ${kept.join(', ')} } from '${modulePath}';` : '';
  });
}

function addNamedImports(src, modulePath, names) {
  const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`);
  if (re.test(src)) {
    return src.replace(re, (m, inside) => {
      const have = new Set(inside.split(',').map(s => s.trim()).filter(Boolean));
      names.forEach(n => have.add(n));
      return `import { ${Array.from(have).join(', ')} } from '${modulePath}';`;
    });
  }
  return `import { ${names.join(', ')} } from '${modulePath}';\n` + src;
}

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

function ensureProviders(configBlock, needHttp) {
  if (!needHttp) return configBlock;
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
  if (/imports\s*:/.test(configBlock)) {
    return configBlock.replace(
      /(imports\s*:\s*\[[\s\S]*?\])\s*(,?)/,
      (m, imp) => `${imp}, providers: [ ${want.join(', ')} ]`
    );
  }
  return configBlock.replace(/^\s*/, lead => `${lead}providers: [ ${want.join(', ')} ], `);
}

/* ---------------- Update the spec file ---------------- */
function transformSpec(specContent, deps, needHttp) {
  let content = specContent;

  // update TestBed config
  const reCfg = /TestBed\.configureTestingModule\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  content = content.replace(reCfg, (m, inner) => {
    let obj = removeFromImportsArray(inner);
    obj = ensureProviders(obj, needHttp);
    return `TestBed.configureTestingModule({${obj}})`;
  });

  // clean deprecated imports
  content = removeNamedImports(content, HTTP_PKG, ['HttpClientModule']);
  content = removeNamedImports(content, HTTP_TEST_PKG, ['HttpClientTestingModule']);

  if (needHttp) {
    content = addNamedImports(content, HTTP_PKG, ['provideHttpClient']);
    content = addNamedImports(content, HTTP_TEST_PKG, ['provideHttpClientTesting']);
  }

  // ensure we import TestBed (some specs may already have it)
  if (!/import\s*\{[^}]*\bTestBed\b/.test(content)) {
    content = `import { TestBed } from '@angular/core/testing';\n` + content;
  }

  // find beforeEach block
  const beforeEachRe = /beforeEach\s*\(\s*\(\)\s*=>\s*\{\s*([\s\S]*?)\}\s*\)\s*;?/;
  const serviceVarMatch = content.match(/const\s+(\w+)\s*=\s*TestBed\.inject\(([\w$]+)\)/);
  let existingInjects = new Set();

  if (beforeEachRe.test(content)) {
    content = content.replace(beforeEachRe, (m, inner) => {
      const already = [...inner.matchAll(/TestBed\.inject\(([\w$]+)\)/g)].map(x => x[1]);
      already.forEach(a => existingInjects.add(a));

      let newLines = '';
      deps.forEach(d => {
        if (!existingInjects.has(d) && d !== 'HttpClient') {
          newLines += `  const ${d.charAt(0).toLowerCase() + d.slice(1)} = TestBed.inject(${d});\n`;
        }
      });

      if (newLines) {
        return `beforeEach(() => {\n${inner}\n${newLines}});`;
      } else {
        return m;
      }
    });
  }

  return content;
}

/* ---------------- Walk ---------------- */
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir)) {
    const fp = path.join(dir, e);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, acc);
    else if (fp.endsWith(GLOB_ENDING)) acc.push(fp);
  }
  return acc;
}

/* ---------------- Main ---------------- */
(function main() {
  const files = walk(ROOT);
  if (!files.length) {
    console.log('No *.service.spec.ts files found.');
    return;
  }

  console.log(`🔍 Found ${files.length} service spec files.\n`);

  for (const specPath of files) {
    const servicePath = specPath.replace(/\.service\.spec\.ts$/, '.service.ts');
    const deps = getInjectedServices(servicePath);
    const needHttp = deps.includes('HttpClient');

    const original = read(specPath);
    const newContent = transformSpec(original, deps, needHttp);

    if (newContent !== original) {
      write(specPath, newContent);
      console.log(`✅ Updated ${path.basename(specPath)} (found: ${deps.join(', ') || 'none'})`);
    } else {
