import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import LocationSelector, { LocationState } from '../components/LocationSelector';
import AIItemIdentifier from '../components/AIItemIdentifier';
import policeStationsData from '../../../data/policeStations.json';
import VoiceReporter from '../components/VoiceReporter';
import {
  ShieldCheck,
  Navigation,
  Search,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../context/AuthContext';
import PageNavigation from '../../../components/common/PageNavigation';

// Leaflet marker icon configuration fix for React compatibility
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom hook component to capture map click coordinates
const MapClickHandler = ({ setPosition }: { setPosition: (pos: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

// Haversine distance formula
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PostItemPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const route = useLocation();
  const { user, loading: authLoading } = useAuth();
  const requestedType = params.get('type');
  const [currentStep, setCurrentStep] = useState(
    requestedType === 'LOST' || requestedType === 'FOUND' ? 2 : 1
  );
  const [stepError, setStepError] = useState('');
  const stepHeading = React.useRef<HTMLHeadingElement>(null);
  const reportForm = React.useRef<HTMLFormElement>(null);
  const previousStep = React.useRef(currentStep);
  React.useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    stepHeading.current?.focus();
  }, [currentStep]);
  const goToStep = (step: number, error = '') => {
    setStepError(error);
    setCurrentStep(step);
  };
  const focusField = (name: string) => {
    reportForm.current?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
  };
  const nextStep = () => {
    if (
      currentStep === 2 &&
      (!formData.title.trim() || !formData.description.trim() || !formData.date)
    ) {
      setStepError(t('report.detailsRequired'));
      const name = !formData.title.trim()
        ? 'title'
        : !formData.description.trim()
          ? 'description'
          : 'date';
      focusField(name);
      return;
    }
    if (currentStep === 3 && (!location.province || !location.district || !location.city)) {
      setStepError(t('report.locationRequired'));
      focusField(!location.province ? 'province' : !location.district ? 'district' : 'city');
      return;
    }
    goToStep(currentStep + 1);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    province: '',
    district: '',
    city: '',
  });
  const [externalLocation, setExternalLocation] = useState<LocationState | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aiMetadata, setAiMetadata] = useState<any>(null);

  // Police Station Recommendation State
  const [nearestPolice, setNearestPolice] = useState<{
    name: string;
    lat: number;
    lon: number;
    distance: number;
  } | null>(null);
  const [isSearchingPolice, setIsSearchingPolice] = useState(false);
  const [hasSearchedPolice, setHasSearchedPolice] = useState(false);

  // Private ownership details Composition State
  const [ownershipProofs, setOwnershipProofs] = useState<
    { proofType: string; customLabel: string; proofValue: string }[]
  >([]);
  const [newProofType, setNewProofType] = useState('serialNumber');
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newProofValue, setNewProofValue] = useState('');

  const handleAddProof = () => {
    if (!newProofValue.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Value required',
        text: 'Please enter a value or description for this proof.',
        confirmButtonColor: '#800000',
      });
      return;
    }
    if (newProofType === 'custom' && !newCustomLabel.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Label required',
        text: 'Please enter a custom label name.',
        confirmButtonColor: '#800000',
      });
      return;
    }

    setOwnershipProofs((prev) => [
      ...prev,
      {
        proofType: newProofType,
        customLabel: newProofType === 'custom' ? newCustomLabel.trim() : '',
        proofValue: newProofValue.trim(),
      },
    ]);

    // reset composition states
    setNewProofValue('');
    setNewCustomLabel('');
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: requestedType === 'FOUND' ? 'FOUND' : 'LOST',
    category: 'Electronics',
    color: '',
    brand: '',
    model: '',
    date: '',
    contactNumber: '',
    securityQuestion: '',
    handedToPolice: false,
    policeStationName: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  React.useEffect(() => {
    if (mapPosition) {
      const fetchLocation = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${mapPosition[0]}&lon=${mapPosition[1]}`,
            {
              headers: {
                'User-Agent': 'LostAndFoundApp/1.0',
              },
            }
          );
          const data = await response.json();
          if (data && data.address) {
            let province = data.address.state || '';
            let district = data.address.state_district || data.address.county || '';
            let city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.suburb ||
              '';

            // Clean up mapping strings to match locations.ts format
            province = province.replace(' Province', '').trim();
            district = district.replace(' District', '').trim();

            setExternalLocation({ province, district, city });
          }
        } catch (error) {
          console.error('Reverse geocoding failed', error);
        }
      };

      const fetchPolice = () => {
        if (formData.type !== 'FOUND') return;
        setIsSearchingPolice(true);
        setNearestPolice(null);

        let closest: {
          name: string;
          lat: number;
          lon: number;
          distance: number;
        } | null = null;
        let minDistance = Infinity;

        // Fast local search: O(N) where N=491 takes < 1ms
        policeStationsData.forEach((el: any) => {
          const elLat = el.lat;
          const elLon = el.lon;

          if (elLat && elLon) {
            const dist = getDistanceFromLatLonInKm(mapPosition[0], mapPosition[1], elLat, elLon);
            if (dist < 15 && dist < minDistance) {
              minDistance = dist;
              closest = {
                name: el.name || 'Local Police Station',
                lat: elLat,
                lon: elLon,
                distance: dist,
              };
            }
          }
        });

        if (closest) {
          const stationName = (closest as any).name;
          setNearestPolice(closest);
          setFormData((prev) => ({
            ...prev,
            policeStationName: stationName,
          }));
        }

        setIsSearchingPolice(false);
        setHasSearchedPolice(true);
      };

      // 500ms debounce
      const timeout = setTimeout(() => {
        fetchLocation();
        fetchPolice();
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setNearestPolice(null);
      setHasSearchedPolice(false);
    }
  }, [mapPosition, formData.type]);

  const handleApplyAIResults = (details: {
    title: string;
    category: string;
    description: string;
    color: string;
    brand: string;
    model: string;
    aiIdentification?: any;
  }) => {
    setFormData((prev) => ({
      ...prev,
      title: details.title || prev.title,
      category: details.category || prev.category,
      description: details.description || prev.description,
      color: details.color || prev.color,
      brand: details.brand || prev.brand,
      model: details.model || prev.model,
    }));
    if (details.aiIdentification) {
      setAiMetadata(details.aiIdentification);
    }
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'AI Details Applied!',
      text: 'Form fields have been updated.',
      showConfirmButton: false,
      timer: 2500,
    });
  };

  const handleApplyVoiceResults = (data: any) => {
    setFormData((prev) => ({
      ...prev,
      title: data.title || prev.title,
      category: data.category || prev.category,
      description: data.description || prev.description,
      color: data.color || prev.color,
      brand: data.brand || prev.brand,
      model: data.model || prev.model,
    }));
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Voice Details Applied!',
      text: 'Form fields have been populated from your voice report.',
      showConfirmButton: false,
      timer: 2500,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      nextStep();
      return;
    }
    if (!formData.contactNumber.trim()) {
      setStepError(t('report.phoneRequired'));
      focusField('contactNumber');
      return;
    }
    if (!location.province || !location.district || !location.city) {
      goToStep(3, t('report.locationRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, typeof value === 'boolean' ? value.toString() : value);
      });
      data.append('province', location.province);
      data.append('district', location.district);
      data.append('city', location.city);

      if (mapPosition) {
        data.append('latitude', mapPosition[0].toString());
        data.append('longitude', mapPosition[1].toString());
      }

      if (imageFile) data.append('image', imageFile);

      if (ownershipProofs && ownershipProofs.length > 0) {
        data.append('ownershipProofs', JSON.stringify(ownershipProofs));
      }

      if (aiMetadata) {
        data.append('aiIdentified', 'true');
        data.append('aiIdentification', JSON.stringify(aiMetadata));
      }

      const response = await api.post('/items', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Swal.fire({
        title: 'Successfully Posted!',
        text: 'Your report is now visible to the community.',
        icon: 'success',
        confirmButtonColor: '#800000',
      });
      navigate(`/?highlight=${response.data._id}`);
    } catch (error: any) {
      setStepError(
        error.response?.data?.message || 'Your report could not be published. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading)
    return (
      <p role="status" className="ui-muted p-8 text-center">
        Loading your account…
      </p>
    );
  if (!user)
    return (
      <section className="ui-panel mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-bold">Sign in to report an item</h1>
        <p className="ui-muted my-4">
          Your account lets you edit your report and speak with people who can help.
        </p>
        <Link to="/login" state={{ from: route.pathname + route.search }} className="ui-primary">
          Sign in
        </Link>
      </section>
    );

  return (
    <>
      <PageNavigation />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 sm:p-8"
      >
        <div className="mb-8 border-b border-gray-100 dark:border-slate-700 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('report.heading')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {t('report.intro')}
          </p>
        </div>

        <ol aria-label={t('report.progress')} className="mb-8 grid grid-cols-4 gap-2">
          {['type', 'details', 'location', 'contact'].map((label, index) => (
            <li
              key={label}
              aria-current={currentStep === index + 1 ? 'step' : undefined}
              className="min-w-0 text-center"
            >
              <span
                className={
                  'mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ' +
                  (currentStep >= index + 1
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400')
                }
              >
                {index + 1}
              </span>
              <span
                className={
                  'block text-xs leading-5 ' +
                  (currentStep === index + 1
                    ? 'font-semibold text-brand-700 dark:text-brand-300'
                    : 'ui-muted')
                }
              >
                {t(`report.${label}`)}
              </span>
            </li>
          ))}
        </ol>

        <h2 ref={stepHeading} tabIndex={-1} className="mb-4 text-xl font-semibold outline-none">
          {t('report.step', {
            step: currentStep,
            label: t(`report.${['type', 'details', 'location', 'contactAndOwnership'][currentStep - 1]}`),
          })}
        </h2>
        <form
          ref={reportForm}
          onSubmit={handleSubmit}
          noValidate
          aria-busy={isSubmitting}
          aria-describedby={stepError ? 'report-error' : undefined}
          className="space-y-8"
        >
          {stepError && (
            <p
              id="report-error"
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
            >
              {stepError}
            </p>
          )}
          {/* Step 1: Core Intent */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4"
            >
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: 'LOST' });
                  goToStep(2);
                }}
                className="ui-panel flex flex-col items-center justify-center p-6 text-center hover:border-brand-700 focus-visible:border-brand-700"
              >
                <div className="mb-4 rounded-xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  <Search className="h-7 w-7" />
                </div>
                <span className="mb-2 text-xl font-bold">{t('report.lost')}</span>
                <span className="ui-muted">{t('report.lostHelp')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: 'FOUND' });
                  goToStep(2);
                }}
                className="ui-panel flex flex-col items-center justify-center p-6 text-center hover:border-brand-700 focus-visible:border-brand-700"
              >
                <div className="mb-4 rounded-xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <span className="mb-2 text-xl font-bold">{t('report.found')}</span>
                <span className="ui-muted">{t('report.foundHelp')}</span>
              </button>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <details className="ui-panel p-4">
                <summary className="min-h-[44px] cursor-pointer text-sm font-semibold">
                  {t('report.voiceOrPhoto')}
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Smart Voice Reporting Section */}
                  <VoiceReporter onApplyResults={handleApplyVoiceResults} />

                  {/* Smart Item Identification Section */}
                  <AIItemIdentifier
                    imageFile={imageFile}
                    onImageChange={(file) => setImageFile(file)}
                    onApplyResults={handleApplyAIResults}
                  />
                </div>
              </details>
              {/* Item details */}
              <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-l-4 border-brand-700 pl-3">
                  {t('report.details')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="report-category"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('report.category')}
                    </label>
                    <select
                      id="report-category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="ui-field"
                    >
                      {['Electronics', 'Documents', 'Keys', 'Bags', 'Wallets', 'Pets', 'Others'].map((category) => (
                        <option key={category} value={category}>{t(`categories.${category}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="report-title"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('report.title')}
                  </label>
                  <input
                    id="report-title"
                    required
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., iPhone 13 Pro Max - Black"
                    className="ui-field"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="report-color"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('report.color')}
                    </label>
                    <input
                      id="report-color"
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      placeholder="e.g., Black, Navy Blue"
                      className="ui-field"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="report-brand"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('report.brand')}
                    </label>
                    <input
                      id="report-brand"
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="e.g., Samsung, Apple"
                      className="ui-field"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="report-model"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('report.model')}
                    </label>
                    <input
                      id="report-model"
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder="e.g., Galaxy A52"
                      className="ui-field"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="report-description"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('report.description')}
                  </label>
                  <textarea
                    id="report-description"
                    required
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide details like colors, specific marks, or brands..."
                    className="ui-field"
                  ></textarea>
                </div>
                <div>
                  <label
                    htmlFor="report-date"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('report.date')}
                  </label>
                  <input
                    id="report-date"
                    required
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="ui-field"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {/* Location & Interactive Map */}
              <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-l-4 border-brand-700 pl-3">
                  {t('report.location')}
                </h3>
                <LocationSelector
                  initialLocation={location}
                  onLocationChange={setLocation}
                  externalLocation={externalLocation}
                  required
                />

                <div className="mt-4">
                  <p id="report-map-label" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('report.markLocation')}
                  </p>
                  <div role="group" aria-labelledby="report-map-label" className="h-72 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-600 z-0 relative shadow-inner mb-2">
                    <MapContainer
                      center={[7.8731, 80.7718]}
                      zoom={7}
                      scrollWheelZoom={true}
                      className="h-full w-full"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap"
                      />
                      <MapClickHandler setPosition={setMapPosition} />
                      {mapPosition && <Marker position={mapPosition} />}
                    </MapContainer>
                  </div>

                  {/* Police Station Suggestion Widget */}
                  {formData.type === 'FOUND' && isSearchingPolice && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 animate-pulse bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-700 mt-2">
                      <div className="w-4 h-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin mr-3"></div>
                      Scanning for nearest police stations...
                    </div>
                  )}

                  {formData.type === 'FOUND' &&
                    !isSearchingPolice &&
                    hasSearchedPolice &&
                    !nearestPolice && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-700 mt-2">
                        <ShieldCheck className="w-5 h-5 text-gray-400 mr-2 dark:text-slate-400" />
                        No police stations detected within a 15km radius.
                      </div>
                    )}

                  {formData.type === 'FOUND' && nearestPolice && !isSearchingPolice && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2 overflow-hidden dark:bg-blue-900/25 dark:border-blue-800"
                    >
                      <div className="flex items-start">
                        <div className="bg-blue-100 p-2 rounded-full mr-4 dark:bg-blue-900/25">
                          <ShieldCheck className="w-6 h-6 text-blue-700 dark:text-blue-300" />
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-bold text-blue-900 dark:text-blue-300">
                            Nearby police station
                          </h4>
                          <p className="text-sm text-blue-800 mt-1 mb-3 dark:text-blue-300">
                            <strong>{nearestPolice.name}</strong> just{' '}
                            {nearestPolice.distance.toFixed(1)} km away from this location. You can
                            contact the station for advice about safely handing over this item.
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${nearestPolice.lat},${nearestPolice.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                            >
                              <Navigation className="w-4 h-4 mr-2" />
                              Get Directions
                            </a>

                            <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-blue-200 hover:bg-white dark:bg-slate-800 transition-colors dark:border-blue-800">
                              <input
                                type="checkbox"
                                checked={formData.handedToPolice}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    handedToPolice: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:text-blue-300 dark:border-slate-700"
                              />
                              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                                I handed this item to {nearestPolice.name}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Private ownership details */}
              {formData.type === 'LOST' && (
                <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-l-4 border-brand-700 pl-3">
                      Private ownership details
                    </h3>
                    <span className="text-xs text-gray-600 font-semibold bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md dark:text-slate-400">
                      Only visible to you
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add private ownership details (e.g. serial numbers, IMEIs, receipts, or unique
                    physical marks). These details are stored securely and{' '}
                    <strong>never shown to the public or finder</strong>. They are only used to
                    verify your ownership when claiming.
                  </p>

                  {/* List of currently added proofs */}
                  {ownershipProofs.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {ownershipProofs.map((proof, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl"
                        >
                          <div>
                            <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400">
                              {proof.proofType === 'custom'
                                ? `Custom: ${proof.customLabel}`
                                : proof.proofType}
                            </div>
                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                              {proof.proofValue}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setOwnershipProofs((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors dark:text-red-300 dark:bg-red-900/25"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form to add a new proof */}
                  <div className="bg-gray-50 dark:bg-slate-900/50 border border-dashed border-gray-200 dark:border-slate-600 rounded-2xl p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="report-8"
                          className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
                        >
                          Proof Type
                        </label>
                        <select
                          id="report-8"
                          value={newProofType}
                          onChange={(e) => {
                            setNewProofType(e.target.value);
                            if (e.target.value !== 'custom') setNewCustomLabel('');
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                        >
                          <option value="serialNumber">Serial Number</option>
                          <option value="imei">IMEI Number</option>
                          <option value="productId">Product ID / Code</option>
                          <option value="receiptRef">Receipt / Invoice Reference</option>
                          <option value="physicalMark">Unique Physical Mark / Scratch</option>
                          <option value="specialFeature">Special Feature / Modification</option>
                          <option value="engraving">Engraving / Text</option>
                          <option value="custom">Custom ID Detail</option>
                        </select>
                      </div>
                      {newProofType === 'custom' && (
                        <div>
                          <label
                            htmlFor="report-9"
                            className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
                          >
                            Custom Label Name
                          </label>
                          <input
                            id="report-9"
                            type="text"
                            value={newCustomLabel}
                            onChange={(e) => setNewCustomLabel(e.target.value)}
                            placeholder="e.g. Frame Number, Keyring details"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="report-10"
                        className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
                      >
                        Proof Description/Value
                      </label>
                      <textarea
                        id="report-10"
                        rows={2}
                        value={newProofValue}
                        onChange={(e) => setNewProofValue(e.target.value)}
                        placeholder="Enter exact serial/code value, or a detailed description of the mark..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddProof}
                      className="w-full bg-gray-800 text-white text-xs font-bold py-2 rounded-xl hover:bg-gray-700 transition"
                    >
                      Add Proof Detail
                    </button>
                  </div>
                </div>
              )}

              {/* Security / Blind Claim */}
              <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-l-4 border-brand-700 pl-3">
                  {t('report.contactAndOwnership')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="report-contactNumber"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('report.phone')}
                    </label>
                    <input
                      id="report-contactNumber"
                      required
                      type="tel"
                      autoComplete="tel"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      placeholder="07XXXXXXXX"
                      className="ui-field"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="report-securityQuestion"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('report.ownershipQuestion')}
                    </label>
                    <input
                      id="report-securityQuestion"
                      type="text"
                      name="securityQuestion"
                      value={formData.securityQuestion}
                      onChange={handleInputChange}
                      placeholder="e.g., What is the lock screen wallpaper?"
                      className="ui-field"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      For found items, ask a question only the owner can answer. Discuss it in chat
                      before returning the item.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-10 pt-6 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => goToStep(currentStep - 1)}
                disabled={isSubmitting}
                className="ui-secondary shrink-0 px-3"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                {t('report.back')}
              </button>

              {/* Separate keys prevent the same click from activating the new submit button. */}
              {currentStep < 4 ? (
                <button
                  key="next-step"
                  type="button"
                  onClick={nextStep}
                  className="ui-primary px-3"
                >
                  {t('report.next')}
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              ) : (
                <button
                  key="publish-report"
                  type="submit"
                  disabled={isSubmitting}
                  className="ui-primary px-3"
                >
                  {isSubmitting ? t('report.publishing') : t('report.publish')}
                </button>
              )}
            </div>
          )}
        </form>
      </motion.div>
    </>
  );
};

export default PostItemPage;
