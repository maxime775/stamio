import "@/assets/fonts/inter-google-v19/inter.web.css";
import { useEffect, useState } from "react";

const fontFamilies = ["Inter_400Regular", "Inter_500Medium", "Inter_600SemiBold", "Inter_700Bold"] as const;
const fontProbe = "Stamio ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ àâäçéèêëîïôöùûüÿ 0123456789 € — « »";

type FontLoadState = {
  loaded: boolean;
  error: Error | null;
};

export function useStamioFonts(): [boolean, Error | null] {
  const [state, setState] = useState<FontLoadState>({ loaded: false, error: null });

  useEffect(() => {
    let active = true;

    Promise.all(fontFamilies.map((family) => document.fonts.load(`16px "${family}"`, fontProbe)))
      .then((loadedFaces) => {
        if (loadedFaces.some((faces) => faces.length === 0)) {
          throw new Error("One or more Inter Web fonts did not load");
        }
        if (active) setState({ loaded: true, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ loaded: false, error: error instanceof Error ? error : new Error(String(error)) });
      });

    return () => {
      active = false;
    };
  }, []);

  return [state.loaded, state.error];
}
