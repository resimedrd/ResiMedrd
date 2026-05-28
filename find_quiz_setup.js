const fs = require('fs');
const path = require('path');

function search(file, keyword) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
  const lines = content.split('\n');
  console.log(`\n=== Matches in ${file} for "${keyword}" ===`);
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(keyword.toLowerCase())) {
      console.log(`Line ${idx + 1}: ${line.trim().substring(0, 120)}`);
    }
  });
}

search('index.html', 'iniciar-examen');
search('index.html', 'seleccionar-tipo');
search('js/ui.js', 'iniciarExamen');
search('js/ui.js', 'setup');
