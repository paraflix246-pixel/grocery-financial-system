export type SerpApiShoppingResult = {
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  link?: string;
  product_id?: string;
  second_hand_condition?: string;
};

export type SerpApiShoppingResponse = {
  shopping_results?: SerpApiShoppingResult[];
  error?: string;
};
