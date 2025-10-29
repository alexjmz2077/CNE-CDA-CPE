"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type Item = {
  value: string
  label: string
  description?: string
}

type Props = {
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  items: Item[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function SearchDropdown({
  placeholder,
  searchPlaceholder = "Buscar…",
  emptyText = "Sin resultados",
  items,
  value,
  onValueChange,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = items.find((item) => item.value === value)
  const filtered = query
    ? items.filter((item) => {
        const text = `${item.label} ${item.description ?? ""}`.toLowerCase()
        return text.includes(query.toLowerCase())
      })
    : items

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-full border border-input bg-background px-4 py-2 text-left shadow-sm transition",
          disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary",
        )}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span
          className={cn(
            "truncate text-sm",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected ? (
            <>
              {selected.label}
              {selected.description ? (
                <span className="ml-1 text-muted-foreground">
                  ({selected.description})
                </span>
              ) : null}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="ml-3 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((item) => {
                const isActive = item.value === value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onValueChange(item.value)
                      setOpen(false)
                      setQuery("")
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.description ? (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      ) : null}
                    </div>
                    <Check className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-0")} />
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}