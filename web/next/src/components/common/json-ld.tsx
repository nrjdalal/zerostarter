// One JSON-LD block, serialized with < escaped so a value can never close the script tag. Rendered in a server component; the object is the schema.org node itself.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}
