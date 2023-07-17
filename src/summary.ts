import {
  AlignType,
  PhrasingContent,
  RootContent,
  Table,
  TableCell,
  TableRow,
} from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { getDiscussionNumberByUrl } from "./discussion.js";
import { ReleaseData, TaggerData } from "./type/octokit.js";

const BODY_TOKEN = "{{GITHUB_RELEASE_ACTION_BODY}}";

export function renderSummary({
  release,
  tagger,
  tagHtmlUrl,
  wasCreated,
}: {
  release: ReleaseData;
  tagger?: TaggerData;
  tagHtmlUrl: string;
  wasCreated: boolean;
}): string {
  const { discussion_url, draft, html_url, prerelease, tag_name } = release;
  const body = release.body ?? "";
  const name = release.name ?? "";
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
    },
  );

  return rendered.replace(BODY_TOKEN, body);

  function titleAST(): RootContent[] {
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

  function taggerAST(): RootContent[] {
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
        [],
      ),
    ];
  }

  function detailsAST(): RootContent[] {
    const headings: PhrasingContent[][] = [
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

    const cells: PhrasingContent[][] = [
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

    const align: AlignType[] = headings.map(() => "left");

    return [createTableAST(align, headings, [cells])];
  }

  function bodyAST(): RootContent[] {
    if (!body.trim()) return [];

    return createDetailsAST("<strong>Release body</strong>", [
      {
        type: "html",
        value: BODY_TOKEN,
      },
    ]);
  }

  function definitionsAST(): RootContent[] {
    const definitions: RootContent[] = [];

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
      },
    );

    return definitions;
  }

  function createDetailsAST(
    summaryHTML: string,
    children: RootContent[],
  ): RootContent[] {
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

  function createTableAST(
    align: AlignType[] | undefined,
    headings: PhrasingContent[][],
    rows: PhrasingContent[][][],
  ): Table {
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
        ...rows.map(
          (row): TableRow => ({
            type: "tableRow",
            children: row.map(
              (children): TableCell => ({
                type: "tableCell",
                children,
              }),
            ),
          }),
        ),
      ],
    };
  }
}
