import { createContext } from "react"
import { Theme } from "@/lib/hooks/useTheme"

export type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

// Create the context
export const ThemeProviderContext = createContext<ThemeProviderState>(initialState) 