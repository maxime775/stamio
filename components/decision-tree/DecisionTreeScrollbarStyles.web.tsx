import { createElement } from "react";
import { getColorWithOpacity, palette, radius } from "@/lib/design";

export const decisionTreeVerticalScrollId = "decision-tree-vertical-scroll";
export const decisionTreeHorizontalScrollId = "decision-tree-horizontal-scroll";

const scrollbarSelector = `#${decisionTreeVerticalScrollId}, #${decisionTreeHorizontalScrollId}`;

const scrollbarCss = `
${scrollbarSelector} {
  scrollbar-width: thin;
  scrollbar-color: ${getColorWithOpacity(palette.muted, 0.48)} ${palette.surfaceSubtle};
}

#${decisionTreeVerticalScrollId}::-webkit-scrollbar,
#${decisionTreeHorizontalScrollId}::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

#${decisionTreeVerticalScrollId}::-webkit-scrollbar-track,
#${decisionTreeVerticalScrollId}::-webkit-scrollbar-corner,
#${decisionTreeHorizontalScrollId}::-webkit-scrollbar-track,
#${decisionTreeHorizontalScrollId}::-webkit-scrollbar-corner {
  background: ${palette.surfaceSubtle};
}

#${decisionTreeVerticalScrollId}::-webkit-scrollbar-thumb,
#${decisionTreeHorizontalScrollId}::-webkit-scrollbar-thumb {
  min-width: 36px;
  min-height: 36px;
  border: 2px solid ${palette.surfaceSubtle};
  border-radius: ${radius.round}px;
  background-color: ${getColorWithOpacity(palette.muted, 0.48)};
}

#${decisionTreeVerticalScrollId}::-webkit-scrollbar-thumb:hover,
#${decisionTreeHorizontalScrollId}::-webkit-scrollbar-thumb:hover {
  background-color: ${getColorWithOpacity(palette.muted, 0.68)};
}
`;

export function DecisionTreeScrollbarStyles() {
  return createElement("style", { dangerouslySetInnerHTML: { __html: scrollbarCss } });
}
