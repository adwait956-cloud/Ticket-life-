import React from 'react';
import { Compass, ArrowRight, Star } from 'lucide-react';
import { TransportCategory } from '../types/travel';

interface ExploreViewProps {
  onSelectRoute: (category: TransportCategory, origin: string, dest: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectRoute }) => {
  const FEATURED_ROUTES: {
    category: TransportCategory;
    title: string;
    from: string;
    to: string;
    type: string;
    duration: string;
    price: number;
    rating: number;
  }[] = [
    {
      category: 'cars',
      title: 'Airport Express Chauffeur Transfer',
      from: 'Connaught Place',
      to: 'Aerocity / IGI Pickup Bay',
      type: 'Prime Sedan Chauffeur',
      duration: '35 mins',
      price: 499,
      rating: 4.9,
    },
    {
      category: 'autos',
      title: 'Metro Smart EV Rickshaw Transfer',
      from: 'Connaught Place',
      to: 'Sector 18 Metro Hub',
      type: 'Mahindra Treo Electric Auto',
      duration: '15 mins',
      price: 110,
      rating: 4.8,
    },
    {
      category: 'bikes',
      title: 'Express City Bike Taxi',
      from: 'Koramangala 4th Block',
      to: 'Indiranagar 100ft Road',
      type: 'Fast Moto Commuter',
      duration: '14 mins',
      price: 65,
      rating: 4.9,
    },
    {
      category: 'cars',
      title: 'Corporate Tech Park Sedan Ride',
      from: 'Koramangala 4th Block',
      to: 'ITPL Tech Park / Whitefield',
      type: 'AC Executive Sedan',
      duration: '40 mins',
      price: 420,
      rating: 4.8,
    },
    {
      category: 'autos',
      title: 'Market & Business District Auto',
      from: 'T. Nagar Hub',
      to: 'Anna Salai Central',
      type: 'Verified Meter Auto Rickshaw',
      duration: '18 mins',
      price: 95,
      rating: 4.7,
    },
    {
      category: 'bikes',
      title: 'Heritage Highway Cruiser Rental',
      from: 'Panaji City Promenade',
      to: 'Coastal Highway Circuit',
      type: 'Royal Enfield Hunter 350',
      duration: '24 Hours Rental',
      price: 1199,
      rating: 4.9,
    },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Editorial Headline */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Explore Popular City Corridors & Mobility Fleet
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Curated local routes across Cars, Auto Rickshaws, and Bikes synced directly with Firebase Realtime Database.
        </p>
      </div>

      {/* Featured Scenic Destination Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-white min-h-[300px] flex items-end p-6 sm:p-8">
        <img
          src="/src/assets/images/travel_destination_scenic_1794029177047.jpg"
          alt="Scenic Highway Drive"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 mb-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>City & Highway Mobility Journeys</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Cars, Auto Rickshaws & Bikes On Demand
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Book verified private cabs, quick meter auto rickshaws, or nimble bike taxis with live Firebase RTDB dispatch and OTP security.
          </p>
          <button
            onClick={() => onSelectRoute('cars', 'Connaught Place', 'Aerocity / IGI Pickup Bay')}
            className="mt-4 px-4 py-2 bg-white text-slate-950 font-bold rounded-lg text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-md"
          >
            <span>Find Live Cars</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fleet Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <img
            src="/src/assets/images/category_transport_fleet_1794029177034.jpg"
            alt="Ticket Life Transport Fleet"
            className="w-full h-56 object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            3 Unified Mobility Categories
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Cars, Auto Rickshaws & Bikes in One App
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Whether you need a quick 2-minute auto rickshaw to the metro, a bike taxi to beat rush-hour traffic, or a comfortable private car ride, Ticket Life connects you directly to live rides in Firebase.
          </p>
        </div>
      </div>

      {/* Popular Corridors Grid */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
          Popular Ride Corridors
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_ROUTES.map((route, i) => (
            <div
              key={i}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-sky-400 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="uppercase font-bold text-sky-600">
                    {route.category === 'autos' ? 'AUTO RICKSHAW' : route.category.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>{route.rating}</span>
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2 group-hover:text-sky-600 transition-colors">
                  {route.title}
                </h3>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  {route.from} ➔ {route.to}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {route.type} · {route.duration}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Est. Fare</span>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                    ₹{route.price.toLocaleString('en-IN')}
                  </div>
                </div>

                <button
                  onClick={() => onSelectRoute(route.category, route.from, route.to)}
                  className="px-3 py-1.5 text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 rounded-md hover:bg-sky-100 transition-colors flex items-center gap-1"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
