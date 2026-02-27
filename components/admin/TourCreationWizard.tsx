'use client';

import { useState, useEffect } from 'react';
import TourBasicInfoStep from './wizard/TourBasicInfoStep';
import TourScheduleStep from './wizard/TourScheduleStep';
import ProductCatalogStep from './wizard/ProductCatalogStep';
import InitialInventoryStep from './wizard/InitialInventoryStep';
import ReviewStep from './wizard/ReviewStep';

type WizardStep = 'basic' | 'schedule' | 'products' | 'inventory' | 'review';

interface TourData {
  name: string;
  artist: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface Show {
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

interface Product {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  sizes: string[];
  imageUrl?: string;
}

interface InventoryItem {
  sku: string;
  size: string;
  location: string; // 'warehouse', 'webstore', 'road', etc.
  quantity: number;
}

export default function TourCreationWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [tourData, setTourData] = useState<TourData>({
    name: '',
    artist: '',
    startDate: '',
    endDate: ''
  });
  const [shows, setShows] = useState<Show[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [initialInventory, setInitialInventory] = useState<InventoryItem[]>([]);

  const steps: { id: WizardStep; label: string; description: string }[] = [
    { id: 'basic', label: 'Tour Info', description: 'Basic tour details' },
    { id: 'schedule', label: 'Shows', description: 'Tour schedule & venues' },
    { id: 'products', label: 'Products', description: 'Merchandise catalog' },
    { id: 'inventory', label: 'Stock', description: 'Initial inventory levels' },
    { id: 'review', label: 'Review', description: 'Review & create' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // Auto-populate start/end dates from shows
  useEffect(() => {
    if (shows.length === 0) return;

    const dates = shows.map(s => s.showDate).filter(Boolean).sort();
    if (dates.length > 0) {
      const earliestDate = dates[0];
      const latestDate = dates[dates.length - 1];

      setTourData(prev => ({
        ...prev,
        startDate: earliestDate,
        endDate: latestDate
      }));
    }
  }, [shows]);

  const goToStep = (stepId: WizardStep) => {
    setCurrentStep(stepId);
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  return (
    <div className="g-container py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
          Admin Panel
        </p>
        <h1 className="text-3xl font-semibold g-title mt-2">Create New Tour</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-3xl">
          Set up a new tour with AI-assisted data entry. Upload PDFs, CSVs, or images
          to automatically populate tour schedules, shows, and product catalogs.
        </p>
      </header>

      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center flex-1"
            >
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => goToStep(step.id)}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-200 border
                    ${index <= currentStepIndex
                      ? 'bg-[var(--color-red-primary)] text-white border-[var(--color-red-primary)]'
                      : 'bg-[var(--color-bg-border)] text-[var(--color-text-muted)] border-[var(--color-bg-border)]'
                    }
                    ${index < currentStepIndex ? 'cursor-pointer hover:opacity-80' : ''}
                  `}
                >
                  {index < currentStepIndex ? '✓' : index + 1}
                </button>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    index <= currentStepIndex ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4 mb-8
                  ${index < currentStepIndex
                    ? 'bg-[var(--color-red-primary)]'
                    : 'bg-[var(--color-bg-border)]'
                  }
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="g-card p-8">
        {currentStep === 'basic' && (
          <TourBasicInfoStep
            tourData={tourData}
            onUpdate={setTourData}
            onNext={nextStep}
          />
        )}

        {currentStep === 'schedule' && (
          <TourScheduleStep
            tourData={tourData}
            shows={shows}
            onUpdate={setShows}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}

        {currentStep === 'products' && (
          <ProductCatalogStep
            tourData={tourData}
            products={products}
            onUpdate={setProducts}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}

        {currentStep === 'inventory' && (
          <InitialInventoryStep
            products={products}
            inventory={initialInventory}
            onUpdate={setInitialInventory}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            tourData={tourData}
            shows={shows}
            products={products}
            initialInventory={initialInventory}
            onPrev={prevStep}
          />
        )}
      </div>
    </div>
  );
}
