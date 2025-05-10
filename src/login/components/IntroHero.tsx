export default function IntroHero() {
  return (
    <div className="relative mx-auto mb-6 aspect-[16/10] w-full overflow-hidden bg-muted">
      <picture>
        <source srcSet="/writing_girl.webp" type="image/webp" />
        <img 
          src="/writing_girl.png" 
          alt="매일 글쓰기 프렌즈" 
          className="size-full object-cover" 
          loading="eager" 
          decoding="async"
        />
      </picture>
    </div>
  )
} 