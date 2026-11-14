import React, { useEffect, useMemo, useState } from 'react';
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
import ItemCard, { ReportCardItem } from '../components/ItemCard';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
const CATEGORIES = ['Electronics', 'Documents', 'Keys', 'Bags', 'Wallets', 'Pets', 'Others'];
const MAX_SEARCH_LENGTH = 120;
type ReportPage = { items: ReportCardItem[]; total: number; page: number; totalPages: number };
type ReportLocation = {
  _id: string; title: string; type: string; city: string; district: string;
  latitude: number; longitude: number; isFuzzy?: boolean;
};
type ReportMap = { locations: ReportLocation[]; truncated: boolean };
const EMPTY_PAGE: ReportPage = { items: [], total: 0, page: 1, totalPages: 1 };
const EMPTY_MAP: ReportMap = { locations: [], truncated: false };
const EMPTY_LOCATION: LocationState = { province: '', district: '', city: '' };

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [reportPage, setReportPage] = useState<ReportPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState(params.get('q') || '');
  const [location, setLocation] = useState<LocationState>(EMPTY_LOCATION);
  const [locationKey, setLocationKey] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [reportMap, setReportMap] = useState<ReportMap>(EMPTY_MAP);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapRetry, setMapRetry] = useState(0);
  const query = params.get('q') || '';
  const category = params.get('category') || '';
  const requestedTab = params.get('tab');
  const canViewOwnReports = Boolean(user?._id && user.role !== 'police');
  const tab = requestedTab === 'LOST' || requestedTab === 'FOUND' || (requestedTab === 'MY_POSTS' && canViewOwnReports)
    ? requestedTab : 'ALL';
  const highlightedId = params.get('highlight');
  const highlight = highlightedId && /^[a-f\d]{24}$/i.test(highlightedId) ? highlightedId.toLowerCase() : undefined;
  const requestedPage = params.get('page') || '1';
  const page = Number.isSafeInteger(Number(requestedPage)) && /^[1-9]\d*$/.test(requestedPage) ? Number(requestedPage) : 1;
  const filtersOpen = params.get('openFilter') === 'true';
  const mapVisible = filtersOpen && mapOpen;
  const activeFilters = Boolean(
    query || category || location.province || location.district || location.city
  );

  const browseFilters = useMemo(() => ({
    ...location,
    // Truncating a shared URL must not send half of a surrogate pair.
    q: query.trim().slice(0, MAX_SEARCH_LENGTH).replace(/[\uD800-\uDBFF]$/, '') || undefined,
    category: CATEGORIES.includes(category) ? category : undefined,
    type: tab === 'LOST' || tab === 'FOUND' ? tab : undefined,
    mine: tab === 'MY_POSTS' ? true : undefined,
  }), [location, query, category, tab]);

  useEffect(() => {
    setDraft(query);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api
      .get<ReportPage>('/items/browse', { params: { ...browseFilters, page, highlight }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setReportPage(data); })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [browseFilters, page, highlight, retry]);

  useEffect(() => {
    if (!mapVisible) return;
    const controller = new AbortController();
    setMapLoading(true);
    setMapError(false);
    api.get<ReportMap>('/items/locations', { params: browseFilters, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setReportMap(data); })
      .catch(() => { if (!controller.signal.aborted) setMapError(true); })
      .finally(() => { if (!controller.signal.aborted) setMapLoading(false); });
    return () => controller.abort();
  }, [browseFilters, mapVisible, mapRetry, retry]);

  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (name === 'q' || name === 'category' || name === 'tab') next.delete('page');
    if (name !== 'openFilter') next.delete('highlight');
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  };
  const updateLocation = (next: LocationState) => {
    if (next.province === location.province && next.district === location.district && next.city === location.city) return;
    setLocation(next);
    if (params.has('page') || params.has('highlight')) updateParam('page', '');
  };
  const resetFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('q');
    next.delete('category');
    next.delete('highlight');
    next.delete('page');
    setParams(next);
    setDraft('');
    setLocation(EMPTY_LOCATION);
    setLocationKey((key) => key + 1);
  };
  const { items: visible, total, page: currentPage, totalPages } = reportPage;
  const reportIsHighlighted = Boolean(highlight && visible.some(item => item._id === highlight));

  useEffect(() => {
    if (!highlight || !reportIsHighlighted || loading) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById('item-' + highlight)
        ?.scrollIntoView({
          block: 'center',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlight, loading, reportIsHighlighted]);

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
              maxLength={MAX_SEARCH_LENGTH}
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
              onLocationChange={updateLocation}
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
              open={mapOpen}
              onToggle={(event) => setMapOpen(event.currentTarget.open)}
              className="border-t border-slate-200 pt-4 dark:border-slate-700"
            >
              <summary className="cursor-pointer rounded-lg text-sm font-semibold">
                {t('ui.showMap')}
              </summary>
              <p role="status" className="ui-muted mt-2 text-sm">
                {mapLoading ? t('common.loading') : mapError ? t('ui.mapError') :
                  reportMap.truncated ? t('ui.mapLimit', { count: reportMap.locations.length }) : ''}
              </p>
              {mapError && !mapLoading && (
                <button type="button" className="ui-secondary mt-2" onClick={() => setMapRetry(value => value + 1)}>
                  {t('ui.tryAgain')}
                </button>
              )}
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
                    {!mapLoading && !mapError && reportMap.locations.map((item) => {
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
                            center={[item.latitude, item.longitude]}
                            radius={1000}
                            pathOptions={{ color: '#047857', fillOpacity: 0.2 }}
                          >
                            {popup}
                          </Circle>
                        ) : (
                          <Marker key={item._id} position={[item.latitude, item.longitude]}>
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
              {loading ? t('common.loading') : error ? '' : t('ui.results', { count: total })}
            </p>
          </div>
          <div
            className="flex flex-wrap gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800"
            role="group"
            aria-label={t('ui.reportType')}
          >
            {['ALL', 'LOST', 'FOUND', ...(canViewOwnReports ? ['MY_POSTS'] : [])].map(
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
                  (highlight === item._id
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
        {!error && totalPages > 1 && (
          <nav
            aria-label={t('ui.pagination')}
            className="mt-7 flex items-center justify-center gap-4"
          >
            <button
              type="button"
              className="ui-secondary h-11 w-11 px-0 aria-disabled:opacity-60"
              aria-disabled={loading || currentPage === 1}
              aria-label={t('ui.previousPage')}
              onClick={() => { if (!loading && currentPage > 1) updateParam('page', String(currentPage - 1)); }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="ui-muted text-sm">
              {t('ui.pageOf', { page: currentPage, total: totalPages })}
            </span>
            <button
              type="button"
              className="ui-secondary h-11 w-11 px-0 aria-disabled:opacity-60"
              aria-disabled={loading || currentPage === totalPages}
              aria-label={t('ui.nextPage')}
              onClick={() => { if (!loading && currentPage < totalPages) updateParam('page', String(currentPage + 1)); }}
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
