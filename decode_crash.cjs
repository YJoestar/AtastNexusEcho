const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const vendorMap = JSON.parse(fs.readFileSync('dist/assets/vendor-Dpze96Sf.js.map', 'utf8'));
const indexMap = JSON.parse(fs.readFileSync('dist/assets/index-DnneHzf_.js.map', 'utf8'));

async function main() {
  const vendorConsumer = await new SourceMapConsumer(vendorMap);
  const indexConsumer = await new SourceMapConsumer(indexMap);

  const vendorPositions = [
    { line: 41, column: 1742, label: 'W (error creation)' },
    { line: 51, column: 8079, label: 'Qd (component stack)' },
    { line: 51, column: 8178, label: 'Qd (stack trace)' },
    { line: 51, column: 7187, label: 'vy (component stack)' },
    { line: 51, column: 4025, label: 'Uv' },
    { line: 51, column: 8021, label: 'gy' },
    { line: 51, column: 3265, label: 'Iv' },
    { line: 60, column: 4824, label: 'ay' },
    { line: 60, column: 1999, label: 'Ey' },
  ];

  const indexPositions = [
    { line: 27, column: 308, label: 'ki (component stack)' },
    { line: 27, column: 2221, label: 'Oi' },
    { line: 10, column: 20080, label: 'mr' },
    { line: 10, column: 66541, label: 'Gs' },
    { line: 10, column: 70429, label: '_i (component stack)' },
    { line: 10, column: 26977, label: 'jr' },
    { line: 10, column: 33200, label: 'vr' },
  ];

  console.log('=== VENDOR positions ===');
  for (const pos of vendorPositions) {
    const result = vendorConsumer.originalPositionFor(pos);
    console.log(`${pos.label}: ${result.source}:${result.line}:${result.column} name=${result.name}`);
  }

  console.log('\n=== INDEX positions ===');
  for (const pos of indexPositions) {
    const result = indexConsumer.originalPositionFor(pos);
    console.log(`${pos.label}: ${result.source}:${result.line}:${result.column} name=${result.name}`);
  }

  vendorConsumer.destroy();
  indexConsumer.destroy();
}

main().catch(e => console.error(e));
