import * as THREE from "three";

/**
 * Convert latitude/longitude to 3D Cartesian coordinates on a sphere.
 * Uses Three.js right-handed coordinate system.
 */
export function latLonToXYZ(
  lat: number,
  lon: number,
  radius: number = 1
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/**
 * Convert latitude/longitude to a THREE.Vector3 on a sphere.
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number = 1
): THREE.Vector3 {
  const [x, y, z] = latLonToXYZ(lat, lon, radius);
  return new THREE.Vector3(x, y, z);
}

/**
 * Generate points along a great circle arc between two lat/lon positions.
 * Points are lifted above the sphere surface by an altitude curve.
 */
export function greatCirclePoints(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  segments: number = 64,
  maxAltitude: number = 0.1
): THREE.Vector3[] {
  const start = latLonToVector3(lat1, lon1, 1).normalize();
  const end = latLonToVector3(lat2, lon2, 1).normalize();

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Spherical linear interpolation
    const point = new THREE.Vector3().copy(start).lerp(end, t).normalize();
    // Parabolic altitude curve (peaks at midpoint)
    const altitude = 1 + maxAltitude * 4 * t * (1 - t);
    point.multiplyScalar(altitude);
    points.push(point);
  }
  return points;
}
