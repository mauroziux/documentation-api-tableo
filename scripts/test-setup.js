#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Tableo API Documentation Setup...\n');

// Test 1: Check if required files exist
console.log('1. Checking required files...');
const requiredFiles = [
  'src/yaakToOpenapi.ts',
  'docs/index.html',
  'docs/openapi.yaml',
  'package.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} missing`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Run "bun run build" to generate them.');
  process.exit(1);
}

// Test 2: Check OpenAPI file format
console.log('\n2. Checking OpenAPI file format...');
try {
  const openapiContent = fs.readFileSync('docs/openapi.yaml', 'utf8');

  if (openapiContent.startsWith('openapi: 3.0.0')) {
    console.log('   ✅ OpenAPI version field is correct');
  } else {
    console.log('   ❌ OpenAPI version field is missing or incorrect');
    console.log('   Expected: openapi: 3.0.0');
    console.log('   Found:', openapiContent.split('\n')[0]);
  }

  // Check for required OpenAPI sections
  const requiredSections = ['info:', 'paths:', 'components:'];
  requiredSections.forEach(section => {
    if (openapiContent.includes(section)) {
      console.log(`   ✅ ${section} section found`);
    } else {
      console.log(`   ⚠️  ${section} section missing`);
    }
  });

} catch (error) {
  console.log('   ❌ Error reading OpenAPI file:', error.message);
}

// Test 3: Check index.html configuration
console.log('\n3. Checking index.html configuration...');
try {
  const indexContent = fs.readFileSync('docs/index.html', 'utf8');

  if (indexContent.includes('url: "./openapi.yaml"')) {
    console.log('   ✅ OpenAPI file reference is correct');
  } else {
    console.log('   ❌ OpenAPI file reference is incorrect');
    console.log('   Expected: url: "./openapi.yaml"');
  }

  if (indexContent.includes('swagger-ui-dist')) {
    console.log('   ✅ Swagger UI dependencies are included');
  } else {
    console.log('   ❌ Swagger UI dependencies are missing');
  }

} catch (error) {
  console.log('   ❌ Error reading index.html:', error.message);
}

// Test 4: Check package.json scripts
console.log('\n4. Checking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const requiredScripts = ['build', 'serve', 'deploy'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`   ✅ "${script}" script is defined`);
    } else {
      console.log(`   ❌ "${script}" script is missing`);
    }
  });

} catch (error) {
  console.log('   ❌ Error reading package.json:', error.message);
}

// Test 5: Check Yaak collection structure
console.log('\n5. Checking Yaak collection structure...');
try {
  const yaakDir = 'api-tableo-collection';

  if (fs.existsSync(yaakDir)) {
    const files = fs.readdirSync(yaakDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    if (yamlFiles.length > 0) {
      console.log(`   ✅ Collection directory exists with ${yamlFiles.length} YAML files`);
    } else {
      console.log('   ⚠️ Collection directory exists but is empty of YAML files');
    }
  } else {
    console.log('   ❌ Collection directory missing');
  }

} catch (error) {
  console.log('   ❌ Error reading Yaak collection:', error.message);
}

console.log('\n🎯 Setup Test Complete!');
console.log('\nNext steps:');
console.log('1. Run "bun run build" to generate/update documentation');
console.log('2. Run "bun --port 8000 docs" to serve locally');
console.log('3. Visit http://localhost:8000 to view documentation');
console.log('4. Push to GitHub to deploy automatically');
