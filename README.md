Parametric Analysis Tool (PAT)
==============

The Parametric Analysis Tool (PAT) is part of the OpenStudio collection of software tools. It is an electron app.

For more information and documentation on OpenStudio, visit the [OpenStudio website](https://www.openstudio.net/) or the [OpenStudio GitHub](https://github.com/NREL/OpenStudio) repo.  User support is available via the community moderated question and answer resource [unmethours.com](https://unmethours.com/questions/).

If you find a bug, you can help us by [submitting an issue](https://github.com/NREL/OpenStudio-PAT/issues).  Guidelines for issue submission and prioritization can be found on the [OpenStudio wiki](https://github.com/NREL/OpenStudio/wiki/Issue-Prioritization).

<br />

# Testing

[![Playwright Tests](https://github.com/NREL/OpenStudio-PAT/actions/workflows/playwright.yml/badge.svg)](https://github.com/NREL/OpenStudio-PAT/actions/workflows/playwright.yml)

PAT uses [playwright](https://playwright.dev/) to conduct automated E2E testing. For more information, please see the [TESTING.md](TESTING.md) file.

<br />

# Development

## Getting started

1. Install node v18.7.0 and npm v8 if you don't have them already. You can [use these commands](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#checking-your-version-of-npm-and-nodejs) to check if they are installed. If you don't have them, you can download them with a [Node version manager](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#checking-your-version-of-npm-and-nodejs) (recommended), an OS-compatible [package manager](https://nodejs.org/en/download/package-manager/), or a [pre-built installer](https://nodejs.org/en/download/current/).

2. Use the following commands to clone the PAT repo and install all dependencies:
	```
	git clone https://github.com/NREL/OpenStudio-PAT.git
	npm install
	npx gulp installDeps
	```

3. Start the PAT application in develop mode:
	```
	npm run start
	```

<br />

## Building PAT Executable (MacOS / Windows)
1. Run the release script to build and package the application into `./tmp`.
	```
	npm run release
	```
2. Copy the folders under `./depend` to the following directory.
	* MacOS: `./tmp/ParametricAnalysisTool.app/Contents/Resources`
	* Windows: `./tmp/pat`
3. The executable should now be ready to use.
	* MacOS: `./tmp/ParametricAnalysisTool.app`
	* Windows: `./tmp/pat/ParametricAnalysisTool.exe`

<br />

## Building PAT Installer Package (MacOS / Windows / Linux)

We tested our Linux-specific instructions on Ubuntu 22.04, but they should also work for other Debian-based distributions.

1. Install the IDE/compiler for your operating system, if you don't have it already.
	* MacOS: [XCode](https://apps.apple.com/us/app/xcode/id497799835) - we tested with v13.4.1
	* Windows: [Visual Studio Community](https://visualstudio.microsoft.com/downloads/) - we tested with v17.3.0 (2022)
	* Linux: Run `sudo apt install g++`

2. Install [CMake](https://cmake.org/) if you don't have it already. We tested with v3.24.0.
	* MacOS: Run `brew install cmake` to install it using [Homebrew](https://brew.sh/) or download it with [the official installer](https://cmake.org/download/)
	* Windows: Download it with [the official installer](https://cmake.org/download/)
	* Linux: Run `sudo apt install cmake`

3. **For MacOS / Windows only,** install and configure the [Qt Installer Framework (QtIFW)](https://doc.qt.io/qtinstallerframework/index.html).
	* Download QtIFW using [the official installer](https://download.qt.io/official_releases/qt-installer-framework/) if you don't have it already. We tested with v4.4.1.
	* Configure your `PATH` variable. If you installed a version other than 4.4.1, replace 4.4.1 with the version you installed.
		* MacOS: Add the following lines to `~/.zshrc` or similar (shell-dependent):
			```
			export PATH="$HOME/Qt/QtIFW-4.4.1/bin:$PATH"
			```
		* Windows: Search for and select "View advanced system settings" from the start menu. Click the "Environment variables..." button, edit the "Path" variable, and add the following path:
			```
			C:\Qt\QtIFW-4.4.1\bin
			```

4. Generate the cmake files.
	* Open a terminal window and `cd` to the `OpenStudio-PAT` project root.
	* Run the following commands to create a new "build" folder and `cd` into it.
		```
		mkdir build
		cd build
		```
	* Run the appropriate command to generate the files.
		* MacOS:
			* For ARM64 (Apple Silicon) builds:
				```
				cmake -DCMAKE_OSX_DEPLOYMENT_TARGET=12.1 -DCMAKE_OSX_ARCHITECTURES="arm64" -DCMAKE_BUILD_TYPE=Release ../
				```
			* For Intel (x86_64) builds:
				```
				cmake -DCMAKE_OSX_DEPLOYMENT_TARGET=12.1 -DCMAKE_OSX_ARCHITECTURES="x86_64" -DCMAKE_BUILD_TYPE=Release ../
				```
		* Windows:
			```
			cmake -G "Visual Studio 17 2022" -A x64 ../
			```
		* Linux (ignore any `QtIFW not found in PATH` warning):
			```
			cmake -DCPACK_BINARY_DEB=ON \
				-DCPACK_BINARY_IFW=OFF \
				-DCPACK_BINARY_TGZ=OFF \
				-DCPACK_BINARY_TZ=OFF \
				-DCPACK_BINARY_STGZ=OFF \
				-DCPACK_BINARY_TBZ2=OFF \
				-DCMAKE_BUILD_TYPE=Release \
				../
			```

5. Run the appropriate command to build PAT. The `-j` option sets the maximum number of processes to use.
	* MacOS:
		```
		make -j 8 package
		```
	* Windows:
		```
		cmake --build . --target package -j 8 --config Release
		```
	* Linux:
		```
		cmake --build . --target package -j 8
		```

6. The installer package should now be ready to use.
	* MacOS ARM64: `./build/ParametricAnalysisTool-x.x.x-Darwin-arm64.dmg`
	* MacOS Intel: `./build/ParametricAnalysisTool-x.x.x-Darwin-x86_64.dmg`
	* Windows: `./build/ParametricAnalysisTool-x.x.x-Windows.exe`
	* Linux: `./build/ParametricAnalysisTool-x.x.x-Linux.deb`