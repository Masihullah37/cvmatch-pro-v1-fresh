import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      // Bracket paths need glob escape with \[ and \]
      "app/\\[locale\\]/**",
      "app/actions/analysis.ts",
      "app/api/analyze-cv/route.ts",
      "app/api/generate-pdf/route.ts",
      "components/templates/CVRenderer.tsx",
      ".next/**",
      "node_modules/**",
      "drizzle/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    rules: {
      "prefer-const": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/static-components": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;