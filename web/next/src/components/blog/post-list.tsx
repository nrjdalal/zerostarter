import Link from "next/link"

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { getPublishedBlogPosts } from "@/lib/blog"
import { formatBlogDate } from "@/lib/blog-policy"

export function BlogPostList() {
  const posts = getPublishedBlogPosts()

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
              href={post.url}
              className="text-lg font-medium text-foreground no-underline hover:underline"
            >
              {post.data.title}
            </Link>
            <time className="text-sm text-muted-foreground" dateTime={post.data.publishedAt}>
              {formatBlogDate(post.data.publishedAt)}
            </time>
            <p className="text-muted-foreground">{post.data.description}</p>
          </article>
        )
      })}
    </div>
  )
}
