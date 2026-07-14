import type { ReactNode } from "react";
import type { DocHeading, DocMeta } from "@/types/docs";

export type DocPage = DocMeta & {
  content: ReactNode;
};

export function h(
  id: string,
  title: string,
  level: 2 | 3 = 2,
): DocHeading {
  return { id, title, level };
}
