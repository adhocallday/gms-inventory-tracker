'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Package, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface ProductRow {
  id: string;
  sku: string;
  description: string;
  product_type: string;
  tour_count: number;
  created_at: string;
}

interface ProductCatalogTableProps {
  products: ProductRow[];
  loading?: boolean;
  onEdit?: (product: ProductRow) => void;
  onDelete?: (product: ProductRow) => void;
}

const productTypeBadgeVariant: Record<string, 'default' | 'active' | 'info' | 'warning'> = {
  apparel: 'active',
  accessories: 'info',
  media: 'warning',
  'paper-items': 'default',
  other: 'default',
};

export function ProductCatalogTable({
  products,
  loading,
  onEdit,
  onDelete,
}: ProductCatalogTableProps) {
  const columns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <Link
            href={`/products/${row.original.id}`}
            className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-red-primary)] transition"
          >
            {row.getValue('sku')}
          </Link>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)]">
            {row.getValue('description')}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'product_type',
        header: 'Type',
        cell: ({ row }) => {
          const type = row.getValue('product_type') as string;
          return (
            <Badge variant={productTypeBadgeVariant[type] || 'default'} size="sm">
              {type.replace('-', ' ')}
            </Badge>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'tour_count',
        header: 'Tours',
        cell: ({ row }) => {
          const count = row.getValue('tour_count') as number;
          return (
            <span className={`text-sm ${count > 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
              {count} {count === 1 ? 'tour' : 'tours'}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Link href={`/products/${row.original.id}`}>
              <Button variant="ghost" size="sm" title="View product">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(row.original)}
                title="Edit product"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {onDelete && row.original.tour_count === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(row.original)}
                title="Delete product"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [onEdit, onDelete]
  );

  return (
    <DataTable
      columns={columns}
      data={products}
      loading={loading}
      stickyHeader
      striped
      emptyState={{
        icon: <Package className="w-12 h-12 text-[var(--color-text-muted)]" />,
        title: 'No products found',
        description: 'Create a new product to get started',
      }}
    />
  );
}
