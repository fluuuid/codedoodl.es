# Contributing doodles

The sketches on codedoodl.es are 100% community-sourced. The submission / review / approval process is handled entirely in the open on GitHub.

You can either [**fork the repo yourself and manually add your doodle**](#submitting-via-github) source code before submitting a pull request, or [**alternatively... you can just fill out a form**](#submitting-via-form), and we'll do the legwork in getting the pull request / code prepared for you :)

## Submitting via GitHub

### Minimum requirements

These are the minimum number of files required for each doodle, these will be used to display / reference each individual doodle on the site / extension.

* <code>**index.html**</code>

	Every doodle must have a single `index.html` file as an entry point. This file must be situated in the root of the doodle directory, which should be located in `/doodles/<author_github_username>/<doodle_name>`.

* <code>**manifest.json**</code>

	Most importantly - each doodle requires a manifest file which contains all the metadata for the doodle, including doodle information / instructions, author details and tech used. You can manually create this file based on the [schema outlined here](manifest.md), or if you use the doodle-creation utility script (<code>utils/createDoodle.js</code>), the manifest will be automatically generated based on answers you have given.

### Step-by-step guide

**Route 1 - using `createDoodle.js` util script**

1. Fork repo and clone local version
2. `cd` in to local repo and run `$ [sudo] npm i`
3. Run `$ node utils/createDoodle.js`
4. Answer the questions within the interactive CLI - this creates a new directory within `/doodles/<author_github_username>/<doodle_name>`, and populates a `manifest.json` file for you
5. Paste in your doodle `index.html` and accompanying asset files / directories
6. Push to github
7. Submit pull request!

**Route 2 - DIY**

1. Fork repo and clone local version
2. Manually create directory at `/doodles/<author_github_username>/<doodle_name>`
3. Create `manifest.json` in this directory based on [schema outlined here](manifest.md)
4. Paste in your doodle `index.html` and accompanying asset files / directories
5. Push to github
6. Submit pull request!

## Submitting via form

Fill out [this form](https://docs.google.com/forms/d/1K66OvKMiKqGjgmYRFUtEA43KZzBzv4KzObM1JtD4cbk/viewform) with a link to live version of your doodle, and some meta data around you / the doodle.

Once submitted we'll create a repo fork here on your behalf, and submit a pull request with code for your doodle sourced directly from a live link you provide. You'll be notified of the pull request with a _@mention_ (github username is required for submission of the form).
