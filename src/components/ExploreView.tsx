import React from 'react';
import { Compass, ArrowRight, ShieldCheck, Star } from 'lucide-react';
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
      category: 'trains',
      title: 'Vande Bharat Scenic Southern Express',
      from: 'Chennai Central (MAS)',
      to: 'KSR Bengaluru (SBC)',
      type: 'Semi-High Speed Rail',
      duration: '4h 30m',
      price: 995,
      rating: 4.8,
    },
    {
      category: 'flights',
      title: 'Delhi to Mumbai Executive Air Corridor',
      from: 'New Delhi (DEL)',
      to: 'Mumbai (BOM)',
      type: 'Airbus A321neo Non-stop',
      duration: '2h 15m',
      price: 4420,
      rating: 4.7,
    },
    {
      category: 'buses',
      title: 'Royal Rajasthan Volvo Sleeper',
      from: 'Delhi Kashmere Gate',
      to: 'Jaipur Sindhi Camp',
      type: 'Volvo 9600 AC Sleeper',
      duration: '5h 45m',
      price: 850,
      rating: 4.7,
    },
    {
      category: 'cars',
      title: 'Airport Express Chauffeur Transfer',
      from: 'Connaught Place',
      to: 'Indira Gandhi Intl (DEL)',
      type: 'Prime Sedan Chauffeur',
      duration: '35 mins',
      price: 499,
      rating: 4.9,
    },
    {
      category: 'bikes',
      title: 'Heritage Highway Cruiser Rental',
      from: 'Connaught Place Hub',
      to: 'City Center / Outstation',
      type: 'Royal Enfield Hunter 350',
      duration: '24 Hours Rental',
      price: 1199,
      rating: 4.9,
    },
    {
      category: 'autos',
      title: 'Metro Smart EV Rickshaw Transfer',
      from: 'Connaught Place',
      to: 'New Delhi Railway (NDLS)',
      type: 'Mahindra Treo Electric',
      duration: '12 mins',
      price: 110,
      rating: 4.8,
    },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Editorial Headline */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Explore Popular Travel Corridors & Fleet Networks
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hand-curated travel experiences verified with authorized railways, airlines, fleet operators, and bus partners.
        </p>
      </div>

      {/* Featured Scenic Destination Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-white min-h-[300px] flex items-end p-6 sm:p-8">
        <img
          src="/src/assets/images/travel_destination_scenic_1794029177047.jpg"
          alt="Scenic Mountain Viaduct Journey"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 mb-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Signature Mountain & Express Journeys</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Discover India by Scenic Rail & Horizon Flights
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Experience world-class Vande Bharat panoramic trains, luxury sleeper buses, and direct flight connections with live confirmed seats.
          </p>
          <button
            onClick={() => onSelectRoute('trains', 'Chennai Central (MAS)', 'KSR Bengaluru (SBC)')}
            className="mt-4 px-4 py-2 bg-white text-slate-950 font-bold rounded-lg text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-md"
          >
            <span>Book Vande Bharat Express</span>
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
            6 Unified Transportation Categories
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            One Single Super App for Every Mobility Need
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Whether you need a quick 2-minute auto rickshaw to the metro, an executive chauffeur cab for client meetings, an intercity sleeper coach, an IRCTC verified railway berth, or a domestic flight, Ticket Life brings genuine inventory, verified fares, and instant tickets together.
          </p>
        </div>
      </div>

      {/* Popular Corridors Table */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
          Trending Travel Corridors
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_ROUTES.map((route, i) => (
            <div
              key={i}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-sky-400 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="uppercase font-bold text-sky-600">{route.category}</span>
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
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">From</span>
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
