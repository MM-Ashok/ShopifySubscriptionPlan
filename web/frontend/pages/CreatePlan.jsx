import React from "react";
import { Page, Layout, AppProvider, Frame } from '@shopify/polaris';

import { CreatePlanForm } from "../components";

export default function CreatePlan(){
  const handlePlanSubmit = (planData) => {
    // Handle the plan submission logic here
    console.log('Plan submitted:', planData);
  };
    return (
      <Page>
        <Layout>
        <Layout.Section>
            <CreatePlanForm onPlanSubmit={handlePlanSubmit} />
        </Layout.Section>
        </Layout>
      </Page>
      );
}