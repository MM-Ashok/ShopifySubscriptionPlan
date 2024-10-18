// sub-app.js
async function fetchPlans() {
  const response = await fetch('/api/plans');
  if (!response.ok) {
    console.error('Failed to fetch plans:', response.statusText);
    return [];
  }
  return response.json();
}

// Call the fetchPlans function and handle the result
fetchPlans().then(plans => {
  const purchaseOptionsContainer = document.querySelector('.purchase-options');

  // Loop through the plans and create HTML elements to display them
  plans.forEach(plan => {
    const planElement = document.createElement('div');
    planElement.innerHTML = `
      <input type="radio" id="${plan._id}" name="purchaseOption" value="${plan.name}">
      <label for="${plan._id}">${plan.name}</label>
    `;
    purchaseOptionsContainer.appendChild(planElement);
  });
});
