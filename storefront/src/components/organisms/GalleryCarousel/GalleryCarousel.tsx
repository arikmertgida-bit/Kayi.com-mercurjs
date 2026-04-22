"use client"

import { useState } from 'react';
import { ProductCarousel } from '@/components/cells';
import { ProductLightbox } from '@/components/organisms/ProductLightbox';
import { HttpTypes } from '@medusajs/types';

export const GalleryCarousel = ({
  images,
}: {
  images: HttpTypes.StoreProduct['images'];
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className='border w-full p-1 rounded-sm'>
        <ProductCarousel slides={images} onImageClick={handleImageClick} />
      </div>
      {lightboxOpen && (
        <ProductLightbox
          slides={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
};
