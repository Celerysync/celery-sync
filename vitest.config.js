import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import process from "node:process";

// Run in Australian time: that's where date bugs show up (UTC is still
// "yesterday" until 10-11am), and where most users are.
process.env.TZ = "Australia/Sydney";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{js,jsx}"],
    setupFiles: ["test/setup.js"],
    // Never a real project: tests can't reach the live database.
    env: {
      VITE_SUPABASE_URL: "https://test.invalid",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
