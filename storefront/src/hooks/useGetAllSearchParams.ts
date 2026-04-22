import { useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiltersContext } from '@/providers/FiltersProvider';

function useGetAllSearchParams() {
  const ctx          = useContext(FiltersContext);
  const searchParams = useSearchParams();

  const allSearchParams: { [key: string]: string } = {};

  if (ctx) {
    // Read from context (live, no router navigation needed)
    Object.entries(ctx.filterMap).forEach(([key, values]) => {
      if (values.length) allSearchParams[key] = values.join(',');
    });
    Object.entries(ctx.paramMap).forEach(([key, value]) => {
      if (value) allSearchParams[key] = value;
    });
  } else {
    // Fallback: read from URL
    searchParams.forEach((value, key) => {
      if (key !== 'sortBy' && key !== 'page') allSearchParams[key] = value;
    });
  }

  const count = Object.keys(allSearchParams)
    .map((key) => allSearchParams[key].split(',').length)
    .reduce((sum, a) => sum + a, 0);

  return { allSearchParams, count };
}

export default useGetAllSearchParams;
