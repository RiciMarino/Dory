import { readFileSync, writeFileSync } from "node:fs";

// Run after `pnpm build`. The generated file is ignored by Git.
const path = "dist/server/wrangler.json";
const databaseId = process.env.DORY_D1_DATABASE_ID;
if (!databaseId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databaseId)) {
  throw new Error("Set DORY_D1_DATABASE_ID to the UUID of Dory's own Cloudflare D1 database.");
}

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
