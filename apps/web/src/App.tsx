import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { Standings } from './pages/Standings';
import { Playoffs } from './pages/Playoffs';
import { Awards } from './pages/Awards';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/playoffs" element={<Playoffs />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  );
}
