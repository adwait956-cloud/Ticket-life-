import React from 'react';
import { Car, Compass, Bike } from 'lucide-react';
import { TransportCategory } from '../types/travel';

interface CategoryNavProps {
  selectedCategory: TransportCategory;
  onSelectCategory: (category: TransportCategory) => void;
}

const CATEGORIES: {
  id: TransportCategory;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'cars',
    label: 'Cars',
    tagline: 'Cabs & Private Chauffeur',
    icon: Car,
  },
  {
    id: 'autos',
    label: 'Auto Rickshaws',
    tagline: 'Local Meter & Smart EV',
    icon: Compass,
  },
  {
    id: 'bikes',
    label: 'Bikes',
    tagline: 'Moto Taxi & Rentals',
    icon: Bike,
  },
];

export const CategoryNav: React.FC<CategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-1.5 bg-stone-100/90 dark:bg-stone-900/80 rounded-2xl border border-stone-200/80 dark:border-stone-800/80">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center sm:flex-col sm:items-center sm:text-center p-3.5 rounded-xl transition-all text-left group focus:outline-none cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-stone-950 text-stone-900 dark:text-amber-400 shadow-xs border border-stone-200/90 dark:border-amber-500/30'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/60 dark:hover:bg-stone-800/50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mr-3 sm:mr-0 sm:mb-2 transition-colors ${
                  isSelected
                    ? 'bg-stone-900 dark:bg-amber-500/20 text-white dark:text-amber-400'
                    : 'bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-300 group-hover:bg-stone-900 group-hover:text-white dark:group-hover:bg-amber-500 dark:group-hover:text-stone-950'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-extrabold truncate leading-tight">
                  {cat.label}
                </span>
                <span className="block text-[11px] text-stone-400 dark:text-stone-500 truncate mt-0.5 font-medium tracking-tight">
                  {cat.tagline}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
