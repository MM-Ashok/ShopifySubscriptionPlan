import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { AppProvider, Frame, Navigation } from '@shopify/polaris';
import HomePage from './pages/index';
import EditPlan from './pages/EditPlan';
import CreatePlan from './pages/CreatePlan';
import Settings from './pages/Settings';

import '@shopify/polaris/build/esm/styles.css';

import { HomeMajor, ProductsMajor, SettingsMajor } from '@shopify/polaris-icons';

// Custom Navigation Menu Component
function NavigationMenu() {
  const navigate = useNavigate();

  const navigationItems = [
    {
      label: 'Home',
      icon: HomeMajor,
      onClick: () => navigate('/'),
    },
    {
      label: 'Create Plan',
      icon: ProductsMajor,
      onClick: () => navigate('/createplan'),
    },
    {
      label: 'Settings',
      icon: SettingsMajor,
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <Navigation location="/">
      <Navigation.Section
        items={navigationItems.map((item) => ({
          label: item.label,
          icon: item.icon,
          onClick: item.onClick,
        }))}
      />
    </Navigation>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Frame
          navigation={<NavigationMenu />}  // Use the NavigationMenu component
        >
          <div style={{ padding: '20px' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/createplan" element={<CreatePlan />} />
              <Route path="/edit/:id" element={<EditPlan />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </Frame>
      </Router>
    </AppProvider>
  );
}

export default App;
