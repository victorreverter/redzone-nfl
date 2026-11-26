import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const milestones = [
  {
    year: 1920,
    title: 'The Birth of the NFL',
    description: 'The American Professional Football Association is founded in Canton, Ohio. 14 teams begin a legacy that will span over a century.',
    image: '/milestones/1920-birth-of-nfl.png',
    gradient: 'from-amber-900 via-amber-700 to-stone-900',
    filter: 'sepia-[0.6] contrast-[1.1] brightness-[0.85]',
    era: 'Vintage Era',
  },
  {
    year: 1958,
    title: 'The Greatest Game Ever Played',
    description: 'Giants vs Colts. Alan Ameche\'s overtime touchdown. 63M viewers watch on TV — the NFL goes mainstream.',
    image: '/milestones/1958-greatest-game.png',
    gradient: 'from-blue-900 via-blue-700 to-slate-900',
    filter: 'sepia-[0.5] contrast-[1.1] brightness-[0.9]',
    era: 'Vintage Era',
  },
  {
    year: 1967,
    title: 'Super Bowl I',
    description: 'Packers 35, Chiefs 10. Lombardi\'s dynasty completes the job. The championship game that started it all.',
    image: '/milestones/1967-super-bowl-i.png',
    gradient: 'from-yellow-900 via-yellow-700 to-green-900',
    filter: 'sepia-[0.4] contrast-[1.05] brightness-[0.9]',
    era: 'Vintage Era',
  },
  {
    year: 1969,
    title: 'Namath\'s Guarantee',
    description: '"I guarantee it." Joe Namath and the Jets shock the Colts in Super Bowl III. The AFL proves it belongs.',
    image: '/milestones/1969-namath-guarantee.png',
    imagePosition: 'center top',
    gradient: 'from-green-900 via-emerald-700 to-slate-900',
    filter: 'sepia-[0.35] contrast-[1.05] brightness-[0.9]',
    era: 'Vintage Era',
  },
  {
    year: 1970,
    title: 'The Merger',
    description: 'AFL and NFL become one league. 26 teams, two conferences. The modern NFL is born.',
    image: '/milestones/1970-merger.png',
    gradient: 'from-slate-700 via-slate-500 to-blue-900',
    filter: 'sepia-[0.3] contrast-[1.05] brightness-[0.9]',
    era: 'Vintage Era',
  },
  {
    year: 1972,
    title: 'The Immaculate Reception',
    description: 'Franco Harris scoops a deflected pass. Steelers dynasty begins. The most debated play in NFL history.',
    image: '/milestones/1972-immaculate-reception.png',
    gradient: 'from-zinc-700 via-zinc-500 to-zinc-900',
    filter: 'sepia-[0.25] contrast-[1.1] brightness-[0.9]',
    era: 'Vintage Era',
  },
  {
    year: 1985,
    title: 'Bears 46 Defense',
    description: 'Chicago\'s 15-1 season. The 46 defense terrorizes the league. "Super Bowl Shuffle" becomes a cultural icon.',
    image: '/milestones/1985-bears-defense.png',
    gradient: 'from-orange-800 via-orange-600 to-blue-900',
    filter: 'sepia-[0.15] contrast-[1.05] brightness-[0.95]',
    era: 'Classic Era',
  },
  {
    year: 1989,
    title: '49ers Dynasty Peak',
    description: 'Montana to Rice to Clark. San Francisco wins 4 Super Bowls in 9 years. The West Coast Offense redefines football.',
    image: '/milestones/1989-49ers-dynasty.png',
    imagePosition: 'center top',
    gradient: 'from-red-900 via-red-700 to-yellow-900',
    filter: 'sepia-[0.1] contrast-[1.05] brightness-[0.95]',
    era: 'Classic Era',
  },
  {
    year: 1992,
    title: 'Cowboys Triple Crown',
    description: 'Dallas wins 3 Super Bowls in 4 years (1992, 1993, 1995). Aikman, Smith, Irvin — "The Triplets."',
    image: '/milestones/1992-cowboys-triple-crown.png',
    imagePosition: 'center top',
    gradient: 'from-blue-900 via-blue-700 to-slate-700',
    filter: 'contrast-[1.05] brightness-[0.95] saturate-[1.1]',
    era: 'Classic Era',
  },
  {
    year: 2002,
    title: 'Patriots Dynasty Begins',
    description: 'Brady and Belichick. Three Super Bowls in four years (2001, 2003, 2004). The greatest dynasty of the salary cap era.',
    image: '/milestones/2002-patriots-dynasty.png',
    imagePosition: 'center top',
    gradient: 'from-blue-900 via-indigo-700 to-red-900',
    filter: 'contrast-[1.05] brightness-[0.95] saturate-[1.1]',
    era: 'Modern Era',
  },
  {
    year: 2008,
    title: 'Giants Shock the Patriots',
    description: 'David Tyree\'s Helmet Catch. New York denies New England\'s perfect 19-0 season. One of the greatest upsets ever.',
    image: '/milestones/2008-helmet-catch.png',
    imagePosition: 'center top',
    gradient: 'from-red-800 via-blue-800 to-blue-950',
    filter: 'contrast-[1.05] brightness-[0.95] saturate-[1.1]',
    era: 'Modern Era',
  },
  {
    year: 2017,
    title: '28-3 Greatest Comeback',
    description: 'Down 25 points in Super Bowl LI. Patriots score 31 unanswered. The largest comeback in Super Bowl history.',
    image: '/milestones/2017-28-3-comeback.png',
    imagePosition: 'center top',
    gradient: 'from-red-900 via-red-700 to-yellow-900',
    filter: 'contrast-[1.08] brightness-[1] saturate-[1.15]',
    era: 'Modern Era',
  },
];

