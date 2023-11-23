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
	} else if (entry.indexOf("*") > -1) {
		// Wildcard MUST be placed at the end
		if (!entry.endsWith("*")) {
			error(
				relative,
				`Invalid entry "${entry}". A wildcard character must always be positioned at the end`,
			);
		}
		// The value must include a wildcard character
		else if (value.indexOf("*") === -1) {
			error(
				relative,
				`Invalid value for entry "${entry}". Didn't find a wildcard character in "${value}".`,
			);
		}

		// Check that the resolved directory exists
		let subPath = value.substr(0, value.indexOf("*"));

		// Ensure we don't check partial filenames, just the directory
		if (!subPath.endsWith(path.posix.sep)) {
			subPath = path.posix.dirname(subPath);
		}

		// Normalize path separator (for windows)
		subPath = subPath.split(path.posix.sep).join(path.sep);

		const resolvedDir = path.join(dir, subPath);
		if (!fs.existsSync(resolvedDir)) {
			error(
				relative,
				`Invalid subpath for "${entry}" ${
					type ? type + ": " : ""
				}${value}. Folder "${resolvedDir}" doesn't exist.`,
			);
		}
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
	if (!("exports" in pkg)) {
		console.log(`No "exports" field found in ${file}. Skipping...`);
		continue;
	}

	const dir = path.dirname(file);
	const relative = path.relative(process.cwd(), file);

	const seen = new Set();
	let hasDotEntry = false;
	let hasPackageJsonEntry = false;

	/**
	 * Ensure that the order of formats for package entries is consistent
	 * as node will pick the first matching format. So the order of formats
	 * matter for node...
	 * @type {Map<string, number>}
	 */
	const order = new Map();

	// ...for that find the entry with the most formats
	let biggestEntry;
	let biggestEntrySize = 0;
	for (const entry in pkg.exports) {
		const value = pkg.exports[entry];
		if (typeof value !== "object") continue;

		const size = Object.keys(value).length;
		if (size > biggestEntrySize) {
			biggestEntrySize = size;
			biggestEntry = value;
		}
	}

	if (biggestEntry !== undefined) {
		let i = 0;
		for (const format in biggestEntry) {
			order.set(format, i++);
		}
	}

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
			let lastOrder = -1;

			for (const type in value) {
				let newOrder = order.get(type);
				if (newOrder < lastOrder) {
					const expected = Array.from(order.keys())
						.map(f => `"${f}"`)
						.join(", ");
					const actual = Array.from(Object.keys(value))
						.map(f => `"${f}"`)
						.join(", ");

					error(
						relative,
						`Inconsistent ordering of entry formats. Expected order is ${expected}, but got ${actual}`,
					);
				}

				lastOrder = newOrder;

				if (type.startsWith(".")) {
					error(
						relative,
						`Entry type must not start with a dot. Got "${type}"`,
					);
				} else if (
					type === "import" &&
					!value[type].endsWith(".mjs") &&
					pkg.type !== "module"
				) {
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
	}

	console.log(`${success("PASS")} ${relative}`);
}
