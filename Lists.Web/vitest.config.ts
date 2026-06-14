import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [
        react(),
        babel({ presets: [reactCompilerPreset()] }),
    ],
    test: {
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.test.{ts,tsx}",
                "src/**/*.d.ts",
                "src/main.tsx",
                "src/test/**",
            ],
        },
        environment: "jsdom",
        setupFiles: "./src/test/setup.ts",
    },
});
