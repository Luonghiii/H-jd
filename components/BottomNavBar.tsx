import React, { useState, useEffect, useRef } from 'react';
import { View } from '../types';
import { Home as HomeIcon, BrainCircuit, Gamepad2, BookOpen, LayoutGrid } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface BottomNavBarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, setCurrentView }) => {
  const { t } = useI18n();
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const navRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const navItems = [
    { view: View.Home, label: t('bottom_nav.home'), icon: HomeIcon },
    { view: View.Learn, label: t('bottom_nav.learn'), icon: BrainCircuit },
    { view: View.Vocabulary, label: t('bottom_nav.vocabulary'), icon: BookOpen },
    { view: View.Games, label: t('bottom_nav.games'), icon: Gamepad2 },
    { view: View.More, label: t('bottom_nav.more'), icon: LayoutGrid },
  ];

  useEffect(() => {
    // A small delay to ensure layout is stable after view change, especially on initial load
    const timer = setTimeout(() => {
      const activeIndex = navItems.findIndex(item => item.view === currentView);
      if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
        const activeItem = itemRefs.current[activeIndex]!;
        const { offsetLeft, offsetWidth } = activeItem;

        setIndicatorStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }, 50); // 50ms delay
    
    return () => clearTimeout(timer);

  }, [currentView, t]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto bg-slate-100/30 backdrop-blur-xl border border-slate-200/50 rounded-full shadow-lg">
        <ul ref={navRef} className="relative flex justify-around items-center p-1">
          <li
            aria-hidden="true"
            className="absolute top-0 h-full bg-white/50 rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]"
            style={indicatorStyle}
          />
          {navItems.map((item, index) => (
            <li
              key={item.view}
              ref={el => { itemRefs.current[index] = el; }}
              className="z-10 flex-1"
            >
              <button
                onClick={() => setCurrentView(item.view)}
                className={`relative w-full flex flex-col items-center justify-center p-1.5 rounded-full transition-all duration-150 ease-out active:scale-95 focus:outline-none ${
                  currentView === item.view ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-label={item.label}
              >
                <item.icon className="w-5 h-5 mb-0.5" />
                <span className={`text-[10px] ${currentView === item.view ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default BottomNavBar;