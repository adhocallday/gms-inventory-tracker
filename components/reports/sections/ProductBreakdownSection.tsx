'use client';

interface ProductBreakdownSectionProps {
  title: string;
  products: any[];
  productImages: any[];
  categories: any[];
}

export function ProductBreakdownSection({
  title,
  products,
  productImages,
  categories
}: ProductBreakdownSectionProps) {
  // Debug: Log image data received
  console.log(`[ProductBreakdown] Received ${productImages?.length || 0} product images`);
  if (productImages && productImages.length > 0) {
    console.log(`[ProductBreakdown] First image:`, {
      product_id: productImages[0].product_id,
      sku: productImages[0].sku,
      has_file_url: !!productImages[0].file_url,
      url_length: productImages[0].file_url?.length || 0
    });
  }
  if (products && products.length > 0) {
    console.log(`[ProductBreakdown] First product:`, {
      product_id: products[0].product_id,
      sku: products[0].sku
    });
  }

  // Group products by category
  const productsByCategory = categories.map(category => {
    const categoryProducts = products.filter(p => p.category_id === category.id);
    return {
      category,
      products: categoryProducts
    };
  }).filter(group => group.products.length > 0);

  // If no categories, show all products ungrouped
  const hasCategories = productsByCategory.length > 0;
  const displayProducts = hasCategories ? [] : products;

  // Calculate total units and gross
  const totalUnits = products.reduce((sum, p) => sum + (p.total_sold || 0), 0);
  const totalGross = products.reduce((sum, p) => sum + (p.total_gross || 0), 0);

  const getProductImage = (productId: string) => {
    return productImages.find(img => img.product_id === productId)?.file_url;
  };

  const getProductPercent = (product: any) => {
    if (totalGross === 0) return 0;
    return ((product.total_gross || 0) / totalGross * 100).toFixed(1);
  };

  return (
    <section className="print:page-break-inside-avoid">
      <div className="mb-6">
        <h2 className="text-3xl font-bold g-title mb-2">{title}</h2>
        <div className="flex gap-6 text-sm text-[var(--g-text-muted)]">
          <div>
            <span className="font-semibold">Total Units: </span>
            {totalUnits.toLocaleString()}
          </div>
          <div>
            <span className="font-semibold">Total Gross: </span>
            ${totalGross.toLocaleString()}
          </div>
          <div>
            <span className="font-semibold">Products: </span>
            {products.length}
          </div>
        </div>
      </div>

      {/* Grouped by category */}
      {hasCategories && (
        <div className="space-y-8">
          {productsByCategory.map(({ category, products: categoryProducts }) => (
            <div key={category.id}>
              <h3
                className="text-xl font-semibold mb-4 pb-2 border-b-2"
                style={{ borderColor: category.color || 'var(--g-border)' }}
              >
                {category.name}
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryProducts.map((product: any) => (
                  <div
                    key={product.product_id}
                    className="g-card p-4 hover:shadow-lg transition"
                  >
                    {/* Product Image */}
                    {getProductImage(product.product_id) ? (
                      <div className="aspect-square bg-[var(--g-bg-muted)] rounded-lg overflow-hidden mb-3">
                        <img
                          src={getProductImage(product.product_id)}
                          alt={product.description || product.sku}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-[var(--g-bg-muted)] rounded-lg flex items-center justify-center mb-3 text-4xl">
                        📦
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="space-y-1">
                      <div className="text-xs text-[var(--g-text-muted)] font-mono">
                        {product.sku}
                      </div>
                      <div className="text-sm font-semibold g-title line-clamp-2">
                        {product.description || 'No description'}
                      </div>
                      <div className="text-lg font-bold" style={{ color: category.color }}>
                        {product.total_sold?.toLocaleString() || 0} units
                      </div>
                      <div className="text-xs text-[var(--g-text-muted)]">
                        {getProductPercent(product)}% of total
                      </div>
                      <div className="text-sm text-[var(--g-text-muted)]">
                        ${product.total_gross?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ungrouped products */}
      {!hasCategories && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayProducts.map((product: any) => (
            <div
              key={product.product_id}
              className="g-card p-4 hover:shadow-lg transition"
            >
              {/* Product Image */}
              {getProductImage(product.product_id) ? (
                <div className="aspect-square bg-[var(--g-bg-muted)] rounded-lg overflow-hidden mb-3">
                  <img
                    src={getProductImage(product.product_id)}
                    alt={product.description || product.sku}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-[var(--g-bg-muted)] rounded-lg flex items-center justify-center mb-3 text-4xl">
                  📦
                </div>
              )}

              {/* Product Info */}
              <div className="space-y-1">
                <div className="text-xs text-[var(--g-text-muted)] font-mono">
                  {product.sku}
                </div>
                <div className="text-sm font-semibold g-title line-clamp-2">
                  {product.description || 'No description'}
                </div>
                <div className="text-lg font-bold text-[var(--g-accent)]">
                  {product.total_sold?.toLocaleString() || 0} units
                </div>
                <div className="text-xs text-[var(--g-text-muted)]">
                  {getProductPercent(product)}% of total
                </div>
                <div className="text-sm text-[var(--g-text-muted)]">
                  ${product.total_gross?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
