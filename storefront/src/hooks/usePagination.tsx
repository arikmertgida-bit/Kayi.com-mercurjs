import { useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import useUpdateSearchParams from './useUpdateSearchParams';
import { FiltersContext } from '@/providers/FiltersProvider';

export const usePagination = () => {
  const ctx            = useContext(FiltersContext);
  const searchParams   = useSearchParams();
  const updateSearchParams = useUpdateSearchParams();

  // When inside FiltersProvider, read page from context (no router navigation needed)
  const currentPage = ctx
    ? parseInt(ctx.paramMap['page'] || '1')
    : parseInt(searchParams.get('page') || '1');

  const setPage = (page: string) => {
    updateSearchParams('page', page);
  };

  return { currentPage, setPage };
};
