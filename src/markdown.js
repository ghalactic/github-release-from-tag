import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

const SOFT_BREAK_PATTERN = /$[^$]/gms;

export function createProcessor() {
  const createRemark = remark().use(remarkGfm).use(stripSoftBreaks).freeze();

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
