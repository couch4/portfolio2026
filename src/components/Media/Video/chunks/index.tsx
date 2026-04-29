import { createContext } from "react";

export const VideoContext = createContext({} as any);
export { default as VideoControls } from "./VideoControls";

import dynamic from "next/dynamic";
export const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
  ssr: false,
});
