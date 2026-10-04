import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@neondatabase/serverless"],
  outputFileTracingRoot: projectRoot,
};

export default config;
