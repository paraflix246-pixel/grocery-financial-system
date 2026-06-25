export type OpenFoodFactsLocation = {
  osm_name?: string | null;
  osm_brand?: string | null;
  osm_display_name?: string | null;
  osm_address_country_code?: string | null;
};

export type OpenFoodFactsPriceRow = {
  id: number;
  price: number;
  currency?: string | null;
  date?: string | null;
  product_name?: string | null;
  product_code?: string | null;
  location?: OpenFoodFactsLocation | null;
  product?: {
    product_name?: string | null;
    brands?: string | null;
  } | null;
};

export type OpenFoodFactsPricesResponse = {
  items?: OpenFoodFactsPriceRow[];
  total?: number;
};

export type OpenFoodFactsAuthResponse = {
  access_token?: string;
  token?: string;
  expires_in?: number;
};
