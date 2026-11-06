import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  PackageSearch,
  Search,
  X,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import LocationSelector, { LocationState } from '../components/LocationSelector';
import ItemCard, { ItemProps } from '../components/ItemCard';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
const CATEGORIES = ['Electronics', 'Documents', 'Keys', 'Bags', 'Wallets', 'Pets', 'Others'];
const PAGE_SIZE = 12;

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<ItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState(params.get('q') || '');
  const [location, setLocation] = useState<LocationState>({ province: '', district: '', city: '' });
  const [locationKey, setLocationKey] = useState(0);
  const [page, setPage] = useState(1);
  const [mapOpen, setMapOpen] = useState(false);
  const query = params.get('q') || '';
  const category = params.get('category') || '';
  const tab = ['ALL', 'LOST', 'FOUND', 'MY_POSTS'].includes(params.get('tab') || '')
    ? params.get('tab')!
    : 'ALL';
  const filtersOpen = params.get('openFilter') === 'true';
  const activeFilters = Boolean(
    query || category || location.province || location.district || location.city
  );

  useEffect(() => {
    setDraft(query);
  }, [query]);
  useEffect(() => {
    setPage(1);
  }, [query, category, tab, location.province, location.district, location.city]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api
      .get('/items', { params: location, signal: controller.signal })
      .then((response) => setItems(response.data))
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [location.province, location.district, location.city, retry]);

  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  };
  const resetFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('q');
    next.delete('category');
    next.delete('highlight');
    setParams(next);
    setDraft('');
    setLocation({ province: '', district: '', city: '' });
    setLocationKey((key) => key + 1);
    setPage(1);
  };
  const filtered = items.filter((item) => {
    const creatorId = typeof item.createdBy === 'object' ? item.createdBy?._id : item.createdBy;
    const typeMatches =
      tab === 'MY_POSTS'
        ? Boolean(user && creatorId === user._id)
        : tab === 'ALL' || item.type === tab;
    const words = query.trim().toLocaleLowerCase();
    return (
      typeMatches &&
      (!category || item.category === category) &&
      (!words ||
        [
          item.title,
          item.description,
          item.titleSi,
          item.descriptionSi,
          item.titleTa,
          item.descriptionTa,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(words))
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    const highlight = params.get('highlight');
    if (!highlight || loading) return;
    const index = filtered.findIndex((item) => item._id === highlight);
    if (index < 0) return;
    setPage(Math.floor(index / PAGE_SIZE) + 1);
    const timer = window.setTimeout(() => {
      document
        .getElementById('item-' + highlight)
        ?.scrollIntoView({
          block: 'center',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [params.get('highlight'), loading, items]);

  return (
    <div className="space-y-8 sm:space-y-10">
      <section
        className="grid gap-6 border-b border-slate-200 pb-8 dark:border-slate-700 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-12 lg:pb-10"
        aria-labelledby="browse-heading"
      >
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
            {t('ui.eyebrow')}
          </p>
          <h1
            id="browse-heading"
            className="max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]"
          >
            {t('ui.heroTitle')}
          </h1>
          <p className="ui-muted mt-4 max-w-xl text-base leading-relaxed">
            {t('ui.heroDescription')}
          </p>
        </div>
        {user?.role !== 'police' && (
          <div className="ui-panel min-w-0 p-5 sm:p-6">
            <h2 className="font-semibold">{t('ui.helpStart')}</h2>
            <p className="ui-muted mt-1 hidden text-sm leading-relaxed sm:block">
              {t('ui.helpDescription')}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:gap-3">
              <Link to="/post?type=LOST" className="ui-primary">
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('ui.reportLost')}
              </Link>
              <Link to="/post?type=FOUND" className="ui-secondary">
                <PackageSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('ui.reportFound')}
              </Link>
            </div>
          </div>
        )}
      </section>

      <section aria-label={t('ui.searchLabel')} className="space-y-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateParam('q', draft.trim());
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative min-w-0 flex-1 basis-48">
            <label htmlFor="item-search" className="sr-only">
              {t('ui.searchLabel')}
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="item-search"
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('ui.searchPlaceholder')}
              className="ui-field pl-11"
            />
          </div>
          <button type="submit" className="ui-primary">
            {t('nav.search')}
          </button>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="browse-filters"
            onClick={() => updateParam('openFilter', filtersOpen ? '' : 'true')}
            className="ui-secondary"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            {t('ui.filters')}
            {activeFilters && (
              <span
                className="h-2 w-2 rounded-full bg-brand-700 dark:bg-brand-300"
                aria-label={t('ui.filtersActive')}
              />
            )}
          </button>
        </form>
        {filtersOpen && (
          <div id="browse-filters" className="ui-panel space-y-5 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('ui.refineSearch')}</h2>
              <button
                type="button"
                className="ui-quiet h-11 w-11 px-0"
                aria-label={t('ui.closeFilters')}
                onClick={() => updateParam('openFilter', '')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <LocationSelector
              key={locationKey}
              initialLocation={location}
              onLocationChange={setLocation}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="item-category" className="ui-label">
                  {t('dashboard.category')}
                </label>
                <select
                  id="item-category"
                  value={category}
                  onChange={(event) => updateParam('category', event.target.value)}
                  className="ui-field"
                >
                  <option value="">{t('dashboard.categoryFilter')}</option>
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {t('categories.' + value)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="ui-secondary" onClick={resetFilters}>
                {t('dashboard.resetFilters')}
              </button>
            </div>
            <details
              onToggle={(event) => setMapOpen(event.currentTarget.open)}
              className="border-t border-slate-200 pt-4 dark:border-slate-700"
            >
              <summary className="cursor-pointer rounded-lg text-sm font-semibold">
                {t('ui.showMap')}
              </summary>
              <div className="relative z-0 mt-4 h-64 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
                {mapOpen && (
                  <MapContainer
                    center={[7.8731, 80.7718]}
                    zoom={7}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap"
                    />
                    {filtered
                      .filter(
                        (item) =>
                          typeof item.latitude === 'number' && typeof item.longitude === 'number'
                      )
                      .map((item) => {
                        const popup = (
                          <Popup>
                            <Link className="font-semibold" to={'/items/' + item._id}>
                              {item.title}
                            </Link>
                            <p>
                              {item.city}, {item.district}
                            </p>
                          </Popup>
                        );
                        return item.type === 'FOUND' && item.isFuzzy ? (
                          <Circle
                            key={item._id}
                            center={[item.latitude!, item.longitude!]}
                            radius={1000}
                            pathOptions={{ color: '#047857', fillOpacity: 0.2 }}
                          >
                            {popup}
                          </Circle>
                        ) : (
                          <Marker key={item._id} position={[item.latitude!, item.longitude!]}>
                            {popup}
                          </Marker>
                        );
                      })}
                  </MapContainer>
                )}
              </div>
            </details>
          </div>
        )}
      </section>

      <section aria-labelledby="reports-heading" aria-busy={loading}>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 id="reports-heading" className="text-xl font-bold tracking-tight">
              {t('ui.recentReports')}
            </h2>
            <p className="ui-muted mt-1 text-sm" aria-live="polite">
              {loading ? t('common.loading') : t('ui.results', { count: filtered.length })}
            </p>
          </div>
          <div
            className="flex flex-wrap gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800"
            role="group"
            aria-label={t('ui.reportType')}
          >
            {['ALL', 'LOST', 'FOUND', ...(user && user.role !== 'police' ? ['MY_POSTS'] : [])].map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tab === value}
                  onClick={() => updateParam('tab', value === 'ALL' ? '' : value)}
                  className={
                    'min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold transition-colors ' +
                    (tab === value
                      ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-200'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
                  }
                >
                  {value === 'ALL'
                    ? t('ui.allReports')
                    : value === 'LOST'
                      ? t('ui.lostReports')
                      : value === 'FOUND'
                        ? t('ui.foundReports')
                        : t('ui.myReports')}
                </button>
              )
            )}
          </div>
        </div>
        {error ? (
          <div role="alert" className="ui-panel p-8 text-center">
            <h3 className="font-semibold">{t('ui.loadError')}</h3>
            <p className="ui-muted mt-2 text-sm">{t('ui.loadErrorHelp')}</p>
            <button
              type="button"
              className="ui-primary mt-5"
              onClick={() => setRetry((value) => value + 1)}
            >
              {t('ui.tryAgain')}
            </button>
          </div>
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[1, 2, 3].map((value) => (
              <div key={value} className="ui-panel overflow-hidden motion-safe:animate-pulse">
                <div className="aspect-[3/2] bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-4 p-5">
                  <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 rounded bg-slate-100 dark:bg-slate-700" />
                  <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <div
                id={'item-' + item._id}
                key={item._id}
                className={
                  'min-w-0 scroll-mt-24 rounded-2xl ' +
                  (params.get('highlight') === item._id
                    ? 'ring-2 ring-brand-700 ring-offset-4 dark:ring-brand-300 dark:ring-offset-slate-900'
                    : '')
                }
              >
                <ItemCard item={item} onChange={() => setRetry((value) => value + 1)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="ui-panel px-5 py-12 text-center">
            <PackageSearch className="mx-auto mb-4 h-10 w-10 text-slate-400" aria-hidden="true" />
            <h3 className="text-lg font-semibold">{t('dashboard.noItemsFound')}</h3>
            <p className="ui-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
              {t('dashboard.adjustFilters')}
            </p>
            {activeFilters && (
              <button type="button" className="ui-secondary mt-5" onClick={resetFilters}>
                {t('dashboard.resetFilters')}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {!loading && !error && totalPages > 1 && (
          <nav
            aria-label={t('ui.pagination')}
            className="mt-7 flex items-center justify-center gap-4"
          >
            <button
              type="button"
              className="ui-secondary h-11 w-11 px-0"
              disabled={currentPage === 1}
              aria-label={t('ui.previousPage')}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="ui-muted text-sm">
              {t('ui.pageOf', { page: currentPage, total: totalPages })}
            </span>
            <button
              type="button"
              className="ui-secondary h-11 w-11 px-0"
              disabled={currentPage === totalPages}
              aria-label={t('ui.nextPage')}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
};
export default DashboardPage;
