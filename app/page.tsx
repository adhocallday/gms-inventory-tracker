export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to GMS Inventory Tracker
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Multi-tour inventory management with AI-powered document parsing
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <a
          href="/upload/po"
          className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-900">
              Upload Purchase Order
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Parse vendor PO PDFs and extract line items, costs, and SKUs automatically
          </p>
        </a>
        
        <a
          href="/upload/packing-list"
          className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-900">
              Upload Packing List
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Parse packing slips from any vendor format and reconcile with POs
          </p>
        </a>
        
        <a
          href="/upload/sales-report"
          className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-900">
              Upload Sales Report
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Parse AtVenu sales reports and extract all sales data by SKU
          </p>
        </a>
        
        <a
          href="/upload/settlement"
          className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-900">
              Upload Settlement
            </h3>
          </div>
          <p className="text-gray-600 text-sm">
            Parse settlement reports and extract comp data and financials
          </p>
        </a>
      </div>
      
      <div className="mt-12 max-w-3xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🚀 Getting Started
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
          <li>Set up your Supabase project and add credentials to .env.local</li>
          <li>Add your Anthropic API key for document parsing</li>
          <li>Run database migrations to create tables</li>
          <li>Upload your first document to test the AI parsing</li>
        </ol>
      </div>
    </div>
  );
}
