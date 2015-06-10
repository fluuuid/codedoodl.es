# TODO

* comprehensive step-by-step guide for contributing doodles
* link to main CONTRIBUTING.md for site / infrastructure contribution documentation

___

# Contributing doodles

The sketches on codedoodl.es are 100% community-sourced. The submission / review / approval process is handled entirely in the open on GitHub - fork this repo, create a doodle, submit pull request, the reviewers will then feedback / approve and merge in to the repo.

### Minimum requirements

These are the minimum number of files required for each doodle, these will be used to display / reference each individual doodle on the site / extension.

_ProTip - use the `createDoodle.js` utility script included in the repo, it will create these minimum required files for you, and populate the manifest based on your answers to CLI prompts._

* <code>**index.html**</code>

	Every doodle must have a single `index.html` file as an entry point. This file must be situated in the root of the doodle directory, which should be located in `/doodles/<author_github_username>/<doodle_name>`.

* <code>**manifest.json**</code>

	Most importantly - each doodle requires a manifest file which contains all the metadata for the doodle, including doodle information / instructions, author details and tech used. You can manually create this file based on the [schema outlined here](manifest.md), or if you use the doodle-creation utility script (<code>utils/createDoodle.js</code>), the manifest will be automatically generated based on answers you have given.

### Step-by-step guide

* **TODO**
