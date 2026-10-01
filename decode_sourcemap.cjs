const fs = require('fs');
const sm = require('source-map');

const raw = fs.readFileSync('dist/assets/index-DWQW4Ppp.js', 'utf8');
const mapRaw = fs.readFileSync('dist/assets/index-DWQW4Ppp.js.map', 'utf8');
const map = JSON.parse(mapRaw);

let line = 1, col = 0;
for (let i = 0; i < 285166 && i < raw.length; i++) {
  if (raw[i] === '\n') { line++; col = 0; }
  else col++;
}
console.log('Offset 285166 -> line', line, ', col', col);

const consumer = new sm.SourceMapConsumer(map);

const pos = consumer.originalPositionFor({ line, column: col });
console.log('Original position:', JSON.stringify(pos));

const qaSourceIdx = map.sources.findIndex(s => s.includes('QAHub'));
console.log('QAHub source:', map.sources[qaSourceIdx]);

for (const offset of [285100, 285120, 285140, 285150, 285160, 285166, 285170, 285180, 285200, 285300, 285400, 285500, 285600, 285700, 285800]) {
  let l = 1, c = 0;
  for (let i = 0; i < offset && i < raw.length; i++) {
    if (raw[i] === '\n') { l++; c = 0; }
    else c++;
  }
  const p = consumer.originalPositionFor({ line: l, column: c });
  console.log(`Offset ${offset} -> ${p.source}:${p.line}:${p.column} name=${p.name}`);
}

consumer.destroy();
