import GithubSlugger from "github-slugger";
import { Node, type Heading } from "mdast";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

const ALERT_PATTERN =
  /(\[!(?:CAUTION|IMPORTANT|NOTE|TIP|WARNING)])(?!\s*$)(\s*)/gm;
const SOFT_BREAK_PATTERN = /$[^$]/gms;

export function createProcessor(): (original: string) => Promise<string> {
  const slugger = new GithubSlugger();
  const createRemark = remark()
    .use(remarkGfm)
    .use(() => {
      return (tree) => {
        // strip soft breaks
        visit(tree, "text", (node: { value: string }) => {
          node.value = node.value.replace(SOFT_BREAK_PATTERN, " ");
        });

        // add anchors to headings
        visit(tree, "heading", (node: Heading) => {
          node.children.unshift({
            type: "html",
            value: `<a id="${slugger.slug(toString(node))}"></a>`,
          });
        });

        // preserve GitHub alerts
        visit(tree, "blockquote", (node: Node) => {
          visit(node, "text", (node: { value: string }) => {
            node.value = node.value.replace(ALERT_PATTERN, "$1\n");
          });
        });
      };
    })
    .freeze();

  return async function process(original) {
    const processor = createRemark();

    return String(await processor.process(original));
  };
}
