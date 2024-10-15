import React, { useEffect, useState } from 'react';

export default function SubscriptionOptions({ productId }) {
  const [plans, setPlans] = useState([]);
  const [selectedOption, setSelectedOption] = useState('one-time');
  const [loading, setLoading] = useState(true);

  // Fetch subscription plans for the given product when the component mounts
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`/api/plans/${productId}`);
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        } else {
          console.error('Failed to fetch plans');
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [productId]);

  // Handle the selected option change (one-time or subscription)
  const handleOptionChange = (e) => {
    setSelectedOption(e.target.value);
  };

  // Add the selected option to the cart (one-time or subscription)
  const addToCart = () => {
    const formData = {
      id: productId,  // Product ID
      quantity: 1,    // Quantity
      properties: {
        subscription_plan: selectedOption === 'one-time' ? 'One-time purchase' : `Subscription Plan: ${selectedOption}`,
      },
    };

    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Added to cart:', data);
      alert('Product added to cart successfully!');
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      alert('Failed to add the product to the cart.');
    });
  };

  return (
    <div className="subscription-options">
      {loading ? (
        <p>Loading subscription options...</p>
      ) : (
        <div>
          <div>
            <input
              type="radio"
              id="one-time"
              name="purchaseOption"
              value="one-time"
              checked={selectedOption === 'one-time'}
              onChange={handleOptionChange}
            />
            <label htmlFor="one-time">One-time purchase</label>
          </div>

          {plans.length > 0 && plans.map((plan) => (
            <div key={plan.id}>
              <input
                type="radio"
                id={`subscription-${plan.id}`}
                name="purchaseOption"
                value={plan.selling_plan_group.name}
                checked={selectedOption === plan.selling_plan_group.name}
                onChange={handleOptionChange}
              />
              <label htmlFor={`subscription-${plan.id}`}>
                Subscribe and save {plan.selling_plan_group.discount}% off <br />
                Delivery every {plan.selling_plan_group.delivery_frequency}
              </label>
            </div>
          ))}

          {/* Add to Cart button */}
          <button onClick={addToCart} className="add-to-cart-btn">
            Add to Cart
          </button>
        </div>
      )}
    </div>
  );
}
