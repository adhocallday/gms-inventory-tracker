'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DocumentReviewHeader from '@/components/review/DocumentReviewHeader';
import ValidationPanel from '@/components/review/ValidationPanel';
import TourShowSelector from '@/components/review/TourShowSelector';
import ReviewFormPO from '@/components/review/ReviewFormPO';
import ReviewFormPackingList from '@/components/review/ReviewFormPackingList';
import ReviewFormSalesReport from '@/components/review/ReviewFormSalesReport';
import ReviewFormSettlement from '@/components/review/ReviewFormSettlement';

interface ParsedDocument {
  id: string;
  doc_type: 'po' | 'packing-list' | 'sales-report' | 'settlement';
  status: 'draft' | 'approved' | 'posted' | 'rejected' | 'error';
  source_filename?: string;
  source_hash: string;
  tour_id?: string;
  show_id?: string;
  created_at: string;
  updated_at: string;
  normalized_json?: any;
  extracted_json?: any;
  ui_overrides?: any;
  validation?: {
    missing_fields?: string[];
    warnings?: string[];
  };
}

export default function ReviewDocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [formData, setFormData] = useState<any>(null);

  // Fetch document
  useEffect(() => {
    async function fetchDocument() {
      try {
        const res = await fetch(`/api/parsed-documents/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setDocument(data.data);
          // Initialize form data from normalized_json + ui_overrides
          const initialData = {
            ...data.data.normalized_json,
            ...data.data.ui_overrides,
          };
          setFormData(initialData);
        } else {
          console.error('Failed to fetch document');
          router.push('/dashboard/parsed-documents');
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        router.push('/dashboard/parsed-documents');
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [params.id, router]);

  const handleTourShowChange = async (tourId: string | null, showId: string | null) => {
    if (!document) return;

    try {
      const res = await fetch(`/api/parsed-documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: tourId,
          show_id: showId,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setDocument(updated.data);
        setStatusMessage('Tour/show assignment saved');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save tour/show:', err);
      setStatusMessage('Failed to save assignment');
    }
  };

  const handleFormDataChange = (newData: any) => {
    setFormData(newData);
  };

  const handleSaveDraft = async () => {
    if (!document) return;

    setSaving(true);
    setStatusMessage('Saving...');

    try {
      const res = await fetch(`/api/parsed-documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ui_overrides: formData,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setDocument(updated.data);
        setStatusMessage('Draft saved');
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        setStatusMessage('Failed to save draft');
      }
    } catch (err) {
      console.error('Save draft error:', err);
      setStatusMessage('Error saving draft');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndPost = async () => {
    if (!document) return;

    // Check for missing fields
    if (document.validation?.missing_fields && document.validation.missing_fields.length > 0) {
      setStatusMessage('Please fill all required fields before posting');
      return;
    }

    if (!confirm('Are you sure you want to post this document to the database? This action cannot be undone.')) {
      return;
    }

    setPosting(true);
    setStatusMessage('Posting...');

    try {
      // First save any pending changes
      await fetch(`/api/parsed-documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ui_overrides: formData,
          status: 'approved',
        }),
      });

      // Then post
      const res = await fetch(`/api/parsed-documents/${document.id}/post`, {
        method: 'POST',
      });

      if (res.ok) {
        const result = await res.json();
        setStatusMessage('Document posted successfully!');
        setTimeout(() => {
          router.push('/dashboard/parsed-documents');
        }, 2000);
      } else {
        const error = await res.json();
        setStatusMessage(`Failed to post: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Post error:', err);
      setStatusMessage('Error posting document');
    } finally {
      setPosting(false);
    }
  };

  const handleReject = async () => {
    if (!document) return;

    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      const res = await fetch(`/api/reject/${document.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });

      if (res.ok) {
        router.push('/dashboard/parsed-documents');
      } else {
        setStatusMessage('Failed to reject document');
      }
    } catch (err) {
      console.error('Reject error:', err);
      setStatusMessage('Error rejecting document');
    }
  };

  if (loading) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--color-text-secondary)]">
          Loading document...
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const isPosted = document.status === 'posted';
  const isRejected = document.status === 'rejected';

  return (
    <div className="g-container py-12">
      <DocumentReviewHeader
        docType={document.doc_type}
        status={document.status}
        filename={document.source_filename}
        createdAt={document.created_at}
      />

      <ValidationPanel validation={document.validation} />

      {!isPosted && !isRejected && (
        <div className="mb-6">
          <TourShowSelector
            tourId={document.tour_id}
            showId={document.show_id}
            docType={document.doc_type}
            onChange={handleTourShowChange}
          />
        </div>
      )}

      {/* Document-Specific Form */}
      {formData && !isPosted && !isRejected && (
        <>
          {document.doc_type === 'po' && (
            <ReviewFormPO
              data={formData}
              onChange={handleFormDataChange}
              unknownSkus={document.validation?.warnings?.filter((w: string) => w.includes('Unknown SKU')) || []}
              readOnly={false}
            />
          )}

          {document.doc_type === 'packing-list' && (
            <ReviewFormPackingList
              data={formData}
              onChange={handleFormDataChange}
              tourId={document.tour_id}
              unknownSkus={document.validation?.warnings?.filter((w: string) => w.includes('Unknown SKU')) || []}
              readOnly={false}
            />
          )}

          {document.doc_type === 'sales-report' && (
            <ReviewFormSalesReport
              data={formData}
              onChange={handleFormDataChange}
              unknownSkus={document.validation?.warnings?.filter((w: string) => w.includes('Unknown SKU')) || []}
              readOnly={false}
            />
          )}

          {document.doc_type === 'settlement' && (
            <ReviewFormSettlement
              data={formData}
              onChange={handleFormDataChange}
              unknownSkus={document.validation?.warnings?.filter((w: string) => w.includes('Unknown SKU')) || []}
              readOnly={false}
            />
          )}
        </>
      )}

      {/* Read-only form for posted/rejected documents */}
      {formData && (isPosted || isRejected) && (
        <>
          {document.doc_type === 'po' && (
            <ReviewFormPO data={formData} onChange={() => {}} readOnly={true} />
          )}

          {document.doc_type === 'packing-list' && (
            <ReviewFormPackingList data={formData} onChange={() => {}} readOnly={true} />
          )}

          {document.doc_type === 'sales-report' && (
            <ReviewFormSalesReport data={formData} onChange={() => {}} readOnly={true} />
          )}

          {document.doc_type === 'settlement' && (
            <ReviewFormSettlement data={formData} onChange={() => {}} readOnly={true} />
          )}
        </>
      )}

      {/* Actions */}
      {!isPosted && !isRejected && (
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <div className="text-sm text-[var(--color-text-secondary)]">{statusMessage}</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReject}
              className="g-button g-button-outline"
              disabled={saving || posting}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || posting}
              className="g-button g-button-outline"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleApproveAndPost}
              disabled={saving || posting || (document.validation?.missing_fields?.length || 0) > 0}
              className="g-button"
            >
              {posting ? 'Posting...' : 'Approve & Post'}
            </button>
          </div>
        </div>
      )}

      {isPosted && (
        <div className="g-card p-6 bg-green-500/10 border-green-500/30">
          <p className="text-sm text-green-300">
            ✓ This document has been posted to the database and cannot be edited.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="g-card p-6 bg-red-500/10 border-red-500/30">
          <p className="text-sm text-red-300">
            ✕ This document has been rejected.
          </p>
        </div>
      )}
    </div>
  );
}
