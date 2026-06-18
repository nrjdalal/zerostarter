import Link from "next/link"

import { getPublishedBlogPosts } from "@/lib/blog"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

function formatBlogDate(value: string): string {
  return dateFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`))
}

// Renders published posts from the posts themselves, so adding a post needs no manual list or meta.json edit.
export function BlogList() {
  const posts = getPublishedBlogPosts()

  if (posts.length === 0) {
    return <p className="not-prose text-fd-muted-foreground">No posts published yet.</p>
  }

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
          <time className="text-fd-muted-foreground text-sm" dateTime={post.data.publishedAt}>
            {formatBlogDate(post.data.publishedAt ?? post.data.createdAt)}
          </time>
          <p className="text-fd-muted-foreground">{post.data.description}</p>
        </article>
      ))}
    </div>
  )
}
