import React, { useEffect, useState } from 'react';
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
        <label className="text-sm font-semibold text-gray-700 mb-1.5">Province</label>
        <select
          value={province}
          onChange={handleProvinceChange}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white text-gray-900 transition-all cursor-pointer shadow-sm"
        >
          <option value="">Select Province</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-700 mb-1.5">District</label>
        <select
          value={district}
          onChange={handleDistrictChange}
          disabled={!province}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white text-gray-900 transition-all cursor-pointer shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">Select District</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-700 mb-1.5">City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={!district}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white text-gray-900 transition-all cursor-pointer shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">Select City</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LocationSelector;
