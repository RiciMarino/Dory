import { readFileSync, writeFileSync } from "node:fs";

// Run after `pnpm build`. The generated file is ignored by Git.
const path = "dist/server/wrangler.json";
// Cloudflare D1 binding identifiers are public configuration, not credentials.
const databaseId = "1a5ee00a-aaff-4553-8d78-2a8b24eb4e8a";

const config = JSON.parse(readFileSync(path, "utf8"));
config.name = "dory-prenotazioni";
config.topLevelName = config.name;
config.d1_databases = [{
  binding: "DB",
  database_name: "dory-prenotazioni",
  database_id: databaseId,
}];
// The build already sets the Worker entrypoint and static assets paths relative
// to dist/server. Retain those generated values instead of guessing them.
writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
console.log("Cloudflare Worker configuration prepared with DB binding.");
