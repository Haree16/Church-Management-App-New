import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

interface PaginationProps extends React.ComponentProps<"nav"> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  className,
  ...props
}: PaginationProps) {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex w-full items-center justify-between px-2 py-3", className)}
      {...props}
    >
      <div className="text-xs text-slate-400">
        {totalItems !== undefined && (
          <span>
            Showing <strong className="font-bold text-white">
              {Math.min((currentPage - 1) * (pageSize || 10) + 1, totalItems)}
            </strong> to <strong className="font-bold text-white">
              {Math.min(currentPage * (pageSize || 10), totalItems)}
            </strong> of <strong className="font-bold text-white">{totalItems}</strong> entries
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {pages.map((page, idx) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }
          const pageNum = Number(page);
          const isActive = pageNum === currentPage;
          return (
            <Button
              key={pageNum}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className={cn("h-8 w-8 p-0 text-xs", isActive ? "pointer-events-none font-semibold" : "")}
            >
              {pageNum}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 px-2"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </nav>
  );
}
