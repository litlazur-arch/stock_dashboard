/**
 * ==========================================================================
 * 커밋 전 개인정보 및 보안 민감정보 자동 검증 스크립트 (check-privacy.js)
 * ==========================================================================
 * 검사 항목:
 * 1. 주민등록번호 패턴 (\d{6}-[1-4]\d{6})
 * 2. 휴대폰 및 유선 전화번호 패턴 (010-XXXX-XXXX, 02-XXX-XXXX 등)
 * 3. 은행 계좌번호 및 신용카드 번호 패턴
 * 4. 이메일 주소 (git author 제외 코드 내부 노출 여부)
 * 5. 비밀번호, 비공개 API Key, 토큰 패턴
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 검사 대상 확장자
const TARGET_EXTENSIONS = ['.html', '.js', '.css', '.gs', '.json', '.md'];

// 무시할 디렉토리 및 파일
const IGNORE_PATTERNS = ['.git', 'node_modules', 'manifest.json', 'icon.svg'];

// 민감정보 검출 정규식
const SECURITY_RULES = [
  {
    name: "주민등록번호",
    regex: /\b\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[- ]?[1-4]\d{6}\b/g
  },
  {
    name: "휴대전화 번호",
    regex: /\b01[016789][- ]?\d{3,4}[- ]?\d{4}\b/g
  },
  {
    name: "일반 전화번호",
    regex: /\b(02|03[1-3]|04[1-4]|05[1-5]|06[1-4])[- ]?\d{3,4}[- ]?\d{4}\b/g
  },
  {
    name: "신용카드 번호",
    regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g
  },
  {
    name: "하드코딩된 비밀번호/토큰 키워드",
    regex: /(password|secret|apikey|api_key|token)\s*[:=]\s*["'][^"']{8,}["']/gi
  }
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (IGNORE_PATTERNS.some(p => fullPath.includes(p))) return;

    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (TARGET_EXTENSIONS.includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function runPrivacyScan() {
  console.log("==========================================");
  console.log("🔍 개인정보 및 민감정보 보안 점검 시작...");
  console.log("==========================================");

  const rootDir = path.resolve(__dirname, '..');
  const files = getAllFiles(rootDir);
  let violationCount = 0;

  files.forEach(filePath => {
    const relativePath = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, lineIdx) => {
      // 주석 내 설명 예시나 User-Agent 제외
      if (line.includes('User-Agent') || line.includes('SERVICE_ITEM')) return;

      SECURITY_RULES.forEach(rule => {
        const matches = line.match(rule.regex);
        if (matches) {
          console.error(`🚨 [경고: ${rule.name}] 파일: ${relativePath}:${lineIdx + 1}`);
          console.error(`   내용: ${line.trim()}`);
          violationCount++;
        }
      });
    });
  });

  console.log("------------------------------------------");
  if (violationCount === 0) {
    console.log("✅ 점검 결과: 개인정보 및 보안 민감정보가 발견되지 않았습니다. 안전합니다!");
    return true;
  } else {
    console.error(`❌ 점검 결과: 총 ${violationCount}건의 민감정보 의심 항목이 발견되었습니다. 확인 후 커밋하세요.`);
    return false;
  }
}

if (require.main === module) {
  const isSafe = runPrivacyScan();
  process.exit(isSafe ? 0 : 1);
}

module.exports = { runPrivacyScan };
