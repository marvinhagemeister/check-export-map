const { spawn } = require("child_process");
const assert = require("assert").strict;
const path = require("path");
const fs = require("fs");

async function run(...args) {
	const child = spawn("node", ["../src/index.js", ...args], {
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

	it("should fail if there is no './' entry", async () => {
		const out = await run("no-root-entry/package.json");
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
	});
});
