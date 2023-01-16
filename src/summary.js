import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { getDiscussionNumberByUrl } from "./discussion.js";

const BODY_TOKEN = "{{GITHUB_RELEASE_ACTION_BODY}}";

export function renderSummary({ release, tagger, tagHtmlUrl, wasCreated }) {
  const { body, discussion_url, draft, html_url, name, prerelease, tag_name } =
    release;
  const hasTagger = tagger?.avatarUrl && tagger?.login;

  const rendered = toMarkdown(
    {
      type: "root",
      children: [
        ...titleAST(),
        ...taggerAST(),
        ...detailsAST(),
        ...bodyAST(),
        ...definitionsAST(),
      ],
    },
    {
      extensions: [gfmToMarkdown()],
    }
  );

  return rendered.replace(BODY_TOKEN, body);

  function titleAST() {
    const action = (() => {
      if (draft) return wasCreated ? "Drafted release " : "Re-drafted release ";
      return wasCreated ? "Released " : "Re-released ";
    })();

    return [
      {
        type: "heading",
        depth: 3,
        children: [
          {
            type: "text",
            value: action,
          },
          {
            type: "linkReference",
            identifier: "release-url",
            label: "release-url",
            referenceType: "full",
            children: [
              {
                type: "text",
                value: name,
              },
            ],
          },
        ],
      },
    ];
  }

  function taggerAST() {
    if (!hasTagger) return [];

    const { avatarUrl, login } = tagger;

    return [
      createTableAST(
        undefined,
        [
          [
            {
              type: "html",
              value: `<img alt="@${login}" src="${avatarUrl}" width="32">`,
            },
          ],
          [
            {
              type: "text",
              value: "Tagged by ",
            },
            {
              type: "text",
              value: `@${login}`,
            },
          ],
        ],
        []
      ),
    ];
  }

  function detailsAST() {
    const headings = [
      [
        {
          type: "text",
          value: "Tag",
        },
      ],
      [
        {
          type: "text",
          value: "Stability",
        },
      ],
    ];

    const cells = [
      [
        {
          type: "linkReference",
          identifier: "tag-url",
          label: "tag-url",
          referenceType: "full",
          children: [
            {
              type: "inlineCode",
              value: tag_name,
            },
          ],
        },
      ],
      [
        {
          type: "text",
          value: prerelease ? "⚠️ Pre-release" : "✅ Stable",
        },
      ],
    ];

    if (discussion_url) {
      headings.push([
        {
          type: "text",
          value: "Discussion",
        },
      ]);
      cells.push([
        {
          type: "linkReference",
          identifier: "discussion-url",
          label: "discussion-url",
          referenceType: "full",
          children: [
            {
              type: "text",
              value: `#${getDiscussionNumberByUrl(discussion_url)}`,
            },
          ],
        },
      ]);
    }

    const align = headings.map(() => "left");

    return [createTableAST(align, headings, [cells])];
  }

  function bodyAST() {
    if (!body.trim()) return [];

    return createDetailsAST("<strong>Release body</strong>", [
      {
        type: "html",
        value: BODY_TOKEN,
      },
    ]);
  }

  function definitionsAST() {
    const definitions = [];

    if (discussion_url) {
      definitions.push({
        type: "definition",
        identifier: "discussion-url",
        label: "discussion-url",
        url: discussion_url,
        title: null,
      });
    }

    definitions.push(
      {
        type: "definition",
        identifier: "release-url",
        label: "release-url",
        url: html_url,
        title: null,
      },
      {
        type: "definition",
        identifier: "tag-url",
        label: "tag-url",
        url: tagHtmlUrl,
        title: null,
      }
    );

    return definitions;
  }

  function createDetailsAST(summaryHTML, children) {
    return [
      {
        type: "html",
        value: `<details><summary>${summaryHTML}</summary>`,
      },
      ...children,
      {
        type: "html",
        value: "</details>",
      },
    ];
  }

  function createTableAST(align, headings, rows) {
    return {
      type: "table",
      align,
      children: [
        {
          type: "tableRow",
          children: headings.map((heading) => ({
            type: "tableCell",
            children: heading,
          })),
        },
        ...rows.map((row) => ({
          type: "tableRow",
          children: row.map((cell) => ({
            type: "tableCell",
            children: cell,
          })),
        })),
      ],
    };
  }
}
