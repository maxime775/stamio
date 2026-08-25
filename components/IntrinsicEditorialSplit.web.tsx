import { createElement, type ReactNode } from "react";
import { View } from "react-native";
import { palette } from "@/lib/design";

type Props = {
  primary: ReactNode;
  secondary: ReactNode;
  primaryWeight?: number;
  secondaryWeight?: number;
  stacked?: boolean;
  variant?: "preview" | "balanced";
};

const ROOT_SELECTOR = '[data-stamio-intrinsic-editorial="root"]';
const PRIMARY_SELECTOR = '[data-stamio-intrinsic-editorial="primary"]';
const SECONDARY_SELECTOR = '[data-stamio-intrinsic-editorial="secondary"]';
const DIVIDER_SELECTOR = '[data-stamio-intrinsic-editorial="divider"]';
const BALANCED_SELECTOR = '[data-stamio-intrinsic-editorial="root"][data-layout-variant="balanced"]';

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

${DIVIDER_SELECTOR} {
  display: none;
}

${BALANCED_SELECTOR} {
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  column-gap: 24px;
  padding-top: 0;
  border-top: 0;
}

${BALANCED_SELECTOR} ${DIVIDER_SELECTOR} {
  display: block;
  width: 1px;
  min-height: 100%;
  background: ${palette.lineStrong};
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

  ${BALANCED_SELECTOR} {
    row-gap: 0;
  }

  ${BALANCED_SELECTOR} ${DIVIDER_SELECTOR} {
    width: 100%;
    min-height: 1px;
    height: 1px;
    margin: 14px 0;
  }
}
`;

export function IntrinsicEditorialSplit({ primary, secondary, variant = "preview" }: Props) {
  if (!primary || !secondary) {
    return <View style={{ width: "100%", minWidth: 0 }}>{primary ?? secondary}</View>;
  }

  return (
    <>
      {createElement("style", { dangerouslySetInnerHTML: { __html: intrinsicLayoutCss } })}
      <View {...({ dataSet: { stamioIntrinsicEditorial: "root", layoutVariant: variant } } as object)}>
        <View {...({ dataSet: { stamioIntrinsicEditorial: "primary" } } as object)}>{primary}</View>
        {variant === "balanced" ? <View {...({ dataSet: { stamioIntrinsicEditorial: "divider" } } as object)} /> : null}
        <View {...({ dataSet: { stamioIntrinsicEditorial: "secondary" } } as object)}>{secondary}</View>
      </View>
    </>
  );
}
