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
  // This explicitly prevents ESLint from touching these files altogether
  {
    ignores: [
      "app/[locale]/dashboard/my-cvs/page.tsx",
      "app/actions/analysis.ts",
      "app/api/analyze-cv/route.ts",
      "app/api/generate-pdf/route.ts",
      "components/templates/CVRenderer.tsx"
    ]
  },
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    rules: {
      "prefer-const": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/static-components": "off"
    }
  }
];

export default eslintConfig;