import { createContext } from "react"
import { FormFieldContextValue, FormItemContextValue } from "./types"

export const FormFieldContext = createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

export const FormItemContext = createContext<FormItemContextValue>(
  {} as FormItemContextValue
) 