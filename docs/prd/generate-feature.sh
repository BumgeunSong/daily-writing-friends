#!/bin/bash

set -e

FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  echo "Usage: $0 <feature-name>"
  exit 1
fi

# 0. json-cli 설치 확인
if ! command -v npx &> /dev/null || ! npx --no-install json --version &> /dev/null; then
  echo "[ERROR] 'json' CLI가 필요합니다. 설치: npm install -D json"
  exit 1
fi

# 1. src/feature 디렉토리 생성 (이미 있으면 중단)
if [ -d "src/$FEATURE_NAME" ]; then
  echo "[ERROR] src/$FEATURE_NAME 디렉토리가 이미 존재합니다."
  exit 1
fi
mkdir -p "src/$FEATURE_NAME/test"
touch "src/$FEATURE_NAME/index.ts"

# 2. tsconfig.json alias 추가 (이미 있으면 중단)
if grep -q "@${FEATURE_NAME}/*" tsconfig.json; then
  echo "[ERROR] tsconfig.json에 이미 @$FEATURE_NAME/* alias가 있습니다."
  exit 1
fi
npx json -I -f tsconfig.json -e \
  "this.compilerOptions.paths['@$FEATURE_NAME/*'] = ['$FEATURE_NAME/*']"

# 3. vite.config.ts alias 추가 (이미 있으면 중단)
if grep -q "'@$FEATURE_NAME'" vite.config.ts; then
  echo "[ERROR] vite.config.ts에 이미 @$FEATURE_NAME alias가 있습니다."
  exit 1
fi
ALIAS_LINE="      '@$FEATURE_NAME': path.resolve(__dirname, './src/$FEATURE_NAME'),"
# OS별 sed 옵션 분기
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "/alias: {/a\
$ALIAS_LINE
" vite.config.ts
else
  sed -i "/alias: {/a $ALIAS_LINE" vite.config.ts
fi

# 4. prettier로 포맷
if npx prettier --version &> /dev/null; then
  npx prettier --write tsconfig.json vite.config.ts
else
  echo "[INFO] prettier가 설치되어 있지 않아 포맷을 건너뜁니다. (npm install -D prettier)"
fi

echo "[SUCCESS] Feature '$FEATURE_NAME' created and alias added!" 