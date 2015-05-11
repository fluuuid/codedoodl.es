#![codedoodle.es logo](http://assets.codedoodl.es/readme_logo.png)

<code>**\\\\ A curated showcase of creative coding sketches \\\\**</code>

**[site](http://codedoodl.es) \\ [chrome extension](http://codedoodl.es) \\ [twitter](http://twitter.com/codedoodl_es)**

### What is this?

codedoodl.es is community-based collection of code experiments created with web technologies. The aim of these doodles is to exhibit interactive, engaging visual web experiments which only require a short attention span.

This means no loading bars, no GUI, no 5MB 3D models or media files, no page of instructional text, just plain and simple doodles with code.

The site at [codedoodl.es](http://codedoodl.es) houses all of the doodles in one place, and installing the [chrome extension](http://codedoodl.es) will show a new doodle every time you open a new tab.

### How to contribute

The sketches on codedoodl.es are 100% community-sourced. The submission / review / approval process is handled entirely in the open on GitHub - fork this repo, create a doodle, submit pull request, [the reviewers]() will then feedback / approve and merge in to the repo.

**[See this guide for comprehensive details on the contribution process.]() (TODO)**

##### Minimum requirements

These are the minimum number of files required for each doodle, these will be used to display / reference each individual doodle on the site / extension.

_ProTip - use the `createDoodle.js` utility script included in the repo, it will create these minimum required files for you, and populate the manifest based on your answers to CLI prompts._

* <code>**index.html**</code>

	Every doodle must have a single `index.html` file as an entry point. This file must be situated in the root of the doodle directory, which should be located in `/doodles/<author_github_username>/<doodle_name>`.

* <code>**thumbnail JPEG 300x300 px**</code>

	A single 300px by 300px JPEG thumbnail for the doodle must be in the root of the doodle directory.

* <code>**manifest.json**</code>

	Most importantly - each doodle requires a manifest file which contains all the metadata for the doodle, including doodle information / instructions, author details and tech used. You can manually create this file based on the [schema outlined here](here) **(TODO)**, or if you use the doodle-creation utility script (<code>utils/createDoodle.js</code>), the manifest will be automatically generated based on answers you have given.

### Doodle criteria

The purpose of codedoodl.es is a little different to the other code-showcasing sites out there - we want to quick-to-load, quick-to-enjoy experiments, which are united through a consistent user interface. In order to maintain consistency with regards to user expectations, visual UI, and doodle performance, we have laid out some basic entry criteria for each doodle.

_Note that the criteria here are more guidelines for the most part - every doodle submitted will be reviewed by a human, and so there will always be flexibility here - we're just trying to create some consistency._

##### Technical

* <code>**2MB max pagesize**</code>

	To keep things in line with the principle of quick-to-load, quick-to-enjoy doodles, we think it's a good idea to put a hard limit on the pagesize for a single doodle. Particularly when considering being viewed in a browser extension "New Tab" page - if it takes more than a second to load, you're probably not going to see it... 2MB seems a reasonable limit to put here, but this is completely arbitrary, so let us know if you think it should be more / less.

* <code>**20 max HTTP requests**</code>

	Following on from the above, another attempt at optimising for speed. Again, let us know if you think this (arbitrary) amount is unreasonable.

* <code>**Web-tech only**</code>

	Rather than worry about feature-detection and "unsupported browser" messages, we think it's probably best to keep things to web-tech only for now. But if you have an awesome Flash / Unity / Whatever experiment that you think should be on here, then let us know.

* <code>**Reasonable browser support**</code>

	A kind of vague requirement, which will have to be judged on a case-by-case basis, but generally speaking, if you're relying on a feature that's hidden behind a browser flag, most people won't see it, and this isn't really ideal - we're hoping the general internet-surfing layman can enjoy these doodles, not just those of us living on the bleeding edge :)

* <code>**All assets included within submitted pull request**</code>

	There's security restrictions we need to consider for browser extensions when loading assets from remote servers, for this reason when a doodle is approved, we'll package it up and deploy to S3 so everything is served from the same place, so please include all assets when you submit.

##### Other restrictions

To try and create a consistent visual style and user experience, we're proposing a restriction on the usage of certain interface elements / technologies.

_Note that these are our initial thoughts on what should / should not be allowed, if you think they're unreasonable or will severe impair creativity or doodle quality, then let us know your thoughts - [make an issue!](https://github.com/neilcarpenter/codedoodl.es/issues)_

* <code>**no GUI**</code>

	This goes against a fundamental theme of experimenting on the web, but in the interest of sticking to our principle of simple, easy to digest sketches, we thought it was best to leave out the option for a GUI. We could potentially add an option via the "info" screen for each doodle to enable GUI (see "Roadmap" below).

* <code>**no custom UI / explanatory text / logos etc**</code>

	To try and keep a consistent user experience, all UI is centralised as part of the site / browser extension - you fill out the `manifest.json` for the doodle, and then this is used to populate the "info" panel, as well as metadata / thumbnails etc across the site. This will also help keep a consistent visual style, and not risk confusing users with having essentially two UIs - with the doodle's individual UI, and that of the site / extension which is embedding it.

* <code>**no sound**</code>

	Again, to try and create a consistent user experience we think it's probably best to avoid sound, particularly when considering doodles being viewed via a "New Tab" browser extension - this could get pretty annoying. This could perhaps be another option to add for "Additional options per doodle" (see Roadmap below).

* <code>**no mandatory user permissions**</code>

	Anything that requires user authorisation before initialising has already taken too much time / attention, doodles shouldn't require user authentication before running. For example, requiring access to webcam.

### Roadmap

This is very much a first iteration, we wanted to get something basic released as soon as possible, and are hoping that there will be sufficient interest / engagement from the creative coding community to warrant the future development of more intricate features and functionality, some ideas include:
	

* <code>**Filtering / sorting**</code>

	Hopefully we'll have enough doodles submitted and added to the site to warrant a more sophisticated filtering / searching mechanism, such as filtering by tag, author, interaction type etc.

* <code>**Voting system**</code>

	Again, will only really become useful with more content, but a basic doodle ranking will help mechanism will help keep the best stuff the most visible.

* <code>**Additional options per doodle**</code>

	Possibly have the option of passing a parameter / query to the doodle, meaning that we can have some centralised way to interact. For example, having a checkbox within the doodle info section to enable GUI for that particular doodle, or perhaps to enable sound.

* <code>**Additional browser extensions**</code>

	Currently only chrome, wouldn't take much to port to other platforms.

* <code>**Browser-extension specific context**</code>

	Browser extensions provide deeper integration with the user's host machine, and access to things that a standard website does not. It may be interesting to investigate allowing doodles to have access to certain things when being run within the extension context.

* <code>**User-defined settings within browser extensions**</code>

	Options to personlise the experience, for example by selecting only tags that you are interested in, and then only being served doodles meeting this criteria.

You have an idea for future improvement? Tell us - [	make an issue!](https://github.com/neilcarpenter/codedoodl.es/issues)

### Thanks

This project is a [FLUUUID](http://FLUUU.ID) production - we created the site / extension / infrastructure to allow this to happen, but the real thanks goes to the digital artists who have contributed doodles:


<< auto-inserted contributors list >>

[Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]() \\ [Neil Carpenter](http://neilcarpenter.com) \\ [Silvio Paganini]() \\ [Fabio Azevedo]()
