# Check export maps

A simple cli tool that checks if the export map defined in a `package.json` file is correct and that the referenced files/folders exist.

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