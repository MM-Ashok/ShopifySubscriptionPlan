async function fetchSubscriptionOptions(shopDomain) {
  try {
    const response = await fetch(`/apps/subscription/subdata/subscription?shop=${shopDomain}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const subscriptionOptions = await response.json();
    return subscriptionOptions;
  } catch (error) {
    console.error('Error fetching subscription options:', error);
  }
}

fetchSubscriptionOptions('{{ shop.permanent_domain }}')
  .then(subscriptionOptions => {
    console.log(subscriptionOptions); // You can then inject the data into your HTML
  });
