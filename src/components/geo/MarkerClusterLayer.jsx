import React from 'react';
import MarkerClusterGroup from 'react-leaflet-cluster';

/**
 * Componente que encapsula los marcadores agrupados en clusters.
 * Usa react-leaflet-cluster para alto rendimiento con más de 1000 marcadores.
 */
export const MarkerClusterLayer = React.memo(({ children }) => {
  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      maxClusterRadius={50}
      spiderfyOnMaxZoom={true}
    >
      {children}
    </MarkerClusterGroup>
  );
});

MarkerClusterLayer.displayName = 'MarkerClusterLayer';
