import "@tanstack/react-table"
import { FieldValues } from "react-hook-form"
import { DataGridColumnType, FieldFunction } from "./components/data-grid/types"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    column?: unknown
    name?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    field?: FieldFunction<TData, any> | null | undefined
    type?: DataGridColumnType
  }
}
