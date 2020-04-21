# TODO

Fill this README with information specific your project

---

## Releases

Information regarding all releases can be found here:

(Release Notes)[./RELEASE_NOTES.md]

---

## Developing

```sh
npm run dev
```

---

## Unit Testing

```sh
npm run unit-test
```

### Developing unit tests with automatic running

```sh
npm run unit-test-dev
```

---

## Releasing a new build

Release cycles expect a two level release structure.
At the minimum, You should have two branches:

`master`

`dev`

All of your changes should be merged into or pushed directly into `dev`. Each merge or commit that finishes or completes
a task should have a message in the format:

`feature: <custom message>`

`hotfix: <custom message>`

`task: <custom message>`

Once you have your list of features and commits ready for release, simply run:

```sh
npm run release
```

This script will do several things for you:

- Aggregate all PROPERLY formatted commit messages and update your RELEASE_NOTES.md with those messages.
- Increment your version based on features or hotfixes in your messages.
  - If only hotfixes and tasks are in the commits the patch version will increment (0.0.x)
  - If any features are in the commits, the minor version will increment and reset the patch version (0.x.0)
- Create a tag with the latest version number.
- Create a new branch `release` and push the branch to your repo.

At this point, you should create PRs from the release branch to BOTH of your `master` and `dev` branches.
