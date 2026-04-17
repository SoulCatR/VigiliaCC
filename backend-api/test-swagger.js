// =============================================
// TEST: Verificar Swagger Config
// Ubicación: backend-api/test-swagger.js
// Ejecutar: node test-swagger.js
// =============================================

const swaggerSpec = require('./src/config/swagger.config');

console.log('='.repeat(60));
console.log('🔍 SWAGGER CONFIG TEST');
console.log('='.repeat(60));

console.log('\n📊 Info básica:');
console.log('- Título:', swaggerSpec.info.title);
console.log('- Versión:', swaggerSpec.info.version);

console.log('\n📂 Tags encontrados:');
if (swaggerSpec.tags && swaggerSpec.tags.length > 0) {
    swaggerSpec.tags.forEach(tag => {
        console.log(`  ✅ ${tag.name}: ${tag.description}`);
    });
} else {
    console.log('  ⚠️  No se encontraron tags definidos explícitamente');
    console.log('     (Se generarán desde los endpoints)');
}

console.log('\n🛣️  Endpoints encontrados:');
if (swaggerSpec.paths && Object.keys(swaggerSpec.paths).length > 0) {
    let count = 0;
    Object.keys(swaggerSpec.paths).forEach(path => {
        const methods = Object.keys(swaggerSpec.paths[path]);
        methods.forEach(method => {
            count++;
            console.log(`  ✅ ${method.toUpperCase().padEnd(6)} ${path}`);
        });
    });
    console.log(`\n  Total: ${count} endpoints`);
} else {
    console.log('  ❌ NO SE ENCONTRARON ENDPOINTS');
    console.log('\n💡 POSIBLES CAUSAS:');
    console.log('  1. Los archivos en src/routes/ no tienen comentarios @swagger');
    console.log('  2. La ruta en swagger.config.js es incorrecta');
    console.log('  3. Falta instalar: npm install swagger-jsdoc swagger-ui-express');
}

console.log('\n🔧 Schemas encontrados:');
if (swaggerSpec.components && swaggerSpec.components.schemas) {
    const schemas = Object.keys(swaggerSpec.components.schemas);
    console.log('  ✅', schemas.join(', '));
    console.log(`     Total: ${schemas.length} schemas`);
} else {
    console.log('  ❌ No se encontraron schemas');
}

console.log('\n🔐 Security Schemes:');
if (swaggerSpec.components && swaggerSpec.components.securitySchemes) {
    Object.keys(swaggerSpec.components.securitySchemes).forEach(name => {
        const scheme = swaggerSpec.components.securitySchemes[name];
        console.log(`  ✅ ${name}: ${scheme.type} (${scheme.scheme || 'N/A'})`);
    });
} else {
    console.log('  ⚠️  No se encontraron security schemes');
}

console.log('\n' + '='.repeat(60));
console.log('🎯 RESULTADO FINAL:');
if (swaggerSpec.paths && Object.keys(swaggerSpec.paths).length > 0) {
    console.log('✅ CONFIGURACIÓN CORRECTA - Swagger funcionará');
} else {
    console.log('❌ CONFIGURACIÓN INCOMPLETA - Revisar archivos de rutas');
}
console.log('='.repeat(60) + '\n');