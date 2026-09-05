# Welcome

### Hi there 👋

I'm Chris. I'm a dad with a dog and cat, and I've got an amazing wife who's also my best friend.

I'm interested in many subjects, particularly philosophy and science, and I enjoy solving problems.

Please don't copy or reuse anything in `_posts` without permission and attribution.

Everything else is under the [MIT License](https://opensource.org/license/mit).


## Moss & Ember

The browser ARPG and its development tools are in [`docs/moss-and-ember/`](docs/moss-and-ember/README.md). The September 5, 2026 post is [`_posts/2026-09-05-moss-and-ember.md`](_posts/2026-09-05-moss-and-ember.md).

GitHub Pages remains configured for **Deploy from a branch → main → /(root)**. Jekyll publishes the game directory alongside the blog as ordinary static files. Once these changes are committed and pushed to `main`, play at **https://cboler.github.io/docs/moss-and-ember/**. No Pages setting change, `.nojekyll` file, custom workflow, or game build step is needed. Do not switch the Pages source to `/docs`: the blog’s Jekyll configuration, pages, and posts are still at the repository root.

From the game directory, `npm start` serves a local preview and `npm test` runs the gameplay checks. See the game README for optional browser checks. The root Jekyll configuration excludes development dependencies, tests, local server scripts, and test artifacts from the published site.
