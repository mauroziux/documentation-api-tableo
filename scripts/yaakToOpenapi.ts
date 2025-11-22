import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Yaak to OpenAPI Converter
 *
 * This script reads Yaak data files (YAML) from a directory and converts them
 * into an OpenAPI 3.0 specification file.
 */

// --- Configuration ---
const YAAK_DATA_DIR = path.join(process.cwd(), 'api-tableo-collection');
const OUTPUT_FILE = path.join(process.cwd(), 'docs', 'v1', 'openapi.yaml');
const OPTIONS_FILE = path.join(process.cwd(), 'scripts', 'options.json');

// --- Interfaces for Yaak Data ---

interface YaakBase {
    type: string;
    id: string;
    model: string;
    name?: string;
    description?: string;
    sortPriority?: number;
}

interface YaakWorkspace extends YaakBase {
    type: 'workspace';
}

interface YaakFolder extends YaakBase {
    type: 'folder';
    workspaceId: string;
    folderId: string | null;
}

interface YaakEnvironment extends YaakBase {
    type: 'environment';
    workspaceId: string;
    variables: Array<{
        name: string;
        value: string;
        enabled: boolean;
        id: string;
    }>;
    public: boolean;
    base: boolean;
}

interface YaakRequest extends YaakBase {
    type: 'http_request';
    workspaceId: string;
    folderId: string | null;
    method: string;
    url: string;
    headers: Array<{ name: string; value: string; enabled: boolean }>;
    urlParameters: Array<{ name: string; value: string; enabled: boolean }>;
    body: {
        text?: string;
        filePath?: string;
    };
    bodyType: string; // 'application/json' etc
}

interface YaakCollection {
    workspaces: YaakWorkspace[];
    folders: YaakFolder[];
    requests: YaakRequest[];
    environments: YaakEnvironment[];
}

// --- Interfaces for OpenAPI ---

interface OpenApiServer {
    url: string;
    description?: string;
    variables?: Record<string, { default: string; description?: string }>;
}

interface OpenApiParameter {
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    description?: string;
    required?: boolean;
    schema: {
        type: string;
        default?: any;
    };
}

interface OpenApiOperation {
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
    parameters?: OpenApiParameter[];
    requestBody?: {
        content: Record<string, { schema: any; example?: any }>;
        required?: boolean;
    };
    responses: Record<string, any>;
}

interface OpenApiSpec {
    openapi: string;
    info: {
        title: string;
        version: string;
        description?: string;
        contact?: {
            name?: string;
            email?: string;
            url?: string;
        };
    };
    servers: OpenApiServer[];
    paths: Record<string, Record<string, OpenApiOperation>>;
    tags: Array<{ name: string; description?: string }>;
    components: {
        schemas: Record<string, any>;
        securitySchemes: Record<string, any>;
    };
}

// --- Main Logic ---

