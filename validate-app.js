const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/app.js', 'utf8');
const devremLab = fs.readFileSync('js/devrem-lab.js', 'utf8');
const engine = fs.readFileSync('js/canvas-engine.js', 'utf8');

const allJs = js + '\n' + devremLab + '\n' + engine;
const re = /getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const missing = new Set();
while ((m = re.exec(allJs)) !== null) {
  const id = m[1];
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missing.add(id);
  }
}
console.log('Missing IDs accessed in JS:');
for (const id of missing) {
  // Check if it is accessed with addEventListener or without optional chaining
  const lines = allJs.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`getElementById('${id}')`) || lines[i].includes(`getElementById("${id}")`)) {
      console.log(`- ${id} at line: ${lines[i].trim()}`);
    }
  }
}
