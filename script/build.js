import { build } from "esbuild";

const [, , outfile] = process.argv;

if (!outfile) {
  console.error("usage: node build.js <outfile>");
  process.exit(1);
}

const addRequire = `// add require()
const require = await (async () => {
	const { createRequire } = await import("node:module");

	return createRequire(import.meta.url);
})();`;

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  sourcemap: true,
  platform: "node",
  target: "node16",
  format: "esm",
  outfile,
  banner: {
    js: addRequire,
  },
});
