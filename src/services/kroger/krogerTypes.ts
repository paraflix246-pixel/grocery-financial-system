export type KrogerTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type KrogerLocation = {
  locationId: string;
  chain: string;
  name: string;
  address?: {
    city?: string;
    state?: string;
    zipCode?: string;
  };
};

export type KrogerLocationsResponse = {
  data?: KrogerLocation[];
};

export type KrogerProductItem = {
  price?: {
    regular?: number;
    promo?: number;
  };
  size?: string;
};

export type KrogerProduct = {
  productId: string;
  description: string;
  brand?: string;
  items?: KrogerProductItem[];
};

export type KrogerProductsResponse = {
  data?: KrogerProduct[];
};

export type KrogerProductQuote = {
  productId: string;
  description: string;
  brand?: string;
  price: number;
  size?: string;
  storeName: string;
  locationId: string;
};
