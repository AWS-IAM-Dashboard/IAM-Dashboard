// eslint.config.js — IAM Dashboard
// Covers: React 18, TypeScript strict, Vite/ESM, shadcn/ui patterns
 
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
 
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
 
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: "./tsconfig.json",
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // ── TypeScript ───────────────────────────────────────────
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // Allow empty arrow functions in AWS SDK calls (common pattern in this repo)
      "@typescript-eslint/no-empty-function": ["warn", { allow: ["arrowFunctions"] }],
 
      // ── React ────────────────────────────────────────────────
      "react/react-in-jsx-scope": "off",        // Not needed with React 18 + Vite
      "react/prop-types": "off",                // TypeScript handles this
      "react/display-name": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
 
      // ── General quality ──────────────────────────────────────
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
    },
  },
 
  // Relax rules for mock / test / type files
  {
    files: ["src/mock/**", "src/tests/**", "src/**/*.test.{ts,tsx}", "src/types/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
 
  {
    ignores: ["dist/", "build/", "node_modules/", "coverage/", "*.config.js"],
  },
];