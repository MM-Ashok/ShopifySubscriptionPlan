import React, { useState, useEffect } from 'react';
import {
  Layout, LegacyCard, TextField, Button, Checkbox, Toast, Spinner, ResourceItem, ResourceList, Thumbnail, RadioButton,
} from '@shopify/polaris';

export function CreatePlanForm({ onPlanSubmit }) {
  const [planTitle, setPlanTitle] = useState('');
  const [purchaseOptionTitle, setPurchaseOptionTitle] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [offerDiscount, setOfferDiscount] = useState(true);
  const [discountType, setDiscountType] = useState('percentage');
  const [deliveryFrequency, setDeliveryFrequency] = useState(1);
  const [deliveryInterval, setDeliveryInterval] = useState('weeks');
  const [percentageOff, setPercentageOff] = useState('');
  const [toastActive, setToastActive] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!searchQuery) {
        setProductResults([]);
        return;
      }

      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/products?query=${searchQuery}`);
        const data = await res.json();
        console.log('Full API Response:', data);
        if (Array.isArray(data.data)) {
          setProductResults(data.data);
        } else {
          setProductResults([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProductResults([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    const debounceTimeout = setTimeout(fetchProducts, 500);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const planData = {
      selling_plan_group: {
        name: planTitle,
        selling_plans: [
          {
            name: purchaseOptionTitle,
            price_adjustments: [{ adjustment_type: discountType, value: parseInt(percentageOff) }],
            delivery_policy: {
              interval: deliveryInterval,
              interval_count: parseInt(deliveryFrequency),
            },
          },
        ],
        products: selectedProducts.map((product) => product.id), // This will be ignored for now
      },
    };
    console.log('Submitting plan:', planData);

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });

      if (response.ok) {
        const newPlan = await response.json();
        console.log('New plan created:', newPlan);
        setToastActive(true); // Show Toast upon successful submission
        // Reset the form fields
        setPlanTitle('');
        setPurchaseOptionTitle('');
        setSelectedProducts([]);
        setSearchQuery('');
        setPercentageOff('');
        setDeliveryFrequency(1);
        setDeliveryInterval('weeks');
      } else {
        let errorData;
        try {
          errorData = await response.json(); // Try to parse error response
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorData = { error: 'Unexpected error occurred' }; // Fallback message
        }
        console.error('Error creating plan:', response.statusText, errorData);
        alert(`Error creating plan: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error submitting form: ${error.message}`);
    }
  };


  const handleProductSelect = (product) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  return (
    <LegacyCard title="Create Subscription Plan" sectioned>
      <form onSubmit={handleSubmit}>
        <Layout>
          {/* Plan Title and Purchase Option */}
          <Layout.Section>
            <TextField
              label="Plan title"
              value={planTitle}
              onChange={setPlanTitle}
              placeholder="Enter plan title"
              autoComplete="off"
            />
            <TextField
              label="Purchase option title"
              value={purchaseOptionTitle}
              onChange={setPurchaseOptionTitle}
              placeholder="Subscribe and save"
              autoComplete="off"
            />
          </Layout.Section>

          {/* Product Selection */}
          <Layout.Section>
            <TextField
              label="Search products"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search products"
              autoComplete="off"
            />

            <div>
              {loadingProducts ? (
                <div style={{ textAlign: 'center' }}>
                  <Spinner accessibilityLabel="Loading products" size="large" />
                </div>
              ) : (
                <ResourceList
                  resourceName={{ singular: 'product', plural: 'products' }}
                  items={productResults}
                  renderItem={(product) => {
                    const { id, title, image } = product;
                    const media = <Thumbnail source={image?.src || ''} alt={title} />;
                    return (
                      <ResourceItem
                        id={id}
                        media={media}
                        accessibilityLabel={`View details for ${title}`}
                        onClick={() => handleProductSelect(product)}
                      >
                        <Checkbox
                          label={title}
                          checked={selectedProducts.some(p => p.id === product.id)}
                        />
                      </ResourceItem>
                    );
                  }}
                />
              )}
            </div>
          </Layout.Section>

          {/* Discount and Delivery Section */}
          <Layout.Section>
            <Checkbox
              label="Offer discount"
              checked={offerDiscount}
              onChange={setOfferDiscount}
            />
            {offerDiscount && (
              <>
                <RadioButton
                  label="Percentage off"
                  checked={discountType === 'percentage'}
                  onChange={() => setDiscountType('percentage')}
                />
                <RadioButton
                  label="Amount off"
                  checked={discountType === 'amount'}
                  onChange={() => setDiscountType('amount')}
                />
                <RadioButton
                  label="Flat rate"
                  checked={discountType === 'flat'}
                  onChange={() => setDiscountType('flat')}
                />
                <TextField
                  label="Percentage off"
                  value={percentageOff}
                  onChange={setPercentageOff}
                  type="number"
                  placeholder="Enter percentage off"
                />
                <TextField
                  label="Delivery frequency"
                  value={deliveryFrequency}
                  onChange={setDeliveryFrequency}
                  type="number"
                  placeholder="1"
                />
                <TextField
                  label="Delivery interval"
                  value={deliveryInterval}
                  onChange={setDeliveryInterval}
                  placeholder="weeks"
                  autoComplete="off"
                />
              </>
            )}
          </Layout.Section>

          {/* Summary Section */}
          <Layout.Section>
            <div>
              <p><strong>Summary</strong></p>
              <p>No title</p>
              <p>Delivery every {deliveryFrequency} {deliveryInterval}</p>
            </div>
          </Layout.Section>

          {/* Submit Button */}
          <Layout.Section>
            <Button submit>Save Subscription Plan</Button>
          </Layout.Section>
        </Layout>
      </form>

      {/* Toast for success message */}
      {toastActive && (
        <Toast
          content="Subscription plan created successfully!"
          onDismiss={() => setToastActive(false)}
          active={toastActive}
        />
      )}
    </LegacyCard>
  );
}
