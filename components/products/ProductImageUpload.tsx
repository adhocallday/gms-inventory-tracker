'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ProductImage {
  id: string;
  image_type: string;
  file_url: string;
  is_primary: boolean;
  display_order: number;
  caption?: string;
  created_at: string;
}

interface ProductImageUploadProps {
  productId: string;
  tourId: string;
  existingImages?: ProductImage[];
  onUploadComplete?: (image: ProductImage) => void;
}

export function ProductImageUpload({
  productId,
  tourId,
  existingImages = [],
  onUploadComplete
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>(existingImages);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Upload each file
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tourId', tourId);
        formData.append('imageType', 'grab_sheet');
        formData.append('isPrimary', String(images.length === 0)); // First image is primary

        const response = await fetch(`/api/products/${productId}/images`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const { image } = await response.json();
        setImages(prev => [...prev, image]);

        if (onUploadComplete) {
          onUploadComplete(image);
        }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [productId, images.length, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    multiple: true,
    disabled: uploading
  });

  const handleSetPrimary = async (imageId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true })
      });

      if (!response.ok) {
        throw new Error('Failed to set primary image');
      }

      // Update local state
      setImages(prev =>
        prev.map(img => ({
          ...img,
          is_primary: img.id === imageId
        }))
      );
    } catch (err: any) {
      console.error('Set primary error:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/images/${imageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          isDragActive
            ? 'border-[var(--g-accent)] bg-[var(--g-accent)]/5'
            : 'border-[var(--g-border)] hover:border-[var(--g-accent)]'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="text-4xl">📸</div>
          {uploading ? (
            <p className="text-sm text-[var(--g-text-muted)]">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-sm text-[var(--g-text)]">Drop images here</p>
          ) : (
            <>
              <p className="text-sm text-[var(--g-text)]">
                Drag & drop product images here, or click to select
              </p>
              <p className="text-xs text-[var(--g-text-muted)]">
                PNG, JPG, GIF, WebP (max 10MB per file)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group border border-[var(--g-border)] rounded-lg overflow-hidden"
            >
              {/* Image */}
              <div className="aspect-square bg-[var(--g-bg-muted)]">
                <img
                  src={image.file_url}
                  alt={image.caption || 'Product image'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Primary Badge */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-[var(--g-accent)] text-white text-xs font-semibold rounded">
                  Primary
                </div>
              )}

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                {!image.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(image.id)}
                    className="px-3 py-1.5 bg-white text-black text-sm font-medium rounded hover:bg-gray-200 transition"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => handleDelete(image.id)}
                  className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </div>

              {/* Caption */}
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 text-white text-xs">
                  {image.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !uploading && (
        <div className="text-center text-sm text-[var(--g-text-muted)] py-8">
          No images uploaded yet
        </div>
      )}
    </div>
  );
}