async function loadYaakData(dir: string): Promise<YaakCollection> {
    const collection: YaakCollection = {
        workspaces: [],
        folders: [],
        requests: [],
        environments: [],
    };

    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

            const content = await fs.readFile(path.join(dir, file), 'utf-8');
            try {
                const data = yaml.load(content) as YaakBase;

                switch (data.type) {
                    case 'workspace':
                        collection.workspaces.push(data as YaakWorkspace);
                        break;
                    case 'folder':
                        collection.folders.push(data as YaakFolder);
                        break;
                    case 'http_request':
                        collection.requests.push(data as YaakRequest);
                        break;
                    case 'environment':
                        collection.environments.push(data as YaakEnvironment);
                        break;
                }
            } catch (e) {
                console.warn(`Failed to parse file ${file}:`, e);
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dir}:`, err);
        throw err;
    }

    return collection;
}

function cleanUrl(url: string): string {
    // Convert Yaak variable syntax ${[var]} to OpenAPI syntax {var}
    let cleaned = url.replace(/\$\{[\s]*\[[\s]*([a-zA-Z0-9_]+)[\s]*\][\s]*\}/g, '{$1}');

    // Remove trailing slashes? OpenAPI usually prefers without, but paths are paths.
    // cleaned = cleaned.replace(/\/$/, '');

    return cleaned;
}

function extractPathParams(url: string): string[] {
    const matches = url.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/[{}]/g, ''));
}

function getFolderHierarchy(folderId: string | null, folders: YaakFolder[]): string[] {
    if (!folderId) return [];

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return [];

    const parentPath = getFolderHierarchy(folder.folderId, folders);
    return [...parentPath, folder.name || 'Unnamed Folder'];
}

function generateOpenApiSchemaFromExample(value: any): any {
    if (typeof value === 'string') {
        if (/^\d+$/.test(value)) {
            return { type: 'integer' };
        } else if (/^\d+\.\d+$/.test(value)) {
            return { type: 'number' };
        } else if (value === 'true' || value === 'false') {
            return { type: 'boolean' };
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return { type: 'string', format: 'date' };
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)) {
            return { type: 'string', format: 'date-time' };
        }
        return { type: 'string' };
    }
    if (value instanceof Date) {
        return { type: 'string', format: 'date' };
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return { type: 'integer' };
        } else {
            return { type: 'number' };
        }
    }
    if (typeof value === 'boolean') {
        return { type: 'boolean' };
    }
    if (Array.isArray(value)) {
        if (value.length > 0) {
            return {
                type: 'array',
                items: generateOpenApiSchemaFromExample(value[0])
            };
        } else {
            return { type: 'array', items: { type: 'object' } };
        }
    }
    if (typeof value === 'object' && value !== null) {
        const properties: any = {};
        const required: string[] = [];
        for (const key in value) {
            properties[key] = generateOpenApiSchemaFromExample(value[key]);
            if (value[key] !== null && value[key] !== undefined) {
                required.push(key);
            }
        }
        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined
        };
    }
    return { type: 'object' }; // fallback
}



function parseDescriptionForTypes(desc: string): Map<string, any> {
    const map = new Map();
    const lines = desc.split('\n');
    for (const line of lines) {
        const match = line.trim().match(/^(string|boolean|int32|int64|Array|Object)\s+(\w+)\s*=/);
        if (match) {
            const typeStr = match[1];
            const field = match[2];
            let type;
            switch (typeStr) {
                case 'string': type = { type: 'string' }; break;
                case 'boolean': type = { type: 'boolean' }; break;
                case 'int32': type = { type: 'integer', format: 'int32' }; break;
                case 'int64': type = { type: 'integer', format: 'int64' }; break;
                case 'Array': type = { type: 'array', items: { type: 'object' } }; break;
                case 'Object': type = { type: 'object' }; break;
            }
            if (type) map.set(field, type);
        }
    }
    return map;
}

function applyTypeHints(schema: any, typeMap: Map<string, any>): any {
    if (schema && typeof schema === 'object') {
        if (schema.properties) {
            for (const key in schema.properties) {
                if (typeMap.has(key)) {
                    schema.properties[key] = typeMap.get(key);
                }
                if (schema.properties[key].properties || schema.properties[key].items) {
                    schema.properties[key] = applyTypeHints(schema.properties[key], typeMap);
                }
            }
        }
        if (schema.items) {
            schema.items = applyTypeHints(schema.items, typeMap);
        }
    }
    return schema;
}

async function convertYaakToOpenApi() {
    console.log('🚀 Starting Yaak to OpenAPI conversion...');

    // 1. Load Yaak data
    const yaakData = await loadYaakData(YAAK_DATA_DIR);

    if (yaakData.workspaces.length === 0) {
        console.error('No workspace found in Yaak collection.');
        process.exit(1);
    }

    const workspace = yaakData.workspaces[0]; // Assume primary workspace
    console.log(`Found workspace: ${workspace.name}`);



    // 2. Load Options (optional overrides)
    let options: any = {};
    try {
        const optionsContent = await fs.readFile(OPTIONS_FILE, 'utf-8');
        options = JSON.parse(optionsContent);
    } catch (e) {
        console.log('No options.json found or invalid, using defaults.');
    }

    // Initialize OpenAPI Structure
    const openApi: OpenApiSpec = {
        openapi: '3.1.0',
        info: {
            title: workspace.name || 'API Documentation',
            version: options.info?.version || '1.0.0',
            description: workspace.description || 'Generated from Yaak Collection',
            contact: options.info?.contact
        },
        servers: options.servers || [],
        paths: {},
        tags: [],
        components: {
            schemas: {},
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    };

    // If no servers defined in options, build from all public Yaak Environments
    if (openApi.servers.length === 0) {
        for (const e of yaakData.environments.filter(e => e.public)) {
            const urlVar = e.variables.find(v => v.name === 'url');
            if (urlVar) {
                openApi.servers.push({
                    url: urlVar.value,
                    description: e.name
                });
            }
        }
    }

    // 5. Process Requests -> Paths
    for (const req of yaakData.requests) {
        if (!req.url) continue;

        const rawUrl = cleanUrl(req.url);

        let pathStr = rawUrl;
        if (pathStr.startsWith('{url}')) {
            pathStr = pathStr.substring(5);
        } else if (pathStr.startsWith('http')) {
            try {
                const u = new URL(pathStr);
                pathStr = u.pathname;
            } catch (e) {
            }
        }

        if (!pathStr.startsWith('/')) {
            pathStr = '/' + pathStr;
        }

        if (!openApi.paths[pathStr]) {
            openApi.paths[pathStr] = {};
        }

        const method = req.method.toLowerCase();

        const hierarchy = getFolderHierarchy(req.folderId, yaakData.folders);
        const tags = hierarchy.length > 0 ? [hierarchy.join(' / ')] : ['General'];

        const parameters: OpenApiParameter[] = [];

        const pathParams = extractPathParams(pathStr);
        pathParams.forEach(param => {
            parameters.push({
                name: param,
                in: 'path',
                required: true,
                schema: { type: 'string' }
            });
        });

        if (req.urlParameters) {
            req.urlParameters.filter(p => p.enabled && p.name && p.name.trim()).forEach(p => {
                let paramSchema = generateOpenApiSchemaFromExample(p.value);
                if (typeof p.value === 'string' && (p.value.includes('nextFridayUnixTime') || p.value.includes('dateAdd'))) {
                    paramSchema = { type: 'integer', format: 'int64' };
                }
                const description = '';
                parameters.push({
                    name: p.name,
                    in: 'query',
                    description: description,
                    schema: paramSchema
                });
            });
        }

        if (req.headers) {
            req.headers.filter(p => p.enabled && p.name && p.name.trim() && p.name.toLowerCase() !== 'content-type').forEach(p => {
                let paramSchema = generateOpenApiSchemaFromExample(p.value);
                if (typeof p.value === 'string' && (p.value.includes('nextFridayUnixTime') || p.value.includes('dateAdd'))) {
                    paramSchema = { type: 'integer', format: 'int64' };
                }
                const description = '';
                parameters.push({
                    name: p.name,
                    in: 'header',
                    required: true,
                    description: description,
                    schema: paramSchema
                });
            });
        }

        let requestBody;
        if (req.body && req.body.text && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const contentType = req.headers?.find(h => h.name.toLowerCase() === 'content-type')?.value || 'application/json';

            let example = req.body.text;
            let schema: any = { type: 'object' };

            try {
                if (contentType.includes('json')) {
                    const parsed = JSON.parse(req.body.text);
                    example = parsed;
                    schema = generateOpenApiSchemaFromExample(example);
                }
            } catch (e) {
            }

            const typeMap = parseDescriptionForTypes(req.description);
            schema = applyTypeHints(schema, typeMap);

            requestBody = {
                content: {
                    [contentType]: {
                        schema: schema,
                        example: example
                    }
                }
            };
        }

        const operation: OpenApiOperation = {
            summary: req.name,
            description: req.description,
            tags: tags,
            parameters: parameters,
            requestBody: requestBody,
            responses: {
                '200': {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: (() => {
                                const typeMap = parseDescriptionForTypes(req.description);
                                let responseSchema = { type: 'object', properties: Object.fromEntries(typeMap.entries()) };
                                responseSchema = applyTypeHints(responseSchema, typeMap);
                                return responseSchema;
                            })()
                        }
                    }
                }
            }
        };

        openApi.paths[pathStr][method] = operation;
    }

    // 6. Write Output
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

    // Dump to YAML
    const yamlStr = yaml.dump(openApi, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
    });

    await fs.writeFile(OUTPUT_FILE, yamlStr, 'utf-8');
    console.log(`✅ OpenAPI specification generated at: ${OUTPUT_FILE}`);
}

// Run the conversion
convertYaakToOpenApi().catch(err => {
    console.error('Conversion failed:', err);
    process.exit(1);
});
