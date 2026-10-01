var fs = require('fs');
var sm = JSON.parse(fs.readFileSync('dist/assets/vendor-Dpze96Sf.js.map','utf8'));
var { SourceMapConsumer } = require('source-map');

SourceMapConsumer.with(sm, null, function(smc) {
  // Maybe the positions are already source-mapped to original positions
  // Let's try both vendor and index source maps
  var positions = [
    {line:38, col:4146, name:'Ed'},
    {line:38, col:4411, name:'gd'},
    {line:199, col:1595, name:'ym'},
    {line:199, col:2519, name:'Pi'},
    {line:199, col:3266, name:'wa'},
    {line:199, col:3151, name:'$s'}
  ];

  // Try different position formats
  console.log('=== Vendor source map ===');
  positions.forEach(function(p) {
    var pos = smc.originalPositionFor({line: p.line, column: p.col});
    if (pos.source) {
      console.log(p.name + ': source=' + pos.source + ' line=' + pos.line + ' col=' + pos.column + ' name=' + pos.name);
    }
  });
  
  // The line numbers might be 1-indexed in browser but 0-indexed in the tool
  console.log('\n=== Trying with 0-indexed lines ===');
  positions.forEach(function(p) {
    var pos = smc.originalPositionFor({line: p.line - 1, column: p.col - 1});
    if (pos.source) {
      console.log(p.name + ': source=' + pos.source + ' line=' + pos.line + ' col=' + pos.column + ' name=' + pos.name);
    }
  });
  
  // Maybe the positions are from the original source
  console.log('\n=== Trying as original positions ===');
  ['react-dom/cjs/react-dom.production.min.js', 'react/cjs/react.production.min.js'].forEach(function(srcFile) {
    var idx = sm.sources.indexOf(srcFile);
    console.log(srcFile + ' source index:', idx);
  });
  
  // Let's also check what sources exist
  console.log('\n=== Sources in vendor map ===');
  sm.sources.forEach(function(s, i) {
    console.log(i + ': ' + s);
  });
});
