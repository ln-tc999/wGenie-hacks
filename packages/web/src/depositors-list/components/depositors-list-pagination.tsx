import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useDepositorsListContext } from '@/depositors-list/depositors-list.context';

export const DepositorsListPagination = () => {
  const {
    params: { depositorsData, currentPage, paginationActions },
  } = useDepositorsListContext();

  const totalPages = depositorsData?.pagination.totalPages ?? 0;

  if (totalPages <= 1) {
    return null;
  }

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous Button */}
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (canGoPrevious) {
                paginationActions.goToPage(currentPage - 1);
              }
            }}
            className={!canGoPrevious ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {/* Page Numbers */}
        {generatePageNumbers().map((page, index) => (
          <PaginationItem key={index}>
            {page === '...' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                isActive={currentPage === page}
                onClick={(e) => {
                  e.preventDefault();
                  paginationActions.goToPage(page as number);
                }}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next Button */}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (canGoNext) {
                paginationActions.goToPage(currentPage + 1);
              }
            }}
            className={!canGoNext ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
