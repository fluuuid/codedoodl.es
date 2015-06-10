# Doodle manifest

Each submitted doodle is required to have a complete manifest JSON, this provides author details and doodle meta data. For ease of generation, would recommend using the interactive CLI tool supplied in the repo `./utils/createDoodle.js` which will auto-generate the manifest / correct directory structure for you.

### Schema
```
{
	"name" : "STRING|REQUIRED",
	"author" : {
		"name" : "STRING|REQUIRED",
		"github" : "STRING|REQUIRED",
		"website" : "STRING-URL|REQUIRED",
		"twitter" : "STRING|OPTIONAL"
	},
	"description" : "ESCAPED-HTML|REQUIRED",
	"tags" : [ "STRING|OPTIONAL" ... ],
	"interaction" : {
		"mouse" : BOOL|REQUIRED,
		"keyboard" : BOOL|REQUIRED,
		"touch" : BOOL|REQUIRED
	},
	"instructions" : "STRING|REQUIRED",
	"colour_scheme" : "light/dark|REQUIRED",
	"mobile_friendly" : BOOL|REQUIRED,
	"slug" : "STRING|REQUIRED"
}
```

### Sample
```
{
	"name" : "Particles",
	"author" : {
		"name" : "Joe Bloggs",
		"github" : "joebloggs",
		"website" : "http://joecodes.com",
		"twitter" : "joebloggs"
	},
	"description" : "Just playing around with some webGL particles, see the explanation on <a href=\"http://joecodes.com/particles-source\">my site</a>.",
	"tags" : [ "webGL", "particles" ],
	"interaction" : {
		"mouse" : true,
		"keyboard" : false,
		"touch" : true
	},
	"instructions" : "swipe / move your mouse",
	"colour_scheme" : "dark",
	"mobile_friendly" : true,
	"slug" : "joebloggs/particles"
}
```

### Breakdown

| Property | Description | Type | Required |
| -------- | ----------- | :----: | :--------: |
| `name` | Title of the doodle | String | yes |
| `author.name` | Author's full name | String | yes |
| `author.github` | Author's github username, must be same user that submits pull request for authenticity | String | yes |
| `author.website` | Full URL for author's site | String | yes |
| `author.twitter` | Twitter handle (without "@") | String | no |
| `description` | Escaped HTML string containing description of the doodle, additional instructions, links to source / blog posts / more feature-rich version etc | String | yes |
| `tags` | Tech / visual keywords to associate with the doodle | Array of Strings | yes |
| `interaction.mouse` | Whether or not the doodle can be interacted with by mouse | Boolean | yes |
| `interaction.keyboard` | Whether or not the doodle can be interacted with by keyboard | Boolean | yes |
| `interaction.touch` | Whether or not the doodle can be interacted with by touch input | Boolean | yes |
| `instructions` | Brief instructions on how to interact with the doodle | String - max length 35 chars | yes |
| `colour_scheme` | Will control the UI colour when doodle is displayed. Eg, if you doodle uses a black background, select "dark" as colour_scheme so the UI will be in contrast and thus accessible | String - "light" or "dark" | yes |
| `mobile_friendly` | Whether or not the doodle is usable on mobile | Boolean | yes |
| `slug` | The directory path within `./doodles`, this should be comprised of `<github-username>/<doodle-name>`, containing no url invalid characters. | String | yes |