export function MilestoneSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

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

  useEffect(() => {
    if (!emblaApi || paused) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 7000);
    return () => clearInterval(interval);
  }, [emblaApi, paused]);

  return (
    <div
      className="pb-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="overflow-hidden relative">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container flex">
            {milestones.map((m) => (
              <div key={m.year} className="embla__slide flex-[0_0_100%] min-w-0">
                <div className={`relative aspect-[16/10] md:aspect-[32/9] bg-gradient-to-br ${m.gradient} overflow-hidden`}>
                  <img
                    src={m.image}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover ${m.filter}`}
                    style={{ objectPosition: m.imagePosition ?? 'center center' }}
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

                  {/* Decorative year */}
                  <div className="absolute -top-6 -right-4 text-[9rem] md:text-[15rem] font-display font-extrabold text-white/[0.12] leading-none select-none pointer-events-none tabular-nums">
                    {m.year}
                  </div>

                  {/* Side accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-nfl-red/80" />

                  {/* Content */}
                  <div className="relative z-10 h-full p-6 md:pl-20 md:pr-8 md:py-8 lg:pl-24 lg:pr-10 flex flex-col justify-end">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono font-medium text-nfl-red uppercase tracking-[0.2em] tabular-nums">
                        {m.year}
                      </span>
                      <span className="text-white/30">/</span>
                      <span className="font-serif italic text-sm md:text-base text-white/75">
                        {m.era}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight leading-[1.08] mb-2">
                      {m.title}
                    </h3>
                    <p className="text-sm md:text-base text-white/80 font-sans leading-relaxed max-w-2xl">
                      {m.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows - desktop only */}
        <button
          type="button"
          onClick={scrollPrev}
          aria-label="Previous milestone"
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/75 backdrop-blur-sm p-2.5 transition-all border border-white/20 items-center justify-center"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          aria-label="Next milestone"
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/75 backdrop-blur-sm p-2.5 transition-all border border-white/20 items-center justify-center"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </div>

      {/* Navigation dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {milestones.map((m, i) => (
          <button
            key={m.year}
            type="button"
            aria-label={`View ${m.year}: ${m.title}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 transition-all ${
              i === selectedIndex
                ? 'bg-nfl-red w-7'
                : 'bg-text-muted/60 hover:bg-text-secondary w-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
