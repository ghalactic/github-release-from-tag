import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkGithub from "remark-github";
import { visit } from "unist-util-visit";

const SOFT_BREAK_PATTERN = /$[^$]/gms;

export function createProcessor({ owner, repo }) {
  const createRemark = remark()
    .use(remarkGfm)
    .use(remarkGithub, {
      repository: `${owner}/${repo}`,
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
