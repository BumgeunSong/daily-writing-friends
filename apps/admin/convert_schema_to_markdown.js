const fs = require('fs');
const path = require('path');

// 내보낸 Firestore 데이터 파일 경로
const EXPORT_PATH = './firestore_export';
const OUTPUT_FILE = 'firestore_schema.json';

// 메인 함수
async function extractSchema() {
  console.log('Firestore 스키마 추출 시작...');

  try {
    // Firestore 내보내기 파일 찾기
    const exportMetadataPath = findExportMetadataFile(EXPORT_PATH);
    if (!exportMetadataPath) {
      throw new Error('Firestore 내보내기 파일을 찾을 수 없습니다. firebase firestore:export 명령을 먼저 실행하세요.');
    }

    console.log(`파일 발견: ${exportMetadataPath}`);

    // 내보낸 데이터 읽기
    const exportData = JSON.parse(fs.readFileSync(exportMetadataPath, 'utf8'));
    
    // 스키마 분석
    const schema = analyzeSchema(exportData);
    
    // JSON으로 변환 및 저장
    const jsonOutput = convertToJSON(schema);
    fs.writeFileSync(OUTPUT_FILE, jsonOutput);
    
    console.log(`스키마가 성공적으로 추출되어 ${OUTPUT_FILE}에 저장되었습니다.`);
  } catch (error) {
    console.error('오류 발생:', error.message);
  }
}

// 내보내기 메타데이터 파일 찾기
function findExportMetadataFile(dir) {
  if (!fs.existsSync(dir)) {
    return null;
  }

  // 일반적인 내보내기 파일 경로
  const commonPaths = [
    path.join(dir, 'all_namespaces/all_kinds/all_namespaces_all_kinds.export_metadata'),
    path.join(dir, 'firestore_export.overall_export_metadata')
  ];

  for (const filePath of commonPaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  // 재귀적으로 하위 디렉토리 검색
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      const found = findExportMetadataFile(path.join(dir, item.name));
      if (found) return found;
    } else if (item.name.endsWith('.json') || item.name.endsWith('.export_metadata')) {
      return path.join(dir, item.name);
    }
  }

  return null;
}

// 스키마 분석
function analyzeSchema(exportData) {
  const schema = {};
  
  // 내보내기 파일 형식에 따라 다른 처리
  if (Array.isArray(exportData)) {
    // 각 문서 분석
    exportData.forEach(doc => {
      if (!doc.fields) return;
      
      // 문서 경로에서 컬렉션 이름 추출
      const pathParts = doc.name ? doc.name.split('/') : [];
      if (pathParts.length < 2) return;
      
      // 짝수 인덱스는 컬렉션 이름
      for (let i = 0; i < pathParts.length - 1; i += 2) {
        const collectionName = pathParts[i];
        if (!schema[collectionName]) {
          schema[collectionName] = {};
        }
        
        // 필드 정보 추출
        if (doc.fields) {
          Object.entries(doc.fields).forEach(([fieldName, fieldValue]) => {
            const fieldType = getFieldType(fieldValue);
            if (!schema[collectionName][fieldName]) {
              schema[collectionName][fieldName] = { type: fieldType };
            } else if (schema[collectionName][fieldName].type !== fieldType) {
              // 같은 필드명에 다른 타입이 있는 경우 - 혼합 타입으로 표시
              schema[collectionName][fieldName].type = `mixed (${schema[collectionName][fieldName].type}, ${fieldType})`;
            }
          });
        }
      }
    });
  } else if (exportData.documents) {
    // Firestore REST API 형식
    exportData.documents.forEach(doc => {
      const pathParts = doc.name.split('/');
      const collectionIndex = pathParts.findIndex(part => part === 'collections') + 1;
      if (collectionIndex > 0 && collectionIndex < pathParts.length) {
        const collectionName = pathParts[collectionIndex];
        if (!schema[collectionName]) {
          schema[collectionName] = {};
        }
        
        if (doc.fields) {
          Object.entries(doc.fields).forEach(([fieldName, fieldValue]) => {
            const fieldType = getFieldType(fieldValue);
            if (!schema[collectionName][fieldName]) {
              schema[collectionName][fieldName] = { type: fieldType };
            }
          });
        }
      }
    });
  } else {
    console.warn('인식할 수 없는 내보내기 형식입니다. 결과가 정확하지 않을 수 있습니다.');
  }
  
  return schema;
}

// 필드 타입 가져오기
function getFieldType(fieldValue) {
  if (!fieldValue) return 'unknown';
  
  // Firestore 타입 처리
  if (fieldValue.stringValue !== undefined) return 'string';
  if (fieldValue.integerValue !== undefined) return 'integer';
  if (fieldValue.doubleValue !== undefined) return 'double';
  if (fieldValue.booleanValue !== undefined) return 'boolean';
  if (fieldValue.timestampValue !== undefined) return 'timestamp';
  if (fieldValue.referenceValue !== undefined) return 'reference';
  if (fieldValue.geoPointValue !== undefined) return 'geopoint';
  if (fieldValue.arrayValue !== undefined) return 'array';
  if (fieldValue.mapValue !== undefined) return 'map';
  if (fieldValue.nullValue !== undefined) return 'null';
  
  // 일반 JSON 데이터인 경우
  return typeof fieldValue;
}

// JSON으로 변환
function convertToJSON(schema) {
  const output = {
    schemaInfo: {
      description: 'Firestore 데이터베이스 스키마',
      generatedAt: new Date().toISOString(),
      version: '1.0'
    },
    collections: {}
  };
  
  // 각 컬렉션 정보 추가
  Object.keys(schema).sort().forEach(collectionName => {
    output.collections[collectionName] = {
      fields: {}
    };
    
    // 필드 정보 추가
    const fields = schema[collectionName];
    Object.keys(fields).sort().forEach(fieldName => {
      output.collections[collectionName].fields[fieldName] = {
        type: fields[fieldName].type,
        description: ''  // LLM을 위한 설명 필드 (비어있음)
      };
    });
  });
  
  return JSON.stringify(output, null, 2);  // 들여쓰기 적용하여 가독성 향상
}

// 스크립트 실행
extractSchema();

// 사용법 출력
console.log('\n사용법:');
console.log('1. Firebase CLI로 Firestore 데이터 내보내기:');
console.log('   firebase firestore:export 대신 다음 명령어를 사용하세요:');
console.log('   firebase firestore export ./firestore_export');
console.log('   또는');
console.log('   firebase emulators:export ./firestore_export (에뮬레이터 사용 시)');
console.log('2. 이 스크립트 실행:');
console.log('   node convert_schema_to_markdown.js');
console.log('3. 생성된 firestore_schema.json 파일 확인'); 