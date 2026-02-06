import type { AISStreamEnvelope, PositionReport, VesselPosition, VesselStatic } from "./types";

/**
 * Strip trailing "@" characters and whitespace from AIS string fields.
 * AIS pads fixed-width fields with "@" characters.
 */
function stripAisPadding(value: string): string {
  return value.replace(/@+\s*$/, "").trim();
}

/**
 * Parse an AISStream.io PositionReport envelope into a normalized VesselPosition.
 * Returns null if the message is not a valid PositionReport or has out-of-range coordinates.
 */
export function parsePositionReport(
  envelope: AISStreamEnvelope
): VesselPosition | null {
  // Accept both Class A (PositionReport) and Class B (StandardClassBCSPositionReport)
  const report =
    envelope.Message.PositionReport ??
    (envelope.Message as Record<string, unknown>).StandardClassBCSPositionReport as PositionReport | undefined;
  if (!report || !report.Valid) {
    return null;
  }

  // Reject out-of-range coordinates (AIS sentinel: Lat=91, Lon=181)
  if (
    report.Latitude < -90 ||
    report.Latitude > 90 ||
    report.Longitude < -180 ||
    report.Longitude > 180
  ) {
    return null;
  }

  // Normalize COG: 1/10 degree integer -> degrees. 3600 = unavailable -> NaN
  const cog = report.Cog === 3600 ? NaN : report.Cog / 10;

  // Normalize SOG: 1/10 knot integer -> knots. 1023 = unavailable -> NaN
  const sog = report.Sog === 1023 ? NaN : report.Sog / 10;

  // Normalize heading: 511 = unavailable -> NaN
  const heading = report.TrueHeading === 511 ? NaN : report.TrueHeading;

  // Ship name from metadata, stripped and defaulted
  const rawName = stripAisPadding(envelope.MetaData.ShipName);
  const shipName = rawName === "" ? "Unknown" : rawName;

  return {
    mmsi: envelope.MetaData.MMSI_String,
    lat: report.Latitude,
    lon: report.Longitude,
    cog,
    sog,
    heading,
    navStatus: report.NavigationalStatus,
    timestamp: Date.now(),
    shipName,
  };
}

/**
 * Parse an AISStream.io ShipStaticData envelope into a normalized VesselStatic.
 * Returns null if the message is not valid ShipStaticData.
 */
export function parseShipStaticData(
  envelope: AISStreamEnvelope
): VesselStatic | null {
  if (envelope.MessageType !== "ShipStaticData") {
    return null;
  }

  const data = envelope.Message.ShipStaticData;
  if (!data || !data.Valid) {
    return null;
  }

  // Normalize draught: 1/10 meter -> meters
  const draught = data.MaximumStaticDraught / 10;

  // Convert ETA fields to ISO date string (use current year)
  let eta: string | null = null;
  if (data.Eta.Month > 0 && data.Eta.Day > 0) {
    const year = new Date().getFullYear();
    const month = String(data.Eta.Month).padStart(2, "0");
    const day = String(data.Eta.Day).padStart(2, "0");
    const hour =
      data.Eta.Hour >= 24 ? "00" : String(data.Eta.Hour).padStart(2, "0");
    const minute =
      data.Eta.Minute >= 60 ? "00" : String(data.Eta.Minute).padStart(2, "0");
    eta = `${year}-${month}-${day}T${hour}:${minute}:00Z`;
  }

  // Strip AIS padding from string fields
  const name = stripAisPadding(data.Name) || "Unknown";
  const callSign = stripAisPadding(data.CallSign);
  const destination = stripAisPadding(data.Destination);

  return {
    mmsi: envelope.MetaData.MMSI_String,
    name,
    callSign,
    imo: data.ImoNumber,
    shipType: data.Type,
    destination,
    dimBow: data.Dimension.A,
    dimStern: data.Dimension.B,
    dimPort: data.Dimension.C,
    dimStarboard: data.Dimension.D,
    draught,
    eta,
    timestamp: Date.now(),
  };
}
