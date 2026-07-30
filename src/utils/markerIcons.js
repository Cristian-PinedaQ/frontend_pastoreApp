import L from 'leaflet';

// Corregir problema de Leaflet con Webpack que no encuentra los iconos por defecto
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * Crea un DivIcon de Leaflet estilizado dinámicamente con Tailwind CSS.
 * Soporta tipos: 'MEMBER', 'LEADER', 'CELL_GROUP'.
 */
export const createCustomMarker = ({ type, isLeader, gender, district, isSelected }) => {
  let colorClass = 'bg-blue-600';
  let ringClass = 'ring-2 ring-white/80';
  let badgeHtml = '';
  let innerIcon = '👤';

  // Si la entidad es un LÍDER (o tipo LEADER)
  if (type === 'LEADER' || isLeader) {
    colorClass = 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400';
    ringClass = 'ring-4 ring-amber-300 dark:ring-amber-500/50 shadow-amber-500/40';
    badgeHtml = '<span class="absolute -top-1.5 -right-1.5 text-[11px] bg-amber-900 border border-amber-300 text-amber-200 rounded-full w-4 h-4 flex items-center justify-center shadow-sm">👑</span>';
    innerIcon = gender === 'FEMENINO' ? '👩‍💼' : '👨‍💼';
  } else if (type === 'MEMBER') {
    // Colores según distrito para miembros regulares
    switch (district) {
      case 'PASTORES':
        colorClass = 'bg-rose-600';
        break;
      case 'D1':
        colorClass = 'bg-violet-600';
        break;
      case 'D2':
        colorClass = 'bg-emerald-600';
        break;
      case 'D3':
        colorClass = 'bg-amber-600';
        break;
      default:
        colorClass = 'bg-indigo-600';
    }
    innerIcon = gender === 'FEMENINO' ? '👩' : '👨';
  } else if (type === 'CELL_GROUP') {
    // Marcador de célula / altar
    colorClass = 'bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600';
    ringClass = 'ring-4 ring-purple-300 dark:ring-purple-500/50 shadow-purple-500/40';
    badgeHtml = '<span class="absolute -bottom-1 -right-1 text-[9px] bg-purple-900 border border-purple-300 text-purple-200 rounded-full w-3.5 h-3.5 flex items-center justify-center font-black">⛪</span>';
    innerIcon = '🏠';
  }

  const selectedClass = isSelected ? 'scale-125 z-50 ring-4 ring-indigo-500 animate-pulse' : '';

  const html = `
    <div class="relative flex items-center justify-center w-8 h-8 rounded-2xl shadow-md ${colorClass} ${ringClass} ${selectedClass} transition-transform hover:scale-110 duration-200">
      ${badgeHtml}
      <div class="relative z-10 flex items-center justify-center text-xs">
        ${innerIcon}
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};
