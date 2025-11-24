import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src 폴더를 web/src로 복사
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 빌드 디렉토리 생성
const buildDir = path.join(__dirname, 'dist');
const webDir = path.join(__dirname, 'web');
const srcDir = path.join(__dirname, 'src');

// dist 폴더가 있으면 삭제
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}

// dist 폴더 생성
fs.mkdirSync(buildDir, { recursive: true });

// web 폴더의 모든 파일을 dist로 복사
copyDir(webDir, buildDir);

// src 폴더를 dist/src로 복사
copyDir(srcDir, path.join(buildDir, 'src'));

// main.js의 import 경로 수정
const mainJsPath = path.join(buildDir, 'main.js');
let mainJsContent = fs.readFileSync(mainJsPath, 'utf-8');
mainJsContent = mainJsContent.replace(/from ['"]\.\.\/src\//g, "from './src/");
fs.writeFileSync(mainJsPath, mainJsContent);

console.log('✅ Build completed! Files copied to dist/');
console.log('📁 Dist folder contents:');
const distContents = fs.readdirSync(buildDir, { withFileTypes: true });
distContents.forEach(entry => {
  const path = entry.isDirectory() ? `${entry.name}/` : entry.name;
  console.log(`  - ${path}`);
});

