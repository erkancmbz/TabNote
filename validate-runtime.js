const fs = require('fs');
const jsdomHtml = fs.readFileSync('index.html', 'utf8');
const bundle = fs.readFileSync('apk-build/assets/bundle.js', 'utf8');

// Basit bir mock DOM oluşturalım
console.log('Testing bundle execution with mock browser environment...');
try {
  const windowMock = {
    addEventListener: (event, cb) => {
      console.log('Registered event:', event);
    },
    location: { href: '' },
    screen: { orientation: { lock: () => Promise.resolve() } },
    innerWidth: 1080,
    innerHeight: 1920
  };
  const documentMock = {
    getElementById: (id) => {
      const exists = jsdomHtml.includes(`id="${id}"`) || jsdomHtml.includes(`id='${id}'`);
      if (!exists) {
        // console.warn('Missing element accessed:', id);
        return null;
      }
      return {
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
        setAttribute: () => {},
        getAttribute: () => '',
        style: {},
        querySelector: () => null,
        querySelectorAll: () => []
      };
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => ({
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {}
    }),
    body: {
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      appendChild: () => {}
    }
  };
  
  const fn = new Function('window', 'document', 'navigator', bundle);
  fn(windowMock, documentMock, { userAgent: 'Android' });
  console.log('Bundle executed successfully without runtime error!');
} catch (e) {
  console.error('RUNTIME ERROR IN BUNDLE:', e);
}
