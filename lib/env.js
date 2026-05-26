const PUBLIC_ENV = [
  'NEXT_PUBLIC_ADMIN_API',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'NEXT_PUBLIC_REDIRECT_URI',
];

const SERVER_ENV = [
  'GOOGLE_CLIENT_SECRET',
];

function cleanBaseUrl(value) {
  return String(value || '').replace(/\/$/, '');
}

function missing(keys) {
  return keys.filter(key => !process.env[key]);
}

export function getPublicRuntimeConfig() {
  const missingKeys = missing(PUBLIC_ENV);
  if (missingKeys.length) {
    throw new Error(`Missing required public environment variables: ${missingKeys.join(', ')}`);
  }

  return {
    adminApi: cleanBaseUrl(process.env.NEXT_PUBLIC_ADMIN_API),
    takneekApi: cleanBaseUrl(process.env.NEXT_PUBLIC_TAKNEEK_API || ''),
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
    metadataUploadEnabled: Boolean(process.env.R2_METADATA_URL),
    ffmpegWasmUrl: process.env.NEXT_PUBLIC_FFMPEG_WASM_URL || '',
    ffmpegCoreUrl: process.env.NEXT_PUBLIC_FFMPEG_CORE_URL || '',
    ffmpegCoreWasmUrl: process.env.NEXT_PUBLIC_FFMPEG_CORE_WASM_URL || '',
  };
}

export function getServerConfig() {
  const missingKeys = missing([...PUBLIC_ENV, ...SERVER_ENV]);
  if (missingKeys.length) {
    throw new Error(`Missing required server environment variables: ${missingKeys.join(', ')}`);
  }

  return {
    ...getPublicRuntimeConfig(),
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    r2MetadataUrl: cleanBaseUrl(process.env.R2_METADATA_URL || ''),
    r2MetadataToken: process.env.R2_METADATA_TOKEN || '',
  };
}

export function getAdminApiBase() {
  const adminApi = cleanBaseUrl(process.env.NEXT_PUBLIC_ADMIN_API);
  if (!adminApi) throw new Error('Missing NEXT_PUBLIC_ADMIN_API');
  return adminApi;
}

export function validateBuildEnvironment() {
  const missingKeys = missing([...PUBLIC_ENV, ...SERVER_ENV]);
  if (missingKeys.length) {
    throw new Error(`Missing required build environment variables: ${missingKeys.join(', ')}`);
  }
}
