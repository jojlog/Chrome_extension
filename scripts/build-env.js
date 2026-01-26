#!/usr/bin/env node

/**
 * Build script to inject .env variables into config/env.js
 * 
 * 사용법:
 * 1. .env.example을 복사하여 .env 파일 생성
 * 2. .env 파일에 실제 API 키 입력
 * 3. npm run build 또는 node scripts/build-env.js 실행
 * 
 * 또는 config/env.js 파일에 직접 값을 입력할 수도 있습니다.
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const ENV_JS_FILE = path.join(__dirname, '..', 'config', 'env.js');

// .env 파일 읽기
function loadEnvFile() {
  const env = {};
  
  if (fs.existsSync(ENV_FILE)) {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // 주석이나 빈 줄 건너뛰기
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // KEY=VALUE 형식 파싱
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, ''); // 따옴표 제거
        env[key] = value;
      }
    }
  }
  
  return env;
}

// env.js 파일 생성
function generateEnvJs(env) {
  const openaiKey = env.OPENAI_API_KEY || '';
  const geminiKey = env.GEMINI_API_KEY || '';
  
  const content = `// Environment Configuration
// 이 파일은 빌드 스크립트에 의해 자동 생성됩니다.
// .env 파일의 값을 사용하거나, 직접 수정할 수 있습니다.

const ENV_CONFIG = {
  // OpenAI API Key
  OPENAI_API_KEY: ${openaiKey ? `'${openaiKey}'` : "''"},
  
  // Google Gemini API Key
  GEMINI_API_KEY: ${geminiKey ? `'${geminiKey}'` : "''"}
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENV_CONFIG;
} else if (typeof window !== 'undefined') {
  window.ENV_CONFIG = ENV_CONFIG;
}
`;

  return content;
}

// 메인 실행
function main() {
  console.log('Building env.js from .env file...');
  
  const env = loadEnvFile();
  
  if (Object.keys(env).length === 0) {
    console.log('⚠️  .env 파일이 없거나 비어있습니다.');
    console.log('   config/env.js에 직접 값을 입력하거나, .env 파일을 생성하세요.');
    console.log('   .env.example을 참고하세요.');
  } else {
    console.log('✅ .env 파일에서 다음 키를 로드했습니다:');
    Object.keys(env).forEach(key => {
      const value = env[key];
      const masked = value.length > 8 ? value.substring(0, 4) + '...' + value.substring(value.length - 4) : '***';
      console.log(`   ${key}: ${masked}`);
    });
  }
  
  const envJsContent = generateEnvJs(env);
  fs.writeFileSync(ENV_JS_FILE, envJsContent, 'utf-8');
  
  console.log(`✅ ${ENV_JS_FILE} 파일이 생성되었습니다.`);
  console.log('');
  console.log('참고: Chrome 확장 프로그램에서는 런타임에 .env를 읽을 수 없습니다.');
  console.log('빌드 스크립트를 실행하거나 config/env.js에 직접 값을 입력하세요.');
}

main();
