"use client"

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

type HotKey = {
  display: ReactNode
  key: string | ((event: KeyboardEvent) => boolean)
}

type DocsSearchContextValue = {
  enabled: boolean
  hotKey: HotKey[]
  open: boolean
  setOpenSearch: (value: boolean) => void
}

const DocsSearchContext = createContext<DocsSearchContextValue>({
  enabled: true,
  hotKey: [],
  open: false,
  setOpenSearch: () => undefined,
})

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

export function DocsSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpenSearch] = useState(false)
  const [modifierKeyDisplay, setModifierKeyDisplay] = useState<ReactNode>("⌘")

  useEffect(() => {
    if (window.navigator.userAgent.includes("Windows")) {
      setModifierKeyDisplay("Ctrl")
    }
  }, [])

  const hotKey = useMemo<HotKey[]>(
    () => [
      {
        display: modifierKeyDisplay,
        key: (event) => event.metaKey || event.ctrlKey,
      },
      {
        display: "K",
        key: "k",
      },
    ],
    [modifierKeyDisplay],
  )

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      hotKey.every((item) =>
        typeof item.key === "string" ? event.key.toLowerCase() === item.key : item.key(event),
      )
    ) {
      setOpenSearch((value) => !value)
      event.preventDefault()
    }
  })

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onKeyDown])

  const value = useMemo<DocsSearchContextValue>(
    () => ({
      enabled: true,
      hotKey,
      open,
      setOpenSearch,
    }),
    [hotKey, open],
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
