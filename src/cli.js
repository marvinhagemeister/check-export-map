#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const kolorist = require("kolorist");
const mri = require("mri");

const readJSON = file => JSON.parse(fs.readFileSync(file, "utf8"));

const argv = process.argv.slice(2);
const args = mri(argv, {
	boolean: ["version", "help"],
	alias: { v: "version", h: "help" },
});

const files = args._;
if (args.help) {
	console.log(`Check if the export map declared in package.json is valid.

Usage
  check-export-map [options] <...FILES>
	
Options
  -v, --version    Displays current version
  -h, --help       Displays this message`);
	process.exit(0);
} else if (args.version) {
	const localPkg = path.join(__dirname, "..", "package.json");
	console.log(readJSON(localPkg).version);
	process.exit(0);
}

if (!files.length) {
	files.push(path.join(process.cwd(), args));
}

if (files.length === 0) {
	files.push(path.join(process.cwd(), "package.json"));
}

const success = msg => kolorist.inverse(kolorist.green(` ${msg} `));
const fail = msg => kolorist.inverse(kolorist.red(` ${msg} `));
const error = (file, msg) => {
	console.log(`${fail("FAIL")} ${file}`);
	console.log(`  ${kolorist.red(msg)}`);

	process.exit(1);
};

function validateValue(relative, dir, entry, value, type) {
	if (!value.startsWith(".")) {
		error(
			relative,
			`File paths must be relative and start with a dot. Got "${value}" instead`,
		);
	} else if (!fs.existsSync(path.join(dir, value))) {
		error(
			relative,
			`File not found for "${entry}" ${type ? type + ": " : ""}${value}`,
		);
	}
}

console.log("Checking export maps...");

for (const file of files) {
	const pkg = readJSON(file);
	const dir = path.dirname(file);
	const relative = path.relative(process.cwd(), file);

	const seen = new Set();
	let hasDotEntry = false;
	let hasRootEntry = false;
	let hasPackageJsonEntry = false;

	for (const entry in pkg.exports) {
		if (seen.has(entry)) {
			error(relative, `Duplicate entry "${entry}".`);
		}
		seen.add(entry);

		if (!entry.startsWith(".")) {
			error(
				relative,
				`Export map entries must be relative and start with a ".", got "${entry}" instead.`,
			);
		}

		const value = pkg.exports[entry];

		if (entry === ".") {
			hasDotEntry = true;
		} else if (entry === "./package.json") {
			hasPackageJsonEntry = true;

			if (value !== "./package.json") {
				error(
					relative,
					`Entry "./package.json" should have value "./package.json". Got "${value}" instead`,
				);
			}
		} else if (entry === "./") {
			hasRootEntry = true;

			if (value !== "./") {
				error(
					relative,
					`Entry "./" should have value "./". Got "${value}" instead`,
				);
			}
		}

		if (typeof value === "string") {
			validateValue(relative, dir, entry, value);
		} else {
			for (const type in value) {
				if (type.startsWith(".")) {
					error(
						relative,
						`Entry type must not start with a dot. Got "${type}"`,
					);
				} else if (type === "import" && !value[type].endsWith(".mjs")) {
					error(
						relative,
						`Value of entry type "import" must end with ".mjs". Got ${value[type]} instead`,
					);
				}
				validateValue(relative, dir, entry, value[type], type);
			}
		}
	}

	if (!hasDotEntry) {
		error(relative, 'Export map does not have a "." entry.');
	} else if (!hasPackageJsonEntry) {
		error(relative, 'Export map does not have a "./package.json" entry.');
	} else if (!hasRootEntry) {
		error(relative, 'Export map does not have a "./" entry.');
	}

	console.log(`${success("PASS")} ${relative}`);
}
