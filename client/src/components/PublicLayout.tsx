import { Outlet } from 'react-router-dom';
import { LeadProvider, PublicProvider } from '../context';
import CookieBanner from './CookieBanner';
import Footer from './Footer';
import Header from './Header';
import LeadModal from './LeadModal';
import Metrika from './Metrika';
import ToTop from './ToTop';

export default function PublicLayout() {
  return (
    <PublicProvider>
      <LeadProvider>
        <Metrika />
        <a className="skip-link" href="#main">Перейти к содержимому</a>
        <Header />
        <Outlet />
        <Footer />
        <ToTop />
        <CookieBanner />
        <LeadModal />
      </LeadProvider>
    </PublicProvider>
  );
}
