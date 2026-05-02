import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase",
              message:
                "Do not import @/lib/supabase. Admin Supabase access must go through Next.js Route Handlers under /api/admin/** (server) or @/apis/admin-api (client). See openspec/changes/admin-supabase-server-routes/.",
            },
            {
              name: "@/apis/supabase-reads",
              message:
                "Do not import @/apis/supabase-reads. Use @/apis/admin-api which calls the server route handlers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/server/**/*.ts", "src/app/api/admin/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default eslintConfig;
