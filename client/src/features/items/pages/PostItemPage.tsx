import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import Swal from "sweetalert2";
import api from "../../../services/api";
import LocationSelector, {
  LocationState,
} from "../components/LocationSelector";
import AIItemIdentifier from "../components/AIItemIdentifier";
import VoiceReporter from "../components/VoiceReporter";
import { ShieldCheck, Navigation, Search, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, MapPin, FileCheck } from "lucide-react";
import "leaflet/dist/leaflet.css";
import PageNavigation from "../../../components/common/PageNavigation";

// Leaflet marker icon configuration fix for React compatibility
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom hook component to capture map click coordinates
const MapClickHandler = ({
  setPosition,
}: {
  setPosition: (pos: [number, number]) => void;
}) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

// Haversine distance formula
const getDistanceFromLatLonInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    province: "",
    district: "",
    city: "",
  });
  const [externalLocation, setExternalLocation] =
    useState<LocationState | null>(null);
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

  // Digital Proof of Ownership Composition State
  const [ownershipProofs, setOwnershipProofs] = useState<
    { proofType: string; customLabel: string; proofValue: string }[]
  >([]);
  const [newProofType, setNewProofType] = useState("serialNumber");
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newProofValue, setNewProofValue] = useState("");

  const handleAddProof = () => {
    if (!newProofValue.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Value required",
        text: "Please enter a value or description for this proof.",
        confirmButtonColor: "#800000",
      });
      return;
    }
    if (newProofType === "custom" && !newCustomLabel.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Label required",
        text: "Please enter a custom label name.",
        confirmButtonColor: "#800000",
      });
      return;
    }

    setOwnershipProofs((prev) => [
      ...prev,
      {
        proofType: newProofType,
        customLabel: newProofType === "custom" ? newCustomLabel.trim() : "",
        proofValue: newProofValue.trim(),
      },
    ]);

    // reset composition states
    setNewProofValue("");
    setNewCustomLabel("");
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "LOST",
    category: "Electronics",
    color: "",
    brand: "",
    model: "",
    date: "",
    contactNumber: "",
    securityQuestion: "",
    handedToPolice: false,
    policeStationName: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
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
                "User-Agent": "LostAndFoundApp/1.0",
              },
            },
          );
          const data = await response.json();
          if (data && data.address) {
            let province = data.address.state || "";
            let district =
              data.address.state_district || data.address.county || "";
            let city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.suburb ||
              "";

            // Clean up mapping strings to match locations.ts format
            province = province.replace(" Province", "").trim();
            district = district.replace(" District", "").trim();

            setExternalLocation({ province, district, city });
          }
        } catch (error) {
          console.error("Reverse geocoding failed", error);
        }
      };

      const fetchPolice = async () => {
        if (formData.type !== "FOUND") return;
        setIsSearchingPolice(true);
        setNearestPolice(null);
        try {
          // Use our reliable backend proxy to query Overpass API to bypass Browser CORS/WAF blocks
          const baseUrl =
            import.meta.env.VITE_API_URL || "http://localhost:5000/api";
          const url = `${baseUrl}/items/nearest-police?lat=${mapPosition[0]}&lng=${mapPosition[1]}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.elements && data.elements.length > 0) {
            let closest: {
              name: string;
              lat: number;
              lon: number;
              distance: number;
            } | null = null;
            let minDistance = Infinity;

            data.elements.forEach((el: any) => {
              const elLat = el.lat || (el.center && el.center.lat);
              const elLon = el.lon || (el.center && el.center.lon);

              if (elLat && elLon) {
                const dist = getDistanceFromLatLonInKm(
                  mapPosition[0],
                  mapPosition[1],
                  elLat,
                  elLon,
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  closest = {
                    name: el.tags?.name || "Local Police Station",
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
          }
        } catch (error) {
          console.error("Failed to find police station", error);
        } finally {
          setIsSearchingPolice(false);
          setHasSearchedPolice(true);
        }
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
  };

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
      position: "top-end",
      icon: "success",
      title: "AI Details Applied!",
      text: "Form fields have been updated.",
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
      position: "top-end",
      icon: "success",
      title: "Voice Details Applied!",
      text: "Form fields have been populated from your voice report.",
      showConfirmButton: false,
      timer: 2500,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.province || !location.district || !location.city) {
      Swal.fire({
        icon: "error",
        title: "Location Required",
        text: "Please complete the geographic registration.",
        confirmButtonColor: "#800000",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, typeof value === "boolean" ? value.toString() : value);
      });
      data.append("province", location.province);
      data.append("district", location.district);
      data.append("city", location.city);

      if (mapPosition) {
        data.append("latitude", mapPosition[0].toString());
        data.append("longitude", mapPosition[1].toString());
      }

      if (imageFile) data.append("image", imageFile);

      if (ownershipProofs && ownershipProofs.length > 0) {
        data.append("ownershipProofs", JSON.stringify(ownershipProofs));
      }

      if (aiMetadata) {
        data.append("aiIdentified", "true");
        data.append("aiIdentification", JSON.stringify(aiMetadata));
      }

      const response = await api.post("/items", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        title: "Successfully Posted!",
        text: "Your item report has been published to the national network.",
        icon: "success",
        confirmButtonColor: "#800000",
      });
      navigate(`/?highlight=${response.data._id}`);
    } catch (error: any) {
      Swal.fire({
        title: "Error!",
        text: error.response?.data?.message || "Failed to post item",
        icon: "error",
        confirmButtonColor: "#800000",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <PageNavigation />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
    >
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Report an Item
        </h2>
        <p className="text-gray-500 mt-2">
          Help reunite lost assets with their rightful owners across Sri Lanka.
        </p>
      </div>

      
      {/* Stepper Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full z-0"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#800000] rounded-full z-0 transition-all duration-500" style={{ width: `${((currentStep - 1) / 4) * 100}%` }}></div>
          
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all duration-300 ${currentStep === step ? "bg-[#800000] text-white shadow-lg shadow-[#800000]/30 scale-110" : currentStep > step ? "bg-[#800000] text-white" : "bg-white border-2 border-gray-200 text-gray-400"}`}>
              {step}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs font-semibold text-gray-500">
          <span className={currentStep === 1 ? "text-[#800000]" : ""}>Intent</span>
          <span className={currentStep === 2 ? "text-[#800000]" : ""}>AI Assist</span>
          <span className={currentStep === 3 ? "text-[#800000]" : ""}>Details</span>
          <span className={currentStep === 4 ? "text-[#800000]" : ""}>Location</span>
          <span className={currentStep === 5 ? "text-[#800000]" : ""}>Security</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Core Intent */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, type: "LOST" });
                setCurrentStep(2);
              }}
              className="group relative flex flex-col items-center justify-center p-12 bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-100 rounded-3xl hover:border-red-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="bg-red-500 text-white p-6 rounded-full mb-6 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-300">
                <Search className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-extrabold text-red-900 mb-3">I Lost Something</h3>
              <p className="text-red-700/80 text-center font-medium px-4">Create an alert to notify finders and police in your area.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, type: "FOUND" });
                setCurrentStep(2);
              }}
              className="group relative flex flex-col items-center justify-center p-12 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-100 rounded-3xl hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="bg-emerald-500 text-white p-6 rounded-full mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-extrabold text-emerald-900 mb-3">I Found Something</h3>
              <p className="text-emerald-700/80 text-center font-medium px-4">Report an item you found to help return it to its owner.</p>
            </button>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 text-center">
              <Sparkles className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-blue-900 mb-2">Let AI fill this out for you!</h3>
              <p className="text-blue-700 text-sm">Save time by uploading a photo or speaking into your microphone. Our AI will automatically extract all the details.</p>
            </div>
            {/* Smart Voice Reporting Section */}
        <VoiceReporter onApplyResults={handleApplyVoiceResults} />

        {/* Smart Item Identification Section */}
        <AIItemIdentifier
          imageFile={imageFile}
          onImageChange={(file) => setImageFile(file)}
          onApplyResults={handleApplyAIResults}
        />

          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          {/* Core Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">
            Core Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
              >
                <option value="Electronics">
                  Electronics (Phones, Laptops)
                </option>
                <option value="Documents">
                  Official Documents (NIC, Passport)
                </option>
                <option value="Keys">Keys</option>
                <option value="Bags">Bags & Luggage</option>
                <option value="Wallets">Wallets & Purses</option>
                <option value="Pets">Pets</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Title
            </label>
            <input
              required
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., iPhone 13 Pro Max - Black"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Color (Optional)
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="e.g., Black, Navy Blue"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Brand (Optional)
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="e.g., Samsung, Apple"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Model (Optional)
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="e.g., Galaxy A52"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              required
              rows={4}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide details like colors, specific marks, or brands..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Date
            </label>
            <input
              required
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
            />
          </div>
        </div>

          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {/* Location & Interactive Map */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">
            Geographic Registration
          </h3>
          <LocationSelector
            onLocationChange={setLocation}
            externalLocation={externalLocation}
          />

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pinpoint Exact Location (Optional)
            </label>
            <div className="h-72 w-full rounded-2xl overflow-hidden border border-gray-200 z-0 relative shadow-inner mb-2">
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
            {formData.type === "FOUND" && isSearchingPolice && (
              <div className="flex items-center text-sm text-gray-500 animate-pulse bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                <div className="w-4 h-4 border-2 border-[#800000] border-t-transparent rounded-full animate-spin mr-3"></div>
                Scanning for nearest police stations...
              </div>
            )}

            {formData.type === "FOUND" &&
              !isSearchingPolice &&
              hasSearchedPolice &&
              !nearestPolice && (
                <div className="flex items-center text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                  <ShieldCheck className="w-5 h-5 text-gray-400 mr-2" />
                  No police stations detected within a 15km radius.
                </div>
              )}

            {formData.type === "FOUND" &&
              nearestPolice &&
              !isSearchingPolice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2 overflow-hidden"
                >
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-4">
                      <ShieldCheck className="w-6 h-6 text-blue-700" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-blue-900">
                        Recommended Action: Surrender to Police
                      </h4>
                      <p className="text-sm text-blue-800 mt-1 mb-3">
                        We detected <strong>{nearestPolice.name}</strong> just{" "}
                        {nearestPolice.distance.toFixed(1)} km away from this
                        location. We recommend surrendering high-value items
                        here to ensure maximum safety and legal compliance.
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

                        <label className="flex items-center space-x-2 cursor-pointer bg-white/60 px-3 py-2 rounded-lg border border-blue-200 hover:bg-white transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.handedToPolice}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                handedToPolice: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm font-semibold text-blue-900">
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

        {currentStep === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          {/* Digital Proof of Ownership */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">
              Digital Proof of Ownership
            </h3>
            <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2 py-1 rounded-md">
              Confidential Layer
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Add private ownership details (e.g. serial numbers, IMEIs, receipts,
            or unique physical marks). These details are stored securely and{" "}
            <strong>never shown to the public or finder</strong>. They are only
            used to verify your ownership when claiming.
          </p>

          {/* List of currently added proofs */}
          {ownershipProofs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {ownershipProofs.map((proof, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-xl"
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400">
                      {proof.proofType === "custom"
                        ? `Custom: ${proof.customLabel}`
                        : proof.proofType}
                    </div>
                    <div className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">
                      {proof.proofValue}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOwnershipProofs((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                    className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form to add a new proof */}
          <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Proof Type
                </label>
                <select
                  value={newProofType}
                  onChange={(e) => {
                    setNewProofType(e.target.value);
                    if (e.target.value !== "custom") setNewCustomLabel("");
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                >
                  <option value="serialNumber">Serial Number</option>
                  <option value="imei">IMEI Number</option>
                  <option value="productId">Product ID / Code</option>
                  <option value="receiptRef">
                    Receipt / Invoice Reference
                  </option>
                  <option value="physicalMark">
                    Unique Physical Mark / Scratch
                  </option>
                  <option value="specialFeature">
                    Special Feature / Modification
                  </option>
                  <option value="engraving">Engraving / Text</option>
                  <option value="custom">Custom ID Detail</option>
                </select>
              </div>
              {newProofType === "custom" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Custom Label Name
                  </label>
                  <input
                    type="text"
                    value={newCustomLabel}
                    onChange={(e) => setNewCustomLabel(e.target.value)}
                    placeholder="e.g. Frame Number, Keyring details"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Proof Description/Value
              </label>
              <textarea
                rows={2}
                value={newProofValue}
                onChange={(e) => setNewProofValue(e.target.value)}
                placeholder="Enter exact serial/code value, or a detailed description of the mark..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none"
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

        {/* Security / Blind Claim */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">
            Verification & Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contact Number
              </label>
              <input
                required
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                placeholder="07XXXXXXXX"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Security Question (Blind Claim Protocol)
              </label>
              <input
                type="text"
                name="securityQuestion"
                value={formData.securityQuestion}
                onChange={handleInputChange}
                placeholder="e.g., What is the lock screen wallpaper?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                If posted as FOUND, claimants must answer this to verify
                ownership.
              </p>
            </div>
          </div>
        </div>


        {currentStep > 1 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 3) {
                    if (!formData.title || !formData.description || !formData.date) {
                      Swal.fire({icon: "error", title: "Missing Fields", text: "Please fill out Title, Description, and Date."});
                      return;
                    }
                  }
                  if (currentStep === 4) {
                    if (!location.province || !location.district || !location.city) {
                      Swal.fire({icon: "error", title: "Location Required", text: "Please select Province, District, and City."});
                      return;
                    }
                  }
                  setCurrentStep(prev => prev + 1);
                }}
                className="flex items-center px-8 py-3 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-bold transition-all shadow-md shadow-gray-900/20"
              >
                Next Step
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center px-8 py-3 bg-[#800000] text-white font-bold rounded-xl hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20 disabled:opacity-70"
              >
                {isSubmitting ? "Publishing..." : "Publish Item Record"}
              </button>
            )}
          </div>
        )}
          </motion.div>
        )}
      </form>

    </motion.div>
    </>
  );
};

export default PostItemPage;
