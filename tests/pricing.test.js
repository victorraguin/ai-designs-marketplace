const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');

// Compile the TypeScript source for testing
const libPath = path.join(__dirname, '../lib/pricing.ts');
const outDir = path.join(__dirname, '../dist-test');
execSync(`tsc ${libPath} --target es2017 --module commonjs --outDir ${outDir}`, { stdio: 'inherit' });

const pricing = require(path.join(outDir, 'pricing.js'));

function runTests() {
  // No margin or discount
  let price = pricing.calculateFinalPrice({ basePrice: 100, currency: 'USD' });
  assert.strictEqual(price, 100);

  // Margin only
  price = pricing.calculateFinalPrice({ basePrice: 100, currency: 'USD', margin: 0.1 });
  assert.strictEqual(price, 110);

  // Discount only
  price = pricing.calculateFinalPrice({ basePrice: 200, currency: 'USD', discount: 0.2 });
  assert.strictEqual(price, 160);

  // Margin and discount
  price = pricing.calculateFinalPrice({ basePrice: 50, currency: 'USD', margin: 0.2, discount: 0.1 });
  assert.strictEqual(price, 54);

  console.log('All tests passed!');
}

runTests();
