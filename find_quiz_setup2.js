const fs = require('fs');
const path = require('path');

function searchAllJS(keyword) {
  const dir = path.join(__dirname, 'js');
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`[${file}] Line ${idx + 1}: ${line.trim().substring(0, 120)}`);
        }
      });
    }
  });
}

searchAllJS('cargarFiltrosAnos');
searchAllJS('selector-ano');
