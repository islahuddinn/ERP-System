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
    if (brace < 0 || par < 0 || sq < 0){
      console.log(`NEGATIVE at line ${i+1}: brace=${brace} par=${par} sq=${sq}`);
      console.log(lines[Math.max(0,i-2)] || '');
      console.log(lines[Math.max(0,i-1)] || '');
      console.log(lines[i]);
      console.log(lines[i+1] || '');
      process.exit(0);
    }
  }
  if ((i+1) % 200 === 0) console.log(`line ${i+1}: brace=${brace} par=${par} sq=${sq} backtickOpen=${backtickOpen}`);
}
console.log(`FINAL: brace=${brace} par=${par} sq=${sq} backtickOpen=${backtickOpen}`);
