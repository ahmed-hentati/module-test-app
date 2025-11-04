const fs = require('fs');
const path = require('path');

const targetDir = process.cwd(); // Dossier courant

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Ignorer si le fichier contient déjà un tableau imports
  if (content.match(/\bimports\s*:\s*\[/)) {
    console.log(`⚠️  Ignored (already has imports): ${filePath}`);
    return;
  }

  // Remplacer declarations par imports
  if (content.includes('declarations')) {
    const updated = content.replace(/\bdeclarations\b/g, 'imports');
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.spec.ts')) {
      replaceInFile(filePath);
    }
  }
}

console.log('🔍 Searching for .spec.ts files...');
walkDir(targetDir);
console.log('🎉 Replacement complete!');
