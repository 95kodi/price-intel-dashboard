# API Integration Guide - Price Intel Dashboard

This document explains how the Price Intelligence Dashboard has been converted from using mock data to real API integration.

## Overview

The dashboard now integrates with backend APIs while maintaining fallback support for mock data. If the API is unavailable, the dashboard gracefully falls back to mock data.

## Architecture

### API Layer Structure

```
src/services/
├── api-client.ts              # Reusable fetch wrapper
├── product.service.ts         # Product API endpoints
├── platform.service.ts        # Platform/Competitor API endpoints
├── product-platform.service.ts # Product-Platform mapping API
├── comparison.service.ts      # Price comparison API
└── api.ts                     # Main API service with mock fallback
```

## Environment Configuration

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your backend API URL:
   ```env
   # Backend API Base URL
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

### Development

For local development with a local backend:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Production

For production deployment:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## API Client (`src/services/api-client.ts`)

The API client provides a reusable fetch wrapper with:
- Global error handling
- Typed responses
- Support for GET, POST, PUT, DELETE methods
- Automatic base URL resolution

### Methods

```typescript
// GET request
apiGet<T>(endpoint: string): Promise<T>

// POST request
apiPost<T>(endpoint: string, body: unknown): Promise<T>

// PUT request
apiPut<T>(endpoint: string, body: unknown): Promise<T>

// DELETE request
apiDelete<T>(endpoint: string): Promise<T>
```

## Backend API Endpoints

### Products

```
GET  /api/Product/GetAll              # Fetch all products
POST /api/Product/Add                 # Create a new product
```

**Expected Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "productName": "iPhone 16 Pro",
      "brand": "Apple",
      "category": "Smartphones",
      "currentPrice": 109900,
      "sku": "APL-IP16P-256",
      "createdAt": "2025-01-01T00:00:00Z",
      "status": "active"
    }
  ]
}
```

### Platforms (Competitors)

```
GET  /api/PlatformMaster/GetAll       # Fetch all platforms
POST /api/PlatformMaster/Add          # Create a new platform
```

**Expected Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "platformName": "Amazon",
      "platformCode": "AMZN",
      "websiteUrl": "https://amazon.in",
      "enabled": true,
      "productCount": 42
    }
  ]
}
```

### Product Platform Mapping

```
GET  /api/ProductPlatform/GetAll      # Fetch all mappings
POST /api/ProductPlatform/Add         # Create a new mapping
GET  /api/ProductPlatform/GetPriceHistory/{productId}  # Price history
```

**Expected Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "productId": 1,
      "platformId": 1,
      "productUrl": "https://amazon.in/dp/B0D8..."
    }
  ]
}
```

**Price History Response:**
```json
{
  "data": [
    {
      "date": "2025-01-15T11:42:00Z",
      "platformName": "Amazon",
      "price": 112000
    }
  ]
}
```

### Price Comparison

```
GET /api/PriceComparison/GetPriceComparison  # Get price comparison data
```

**Expected Response Format:**
```json
{
  "data": [
    {
      "productId": 1,
      "productName": "iPhone 16 Pro Max 512GB",
      "ourPrice": 109900,
      "lowestCompetitorPrice": 109500,
      "competitorName": "Flipkart",
      "priceGap": 400,
      "status": "losing",
      "competitors": [
        {
          "platformName": "Amazon",
          "price": 112000
        },
        {
          "platformName": "Flipkart",
          "price": 109500
        }
      ]
    }
  ],
  "summary": {
    "totalProducts": 15,
    "winningProducts": 8,
    "losingProducts": 4,
    "matchingProducts": 3,
    "averagePriceGap": 2500
  }
}
```

## Service Layer

### Product Service (`src/services/product.service.ts`)

```typescript
// Fetch all products
fetchProductsFromAPI(): Promise<Product[]>

// Create a new product
createProductAPI(data: Omit<Product, "id" | "createdAt">): Promise<Product>

// Get unique brands
fetchBrandsFromAPI(): Promise<string[]>
```

### Platform Service (`src/services/platform.service.ts`)

```typescript
// Fetch all platforms
fetchPlatformsFromAPI(): Promise<Platform[]>

// Create a new platform
createPlatformAPI(data: Omit<Platform, "id">): Promise<Platform>

// Fetch competitors (converts platforms to competitor format)
fetchCompetitorsFromAPI(): Promise<Competitor[]>
```

### Product Platform Service (`src/services/product-platform.service.ts`)

