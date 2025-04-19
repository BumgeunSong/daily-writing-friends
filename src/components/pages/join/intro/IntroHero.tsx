export default function IntroHero() {
  return (
    <div className="w-full aspect-[16/10] relative bg-muted mx-auto mb-6 overflow-hidden">
      <picture>
        <source srcSet="/writing_girl.webp" type="image/webp" />
        <img 
          src="/writing_girl.png" 
          alt="매일 글쓰기 프렌즈" 
          className="w-full h-full object-cover" 
          loading="eager" 
          decoding="async"
        />
      </picture>
    </div>
  )
} 