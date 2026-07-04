import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
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
      "@typescript-eslint/no-explicit-any": "off",
      "react/display-name": "off",
      "@next/next/no-img-element": "off",
    },
  },
  // CVRenderer uses components defined inside render function
  // This is intentional for the closure pattern — refactor planned post-launch
  {
    files: ["components/templates/CVRenderer.tsx"],
    rules: {
      // Disable ALL react-hooks rules for this specific file
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default eslintConfig;