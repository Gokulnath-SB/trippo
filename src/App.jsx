import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { TripsProvider } from './context/TripsContext';
import CinematicIntro from './intro/CinematicIntro';
import PageTransition from './components/PageTransition';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Button, EmptyState } from './components/ui';

import Landing from './pages/Landing';
import Explore from './pages/Explore';
import DestinationDetail from './pages/DestinationDetail';
import CreateTrip from './pages/CreateTrip';
import Itinerary from './pages/Itinerary';
import Budget from './pages/Budget';
import TravelMap from './pages/TravelMap';
import MyTrips from './pages/MyTrips';
import Wishlist from './pages/Wishlist';
import Assistant from './pages/Assistant';
import Profile from './pages/Profile';
import Auth from './pages/Auth';

const INTRO_KEY = 'tripo.intro.seen';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="container page">
      <EmptyState
        as="h1"
        title="This route is off the map"
        description="The page you were looking for does not exist. Head back to explore destinations instead."
        action={<Button as={Link} to="/">Go home</Button>}
      />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">Skip to main content</a>
      <Navbar />
      <main id="main">
        <PageTransition key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/destinations/:id" element={<DestinationDetail />} />
            <Route path="/create-trip" element={<CreateTrip />} />
            <Route path="/itinerary/:id" element={<Itinerary />} />
            <Route path="/budget/:id" element={<Budget />} />
            <Route path="/map" element={<TravelMap />} />
            <Route path="/map/:id" element={<TravelMap />} />
            <Route path="/my-trips" element={<MyTrips />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  const [introVisible, setIntroVisible] = useState(() => {
    try { return sessionStorage.getItem(INTRO_KEY) !== '1'; } catch { return true; }
  });

  const finishIntro = () => {
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* storage blocked — intro still closes */ }
    setIntroVisible(false);
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TripsProvider>
          <div className="app-shell">
            <AppRoutes />
            {introVisible ? <CinematicIntro onEnter={finishIntro} /> : null}
          </div>
        </TripsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
