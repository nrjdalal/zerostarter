import Link from "next/link"

import { blogSource } from "@/lib/source"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

// Renders the /blog listing from the posts themselves (newest first by `date`), so adding a post needs no manual list or meta.json edit. Excludes the blog index page.
export function BlogList() {
  const posts = blogSource
    .getPages()
    .filter((page) => page.url !== "/blog")
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1))

  return (
    <div className="not-prose flex flex-col gap-6">
      {posts.map((post) => (
        <article key={post.url} className="flex flex-col gap-1">
          <Link
            href={post.url}
            className="text-fd-foreground text-lg font-medium no-underline hover:underline"
          >
            {post.data.title}
          </Link>
          <time className="text-fd-muted-foreground text-sm" dateTime={post.data.date}>
            {dateFormatter.format(new Date(post.data.date))}
          </time>
          <p className="text-fd-muted-foreground">{post.data.description}</p>
        </article>
      ))}
    </div>
  )
}
