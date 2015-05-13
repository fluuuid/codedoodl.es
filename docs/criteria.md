# Doodle criteria

The purpose of codedoodl.es is a little different to the other code-showcasing sites out there - we want to quick-to-load, quick-to-enjoy experiments, which are united through a consistent user interface. In order to maintain consistency with regards to user expectations, visual UI, and doodle performance, we have laid out some basic entry criteria for each doodle.

_Note that the criteria here are more guidelines for the most part - every doodle submitted will be reviewed by a human, and so there will always be flexibility here - we're just trying to create some consistency._

### Technical

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

### Other restrictions

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