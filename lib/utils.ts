import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely — last class wins for conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
