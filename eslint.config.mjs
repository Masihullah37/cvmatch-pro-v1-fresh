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
    // Apply globally to all TypeScript and JavaScript files
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    rules: {
      // 1. Turn off the 'const' reassignment warning
      "prefer-const": "off",

      // 2. Turn off the ban on standard @ts-ignore comments
      "@typescript-eslint/ban-ts-comment": "off",

      // 3. Turn off warnings about creating components inside other components (CVRenderer.tsx)
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/static-components": "off"
    }
  }
];

export default eslintConfig;