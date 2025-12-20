"use client"

import { useEffect, useState } from "react"

import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { CodeXml, ExternalLink } from "lucide-react"

const config = {
  WebNext: "nrjdalal/zerostarter.dev",
  ApiHono: "nrjdalal/api.zerostarter.dev",
  Github: "nrjdalal/zerostarter",
}

const Links = [
  {
    title: "WebNext",
    url: `https://vercel.com/${config.WebNext}/deployments`,
  },
  {
    title: "ApiHono",
    url: `https://vercel.com/${config.ApiHono}/deployments`,
  },
  {
    title: "Github",
    url: `https://github.com/${config.Github}`,
  },
]

export function DevTools() {
  const [expandDevtools, setExpandDevtools] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    function updateDimensions() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  const { width, height } = dimensions

  return (
    <div className="bg-background text-primary fixed right-2 bottom-2 z-100 flex items-center gap-1.5 rounded-full border font-mono text-xs font-medium select-none">
      {expandDevtools && (
        <>
          <ReactQueryDevtools buttonPosition="top-right" />
          <div className="fixed right-4 bottom-12 flex items-center gap-x-3">
            {Links.map(({ title, url }) => (
              <a
                key={title}
                className="flex items-center gap-1.5"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                <span>{title}</span>
                <ExternalLink className="mb-0.5 size-3" />
              </a>
            ))}
          </div>
          <span className="ml-1">{width.toLocaleString()}</span>
          <span>x</span>
          <span>{height.toLocaleString()}</span>
          <div className="h-4 w-px bg-zinc-500" />
          <span className="sm:hidden">XS</span>
          <span className="hidden sm:inline md:hidden">SM</span>
          <span className="hidden md:inline lg:hidden">MD</span>
          <span className="hidden lg:inline xl:hidden">LG</span>
          <span className="hidden xl:inline 2xl:hidden">XL</span>
          <span className="hidden 2xl:inline">2XL</span>
          <div className="-mr-1.5 h-4 w-px bg-zinc-500" />
        </>
      )}

      <CodeXml
        className="size-7.5 cursor-pointer p-1.5"
        onClick={() => setExpandDevtools(!expandDevtools)}
      />
    </div>
  )
}
