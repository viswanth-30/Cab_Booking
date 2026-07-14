import React, { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Define custom icons using CSS/DIVs to prevent bundler path issues
const pickupIcon = L.divIcon({
  className: 'custom-pickup-icon',
  html: '<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(16,185,129,0.8);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const dropoffIcon = L.divIcon({
  className: 'custom-dropoff-icon',
  html: '<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(239,68,68,0.8);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const driverIcon = L.divIcon({
  className: 'custom-driver-icon',
  html: '<div style="background-color: #f59e0b; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(245,158,11,0.9); font-size: 14px; cursor: pointer;">🚖</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const nearbyIcon = L.divIcon({
  className: 'custom-nearby-icon',
  html: '<div style="background-color: #6366f1; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(99,102,241,0.7); font-size: 10px;">🚕</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Event Handler component for Map Clicking
function MapClickEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

// Auto fit zoom bounds
function FitBounds({ pickup, dropoff, driver }) {
  const map = useMap();
  
  useEffect(() => {
    if (pickup && dropoff) {
      map.fitBounds([
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng]
      ], { padding: [50, 50], maxZoom: 16 });
    } else if (driver) {
      map.setView([driver.lat, driver.lng], 15);
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
    }
  }, [pickup, dropoff, driver, map]);

  return null;
}

export default function MapContainer({ 
  pickup, 
  dropoff, 
  driverLocation, 
  nearbyDrivers = [], 
  onMapClick, 
  style = { height: '100%', width: '100%' } 
}) {
  const defaultCenter = [12.9716, 77.5946]; // Bangalore center

  return (
    <LeafletMap 
      center={defaultCenter} 
      zoom={12} 
      style={style}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Modern dark map style
      />
      
      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>Pickup Location</Popup>
        </Marker>
      )}

      {dropoff && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
          <Popup>Dropoff Location</Popup>
        </Marker>
      )}

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
          <Popup>Your Ride Driver</Popup>
        </Marker>
      )}

      {pickup && dropoff && (
        <Polyline 
          positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} 
          color="#6366f1" 
          weight={4} 
          opacity={0.8}
          dashArray="5, 10"
        />
      )}

      {nearbyDrivers.map((drv, idx) => (
        <Marker 
          key={idx} 
          position={[drv.currentLocation.lat, drv.currentLocation.lng]} 
          icon={nearbyIcon}
        >
          <Popup>
            <strong>{drv.name}</strong><br />
            Vehicle: {drv.vehicleType.toUpperCase()} ({drv.vehicleNumber})<br />
            Rating: {drv.rating} ★
          </Popup>
        </Marker>
      ))}

      <MapClickEvents onMapClick={onMapClick} />
      <FitBounds pickup={pickup} dropoff={dropoff} driver={driverLocation} />
    </LeafletMap>
  );
}
