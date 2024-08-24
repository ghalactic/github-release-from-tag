### <a id="changed"></a>Changed

* **\[BC BREAK]** This action was completely re-written in `v2` with support for many new features. With that being said, it *should* be pretty much 100% compatible with `v1`.
* **\[BC BREAK]** The `GITHUB_TOKEN` environment variable can no longer be used to supply a custom GitHub token. Use the [`token` action input][v2.0-token-action-input] instead.
* **\[BC BREAK]** Improved the rendering of line breaks in tag annotation message bodies. See [Markdown line breaks][v2.0-markdown-line-breaks] for more information.
* **\[BC BREAK]** Tag names like `v1` and `v1.2` are now considered "stable" as per [GitHub's recommendations for action versioning].

[v2.0-token-action-input]: https://github.example.org/ghalactic/github-release-from-tag/tree/v2.0.0#action-inputs

[v2.0-markdown-line-breaks]: https://github.example.org/ghalactic/github-release-from-tag/tree/v2.0.0#markdown-line-breaks

[github's recommendations for action versioning]: https://github.example.org/actions/toolkit/blob/%40actions/core%401.1.0/docs/action-versioning.md#recommendations
