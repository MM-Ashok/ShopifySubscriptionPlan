import React, { useEffect, useState } from 'react';
import {
  Page,
  Layout,
  LegacyCard,
  TextField,
  Button,
  Spinner,
  Checkbox,
} from "@shopify/polaris";
import { useParams, useNavigate } from 'react-router-dom';

export default function EditPage() {
  const { id } = useParams();  // Get the plan ID from the URL
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);  // Loading state
  const [planTitle, setPlanTitle] = useState('');
  const [purchaseOptionTitle, setPurchaseOptionTitle] = useState('');
  const [offerDiscount, setOfferDiscount] = useState(false);
  const [percentageOff, setPercentageOff] = useState('');
  const [deliveryFrequency, setDeliveryFrequency] = useState(1);
  const [deliveryInterval, setDeliveryInterval] = useState('weeks');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);  // Available products

  // Fetch plan details when the component mounts
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch(`/api/plans/${id}`);
        if (res.ok) {
          const data = await res.json();
          console.log('Plan data:', data);

          setPlan(data);

          // Populate fields with fetched data
          setPlanTitle(data.selling_plan_group.name);
          setPurchaseOptionTitle(data.selling_plan_group.selling_plans[0].name);

          // Set discount data
          const priceAdjustments = data.selling_plan_group.selling_plans[0].price_adjustments;
          if (priceAdjustments.length > 0 && priceAdjustments[0].adjustment_type === 'percentage') {
            setOfferDiscount(true);
            setPercentageOff(priceAdjustments[0].value.toString());
          }

          // Set delivery frequency and interval
          const deliveryPolicy = data.selling_plan_group.selling_plans[0].delivery_policy;
          setDeliveryFrequency(deliveryPolicy.interval_count.toString());
          setDeliveryInterval(deliveryPolicy.interval);

          // Set selected products
          setSelectedProducts(data.selling_plan_group.products || []);

          // Set all products from product_names field
          setAllProducts(data.product_names || []);
        } else {
          const errorText = await res.text();
          console.error('Error fetching plan:', errorText);
        }
      } catch (error) {
        console.error('Error fetching plan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id]);

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Handle form submission to update the plan
  const handleUpdate = async () => {
    const updatedPlanData = {
      selling_plan_group: {
        ...plan.selling_plan_group,
        name: planTitle,
        selling_plans: [
          {
            ...plan.selling_plan_group.selling_plans[0],
            name: purchaseOptionTitle,
            price_adjustments: offerDiscount ? [{ adjustment_type: 'percentage', value: parseInt(percentageOff) }] : [],
            delivery_policy: {
              interval: deliveryInterval,
              interval_count: parseInt(deliveryFrequency),
            },
          }
        ],
        products: selectedProducts,  // Send selected product IDs for update
      },
    };

    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPlanData),
      });

      if (res.ok) {
        navigate('/');  // Navigate back to HomePage after successful update
      } else {
        const errorText = await res.text();
        console.error('Failed to update plan:', errorText);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  return (
    <Page title="Edit Subscription Plan">
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            {loading ? (
              <div style={{ textAlign: 'center' }}>
                <Spinner accessibilityLabel="Loading plans" size="large" />
              </div>
            ) : (
              <>
                {plan ? (
                  <>
                    {/* Plan title and purchase option */}
                    <TextField
                      label="Plan Title"
                      value={planTitle}
                      onChange={setPlanTitle}
                    />
                    <TextField
                      label="Purchase Option Title"
                      value={purchaseOptionTitle}
                      onChange={setPurchaseOptionTitle}
                    />

                    {/* Discount section */}
                    <Checkbox
                      label="Offer Discount"
                      checked={offerDiscount}
                      onChange={(checked) => setOfferDiscount(checked)}
                    />
                    {offerDiscount && (
                      <TextField
                        label="Percentage Off"
                        value={percentageOff}
                        onChange={setPercentageOff}
                        type="number"
                      />
                    )}

                    {/* Delivery section */}
                    <TextField
                      label="Delivery Frequency"
                      value={deliveryFrequency}
                      onChange={setDeliveryFrequency}
                      type="number"
                    />
                    <TextField
                      label="Delivery Interval"
                      value={deliveryInterval}
                      onChange={setDeliveryInterval}
                    />

                    {/* Products associated with the plan */}
                    <p><strong>Products in this plan:</strong></p>
                    {allProducts.length > 0 ? (
                      <ul>
                        {allProducts.map(product => (
                          <li key={product.id}>
                            <Checkbox
                              label={product.name}  // Updated to match your data structure
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => toggleProductSelection(product.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No products available.</p>
                    )}

                    {/* Save button */}
                    <Button primary onClick={handleUpdate}>Save</Button>
                  </>
                ) : (
                  <p>Loading plan data...</p>
                )}
              </>
            )}
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
