# Doodle / site / extension(s) administration

This section is a run-through on how to publish new doodles, and how to deploy new versions of the site / extension(s), note you'll need to be given separate AWS credentials for these tasks.

## Adding a new doodle

#### Prerequisites

* `credentials.coffee` in repo root, containing AWS ID / Key / region for IAM that enables publishing to both preview S3 bucket (pending.codedoodl.es), source S3 bucket (source.codedoodl.es) and CloudFront.

#### Steps

**Step 1: preview the doodle**

1. Clone forked repo containing new doodle source in directory `/doodles/author_github_username/doodle_name`
2. `$ [sudo] npm i`
3. `$ gulp previewDoodle --path author_github_username/doodle_name`
	* **_pushes doodle source to preview bucket_**
4. Assuming successful, you can preview the doodle at http://pending.codedoodl.es/author_github_username/doodle_name/index.html

**Step 2: validate the doodle**

1. Check for `404`'s, or requests to domains other than `pending.codedoodl.es`
2. Check for properly formed `manifest.json` against [schema](manifest.md)
3. Validate doodle against [doodle criteria](criteria.md)

**Step 3: upload all doodle assets**

1. Create thumbnail images / video, using `utils/thumbs.sh` (see this script for notes on dependencies / assumptions)
2. `$ gulp uploadDoodle --path author_github_username/doodle_name`
	* **_pushes doodle source to production source bucket_**
3. Confirm doodle published to S3 / CloudFront successfully on http://source.codedoodl.es/author_github_username/doodle_name/index.html (the source will have been gzipped this time, so there is a chance things may have broken)

**Step 4: deploy new doodle to dev site**

10. `$ gulp deployDoodle --path author_github_username/doodle_name`
	* **_pushes updated `master_manifest_DEV.json` to source S3_**
11. Once CloudFront has invalidated (5-10 mins) and API cache has been refreshed, the dev server API should now return this new doodle, at `GET http://develop.codedoodl.es/api/doodles`
12. Check dev site has updated and displays doodle correctly

**Step 5: deploy new doodle to production site**

13. `$ gulp deployDoodle --path author_github_username/doodle_name --production`
	* **_pushes updated `master_manifest.json` to source S3_**
14. Once CloudFront has invalidated, and API cache refreshed, new doodle should be live at http://codedoodl.es/_/author_github_username/doodle_name
15. The end

## Deploying to the site

#### Prerequisites

* `credentials.coffee` in repo root, containing AWS ID / Key / region for IAM that enables publishing to static assets S3 bucket (assets.codedoodl.es)
* Elasticbeanstalk CLI
* Initialised Elasticbeanstalk environments for `develop` and `master` branches, configured with relevant AWS IAM credentials

#### Steps

**Step 1: deploy to dev site**

1. Clone repo
2. `$ [sudo] npm i`
3. `$ git checkout develop`
4. `$ gulp deployApp`
	* **_compiles FE assets, pushes to S3, commits changes to repo (for sake of EB), deploys via elasticbeanstalk to development environment_**
5. Check all looks good

**Step 2: deploy to production**

1. Merge latest changes in to `master`
2. `$ eb deploy`
	* **_deploys latest version via elastic beanstalk to production environment_**

## Updating the chrome extension

_todo_
