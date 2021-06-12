export const reverseLatLng = (features) => {
  if (features === undefined) return features;
  if (features.type === "FeatureCollection") {
    features.features.forEach(feature => {
      feature.geometry.coordinates = reverseLatLngRecursive(feature.geometry.coordinates);
    });
  } else if (features.type === "Feature") {
    features.geometry.coordinates = reverseLatLngRecursive(features.geometry.coordinates);
  }
  
  return features;
}

const reverseLatLngRecursive = (coords) => {
  if (Array.isArray(coords) && Array.isArray(coords[0])) {
    return coords.map(c => reverseLatLngRecursive(c));
  }

  return [coords[1], coords[0]];
}