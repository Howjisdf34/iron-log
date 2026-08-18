import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // La traza de output standalone a veces omite node_modules/@swc/helpers/esm
  // con pnpm (issue conocido de Next.js), y el server lo pide en runtime.
  // Se fuerza su inclusión explícita para no depender de que la traza lo
  // detecte sola.
  outputFileTracingIncludes: {
    "*": ["./node_modules/@swc/helpers/**/*"],
  },
};

export default nextConfig;
