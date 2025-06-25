'use client';
import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';

interface WaterQualityData {
  sampling?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

interface MapComponentProps {
  csvData: WaterQualityData[];
   backendUrl?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ csvData, backendUrl = 'http://172.20.43.252:9000' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  useEffect(() => {
    if (!csvData.length || !mapRef.current) return;

    const initializeMap = () => {
      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
      }

      // Create initial map without vector layer
      const map = new Map({
        target: mapRef.current!,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
        ],
        view: new View({
          center: fromLonLat([
            csvData[0]?.longitude || 77.2090, 
            csvData[0]?.latitude || 28.6139
          ]), // Default to Delhi coordinates
          zoom: 10,
        }),
      });

      mapInstanceRef.current = map;

      // Add click handler
      map.on('click', (event) => {
        map.forEachFeatureAtPixel(event.pixel, (feature) => {
          const properties = feature.getProperties();
          alert(JSON.stringify(properties, null, 2));
        });
      });
    };

    const fetchGeoJSON = async () => {
      try {
        const response = await fetch(`${backendUrl}/rwm/shapefile-filtered/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const geojsonData = await response.json();

        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(geojsonData, {
            featureProjection: 'EPSG:3857',
          }),
        });

        vectorLayerRef.current = new VectorLayer({
          source: vectorSource,
          style: new Style({
            image: new Circle({
              radius: 6,
              fill: new Fill({ color: 'red' }),
              stroke: new Stroke({ color: 'black', width: 1 }),
            }),
          }),
        });

        // Add vector layer to map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.addLayer(vectorLayerRef.current);
        }
      } catch (error) {
        console.error('Error fetching GeoJSON:', error);
        // Continue without shapefile data - map will still show base layer
      }
    };

    // Initialize map first
    initializeMap();
    
    // Then fetch and add GeoJSON data
    fetchGeoJSON();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [csvData]);

  return (
    <div className="h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};

export default MapComponent;