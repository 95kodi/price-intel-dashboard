export interface SearchHit {
  title: string;
  url: string;
  price: number | null;
  mrp: number | null;
  /** Only set when the store's search data says so; undefined = unknown. */
  inStock?: boolean;
}

export interface StoreSearcher {
  /** Absolute product-page URLs, in the store's own relevance order. Throw BlockedError if blocked. */
  search(query: string): Promise<SearchHit[]>;
}
