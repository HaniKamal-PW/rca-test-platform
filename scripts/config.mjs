import { readFileSync } from "node:fs";
import YAML from "yaml";
export const cfg = YAML.parse(readFileSync("platform.config.yaml", "utf8"));
export const projectOf = (key) => String(key).split("-")[0].toUpperCase();
