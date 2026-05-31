import React, { useState } from 'react';
import { Clock, MapPin, CheckCircle, XCircle, Camera, FileSignature, AlertTriangle } from 'lucide-react';

// Tipos para nuestros eventos
type TipoEvento = 'ENTREGA_EXITOSA' | 'PROBLEMA_RUTA' | 'TIENDA_CERRADA';

interface EventoLogistico {
  id: string;
  repartidor: string;
  vehiculo: string;
  cliente: string;
  direccion: string;
  tipo: TipoEvento;
  checkIn: string;
  checkOut: string;
  tiempoTotalMin: number;
  tiempoPermitidoMin: number; // SLA
  evidenciaFotoUrl?: string;
  firmaCliente?: boolean;
  observacion?: string;
}

// Datos Mockeados en Tiempo Real
const EVENTOS_MOCK: EventoLogistico[] = [
  {
    id: 'EV-001',
    repartidor: 'Juan Pérez',
    vehiculo: 'VEN-01',
    cliente: 'Mercado Chasquipampa',
    direccion: 'Calle 21, Zona Sur',
    tipo: 'ENTREGA_EXITOSA',
    checkIn: '08:45 AM',
    checkOut: '09:02 AM',
    tiempoTotalMin: 17,
    tiempoPermitidoMin: 20,
    evidenciaFotoUrl: '/image copy.png',
    firmaCliente: true,
  },
  {
    id: 'EV-002',
    repartidor: 'Juan Pérez',
    vehiculo: 'VEN-01',
    cliente: 'Mercado Achumani',
    direccion: 'Av. Alexander',
    tipo: 'PROBLEMA_RUTA',
    checkIn: '09:35 AM',
    checkOut: '09:55 AM',
    tiempoTotalMin: 20,
    tiempoPermitidoMin: 15,
    evidenciaFotoUrl: '/image.png',
    observacion: 'Falta de stock de Sopa Maggi en almacén local. Cliente rechazó entrega parcial.',
    firmaCliente: false,
  },
  {
    id: 'EV-003',
    repartidor: 'Carlos Gómez',
    vehiculo: 'VEN-04',
    cliente: 'Tienda Doña María',
    direccion: 'Miraflores',
    tipo: 'TIENDA_CERRADA',
    checkIn: '10:15 AM',
    checkOut: '10:16 AM',
    tiempoTotalMin: 1,
    tiempoPermitidoMin: 15,
    evidenciaFotoUrl: '/image copy 3.png', // Foto de persiana cerrada
    observacion: 'El PDV se encontraba cerrado al momento de la visita.',
  },
  {
    id: 'EV-004',
    repartidor: 'Luis Sánchez',
    vehiculo: 'VEN-02',
    cliente: 'Ketal Megacenter',
    direccion: 'Irpavi',
    tipo: 'ENTREGA_EXITOSA',
    checkIn: '11:00 AM',
    checkOut: '11:45 AM',
    tiempoTotalMin: 45,
    tiempoPermitidoMin: 30, // Excedió el SLA (Rojo)
    evidenciaFotoUrl: '/image copy 2.png',
    firmaCliente: true,
    observacion: 'Demora prolongada en rampa de descarga por congestión.',
  }
];

