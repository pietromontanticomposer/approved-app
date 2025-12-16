const fs = require('fs');
const path = 'public/flow.js';
const s = fs.readFileSync(path, 'utf8');

function findTryIssues(src) {
  const issues = [];
  const re = /\btry\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index;
    // find end of this block by scanning braces from the position of '{'
    const bracePos = src.indexOf('{', start);
    if (bracePos === -1) { issues.push({start, reason: 'no opening brace'}); continue; }
    let depth = 0;
    let i = bracePos;
    let inString = null;
    let esc = false;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (inString) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === inString) { inString = null; }
        continue;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
        if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) break; }
      }
    }
    if (i >= src.length) { issues.push({start, reason: 'block not closed'}); continue; }
    const endPos = i; // position of matching '}'
    // Skip whitespace/comments after endPos to find next token
    let j = endPos + 1;
    while (j < src.length && /[\s\/]/.test(src[j])) {
      // skip spaces and also handle simple comment starts
      if (src[j] === '/') {
        if (src[j+1] === '/') { j = src.indexOf('\n', j+2); if (j === -1) { j = src.length; break; } continue; }
        if (src[j+1] === '*') { const endC = src.indexOf('*/', j+2); if (endC === -1) { j = src.length; break; } j = endC+2; continue; }
      }
      j++;
    }
    const nextToken = src.slice(j, j+10);
    if (!/^catch\b/.test(nextToken) && !/^finally\b/.test(nextToken)) {
      issues.push({start, bracePos, endPos, nextToken: nextToken.trim().split(/\s|\(|\{/)[0]});
    }
  }
  return issues;
}

const issues = findTryIssues(s);
if (issues.length === 0) {
  console.log('OK: No try/catch issues found');
  process.exit(0);
} else {
  console.log('Found issues:', issues.length);
  issues.forEach((it, idx) => {
    const loc = s.slice(0, it.start).split('\n');
    const line = loc.length;
    console.log(`#${idx+1} at char ${it.start} (approx line ${line}): reason=${it.reason||'no-catch'} next='${it.nextToken}'`);
  });
  process.exit(2);
}
