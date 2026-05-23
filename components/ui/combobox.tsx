"use client";

import { useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ComboboxItem {
  value: string;
  label: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  items,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find((i) => i.value === value);

  const filtered = search
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  function handleSelect(item: ComboboxItem) {
    onValueChange(item.value);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (disabled) return;
        setOpen(o);
        if (o) setTimeout(() => inputRef.current?.focus(), 50);
        else setSearch("");
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors",
              "hover:bg-muted/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !selected && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground ml-1" />
      </PopoverTrigger>

      <PopoverContent
        className="w-(--anchor-width) min-w-48 p-0 gap-0"
        align="start"
        sideOffset={4}
      >
        <div className="border-b border-border p-1.5">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-7 h-7 text-xs border-none shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  item.value === value && "bg-accent text-accent-foreground"
                )}
              >
                <CheckIcon
                  className={cn("size-3.5 shrink-0", item.value !== value && "invisible")}
                />
                <span className="truncate">{item.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
