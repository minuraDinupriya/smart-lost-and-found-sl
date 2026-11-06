import React, { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getProvinces, getDistricts, getCities } from '../../../utils/locations';

export interface LocationState {
  province: string;
  district: string;
  city: string;
}

interface LocationSelectorProps {
  onLocationChange: (location: LocationState) => void;
  initialLocation?: LocationState;
  externalLocation?: LocationState | null;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationChange, initialLocation, externalLocation }) => {
  const { t } = useTranslation();
  const id = useId();
  const [province, setProvince] = useState(initialLocation?.province || '');
  const [district, setDistrict] = useState(initialLocation?.district || '');
  const [city, setCity] = useState(initialLocation?.city || '');

  // Listen for reverse geocoding external overrides
  useEffect(() => {
    if (externalLocation && externalLocation.province) {
      setProvince(externalLocation.province);
      setDistrict(externalLocation.district || '');
      setCity(externalLocation.city || '');
    }
  }, [externalLocation]);

  const provinces = getProvinces();
  const districts = getDistricts(province);
  const cities = getCities(province, district);

  // Cascading resets: Changing a higher-level geographic bound resets lower-level bounds
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvince(e.target.value);
    setDistrict('');
    setCity('');
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDistrict(e.target.value);
    setCity('');
  };

  // Sync state upward to parent component whenever internal state updates
  useEffect(() => {
    onLocationChange({ province, district, city });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province, district, city]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="flex flex-col">
        <label htmlFor={id + '-province'} className="ui-label">{t('location.province')}</label>
        <select
          id={id + '-province'} value={province}
          onChange={handleProvinceChange}
          className="ui-field disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{t('location.selectProvince')}</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{t(`provinces.${p}`, { defaultValue: p })}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor={id + '-district'} className="ui-label">{t('location.district')}</label>
        <select
          id={id + '-district'} value={district}
          onChange={handleDistrictChange}
          disabled={!province}
          className="ui-field disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{t('location.selectDistrict')}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{t(`districts.${d}`, { defaultValue: d })}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor={id + '-city'} className="ui-label">{t('location.city')}</label>
        <select
          id={id + '-city'} value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={!district}
          className="ui-field disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{t('location.selectCity')}</option>
          {cities.map((c) => (
            <option key={c} value={c}>{t(`cities.${c}`, { defaultValue: c })}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LocationSelector;
