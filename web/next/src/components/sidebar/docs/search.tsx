"use client"

import { RiSearchLine } from "@remixicon/react"
import { useDocsSearch } from "fumadocs-core/search/client"
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search"
import { useI18n } from "fumadocs-ui/contexts/i18n"
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { Kbd } from "@/components/ui/kbd"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type HotKey = {
  id: string
  display: ReactNode
  key: string | ((event: KeyboardEvent) => boolean)
}

type DocsSearchContextValue = {
  hotKey: HotKey[]
  setOpenSearch: (value: boolean) => void
}

const DocsSearchContext = createContext<DocsSearchContextValue>({
  hotKey: [],
  setOpenSearch: () => undefined,
})

const IS_MAC = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac")

function DocsSearchDialog(props: SharedProps) {
  const { locale } = useI18n()
  const { search, setSearch, query } = useDocsSearch({
    type: "fetch",
    api: "/api/search",
    locale,
  })

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  )
}

export function SidebarDocsSearch() {
  const { isMobile, setOpenMobile } = useSidebar()
  const { hotKey, setOpenSearch } = useDocsSearchContext()

  return (
    <div className="relative">
      <RiSearchLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label="Open search"
        onClick={() => {
          if (isMobile) {
            setOpenMobile(false)
          }

          setOpenSearch(true)
        }}
        className={cn(
          "h-8 w-full rounded-lg border border-input bg-background pl-8 text-left text-sm text-muted-foreground shadow-none transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          isMobile ? "pr-3" : "pr-20",
        )}
      >
        Search
      </button>
      {!isMobile && hotKey.length > 0 && (
        <div className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {hotKey.map((item) => (
            <Kbd key={item.id} suppressHydrationWarning={item.id === "modifier"}>
              {item.display}
            </Kbd>
          ))}
        </div>
      )}
    </div>
  )
}

export function DocsSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpenSearch] = useState(false)

  const hotKey = useMemo<HotKey[]>(
    () => [
      {
        id: "modifier",
        display: IS_MAC ? "⌘" : "Ctrl",
        key: (event) => (IS_MAC ? event.metaKey : event.ctrlKey),
      },
      {
        id: "search",
        display: "K",
        key: "k",
      },
    ],
    [],
  )

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat) {
      return
    }

    if (
      !hotKey.every((item) =>
        typeof item.key === "string" ? event.key.toLowerCase() === item.key : item.key(event),
      )
    ) {
      return
    }

    const target = event.target as HTMLElement
    if (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return
    }

    event.preventDefault()
    setOpenSearch(true)
  })

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  const value = useMemo<DocsSearchContextValue>(
    () => ({
      hotKey,
      setOpenSearch,
    }),
    [],
  )

  return (
    <DocsSearchContext.Provider value={value}>
      <Suspense fallback={null}>
        <DocsSearchDialog open={open} onOpenChange={setOpenSearch} />
      </Suspense>
      {children}
    </DocsSearchContext.Provider>
  )
}

export function useDocsSearchContext() {
  return useContext(DocsSearchContext)
}
