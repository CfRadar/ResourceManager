'use strict';

/**
 * src/utils/geo.js
 *
 * Geographical calculation utilities (Haversine distance & geofencing).
 * Spec §4.12: Soft GPS check-in evaluation.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Converts degrees to radians.
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Evaluates geofence status for a check-in event against facility coordinates.
 *
 * @param {object} [facilityCoords] - { lat, lng }
 * @param {object} [checkInCoords]  - { lat, lng, accuracy }
 * @param {number} [radiusMeters=150] - Geofence radius in meters
 * @returns {'WITHIN'|'OUTSIDE'|'NOT_PROVIDED'}
 */
function evaluateGeofence(facilityCoords, checkInCoords, radiusMeters = 150) {
  if (!checkInCoords || checkInCoords.lat == null || checkInCoords.lng == null) {
    return 'NOT_PROVIDED';
  }
  if (!facilityCoords || facilityCoords.lat == null || facilityCoords.lng == null) {
    return 'NOT_PROVIDED';
  }

  const distance = calculateHaversineDistance(
    Number(facilityCoords.lat),
    Number(facilityCoords.lng),
    Number(checkInCoords.lat),
    Number(checkInCoords.lng)
  );

  return distance <= radiusMeters ? 'WITHIN' : 'OUTSIDE';
}

module.exports = {
  calculateHaversineDistance,
  evaluateGeofence,
};
