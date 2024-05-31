# Development guide

## Quick start

1. Install [Node.js](https://nodejs.org/en).
2. Navigate to the repo root and run `npm run start:dev:clean`. This command will clean the repo (if any garbage), install dependencies, build httpiness and start electron in development mode.
3. For changes in *renderer process* codebase to be visible, run `npm run build:dev` and refresh the electron application (by pressing `Ctrl+R` for example). For changes in *main process* codebase to be visible, electron instance needs to be restarted.

## Directory structure

Currently, the repo contains following directories:

- **.github** - Contains GitHub Actions workflows YAML specifications.
- **.vscode** - Contains VSCode configuration files.
- **dist** - Contains build output and files which are direct input for build process (static resources, for example).
  - **electron-workspace** - This a directory in which `electron-builder` or `electron` can be run. It contains special package.json, as well as all resources which are needed as input for `electron-builder` or `electron`. `webpack` outputs for main and renderer processes (`main.js` and `renderer.js`) are generated in this directory. This directory is committed to git (as resources are stored here), except for ephemeral files (like `main.js` and `renderer.js`).
  - **bin** - This directory contains actual output of `electron-builder`, i.e. httpiness build artifacts. This is ephemeral directory which is created during build process and is not committed to git.
- **docs** - Contains internal documentation.
- **src** - Contains actual TypeScript source.
  - **main** - Contains `main` process entry point and its dependencies.
  - **renderer** - Contains `renderer` process entry point and its dependencies. For details about renderer and main process in Chromium and electron, please check electron documentation.
    - **ui** - This directory contains code of UI layer. Code in this directory, when properly compiled, should be loadable in the browser. It means that it **MUST** exclusively depend on standard browser APIs. If it needs to access non-browser APIs (for example, *node* APIs like `fs`), these APIs **MUST** be wrapped within proper abstraction layer within *lib* directory. The reason for this explicit segregation is to allow easy porting of httpiness from electron to browser; if *ui* directory contains browser-loadable code, then only files in *lib* directory needs to be reimplemented for browser.  
    - **lib** - This directory contains files which operate with *non-browser* APIs (node APIs, for example).
- **test** - Contains test-related files.
  - **manual** - Contains manual testing plan with companion resources.
  - **unit** - Contains small collection of unit tests where sensitive algorithmic logic is tested.

## Command-line scripts for repository management

All commands are intended to be run from the repo root.

### `build:*` commands

- `npm run build:dev` - Runs dev build only for renderer process. For main process to be build, run `start:dev` command. This command is used during development of renderer codebase, after electron dev instance is started using `start:dev`. After change in render code in created, run this command and refresh the electron app (by pressing `Ctrl+R`, for example).
- `npm run build:prod` - Runs production build for renderer and main processes and then builds httpiness executable and installers using electron-builder.
- `npm run build:prod:clean` - This is a convenience command that runs sequentially: `npm run clean`, `npm install` and `npm run build:prod`.

### `start:*` commands

- `npm run start:dev` - Builds renderer and main codebase and runs development electron instance. Use this command during development.
- `npm run start:dev:clean` - This is a convenience command that runs sequentially: `npm run clean`, `npm install` and `npm run start:dev`.
- `npm run start:prod` - Starts production httpiness executable in `dist/bin` (if it has been previously built). Use this command if you want to use httpiness as an end product.
- `npm run start:prod:clean` - This is a convenience command that runs sequentially: `npm run clean`, `npm install`, `npm run build:prod` and `npm run start:prod`.

### Other commands

- `npm run clean` - Cleans the repo by calling `git clean -dfX`. Deletes all git-ignored files, including `node_module` directories and build artifacts. This command will delete all *git-ignored* files but will leave all *non-git-ignored but untracked* files (new source code files won't be deleted).
- `npm run test` - Runs unit tests.
- `npm run lint` - Runs linter.

## Development workflow

### Dev cycle

During development, electron dev instance should be used. It is started by running `npm run start:dev`.

Developers are modifying either code base of (1) renderer process, or (2) main process. For difference between main and renderer process, check out [Electron documentation](https://www.electronjs.org/docs/latest/tutorial/process-model). These code bases do not overlap and do not depend on each other; they are segregated in their respective directories as explained above.

When renderer process code-base is changed, it is sufficient to rebuild it by running `npm run build:dev` and refresh the web-page loaded in the dev instance of electron (by pressing `Ctrl+R` for example). httpiness caches its state, so, for example, it should show load the same list of requests that were opened before refresh.

When main process code-base is changed, it is necessary to restart electron dev instance, for example by ending existing process in command line (press `Ctrl+C`) and starting it again (by calling `npm run start:dev`).

### Debugging

It is possible to open Chrome dev tools in Electron instance by pressing `Ctrl+Shift+I`. There's no debugging configuration prepared for VSCode, so resort to using console for debugging data.

### Tests

Directory `test/manual` contains modest manual testing plan for manual testing. `httpiness-test.json` collection contains predefined requests where majority of httpiness features are utilized and can be tested.

Directory `test/unit` contains small collection of unit tests for sensitive algorithmic logic.

### Linting

TypeScript linter is configured. Run it by `npm run lint`.

## Distributing binaries

Binaries need to be properly signed and notarized in order to be run on modern operating systems without security warnings. This is true for both httpiness executable as well as installers (NSIS for Windows, dmg for macOS). Have in mind that these warnings are not usually shown on the machine where binaries are build even if they are *not* signed and notarized.

In order to sign binaries, it is necessary to buy proper code-signing certificate. Overview of code-signing certificates is beyond of scope of this readme. Once you obtain certificate, follow [electron-builder documentation](https://www.electron.build/code-signing) to configure signing using your certificate.

However, signing alone is not always sufficient to avoid security warnings on some operating systems; it is also necessary to notarize application (submit application to OS vendor for pre-distribution scan). Different OS vendors are handling notarization differently; for example, macOS uses `notarytool` command-line tool which is installed as part of XCode tool-set.
