export interface Port {
  name: string;
  lat: number;
  lon: number;
  value: number; // relative throughput 0-1
}

export interface Vessel {
  id: string;
  lat: number;
  lon: number;
  heading: number; // degrees from north
  speed: number;
  type: "container" | "bulk" | "tanker";
}

export interface ShippingLane {
  from: string;
  to: string;
  commodity: string;
}

export const TEST_PORTS: Port[] = [
  { name: "Shanghai", lat: 31.2, lon: 121.5, value: 1.0 },
  { name: "Rotterdam", lat: 51.9, lon: 4.5, value: 0.7 },
  { name: "Singapore", lat: 1.3, lon: 103.8, value: 0.9 },
  { name: "Los Angeles", lat: 33.7, lon: -118.3, value: 0.6 },
  { name: "Busan", lat: 35.1, lon: 129.1, value: 0.8 },
  { name: "Kaohsiung", lat: 22.6, lon: 120.3, value: 0.75 },
];

export const TEST_VESSELS: Vessel[] = [
  // Pacific Ocean
  { id: "V001", lat: 35.0, lon: -160.0, heading: 270, speed: 14, type: "container" },
  { id: "V002", lat: 30.0, lon: -140.0, heading: 90, speed: 12, type: "bulk" },
  { id: "V003", lat: 25.0, lon: 170.0, heading: 45, speed: 16, type: "container" },
  // Indian Ocean
  { id: "V004", lat: 5.0, lon: 80.0, heading: 315, speed: 13, type: "tanker" },
  { id: "V005", lat: -10.0, lon: 60.0, heading: 0, speed: 11, type: "bulk" },
  // Atlantic
  { id: "V006", lat: 40.0, lon: -30.0, heading: 90, speed: 15, type: "container" },
  { id: "V007", lat: 15.0, lon: -45.0, heading: 340, speed: 10, type: "tanker" },
];

export const TEST_LANES: ShippingLane[] = [
  { from: "Shanghai", to: "Los Angeles", commodity: "semiconductors" },
  { from: "Rotterdam", to: "Singapore", commodity: "mixed" },
  { from: "Busan", to: "Los Angeles", commodity: "electronics" },
];
