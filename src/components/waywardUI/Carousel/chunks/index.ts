"use client";
import { createContext } from "react";

export const CarouselContext = createContext({} as any);

export { default as CarouselItem } from "./CarouselItem";

import dynamic from "next/dynamic";
export const CarouselWrapper = dynamic(() => import("./CarouselWrapper"), {
  ssr: false,
});
