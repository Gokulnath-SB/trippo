import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Compass, Search, MapPinned, Wallet, Sparkles, CalendarDays,
  Heart, Route, ShieldCheck, Quote, Mountain, Palmtree, Landmark,
} from 'lucide-react';
import { Button, Card, Chip, SectionHeading, Badge } from '../components/ui';
import DestinationCard from '../components/DestinationCard';
import Reveal from '../components/Reveal';
import { destinations, photo } from '../data/destinations';
import '../styles/landing.css';

const popular = ['Ooty', 'Goa', 'Manali', 'Jaipur', 'Bali', 'Kyoto'];

const experiences = [
  { title: 'Mountain air', copy: 'Hill stations and high trails, planned at a pace that lets you look around.', category: 'mountain', icon: Mountain, image: photo('photo-1506905925346-21bda4d32df4') },
  { title: 'Coastal days', copy: 'Long shorelines, small towns and unhurried sunsets — mapped end to end.', category: 'beach', icon: Palmtree, image: photo('photo-1507525428034-b723cf961d3e') },
  { title: 'Living history', copy: 'Forts, temples and old quarters with context that makes them make sense.', category: 'history', icon: Landmark, image: photo('photo-1524492412937-b28074a5d7da') },
];

const benefits = [
  { icon: MapPinned, title: 'Places with context', copy: 'A curated catalogue of real destinations with coordinates, highlights and indicative costs.' },
  { icon: CalendarDays, title: 'Day-wise itineraries', copy: 'Turn a rough idea into mornings, afternoons and evenings you can actually keep.' },
  { icon: Wallet, title: 'Budgets that stay honest', copy: 'Track estimated and actual spend in INR, with a clear picture of what is left.' },
  { icon: Route, title: 'See it on the map', copy: 'Connect the places in your plan to a map and explore what sits nearby.' },
];

const steps = [
  { n: '01', title: 'Pick a place', copy: 'Search the catalogue or start from a destination you already have in mind.' },
  { n: '02', title: 'Shape the trip', copy: 'Set dates, travellers, budget and the kind of journey you want.' },
  { n: '03', title: 'Build the days', copy: 'Generate a demo plan, then edit, reorder and fine-tune every activity.' },
  { n: '04', title: 'Track the spend', copy: 'Log expenses as you go and keep the budget in view.' },
];

const sampleTestimonials = [
  { id: 'budget-clarity', quote: 'Having the days laid out with a budget beside them made the whole trip feel manageable.', name: 'Sample traveller', context: 'Illustrative example · Couple getaway' },
  { id: 'editable-days', quote: 'I liked being able to move things around without starting the plan from scratch.', name: 'Sample traveller', context: 'Illustrative example · Solo trip' },
  { id: 'map-context', quote: 'The map view helped us see how far apart the places on our list really were.', name: 'Sample traveller', context: 'Illustrative example · Family holiday' },
];

