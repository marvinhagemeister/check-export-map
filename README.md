# Check export maps

A simple cli tool that checks if the export map defined in a `package.json` file is correct and that the referenced files/folders exist.

Rules:

- Entries must start with a `.`
- Must have the following entries:
  - `.` = main export when you do `import * as foo from "my-package"`
  - `./package.json` = allow user to import the package's `package.json` file
- Entry type `import` must end with `.mjs`
- Entry file paths must be relative and start with a `.`
- All referenced files/folders must exist on disk

Example of a valid export map in `package.json`:

```json
{
  "name": "preact",
  "exports": {
    ".": {
      "browser": "./dist/preact.module.js",
      "umd": "./dist/preact.umd.js",
      "import": "./dist/preact.mjs",
      "require": "./dist/preact.js"
    },
    "./compat": {
      "browser": "./compat/dist/compat.module.js",
      "umd": "./compat/dist/compat.umd.js",
      "import": "./compat/dist/compat.mjs",
      "require": "./compat/dist/compat.js"
    },
    "./compat/server": {
      "require": "./compat/server.js"
    },
    "./package.json": "./package.json"
  }
}
```

## Usage

Add the package via:

```bash
npm install -D check-export-map
# yarn
yarn add -D check-export-map
```

...and add an script to your `package.json`:

```json
{
	"name": "my-package",
	"scripts": {
		"test": "check-export-map"
	}
}
```

### Global installation

You can install `check-export-map` globally to invoke it from any directory.

```bash
npm install -g check-export-map
```

### CLI documentation

```txt
Check if the export map declared in package.json is valid.

Usage
  check-export-map [options] <...FILES>
	
Options
  -v, --version    Displays current version
  -h, --help       Displays this message
```

## LICENSE

MIT, see the [LICENSE file](./LICENSE).