```typescript
// Fetch all mappings
fetchProductPlatformsFromAPI(): Promise<ProductPlatform[]>

// Create a new mapping
createProductPlatformAPI(data: Omit<ProductPlatform, "id">): Promise<ProductPlatform>

// Fetch price history
fetchPriceHistoryFromAPI(productId: number): Promise<PriceHistoryEntry[]>

// Helper functions
formatPriceHistoryForChart(entries: PriceHistoryEntry[]): Array<{...}>
groupPriceHistoryByPlatform(entries: PriceHistoryEntry[]): Record<...>
```

### Comparison Service (`src/services/comparison.service.ts`)

```typescript
// Fetch price comparison data
fetchPriceComparisonFromAPI(): Promise<PriceComparisonResponse>

// Convert API response to ProductWithPrices
convertComparisonToProductWithPrices(items: PriceComparisonItem[]): ProductWithPrices[]

// Convert API response to DashboardSummary
convertComparisonToDashboardSummary(response: PriceComparisonResponse): DashboardSummary

// Generate notifications from comparison data
generateNotificationsFromComparison(items: PriceComparisonItem[]): Notification[]
```

## Main API Service (`src/services/api.ts`)

The main API service provides the public interface with:
- Real API integration with fallback to mock data
- Automatic cache invalidation on mutations
- Error handling and recovery

### Key Features

1. **API Fallback**: If the API call fails, automatically falls back to mock data
   ```typescript
   async function tryAPI<T>(apiCall: () => Promise<T>, fallback: T): Promise<T>
   ```

2. **Dashboard Operations**:
   - `fetchDashboardSummary()` - Get dashboard metrics
   - `fetchProductsWithPrices()` - Get products with competitor prices
   - `fetchBrandPriceGaps()` - Get price gaps by brand
   - `fetchCompetitorCoverage()` - Get competitor coverage

3. **Product Operations**:
   - `fetchProducts()` - Get all products
   - `createProduct()` - Create a new product
   - `updateProduct()` - Update a product
   - `deleteProduct()` - Delete a product

4. **Competitor Operations**:
   - `fetchCompetitors()` - Get all competitors
   - `createCompetitor()` - Create a new competitor
   - `updateCompetitor()` - Update a competitor
   - `deleteCompetitor()` - Delete a competitor
   - `toggleCompetitor()` - Enable/disable a competitor

5. **Notification Operations**:
   - `fetchNotifications()` - Get notifications
   - `markNotificationRead()` - Mark notification as read
   - `markAllNotificationsRead()` - Mark all as read

## State Management (TanStack Query)

### Hook Files (`src/hooks/useQueries.ts`)

The hooks provide React Query integration with caching and auto-refetch:

```typescript
// Dashboard hooks
useDashboardSummary()           // Refetches every 5 minutes
useProductsWithPrices(filters)  // Refetches every 5 minutes
useBrandPriceGaps()
useCompetitorCoverage()

// Product hooks
useProducts()
useBrands()
useCreateProduct()
useUpdateProduct()
useDeleteProduct()

// Competitor hooks
useCompetitors()
useCreateCompetitor()
useUpdateCompetitor()
useDeleteCompetitor()
useToggleCompetitor()

// Notification hooks
useNotifications()
useMarkNotificationRead()
useMarkAllRead()

// Price history hooks
usePriceHistory(productId)
useProductPlatforms()
useCreateProductUrl()

// Scan hooks
useRunScan()
```

### Query Configuration

- **Stale Time**: 60 seconds for dashboard and product data
- **Auto-Refetch**: Every 5 minutes for comparison data
- **Cache Invalidation**: Automatic on mutations
- **Retry**: Automatic retry on network failures

## Component Integration

### Loading States

Components display skeleton loaders while data is loading:
- `KpiCardSkeleton` - For dashboard cards
- `TableSkeleton` - For tables
- `ChartSkeleton` - For charts

### Error States

Graceful error handling with user-friendly messages and retry buttons:
```typescript
<ErrorState
  title="Failed to load data"
  description="Unable to fetch price comparison data..."
  onRetry={() => refetch()}
/>
```

### Empty States

Clear messaging when no data is available:
```typescript
<EmptyState
  icon={Package}
  title="No products found"
  description="Add your first product to start tracking prices."
  action={{ label: "Add Product", onClick: openAddModal }}
/>
```

## Type Definitions

### Core Types (`src/types/index.ts`)

