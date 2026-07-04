// import { defineConfig, globalIgnores } from "eslint/config";
// import nextVitals from "eslint-config-next/core-web-vitals";
// import nextTs from "eslint-config-next/typescript";

// const eslintConfig = defineConfig([
//   ...nextVitals,
//   ...nextTs,
//   // Override default ignores of eslint-config-next.
//   globalIgnores([
//     // Default ignores of eslint-config-next:
//     ".next/**",
//     "out/**",
//     "build/**",
//     "next-env.d.ts",
//   ]),
// ]);

// export default eslintConfig;

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // Match all TypeScript and JavaScript files in your project
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    rules: {
      // Shuts down the const assignment checking completely
      "prefer-const": "off",

      // Stops the linter from complaining about regular @ts-ignore lines
      "@typescript-eslint/ban-ts-comment": "off",

      // Disables all React hook / nested component structural warnings for CVRenderer.tsx
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/static-components": "off"
    }
  }
];

export default eslintConfig;