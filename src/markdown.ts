import { remark } from "remark";
import remarkGfm, { Root } from "remark-gfm";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

const SOFT_BREAK_PATTERN = /$[^$]/gms;

const stripSoftBreaks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "text", (node) => {
      node.value = node.value.replace(SOFT_BREAK_PATTERN, " ");
    });
  };
};

export function createProcessor(): (original: string) => Promise<string> {
  const createRemark = remark().use(remarkGfm).use(stripSoftBreaks).freeze();

  return async function process(original) {
    const processor = createRemark();

    return String(await processor.process(original));
  };
}
