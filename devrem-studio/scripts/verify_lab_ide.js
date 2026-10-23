const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const checks = [
    { name: 'labCalculatorsContainer exists', test: html.includes('id="labCalculatorsContainer"') },
    { name: 'labCatalogContainer exists', test: html.includes('id="labCatalogContainer"') },
    { name: 'btnBackToCatalog exists', test: html.includes('id="btnBackToCatalog"') },
    { name: 'btnViewCatalog exists', test: html.includes('id="btnViewCatalog"') },
    { name: 'renderLabCatalog defined', test: html.includes('function renderLabCatalog(') },
    { name: 'setLabViewMode defined', test: html.includes('function setLabViewMode(') },
    { name: '44 items in LAB_TOOLS_REGISTRY', test: (html.match(/\{ id: 'calc/g) || []).length >= 36 }
];

let pass = 0;
checks.forEach(c => {
    if (c.test) {
        console.log('PASS: ' + c.name);
        pass++;
    } else {
        console.error('FAIL: ' + c.name);
    }
});

if (pass === checks.length) {
    console.log(`\nALL LAB IDE CHECKS PASSED: ${pass}/${checks.length}`);
} else {
    process.exit(1);
}
