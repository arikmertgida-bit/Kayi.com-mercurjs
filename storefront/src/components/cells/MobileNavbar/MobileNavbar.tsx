'use client';

import { HttpTypes } from '@medusajs/types';
import LocalizedClientLink from '@/components/molecules/LocalizedLink/LocalizedLink';
import { CloseIcon, HamburgerMenuIcon } from '@/icons';
import { SellNowButton } from '@/components/cells/SellNowButton/SellNowButton';
import { useState } from 'react';
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export const MobileNavbar = ({
  childrenCategories,
  parentCategories,
  menuCategories = [],
  collections = [],
}: {
  childrenCategories: HttpTypes.StoreProductCategory[];
  parentCategories: HttpTypes.StoreProductCategory[];
  menuCategories?: HttpTypes.StoreProductCategory[];
  collections?: HttpTypes.StoreCollection[];
}) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const pathname = usePathname()

  const closeMenuHandler = () => setOpenMenu(false);

  const toggleAccordion = (id: string) =>
    setOpenAccordion((prev) => (prev === id ? null : id));

  const stripped = pathname?.replace(/^\/[a-z]{2}(\/|$)/, '/') ?? ''
  const isActive = (href: string) => stripped === href || stripped.startsWith(href + '/')

  return (
    <div className='lg:hidden'>
      <button
        onClick={() => setOpenMenu(true)}
        aria-label='Menuyu ac'
        className='flex items-center justify-center p-1'
      >
        <HamburgerMenuIcon />
      </button>

      {openMenu && (
        <div
          className='fixed inset-0 bg-black/40 z-20'
          onClick={closeMenuHandler}
        />
      )}

      <div
        className={`fixed left-0 top-0 h-full w-72 bg-white z-30 flex flex-col shadow-xl transform transition-transform duration-300 ${
          openMenu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className='pt-[5px]'>
          <div className='flex items-center justify-between px-4 py-2'>
            <span className='text-base font-extrabold tracking-wide'>&#9776; Menu</span>
            <button onClick={closeMenuHandler} aria-label='Kapat'>
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        <div className='border-t' />

        <div className='flex-1 overflow-y-auto'>
          <div className='mt-3' />

          <p className='px-4 pb-1 text-xs font-extrabold uppercase tracking-widest text-gray-700'>
            TUM KATEGORILER
          </p>

          <div className='flex flex-col'>
            {menuCategories.map((parent) => {
              const children: HttpTypes.StoreProductCategory[] =
                (parent as any).category_children ?? [];
              const isOpen = openAccordion === parent.id;

              return (
                <div key={parent.id}>
                  <button
                    onClick={() => toggleAccordion(parent.id)}
                    className='flex items-center justify-between w-full px-4 py-[6px] text-sm font-bold uppercase tracking-wide hover:bg-gray-50 transition-colors text-gray-800'
                  >
                    <span>{parent.name}</span>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      <path
                        fillRule='evenodd'
                        d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </button>

                  {isOpen && children.length > 0 && (
                    <div className='bg-gray-50 border-t border-b'>
                      {children.map((child) => (
                        <LocalizedClientLink
                          key={child.id}
                          href={`/categories/${child.handle}`}
                          onClick={closeMenuHandler}
                          className='block px-8 py-[5px] text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors'
                        >
                          {child.name}
                        </LocalizedClientLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className='flex flex-col mt-2 border-t pt-2'>
            <LocalizedClientLink
              href='/categories'
              onClick={closeMenuHandler}
              className={cn(
                'flex items-center gap-2 px-4 py-[6px] text-sm font-bold uppercase tracking-wide transition-colors hover:bg-gray-50',
                isActive('/categories') ? 'text-[#e30a17]' : 'text-gray-800'
              )}
            >
              <span className='w-2 h-2 rounded-full bg-[#e30a17] flex-shrink-0' />
              All Products
            </LocalizedClientLink>

            {collections.map((collection) => {
              const href = `/collections/${collection.handle}`
              return (
                <LocalizedClientLink
                  key={collection.id}
                  href={href}
                  onClick={closeMenuHandler}
                  className={cn(
                    'flex items-center gap-2 px-4 py-[6px] text-sm font-bold uppercase tracking-wide transition-colors hover:bg-gray-50',
                    isActive(href) ? 'text-[#e30a17]' : 'text-gray-800'
                  )}
                >
                  <span className='w-2 h-2 rounded-full bg-[#e30a17] flex-shrink-0' />
                  {collection.title}
                </LocalizedClientLink>
              )
            })}
          </div>
        </div>

        <div className='border-t p-4 flex justify-center'>
          <SellNowButton />
        </div>
      </div>
    </div>
  );
};