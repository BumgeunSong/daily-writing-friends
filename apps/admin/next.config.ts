import { loadEnvConfig } from "@next/env";
import path from "path";
import type { NextConfig } from "next";

// Load env from monorepo root so all apps share a single .env file
loadEnvConfig(path.resolve(__dirname, "../.."));

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
