import Image from "next/image"
import { BlogPost } from "@/types/blog"

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <div
      className="group block border border-secondary p-1 rounded-sm relative"
    >
      <div className="relative overflow-hidden rounded-xs h-full">
        <Image
          loading="lazy"
          sizes="(min-width: 1024px) 33vw, 100vw"
          src={decodeURIComponent(post.image)}
          alt={post.title}
          width={467}
          height={472}
          className="object-cover max-h-[472px] h-full w-full"
        />
      </div>
      <div className="p-4 bg-tertiary text-tertiary absolute bottom-0 left-1 lg:opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-b-xs w-[calc(100%-8px)]">
        <h3 className="heading-sm">{post.title}</h3>
        <p className="text-md line-clamp-2">{post.excerpt}</p>
      </div>
    </div>
  )
}