export default function Landing() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
  };

  return (
    <div className="landing">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__media" aria-hidden="true">
          <img src={photo('photo-1501785888041-af3ef285b470', 1920)} alt="" fetchpriority="high" />
          <div className="hero__veil" />
        </div>
        <div className="container hero__inner">
          <Reveal className="stack" >
            <span className="eyebrow">Explore Beyond · Travel Smarter</span>
            <h1 id="hero-title">Your Journey.<br />Your World. <span className="accent">Your Way.</span></h1>
            <p className="lead">Discover extraordinary destinations, design personalized journeys, and experience smarter travel with tripo.tech.</p>
            <div className="row wrap hero__actions">
              <Button as={Link} to="/create-trip" size="lg" icon={Compass} iconRight={ArrowRight}>Plan Your Journey</Button>
              <Button as={Link} to="/explore" size="lg" variant="secondary">Explore Destinations</Button>
            </div>
          </Reveal>

          <form className="hero-search" onSubmit={submitSearch} role="search">
            <label className="sr-only" htmlFor="hero-search">Search destinations</label>
            <Search size={20} aria-hidden="true" className="hero-search__icon" />
            <input id="hero-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Where would you like to go?" autoComplete="off" />
            <Button type="submit" icon={ArrowRight}>Search</Button>
          </form>

          <div className="hero__popular row wrap">
            <span className="muted">Popular:</span>
            {popular.map((name) => (
              <Chip key={name} onClick={() => navigate(`/explore?q=${encodeURIComponent(name)}`)}>{name}</Chip>
            ))}
          </div>
        </div>
        <div className="hero__bottom" aria-hidden="true"><span>SCROLL TO EXPLORE</span><span className="hero__line" /></div>
      </section>

      <div className="trust-strip">
        <div className="container trust-strip__inner">
          {benefits.map((b) => {
            const Icon = b.icon;
            return <div key={b.title} className="trust-strip__item"><Icon size={18} aria-hidden="true" /><span>{b.title}</span></div>;
          })}
        </div>
      </div>

      <section className="section container" aria-labelledby="destinations-title">
        <SectionHeading
          eyebrow="Start somewhere good"
          title={<span id="destinations-title">Destinations worth the detour</span>}
          description="A curated starting point — real places, honest details, and room to make the plan your own."
          action={<Button as={Link} to="/explore" variant="secondary" iconRight={ArrowRight}>View all destinations</Button>}
        />
        <div className="grid grid--3">
          {destinations.slice(0, 6).map((d) => <DestinationCard key={d.id} destination={d} />)}
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="experiences-title">
        <div className="container">
          <SectionHeading eyebrow="Find your kind of trip" title={<span id="experiences-title">Travel by feeling, not by checklist</span>} />
          <div className="grid grid--3">
            {experiences.map((x) => {
              const Icon = x.icon;
              return (
                <Reveal key={x.title}>
                  <Card as={Link} to={`/explore?category=${x.category}`} interactive className="experience-card">
                    <div className="media experience-card__media"><img src={x.image} alt="" loading="lazy" /><Icon size={28} aria-hidden="true" className="experience-card__icon" /></div>
                    <div className="stack" style={{ gap: 'var(--s2)' }}>
                      <h3>{x.title}</h3>
                      <p className="muted">{x.copy}</p>
                      <span className="accent row" style={{ fontWeight: 700, fontSize: 'var(--t2)' }}>Explore <ArrowRight size={16} aria-hidden="true" /></span>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="why-title">
        <div className="why-grid">
          <div className="why-grid__intro stack">
            <span className="eyebrow">Why tripo.tech</span>
            <h2 id="why-title">A calmer way to plan something big</h2>
            <p className="lead">Planning should feel like anticipation, not administration. Everything here is built to keep the important decisions in one place.</p>
            <Badge tone="emerald">Curated catalogue · Demo planning tools</Badge>
          </div>
          <div className="grid grid--2 why-grid__items">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <Card key={b.title} className="why-card">
                  <span className="why-card__icon"><Icon size={20} aria-hidden="true" /></span>
                  <h3>{b.title}</h3>
                  <p className="muted">{b.copy}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="how-title">
        <div className="container">
          <SectionHeading eyebrow="How it works" title={<span id="how-title">Four steps from idea to itinerary</span>} />
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.n} className="steps__item">
                <span className="steps__num">{s.n}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="stories-title">
        <div className="container">
          <SectionHeading
            eyebrow="Traveller notes"
            title={<span id="stories-title">What a trip could feel like</span>}
            description="These are clearly labelled sample testimonials written for this demo — not reviews from real customers."
          />
          <div className="grid grid--3">
            {sampleTestimonials.map((t) => (
              <Card key={t.id} className="quote-card">
                <Quote size={22} aria-hidden="true" className="accent" />
                <p>“{t.quote}”</p>
                <div className="quote-card__by"><span>{t.name}</span><span className="dim">{t.context}</span></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section container" aria-label="Call to action">
        <div className="cta-band">
          <div className="stack" style={{ gap: 'var(--s3)' }}>
            <span className="eyebrow">Explore Beyond. Travel Smarter.</span>
            <h2>Your next journey starts with one good plan.</h2>
            <p className="lead">Open the planner, choose a place, and see what a week could look like.</p>
          </div>
          <div className="row wrap cta-band__actions">
            <Button as={Link} to="/create-trip" size="lg" icon={Sparkles}>Plan Your Journey</Button>
            <Button as={Link} to="/wishlist" size="lg" variant="secondary" icon={Heart}>My Wishlist</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
