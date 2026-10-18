const fs = require('fs');
const path = process.argv[2] || 'backend/src/pos/pos.service.ts';
const text = fs.readFileSync(path, 'utf8');
const lines = text.split(/\r?\n/);
let brace = 0, par = 0, sq = 0, backtickOpen = false;
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  for (let j=0;j<line.length;j++){
    const ch = line[j];
    if (ch === '`') backtickOpen = !backtickOpen;
    if (backtickOpen) continue;
    if (ch==='{') brace++;
    if (ch==='}') brace--;
    if (ch==='(') par++;
    if (ch===')') par--;
    if (ch==='[') sq++;
    if (ch===']') sq--;
  }
  if (i%50===0) console.log(`line ${i+1}: brace=${brace} par=${par} sq=${sq}`);
}
console.log('FINAL', {brace,par,sq,backtickOpen});
