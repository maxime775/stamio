import { Redirect } from "expo-router";
import { SAMPLE_POLL_ID } from "@/lib/constants";

export default function Home() {
  return <Redirect href={`/poll/${SAMPLE_POLL_ID}`} />;
}
