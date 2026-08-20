import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

const milestones = [
  {
    year: 1920,
    title: 'The Birth of the NFL',
    description: 'The American Professional Football Association is founded in Canton, Ohio. 14 teams begin a legacy that will span over a century.',
    gradient: 'from-amber-900 via-amber-800 to-stone-900',
  },
  {
    year: 1958,
    title: 'The Greatest Game Ever Played',
    description: 'Giants vs Colts. Alan Ameche\'s overtime touchdown. 63M viewers watch on TV — the NFL goes mainstream.',
    gradient: 'from-blue-900 via-blue-800 to-slate-900',
  },
  {
    year: 1967,
    title: 'Super Bowl I',
    description: 'Packers 35, Chiefs 10. Lombardi\'s dynasty completes the job. The championship game that started it all.',
    gradient: 'from-yellow-900 via-yellow-800 to-green-900',
  },
  {
    year: 1969,
    title: 'Namath\'s Guarantee',
    description: '"I guarantee it." Joe Namath and the Jets shock the Colts in Super Bowl III. The AFL proves it belongs.',
    gradient: 'from-green-900 via-emerald-800 to-slate-900',
  },
  {
    year: 1970,
    title: 'The Merger',
    description: 'AFL and NFL become one league. 26 teams, two conferences. The modern NFL is born.',
    gradient: 'from-slate-700 via-slate-600 to-blue-900',
  },
  {
    year: 1972,
    title: 'The Immaculate Reception',
    description: 'Franco Harris scoops a deflected pass. Steelers dynasty begins. The most debated play in NFL history.',
    gradient: 'from-zinc-700 via-zinc-600 to-zinc-900',
  },
  {
    year: 1985,
    title: 'Bears 46 Defense',
    description: 'Chicago\'s 15-1 season. The 46 defense terrorizes the league. "Super Bowl Shuffle" becomes a cultural icon.',
    gradient: 'from-orange-800 via-orange-700 to-blue-900',
  },
  {
    year: 1989,
    title: '49ers Dynasty Peak',
    description: 'Montana to Rice to Clark. San Francisco wins 4 Super Bowls in 9 years. The West Coast Offense redefines football.',
    gradient: 'from-red-900 via-red-800 to-yellow-900',
  },
  {
    year: 1992,
    title: 'Cowboys Triple Crown',
    description: 'Dallas wins 3 Super Bowls in 4 years (1992, 1993, 1995). Aikman, Smith, Irvin — "The Triplets."',
    gradient: 'from-blue-900 via-blue-800 to-slate-700',
  },
  {
    year: 2002,
    title: 'Patriots Dynasty Begins',
    description: 'Brady and Belichick. Three Super Bowls in four years (2001, 2003, 2004). The greatest dynasty of the salary cap era.',
    gradient: 'from-blue-900 via-indigo-800 to-red-900',
  },
  {
    year: 2017,
    title: '28-3 Greatest Comeback',
    description: 'Down 25 points in Super Bowl LI. Patriots score 31 unanswered. The largest comeback in Super Bowl history.',
    gradient: 'from-red-900 via-red-800 to-yellow-900',
  },
  {
    year: 2024,
    title: 'Chiefs Three-Peat',
    description: 'Mahomes leads Kansas City to three consecutive Super Bowl wins. A new dynasty is born in the 2020s.',
    gradient: 'from-red-800 via-red-700 to-yellow-800',
  },
];

export function MilestoneSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Auto-play
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="overflow-hidden">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {milestones.map((m) => (
            <div key={m.year} className="embla__slide flex-[0_0_100%] min-w-0">
              <div className={`relative bg-gradient-to-br ${m.gradient} border-2 border-gridiron-border overflow-hidden`}>
                {/* Decorative year */}
                <div className="absolute -top-4 -right-4 text-[8rem] md:text-[12rem] font-oswald font-bold text-white/[0.05] leading-none select-none pointer-events-none">
                  {m.year}
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 md:p-8 lg:p-10 min-h-[200px] md:min-h-[280px] flex flex-col justify-end">
                  <div className="mb-2 md:mb-3">
                    <span className="text-xs md:text-sm font-mono font-bold text-white/60 uppercase tracking-widest">
                      {m.year}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-3xl lg:text-4xl font-oswald font-bold text-white uppercase tracking-tight leading-tight mb-2 md:mb-3">
                    {m.title}
                  </h3>
                  <p className="text-sm md:text-base lg:text-lg text-white/80 font-sans leading-relaxed max-w-2xl">
                    {m.description}
                  </p>
                </div>

                {/* Bottom gradient fade */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {milestones.map((_m, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2 md:h-2.5 transition-all ${
              i === selectedIndex
                ? 'bg-nfl-red w-6 md:w-8'
                : 'bg-text-muted hover:bg-text-secondary w-2 md:w-2.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
