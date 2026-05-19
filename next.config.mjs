import nextEnv from '@next/env';
import { validateBuildEnvironment } from './lib/env.js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
validateBuildEnvironment();

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
};

export default nextConfig;
