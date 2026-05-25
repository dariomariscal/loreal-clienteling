export interface OrderLineItem {
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrder {
  customerId: string;
  /** Channel-source label (pos_integration | manual | ecommerce | shopify | sap). */
  sourceName: string;
  items: OrderLineItem[];
  totalPrice: number;
  externalOrderId?: string;
}
