import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url.split('?')[0]; // 쿼리 문자열 제거
  
  // 루트 경로는 index.html로
  if (filePath === './' || filePath === './index.html') {
    filePath = './web/index.html';
  }
  
  // web/ 폴더의 파일들 (main.js 등)
  if (filePath.startsWith('./main.js') || 
      filePath.startsWith('./web/main.js') ||
      (!filePath.startsWith('./src/') && !filePath.startsWith('./web/') && !filePath.startsWith('./tests/'))) {
    // web/ 폴더에서 찾기
    if (!filePath.startsWith('./web/')) {
      filePath = './web' + filePath.substring(1);
    }
  }
  
  // src/ 경로는 그대로 유지 (ES 모듈 import)
  // web/ 경로도 그대로 유지

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // 보안: 상위 디렉토리 접근 방지
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.startsWith('..')) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 - Forbidden</h1>', 'utf-8');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        console.error(`404: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<h1>404 - File Not Found</h1><p>${filePath}</p>`, 'utf-8');
      } else {
        console.error(`500: ${error.code} - ${filePath}`);
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/ in your browser to play the game!`);
});

