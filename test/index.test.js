const { spawn } = require("child_process");
const assert = require("assert").strict;
const path = require("path");
const fs = require("fs");

async function run(...args) {
	const child = spawn("node", ["../src/cli.js", ...args], {
		encoding: "utf-8",
		cwd: __dirname,
	});

	const out = [];
	child.stdout.on("data", msg => out.push(msg));
	child.stderr.on("data", msg => out.push(msg));

	await new Promise(resolve => {
		child.on("exit", resolve);
	});

	return out.join("\n").trim();
}

describe("check-export-map", () => {
	it("should support -v,--v", async () => {
		const pkg = JSON.parse(
			fs.readFileSync(path.join("__dirname", "..", "package.json"), "utf-8"),
		);
		assert.equal(await run("-v"), pkg.version);
		assert.equal(await run("--version"), pkg.version);
	});

	it("should support -h,--help", async () => {
		const out = await run("-h");
		assert(/Options/.test(out));
	});

	it("should skip file if no 'exports' field is found", async () => {
		const out = await run("no-exports/package.json");
		assert(/Skipping/.test(out));
	});

	it("should pass all checks", async () => {
		const out = await run("success/package.json");
		assert(/PASS/.test(out));
	});

	it("should fail if value is not relative", async () => {
		const out = await run("non-relative-value/package.json");
		assert(/FAIL/.test(out), out);
	});

	it("should fail if there is no '.' entry", async () => {
		const out = await run("no-dot-entry/package.json");
		assert(/FAIL/.test(out), out);
	});

	it("should fail if there is no './package.json' entry", async () => {
		const out = await run("no-package-json/package.json");
		assert(/FAIL/.test(out), out);
	});

	it("should fail if './package.json' entry doesn't have value './package.json'", async () => {
		const out = await run("wrong-package-json-value/package.json");
		assert(/FAIL/.test(out), out);
	});

	it("should fail if './' entry value is not './'", async () => {
		const out = await run("wrong-root-entry/package.json");
		assert(/FAIL/.test(out), out);
	});

	it("should fail if './package.json' entry doesn't have value './package.json'", async () => {
		const out = await run("wrong-package-json-value/package.json");
		assert(/FAIL/.test(out), out);
	});

	describe("Object syntax", () => {
		it("should fail if entry value is not relative", async () => {
			const out = await run("object-not-relative/package.json");
			assert(/FAIL/.test(out), out);
		});

		it("should fail if entry type starts with a dot", async () => {
			const out = await run("object-type-dot/package.json");
			assert(/FAIL/.test(out), out);
		});

		it("should fail if 'import' entry type value doesn't end with .mjs without package.json type module", async () => {
			const out = await run("object-mjs-1/package.json");
			assert(/FAIL/.test(out), out);
		});

		it("should accept if 'import' entry type value end with .js and package.json type module", async () => {
			const out = await run("object-mjs-2/package.json");
			assert(/PASS/.test(out), out);
		});

		describe("Format ordering", () => {
			it("should ensure a consistent order for formats", async () => {
				const out = await run("object-format-order-1/package.json");
				assert(/FAIL/.test(out), out);
				assert(/Expected order/.test(out), out);
			});

			it("should ensure a consistent order for formats", async () => {
				const out = await run("object-format-order-2/package.json");
				assert(/FAIL/.test(out), out);
				assert(/Expected order/.test(out), out);
			});

			it("should ensure a consistent order for formats", async () => {
				const out = await run("object-format-order-3/package.json");
				assert(/PASS/.test(out), out);
			});
		});
	});

	describe("Wildcards", () => {
		it("should throw if '*' is not at the end", async () => {
			const out = await run("wildcard-invalid/package.json");
			assert(/FAIL/.test(out), out);
			assert(/wildcard character/.test(out), out);
		});

		it("should check that both entry and value have an asteriks", async () => {
			const out = await run("wildcard-invalid-2/package.json");
			assert(/FAIL/.test(out), out);
			assert(/Didn't find a wildcard/.test(out), out);
		});

		it("should check that resolved directory exists", async () => {
			const out = await run("wildcard-invalid-3/package.json");
			assert(/FAIL/.test(out), out);
			assert(/Folder .* doesn't exist/.test(out), out);
		});

		it("should pass", async () => {
			const out = await run("wildcard/package.json");
			assert(/PASS/.test(out), out);
		});
	});
});
