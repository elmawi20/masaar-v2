import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";

const eslintConfig = [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scratch/**",
      "scripts/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "node_modules/**",
    ],
  },
];

export default eslintConfig;
