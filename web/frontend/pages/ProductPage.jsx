import React from 'react';
import SubscriptionOptions from '../components/SubscriptionOptions';

export default function ProductPage({ productId }) {
  return (
    <div>
      {/* Other product details */}
      <h1>Product Title</h1>
      <p>Product description, price, etc.</p>

      {/* Subscription options */}
      <SubscriptionOptions productId={productId} />

      {/* Add to cart button or other product actions */}
    </div>
  );
}
