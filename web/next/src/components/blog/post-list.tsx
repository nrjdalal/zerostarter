import { Link } from "@tanstack/react-router"

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { formatBlogDate } from "@/lib/blog-policy"
import type { PostSummary } from "@/lib/fumadocs"

// Pure presentational list; posts come from the /blog route loader (client-safe), not the server source, so this component can render on the client.
export function BlogPostList({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) {
    return (
      <Empty className="not-prose">
        <EmptyHeader>
          <EmptyTitle>No posts published yet.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="not-prose flex flex-col gap-6">
      {posts.map((post) => {
        return (
          <article key={post.url} className="flex flex-col gap-1">
            <Link
              to={post.url}
              className="text-foreground text-lg font-medium no-underline hover:underline"
            >
              {post.title}
            </Link>
            <time className="text-muted-foreground text-sm" dateTime={post.publishedAt}>
              {formatBlogDate(post.publishedAt)}
            </time>
            <p className="text-muted-foreground">{post.description}</p>
          </article>
        )
      })}
    </div>
  )
}
