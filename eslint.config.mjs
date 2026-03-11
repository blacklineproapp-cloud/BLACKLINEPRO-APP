import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "plugin:@typescript-eslint/recommended"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];

export default eslintConfig;
