import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

const SOFT_BREAK_PATTERN = /$[^$]/gms;

export function createProcessor(): (original: string) => Promise<string> {
  const createRemark = remark()
    .use(remarkGfm)
    // strip soft breaks
    .use(() => {
      return (tree) => {
        visit(tree, "text", (node: { value: string }) => {
          node.value = node.value.replace(SOFT_BREAK_PATTERN, " ");
        });
      };
    })
    .freeze();

  return async function process(original) {
    const processor = createRemark();

    return String(await processor.process(original));
  };
}
