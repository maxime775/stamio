import { createElement, type ReactNode } from "react";
import { View } from "react-native";
import { palette } from "@/lib/design";

type Props = {
  primary: ReactNode;
  secondary: ReactNode;
};

const ROOT_SELECTOR = '[data-stamio-intrinsic-editorial="root"]';
const PRIMARY_SELECTOR = '[data-stamio-intrinsic-editorial="primary"]';
const SECONDARY_SELECTOR = '[data-stamio-intrinsic-editorial="secondary"]';

const intrinsicLayoutCss = `
${ROOT_SELECTOR} {
  --stamio-editorial-gap: 24px;
  --stamio-editorial-secondary-min: 500px;
  display: grid;
  grid-template-columns:
    fit-content(calc(100% - var(--stamio-editorial-gap) - var(--stamio-editorial-secondary-min)))
    minmax(var(--stamio-editorial-secondary-min), 1fr);
  align-items: start;
  column-gap: var(--stamio-editorial-gap);
  width: 100%;
  min-width: 0;
  padding-top: 14px;
  border-top: 1px solid ${palette.line};
}

${PRIMARY_SELECTOR} {
  width: auto;
  max-width: 100%;
  min-width: 0;
}

${PRIMARY_SELECTOR} > * {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

${SECONDARY_SELECTOR} {
  width: 100%;
  min-width: 0;
  align-self: center;
}

@media (max-width: 899px) {
  ${ROOT_SELECTOR} {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 12px;
  }

  ${PRIMARY_SELECTOR},
  ${PRIMARY_SELECTOR} > * {
    width: 100% !important;
    max-width: 100% !important;
  }

  ${SECONDARY_SELECTOR} {
    align-self: stretch;
  }
}
`;

export function IntrinsicEditorialSplit({ primary, secondary }: Props) {
  return (
    <>
      {createElement("style", { dangerouslySetInnerHTML: { __html: intrinsicLayoutCss } })}
      <View {...({ dataSet: { stamioIntrinsicEditorial: "root" } } as object)}>
        <View {...({ dataSet: { stamioIntrinsicEditorial: "primary" } } as object)}>{primary}</View>
        <View {...({ dataSet: { stamioIntrinsicEditorial: "secondary" } } as object)}>{secondary}</View>
      </View>
    </>
  );
}