```typescript
// Product with flexible naming
interface Product {
  id: number;
  productName?: string;
  name?: string;
  brand: string;
  category: string;
  currentPrice?: number;
  ourPrice?: number;
  sku: string;
  createdAt: string;
  status: "active" | "inactive";
}

// Platform/Competitor
interface Platform {
  id: number;
  platformName?: string;
  platformCode?: string;
  websiteUrl?: string;
  enabled?: boolean;
  lastScan?: string | null;
  productCount?: number;
}

// Price comparison item
interface PriceComparisonItem {
  productId: number;
  productName: string;
  ourPrice: number;
  lowestCompetitorPrice: number | null;
  priceGap: number | null;
  status: PriceStatus;
  competitors: Array<{
    platformName: string;
    price: number | null;
  }>;
}

// API response wrappers
interface ApiListResponse<T> {
  data: T[];
  message?: string;
  success?: boolean;
}

interface ApiSingleResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}
```

## Data Flow

### Dashboard Page

```
Dashboard Page
    ↓
    ├─→ useDashboardSummary()     → KpiCards (Summary metrics)
    ├─→ useProductsWithPrices()   → PriceComparisonTable
    ├─→ useBrandPriceGaps()       → BrandGapBarChart
    ├─→ useCompetitorCoverage()   → CompetitorCoverageChart
    └─→ useDashboardSummary()     → WinLossPieChart

All queries fetch from /api/PriceComparison/GetPriceComparison
With fallback to mock data if API is unavailable
```

### Product Operations

```
ProductTable Component
    ↓
    ├─→ useProducts()           → Fetch /api/Product/GetAll
    ├─→ useCreateProduct()      → POST /api/Product/Add
    ├─→ useUpdateProduct()      → Mock (API may not support PUT)
    └─→ useDeleteProduct()      → Mock (API may not support DELETE)
```

### Competitor Operations

```
CompetitorTable Component
    ↓
    ├─→ useCompetitors()        → Fetch /api/PlatformMaster/GetAll
    ├─→ useCreateCompetitor()   → POST /api/PlatformMaster/Add
    └─→ useToggleCompetitor()   → Mock (API may not support)
```

## Error Handling

### API Errors

If an API call fails:
1. Error is logged to console
2. Components display error state UI
3. User can click "Try again" to retry
4. Falls back to mock data as last resort

### Network Errors

The API client handles:
- Network timeouts
- 4xx and 5xx HTTP errors
- Invalid JSON responses
- Connection refused errors

## Testing

### With Mock Data (No Backend)

The dashboard works out of the box with mock data:
1. No `.env.local` configuration needed
2. All API calls automatically fall back to mock data
3. Full dashboard functionality available

### With Real Backend

To test with a real backend:
1. Configure `.env.local` with backend URL
2. Ensure backend is running and accessible
3. Dashboard fetches real data
4. Falls back to mock if backend is unavailable

## Debugging

### Enable Debug Logging

To debug API calls, add logging:
```typescript
// In api-client.ts
console.log(`GET ${endpoint}`, url);
console.log(`Response:`, data);
```

### React Query DevTools

Install React Query DevTools to debug caching:
```bash
npm install @tanstack/react-query-devtools
```

## Future Enhancements

1. **Authentication**: Add bearer token support
2. **Pagination**: Implement server-side pagination for large datasets
3. **Real-time Updates**: Add WebSocket support for live price updates
4. **Offline Support**: Add service worker for offline functionality
5. **GraphQL**: Consider GraphQL alternative to REST
6. **Rate Limiting**: Implement exponential backoff for retries
7. **Analytics**: Track API performance and errors

## Troubleshooting

### Dashboard Shows Mock Data

**Symptoms**: Dashboard shows "Flipkart", "Amazon" etc. hardcoded data

**Solution**: 
1. Check that `NEXT_PUBLIC_API_URL` is correctly configured in `.env.local`
2. Verify backend is running at that URL
3. Check browser console for API errors
4. Ensure CORS is enabled on backend if different domain

### API Calls Failing

**Symptoms**: Error state showing "Failed to load data"

**Solution**:
1. Verify `.env.local` has correct backend URL
2. Check backend is running: `curl http://localhost:5000`
3. Check browser console for network errors
4. Verify API endpoints match expected format
5. Check CORS headers on backend

### Type Errors

**Symptoms**: TypeScript compilation errors about types

**Solution**:
1. Ensure API responses match expected types in `src/types/index.ts`
2. Update types if backend returns different field names
3. Use optional properties for fields that might be missing

## Support

For issues or questions:
1. Check this documentation
2. Review component implementations
3. Check browser console for errors
4. Verify backend API responses match expected format
