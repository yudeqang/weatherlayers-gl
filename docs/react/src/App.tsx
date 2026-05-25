import FPSStatsModule from 'react-fps-stats';

// react-fps-stats is a CJS/Babel package; Vite 8 no longer auto-unwraps __esModule interop
const FPSStats = (FPSStatsModule as any).default ?? FPSStatsModule;

import Deck from './Deck.tsx';
import Mapbox from './Mapbox.tsx';
import Maplibre from './Maplibre.tsx';
import MaplibreGlobe from './MaplibreGlobe.tsx';

export default function App() {
  return (
    <div className="relative w-full h-full">
      {/*
      <Deck />
      <Mapbox />
      <Maplibre />
      */}
      <MaplibreGlobe />
      <FPSStats top='auto' right={0} bottom={0} left='auto' />
    </div>
  );
}