export const EventosPage: React.FC = () => {
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoLogistico | null>(EVENTOS_MOCK[0]);

  const getIconoEvento = (tipo: TipoEvento) => {
    switch (tipo) {
      case 'ENTREGA_EXITOSA': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'PROBLEMA_RUTA': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'TIENDA_CERRADA': return <XCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getBadgeColor = (tipo: TipoEvento) => {
    switch (tipo) {
      case 'ENTREGA_EXITOSA': return 'bg-green-100 text-green-800 border-green-200';
      case 'PROBLEMA_RUTA': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TIENDA_CERRADA': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#003366]">Feed de Eventos en Tiempo Real</h2>
          <p className="text-gray-500">Monitoreo de check-in, tiempos de estadía y validación de evidencias.</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-blue-100 text-[#003366] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-blue-200">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            Recepción en Vivo (Socket.io)
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Lado Izquierdo: Lista/Feed de Eventos */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Timeline de Entregas</h3>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{EVENTOS_MOCK.length} hoy</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {EVENTOS_MOCK.map(evento => (
              <div 
                key={evento.id}
                onClick={() => setEventoSeleccionado(evento)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${eventoSeleccionado?.id === evento.id ? 'border-[#003366] bg-blue-50' : 'border-transparent bg-gray-50 hover:border-gray-200 hover:shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getIconoEvento(evento.tipo)}
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{evento.cliente}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {evento.direccion}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border border-gray-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase">Llegada</p>
                      <p className="font-semibold">{evento.checkIn}</p>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase">Salida</p>
                      <p className="font-semibold">{evento.checkOut}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center border-t border-gray-200/60 pt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-gray-200 w-5 h-5 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold">{evento.repartidor.charAt(0)}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-600">{evento.repartidor}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBadgeColor(evento.tipo)}`}>
                    {evento.tipo.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lado Derecho: Detalle y Evidencias */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {eventoSeleccionado ? (
            <>
              <div className="p-6 border-b border-gray-100 bg-[#f8fafc] flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xl text-gray-900">{eventoSeleccionado.cliente}</h3>
                  <p className="text-sm text-gray-500">ID Operación: {eventoSeleccionado.id} • {eventoSeleccionado.vehiculo}</p>
                </div>
                {getIconoEvento(eventoSeleccionado.tipo)}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                
                {/* Métricas de Tiempo y Eficiencia */}
                <section>
                  <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider mb-4 border-l-4 border-[#003366] pl-2">Análisis de Tiempos</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                      <p className="text-gray-500 text-xs mb-1">Hora de Check-In</p>
                      <p className="font-bold text-xl">{eventoSeleccionado.checkIn}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                      <p className="text-gray-500 text-xs mb-1">Hora de Check-Out</p>
                      <p className="font-bold text-xl">{eventoSeleccionado.checkOut}</p>
                    </div>
                    <div className={`p-4 rounded-xl border text-center ${eventoSeleccionado.tiempoTotalMin > eventoSeleccionado.tiempoPermitidoMin ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                      <p className="text-xs mb-1 opacity-80">Tiempo en PDV</p>
                      <p className="font-bold text-2xl">{eventoSeleccionado.tiempoTotalMin} min</p>
                      <p className="text-[10px] mt-1">
                        SLA: {eventoSeleccionado.tiempoPermitidoMin} min 
                        {eventoSeleccionado.tiempoTotalMin > eventoSeleccionado.tiempoPermitidoMin ? ' (EXCEDIDO)' : ' (ÓPTIMO)'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Evidencia Fotográfica y Firma */}
                <section className="flex-1 flex gap-6">
                  
                  {/* Foto Georreferenciada */}
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider mb-4 border-l-4 border-[#003366] pl-2 flex items-center gap-2">
                      <Camera className="w-4 h-4" /> Evidencia Fotográfica
                    </h4>
                    {eventoSeleccionado.evidenciaFotoUrl ? (
                      <div className="relative group rounded-xl overflow-hidden shadow-md border border-gray-200 h-64 bg-gray-100">
                        <img 
                          src={eventoSeleccionado.evidenciaFotoUrl} 
                          alt="Evidencia" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 text-white backdrop-blur-sm">
                          <p className="text-xs font-mono">LAT: -16.5367867 • LNG: -68.0469685</p>
                          <p className="text-[10px] opacity-75">Sello GPS validado por PostGIS</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 flex-col gap-2">
                        <Camera className="w-8 h-8 opacity-50" />
                        <span>Sin registro fotográfico</span>
                      </div>
                    )}
                  </div>

                  {/* Observaciones y Firma */}
                  <div className="w-1/3 flex flex-col gap-6">
                    <div>
                      <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider mb-4 border-l-4 border-[#003366] pl-2 flex items-center gap-2">
                        <FileSignature className="w-4 h-4" /> Firma Digital
                      </h4>
                      {eventoSeleccionado.firmaCliente ? (
                        <div className="h-32 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center p-4">
                          {/* Firma Simulada SVG */}
                          <svg viewBox="0 0 200 60" className="w-full opacity-80 stroke-[#003366]" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M 20 40 Q 40 10, 60 40 T 100 20 T 130 50 T 180 20" />
                            <path d="M 80 10 L 90 50" />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-32 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                          <span className="text-sm">Sin firma del cliente</span>
                        </div>
                      )}
                    </div>

                    {eventoSeleccionado.observacion && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex-1">
                        <h5 className="font-bold text-xs text-yellow-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Observaciones del Reponedor
                        </h5>
                        <p className="text-sm text-yellow-900 italic">"{eventoSeleccionado.observacion}"</p>
                      </div>
                    )}
                  </div>

                </section>

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
              <p>Selecciona un evento en el panel lateral para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventosPage;
