import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button, Card, Chip, EmptyState, Field, Input, Select, Spinner, Badge } from '../components/ui';
import DestinationCard from '../components/DestinationCard';
import { destinations, searchDestinations, categories, countries, cities } from '../data/destinations';
import { useTrips } from '../context/TripsContext';
import '../styles/trip-pages.css';

const initialFilters = { query: '', category: 'all', country: 'all', city: 'all' };

export default function Explore() {
  const { loading } = useTrips();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    query: searchParams.get('q') || '',
    category: categories.some((c) => c.id === searchParams.get('category')) ? searchParams.get('category') : 'all',
  }));

  // Landing page deep links (?q=, ?category=) must drive the filter state.
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category');
    const category = categories.some((c) => c.id === categoryParam) ? categoryParam : 'all';
    setFilters((prev) => (prev.query === query && prev.category === category ? prev : { ...prev, query, category }));
  }, [searchParams]);

  const results = useMemo(
    () => searchDestinations(filters),
    [filters]
  );

  const availableCities = useMemo(() => {
    const pool = filters.country === 'all'
      ? cities
      : destinations.filter((d) => d.country === filters.country).map((d) => d.city);
    return Array.from(new Set(['all', ...pool]));
  }, [filters.country]);

  const setFilter = (key, value) => {
    setFilters((prev) => {
      if (key === 'country') return { ...prev, country: value, city: 'all' };
      return { ...prev, [key]: value };
    });
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const count = results.length;
  const filtersActive = Object.entries(filters).some(([key, value]) => value !== initialFilters[key]);

  return (
    <div className="page container tp-page">
      <header className="tp-page-head">
        <div className="tp-page-head__text">
          <span className="eyebrow">Explore</span>
          <h1>Find your next place</h1>
          <p>Browse a curated catalogue of real destinations. Use the filters to narrow by category, country or city — then open a place to plan the details.</p>
        </div>
        <Badge tone="emerald">{destinations.length} destinations in the catalogue</Badge>
      </header>

      <section aria-labelledby="tp-explore-filters-title">
        <h2 id="tp-explore-filters-title" className="sr-only">Filter destinations</h2>
        <Card>
          <div className="tp-filters">
            <div className="tp-filters__search tp-search">
              <Search size={18} aria-hidden="true" />
              <Field label="Search destinations" htmlFor="tp-search" className="tp-search-field">
                <Input
                  id="tp-search"
                  type="search"
                  placeholder="Try 'tea gardens', 'Kyoto' or 'beach'"
                  value={filters.query}
                  onChange={(e) => setFilter('query', e.target.value)}
                  aria-describedby="tp-search-hint"
                />
              </Field>
              <span id="tp-search-hint" className="sr-only">Matches place names, regions, tags and highlights.</span>
            </div>
            <Field label="Country" htmlFor="tp-country">
              <Select id="tp-country" value={filters.country} onChange={(e) => setFilter('country', e.target.value)}>
                {countries.map((country) => <option key={country} value={country}>{country === 'all' ? 'All countries' : country}</option>)}
              </Select>
            </Field>
            <Field label="City" htmlFor="tp-city">
              <Select id="tp-city" value={filters.city} onChange={(e) => setFilter('city', e.target.value)}>
                {availableCities.map((city) => <option key={city} value={city}>{city === 'all' ? 'All cities' : city}</option>)}
              </Select>
            </Field>
          </div>

          <div className="tp-chips" role="group" aria-label="Filter by category">
            {categories.map((category) => (
              <Chip
                key={category.id}
                active={filters.category === category.id}
                onClick={() => setFilter('category', category.id)}
              >
                {category.label}
              </Chip>
            ))}
          </div>
          <p className="tp-count"><SlidersHorizontal size={14} aria-hidden="true" /> Filters apply instantly.</p>
        </Card>
      </section>

      <div className="tp-results-head" style={{ marginTop: 'var(--s6)' }}>
        <h2 className="tp-heading-sm">Results</h2>
        <p className="tp-count" role="status" aria-live="polite">
          {loading ? 'Loading catalogue…' : `${count} ${count === 1 ? 'destination' : 'destinations'} found`}
        </p>
      </div>

      {loading ? (
        <Spinner label="Loading destinations" />
      ) : count === 0 ? (
        <EmptyState
          icon={Search}
          title="No destinations match those filters"
          description="Try a different search term, or clear the filters to see the full catalogue."
          action={(
            <Button variant="secondary" icon={SlidersHorizontal} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        />
      ) : (
        <ul className="tp-explore-grid">
          {results.map((destination) => (
            <li key={destination.id}>
              <DestinationCard destination={destination} detailed />
            </li>
          ))}
        </ul>
      )}

      {!loading && count > 0 && filtersActive ? (
        <p className="tp-count" style={{ marginTop: 'var(--s5)' }}>
          Looking for something else? <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={clearFilters}>Clear filters</button>
        </p>
      ) : null}
    </div>
  );
}
