import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

import { config } from "@/lib/config"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: config.app.name,
    },
  }
}
