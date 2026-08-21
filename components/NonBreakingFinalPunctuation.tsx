import { Fragment } from "react";
import { Platform, Text, type TextStyle } from "react-native";
import { splitFinalFrenchPunctuation } from "@/lib/typography";

type NonBreakingFinalPunctuationProps = {
  value: string;
};

type WebNoWrapTextStyle = TextStyle & { whiteSpace: "nowrap" };

const webNoWrapStyle: WebNoWrapTextStyle | undefined = Platform.OS === "web"
  ? { whiteSpace: "nowrap" }
  : undefined;

export function NonBreakingFinalPunctuation({ value }: NonBreakingFinalPunctuationProps) {
  const parts = splitFinalFrenchPunctuation(value);
  if (!parts) return <Fragment>{value}</Fragment>;

  return (
    <Fragment>
      {parts.leadingText}
      <Text style={webNoWrapStyle}>{parts.nonBreakingTail}</Text>
    </Fragment>
  );
}
