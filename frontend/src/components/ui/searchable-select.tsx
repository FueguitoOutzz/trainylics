import * as React from "react"
import { Search, Check, ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Option {
  id: string
  name: string
  [key: string]: any
}

interface SearchableSelectProps {
  options: Option[]
  value?: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecciona tu club...",
  searchPlaceholder = "Buscar club...",
  className = "w-full",
  disabled = false
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((opt) => opt.id === value)

  const normalizeStr = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  }

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options
    const normSearch = normalizeStr(search)
    return options.filter((opt) => normalizeStr(opt.name).includes(normSearch))
  }, [options, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`justify-between bg-background/50 border-border/80 font-normal ${className}`}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] sm:w-[320px] p-2 bg-card border border-border shadow-xl rounded-xl z-50">
        <div className="flex items-center border-b border-border/40 px-2 pb-2 mb-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-none bg-transparent focus-visible:ring-0 text-xs shadow-none p-0 focus:outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No se encontraron clubes.
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.id === value
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onValueChange(opt.id)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors text-left ${
                    isSelected
                      ? "bg-primary/15 text-primary font-bold"
                      : "hover:bg-accent hover:text-accent-foreground text-foreground"
                  }`}
                >
                  <span className="truncate">{opt.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
