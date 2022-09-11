import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkGithub from "remark-github";
import { visit } from "unist-util-visit";

const SOFT_BREAK_PATTERN = /$[^$]/gms;
const GITHUB_SERVER_URL_PATTERN = /^https:\/\/github\.com/;

export function createProcessor({ serverUrl, owner, repo }) {
  const createRemark = remark()
    .use(remarkGfm)
    .use(remarkGithub, {
      repository: `${owner}/${repo}`,

      buildUrl(values, defaultBuildUrl) {
        return defaultBuildUrl(values).replace(
          GITHUB_SERVER_URL_PATTERN,
          serverUrl
        );
      },
    })
    .use(stripSoftBreaks)
    .freeze();

  return async function process(original) {
    const processor = createRemark();

    return String(await processor.process(original));
  };
}

function stripSoftBreaks() {
  return (tree) => {
    visit(tree, "text", (node) => {
      node.value = node.value.replace(SOFT_BREAK_PATTERN, " ");
    });
  };
}
