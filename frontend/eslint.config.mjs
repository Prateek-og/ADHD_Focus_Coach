import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Calling an async fetch function inside useEffect is a standard React pattern.
      // The rule incorrectly flags async calls that internally call setState.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
