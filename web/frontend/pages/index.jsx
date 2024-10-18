import React, { useEffect, useState } from 'react';
import {
  Page,
  Layout,
  LegacyCard,
  IndexTable,
  Spinner,
  TextStyle,
  useIndexResourceState,
  Button,
} from "@shopify/polaris";
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch plans when the component mounts
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/plans');
        if (res.ok) {
          const data = await res.json();
          console.log('Fetched plans:', data);
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
  }, []);

  // Handle removing a plan
  // const handleRemove = async (selectedIds) => {
  //   try {
  //     await Promise.all(
  //       selectedIds.map(async (planId) => {
  //         const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
  //         if (res.ok) {
  //           setPlans(plans.filter(plan => plan._id !== planId));
  //         } else {
  //           console.error('Failed to remove plan');
  //         }
  //       })
  //     );
  //   } catch (error) {
  //     console.error('Error removing plans:', error);
  //   }
  // };
// Handle removing a plan
  const handleRemove = async (selectedIds) => {
    try {
      await Promise.all(
        selectedIds.map(async (planId) => {
          const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
          if (res.ok) {
            setPlans(plans.filter(plan => plan._id !== planId)); // Use _id
          } else {
            console.error('Failed to remove plan');
          }
        })
      );
    } catch (error) {
      console.error('Error removing plans:', error);
    }
  };

  // Handle editing a plan when a row is clicked
  const handleRowClick = (planId) => {
    navigate(`/edit/${planId}`);
  };

  // Prepare the rows for the IndexTable
  const resourceName = { singular: 'plan', plural: 'plans' };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(plans);

  const rowMarkup = plans.map((plan, index) => (
    <IndexTable.Row
      id={plan._id}
      key={plan._id}
      selected={selectedResources.includes(plan._id)}
      position={index}
      onClick={() => handleRowClick(plan._id)} // Navigate on row click
    >
      <IndexTable.Cell>
        <TextStyle variation="strong">{plan.name}</TextStyle>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {plan.product_names.length > 0 ? plan.product_names[0].name : "Unknown Product"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {plan.selling_plans.length > 0 ? plan.selling_plans[0].name : "No Plan"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {plan.selling_plans.length > 0 ? `${plan.selling_plans[0].delivery_policy.interval_count} ${plan.selling_plans[0].delivery_policy.interval}` : "N/A"}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  // Bulk Actions (for deleting selected plans)
  const bulkActions = [
    {
      content: 'Delete selected plans',
      onAction: () => handleRemove(selectedResources),
    },
  ];

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <LegacyCard title="Subscription Plans" sectioned>
            {loading ? (
              <div style={{ textAlign: 'center' }}>
                <Spinner accessibilityLabel="Loading plans" size="large" />
              </div>
            ) : (
              <>
                {plans.length > 0 ? (
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={plans.length}
                    selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                    onSelectionChange={handleSelectionChange}
                    bulkActions={bulkActions}
                    headings={[
                      { title: 'Plan title' },
                      { title: 'Products' },
                      { title: 'Selling Plan' },
                      { title: 'Delivery frequency' },
                    ]}
                  >
                    {rowMarkup}
                  </IndexTable>
                ) : (
                  <p>No subscription plans created yet.</p>
                )}
              </>
            )}
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
