// ─── AISStream.io Raw Message Types ──────────────────────────────────────────

export type AISMessageType =
  | "PositionReport"
  | "ShipStaticData"
  | "StandardClassBCSPositionReport"
  | "StaticDataReport"
  | "UnknownMessage";

/** Subscription message sent by client to AISStream.io on connect */
export interface AISStreamSubscription {
  APIKey: string;
  BoundingBoxes: [number, number][][]; // Array of [[lat1,lon1],[lat2,lon2]] pairs
  FiltersShipMMSI?: string[];
  FilterMessageTypes?: AISMessageType[];
}

/** Envelope wrapping every message from AISStream.io */
export interface AISStreamEnvelope {
  MessageType: AISMessageType;
  Message: {
    PositionReport?: PositionReport;
    ShipStaticData?: ShipStaticData;
    [key: string]: unknown;
  };
  MetaData: AISStreamMetaData;
}

/** MetaData present on every AISStream.io message */
export interface AISStreamMetaData {
  MMSI: number;
  MMSI_String: string;
  ShipName: string;
  latitude: number;
  longitude: number;
  time_utc: string; // ISO 8601 timestamp string
}

/** PositionReport — AIS message types 1, 2, 3 */
export interface PositionReport {
  Cog: number; // Course over ground in 1/10 degree (0-3599, 3600 = unavailable)
  CommunicationState: number;
  Latitude: number; // Degrees (-90 to 90, 91 = unavailable)
  Longitude: number; // Degrees (-180 to 180, 181 = unavailable)
  MessageID: number; // 1, 2, or 3
  NavigationalStatus: number; // 0-15
  PositionAccuracy: boolean;
  Raim: boolean;
  RateOfTurn: number; // Degrees per minute (-127 to 127, -128 = unavailable)
  RepeatIndicator: number;
  Sog: number; // Speed over ground in 1/10 knot (0-1022, 1023 = unavailable)
  Spare: number;
  SpecialManoeuvreIndicator: number;
  Timestamp: number; // UTC second (0-59, 60 = unavailable)
  TrueHeading: number; // Degrees (0-359, 511 = unavailable)
  UserID: number; // MMSI
  Valid: boolean;
}

/** ShipStaticData dimension sub-object */
export interface ShipStaticDataDimension {
  A: number; // Distance from GPS to bow (meters)
  B: number; // Distance from GPS to stern (meters)
  C: number; // Distance from GPS to port (meters)
  D: number; // Distance from GPS to starboard (meters)
}

/** ShipStaticData ETA sub-object */
export interface ShipStaticDataEta {
  Month: number; // 1-12 (0 = unavailable)
  Day: number; // 1-31 (0 = unavailable)
  Hour: number; // 0-23 (24 = unavailable)
  Minute: number; // 0-59 (60 = unavailable)
}

/** ShipStaticData — AIS message type 5 */
export interface ShipStaticData {
  AisVersion: number;
  CallSign: string;
  Destination: string;
  Dimension: ShipStaticDataDimension;
  Dte: number;
  Eta: ShipStaticDataEta;
  FixType: number;
  ImoNumber: number;
  MaximumStaticDraught: number; // In 1/10 meter
  MessageID: number; // 5
  Name: string;
  RepeatIndicator: number;
  Spare: boolean;
  Type: number; // Ship type code (70-79 = cargo, 80-89 = tanker)
  UserID: number; // MMSI
  Valid: boolean;
}

// ─── Internal Domain Types ───────────────────────────────────────────────────

/** Normalized vessel position — what the rest of our app uses */
export interface VesselPosition {
  mmsi: string;
  lat: number;
  lon: number;
  cog: number; // Degrees (0-359.9), NaN if unavailable
  sog: number; // Knots, NaN if unavailable
  heading: number; // True heading degrees (0-359), NaN if unavailable
  navStatus: number; // Navigational status code (0-15)
  timestamp: number; // Unix epoch ms when this position was received
  shipName: string; // From MetaData
}

/** Normalized vessel static data */
export interface VesselStatic {
  mmsi: string;
  name: string;
  callSign: string;
  imo: number;
  shipType: number; // AIS ship type code
  destination: string;
  dimBow: number; // Meters
  dimStern: number; // Meters
  dimPort: number; // Meters
  dimStarboard: number; // Meters
  draught: number; // Meters
  eta: string | null; // ISO date string or null if unavailable
  timestamp: number; // Unix epoch ms when received
}

/** Combined vessel record stored in VesselStore */
export interface VesselRecord {
  position: VesselPosition | null;
  static: VesselStatic | null;
  lastUpdate: number; // Unix epoch ms of most recent update (position or static)
}
