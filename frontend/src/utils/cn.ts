import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names without conflicting utilities. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
