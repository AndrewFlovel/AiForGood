// Schema fijo de "datos adicionales" para la demo.
// En producción esto vendría definido por los supervisores (endpoint/Supabase).
// La pantalla TareaEnProceso renderiza estos campos dinámicamente.
//
// Tipos soportados por el render: 'text' | 'number' | 'select' | 'boolean'

export const CAMPOS_ADICIONALES = [
  {
    key: 'nivel_stock',
    label: 'Nivel de stock en góndola',
    type: 'select',
    options: ['Alto', 'Medio', 'Bajo', 'Agotado'],
  },
  {
    key: 'precio_competencia',
    label: 'Precio competencia (Bs)',
    type: 'number',
  },
  {
    key: 'gondola_ok',
    label: 'Góndola en buen estado',
    type: 'boolean',
  },
  {
    key: 'observacion_exhibicion',
    label: 'Observación de exhibición',
    type: 'text',
  },
];
