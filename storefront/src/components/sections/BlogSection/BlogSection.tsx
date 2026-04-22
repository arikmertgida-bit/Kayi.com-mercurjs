import { BlogPost } from '@/types/blog';
import { BlogCard } from '@/components/organisms';

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: '14 Günde Para İade',
    excerpt:
      'İçinize sinmeyen bir durum olursa bizi hemen bilgilendirin. 14 gün boyunca iade hakkınız güvencemiz altındadır ve paranız en kısa sürede hesabınıza aktarılır.',
    image: '/images/blog/para-iade.jpeg',
    category: 'İADE',
    href: '#',
  },
  {
    id: 2,
    title: 'Ücretsiz Kargo ve İade',
    excerpt:
      'Alışverişiniz belirli bir tutarı geçtiğinde kargo ve iade tamamen bizden! Daha uygun ve güvenli bir alışveriş için ekstra ücret ödemenize gerek yok.',
    image: '/images/blog/ucretsiz-kargo.jpeg',
    category: 'KARGO',
    href: '#',
  },
  {
    id: 3,
    title: 'Hızlı E-Posta Desteği',
    excerpt:
      'Her türlü sorunuz için e-posta ile bize ulaşabilirsiniz. Destek ekibimiz taleplerinizi hızlıca değerlendirip en kısa sürede dönüş sağlar.',
    image: '/images/blog/eposta-destek.jpeg',
    category: 'DESTEK',
    href: '#',
  },
];

export function BlogSection() {
  return (
    <section className='bg-tertiary container'>
      <div className='flex items-center justify-between mb-12'>
        <h2 className='heading-lg text-tertiary'>
          Neden Bizi Seçmelisiniz?
        </h2>
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {blogPosts.map((post) => (
          <BlogCard
            key={post.id}
            post={post}
          />
        ))}
      </div>
    </section>
  );
}