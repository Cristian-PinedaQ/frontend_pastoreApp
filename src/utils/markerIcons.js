import L from 'leaflet';

// Corregir problema de Leaflet con Webpack que no encuentra los iconos por defecto
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * Crea un DivIcon de Leaflet estilizado dinámicamente con Tailwind.
 * Esto evita el uso de imágenes y genera marcadores modernos de alta gama visual.
 */
export const createCustomMarker = ({ type, gender, status, district }) => {
  let colorClass = 'bg-blue-600';
  let pulseClass = 'bg-blue-400';
  let innerHtml = '';

  if (type === 'MEMBER') {
    // Colores según distrito
    switch (district) {
      case 'PASTORES':
        colorClass = 'bg-rose-600';
        pulseClass = 'bg-rose-400';
        break;
      case 'D1':
        colorClass = 'bg-violet-600';
        pulseClass = 'bg-violet-400';
        break;
      case 'D2':
        colorClass = 'bg-emerald-600';
        pulseClass = 'bg-emerald-400';
        break;
      case 'D3':
        colorClass = 'bg-amber-600';
        pulseClass = 'bg-amber-400';
        break;
      default:
        colorClass = 'bg-blue-600';
        pulseClass = 'bg-blue-400';
    }

    // Icono interno o letra según género
    innerHtml = gender === 'FEMENINO' 
      ? '<span class="text-white text-[10px] font-bold">👩</span>'
      : '<span class="text-white text-[10px] font-bold">👨</span>';

  } else if (type === 'CELL_GROUP') {
    // Marcador de célula - diferenciado con icono de casa y un halo de pulsación continuo
    colorClass = 'bg-indigo-700 border-2 border-white ring-4 ring-indigo-200';
    pulseClass = 'bg-indigo-500 animate-ping';
    innerHtml = '<span class="text-white text-[10px] font-bold">🏠</span>';
  }

  // Generamos el HTML del marcador con micro-animaciones
  const html = `
    <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${colorClass} transition-transform hover:scale-110">
      <span class="absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseClass}"></span>
      <div class="relative z-10 flex items-center justify-center">
        ${innerHtml}
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-leaflet-marker', // Reset default styling wrapper de leaflet
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};
