export interface LocationData {
  [province: string]: {
    [district: string]: string[];
  };
}

export const sriLankaLocations: LocationData = {
  "Western": {
    "Colombo": ["Colombo 1", "Colombo 2", "Colombo 3", "Dehiwala", "Moratuwa", "Maharagama", "Homagama"],
    "Gampaha": ["Gampaha", "Negombo", "Kelaniya", "Kadawatha", "Nittambuwa", "Wattala"],
    "Kalutara": ["Kalutara", "Panadura", "Horana", "Matugama", "Bandaragama"]
  },
  "Central": {
    "Kandy": ["Kandy", "Peradeniya", "Gampola", "Katugastota", "Nawalapitiya"],
    "Matale": ["Matale", "Dambulla", "Sigiriya", "Ukuwela"],
    "Nuwara Eliya": ["Nuwara Eliya", "Hatton", "Talawakele", "Nanu Oya"]
  },
  "Southern": {
    "Galle": ["Galle", "Ambalangoda", "Hikkaduwa", "Karapitiya", "Elpitiya"],
    "Matara": ["Matara", "Weligama", "Dikwella", "Akuressa", "Hakmana"],
    "Hambantota": ["Hambantota", "Tangalle", "Tissamaharama", "Beliatta", "Ambalantota"]
  },
  "Northern": {
    "Jaffna": ["Jaffna", "Nallur", "Chavakachcheri", "Point Pedro"],
    "Kilinochchi": ["Kilinochchi", "Pallai", "Paranthan"],
    "Mannar": ["Mannar", "Murunkan", "Pesalai"],
    "Vavuniya": ["Vavuniya", "Settikulam", "Nedunkeni"],
    "Mullaitivu": ["Mullaitivu", "Puthukkudiyiruppu", "Mankulam"]
  },
  "Eastern": {
    "Trincomalee": ["Trincomalee", "Kinniya", "Mutur"],
    "Batticaloa": ["Batticaloa", "Kattankudy", "Eravur", "Valaichchenai"],
    "Ampara": ["Ampara", "Kalmunai", "Samanthurai", "Pottuvil"]
  },
  "North Western": {
    "Kurunegala": ["Kurunegala", "Kuliyapitiya", "Narammala", "Wariyapola"],
    "Puttalam": ["Puttalam", "Chilaw", "Wennappuwa", "Nattandiya"]
  },
  "North Central": {
    "Anuradhapura": ["Anuradhapura", "Kekirawa", "Thambuththegama", "Eppawala"],
    "Polonnaruwa": ["Polonnaruwa", "Kaduruwela", "Hingurakgoda", "Medirigiriya"]
  },
  "Uva": {
    "Badulla": ["Badulla", "Bandarawela", "Hali-Ela", "Welimada", "Mahiyanganaya"],
    "Moneragala": ["Moneragala", "Bibile", "Wellawaya", "Kataragama"]
  },
  "Sabaragamuwa": {
    "Ratnapura": ["Ratnapura", "Pelmadulla", "Balangoda", "Embilipitiya", "Rakwana"],
    "Kegalle": ["Kegalle", "Mawanella", "Warakapola", "Ruwanwella", "Yatiyantota"]
  }
};

export const getProvinces = (): string[] => Object.keys(sriLankaLocations);

export const getDistricts = (province: string): string[] => {
  return province && sriLankaLocations[province] ? Object.keys(sriLankaLocations[province]) : [];
};

export const getCities = (province: string, district: string): string[] => {
  return province && district && sriLankaLocations[province]?.[district] 
    ? sriLankaLocations[province][district] 
    : [];
};
