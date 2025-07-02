'use client';
import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import TileWMS from 'ol/source/TileWMS';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import { fromLonLat, transformExtent } from 'ol/proj';

interface WaterQualityData {
  sampling?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

interface SamplingPointData {
  'Sampling Location'?: string;
  'STATUS'?: string;
  'LATITUDE'?: number;
  'LONGITUDE'?: number;
  'pH'?: number;
  'TDS (ppm)'?: number;
  'EC (μS/cm)'?: number;
  'Temperature (°C)'?: number;
  'Turbidity (FNU)'?: number;
  'DO (mg/L)'?: number;
  'ORP'?: number;
  'TSS(mg/l)'?: number;
  'COD'?: number;
  'BOD(mg/l)'?: number;
  'TS_mg_l_'?: number;
  'Chloride(mg/l)'?: number;
  'Nitrate'?: number;
  'Hardness(mg/l)'?: number;
  'Faecal Coliform (CFU/100 mL)'?: number;
  'Total Coliform (CFU/100 mL)'?: number;
  [key: string]: any;
}

interface LayerInfo {
  name: string;
  wms_url: string;
  layer: string;
}

interface MapComponentProps {
  csvData: WaterQualityData[];
  backendUrl?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ csvData, backendUrl = 'http://172.29.192.1:9000' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const riverBufferLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const riverLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const basinLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const clipped_subdistLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const wmsLayerRef = useRef<TileLayer<TileWMS> | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<SamplingPointData | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const attributes = [
    'pH', 'TDS (ppm)', 'EC (μS/cm)', 'Temperature (°C)', 'Turbidity (FNU)', 'DO (mg/L)', 'ORP',
    'TSS(mg/l)', 'COD', 'BOD(mg/l)', 'TS_mg_l_', 'Chloride(mg/l)', 'Nitrate', 'Hardness(mg/l)',
    'Faecal Coliform (CFU/100 mL)', 'Total Coliform (CFU/100 mL)'
  ];

  useEffect(() => {
    if (!csvData.length || !mapRef.current) return;

    const initializeMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
      }

      const map = new Map({
        target: mapRef.current!,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
        ],
        view: new View({
          center: fromLonLat([csvData[0]?.longitude || 77.2090, csvData[0]?.latitude || 28.6139]),
          zoom: 10,
          projection: 'EPSG:3857',
        }),
      });

      mapInstanceRef.current = map;

      map.on('click', (event) => {
        let featureFound = false;
        map.forEachFeatureAtPixel(event.pixel, (feature) => {
          const properties = feature.getProperties();
          if (properties['Sampling Location'] || properties['LATITUDE']) {
            setSelectedPoint(properties as SamplingPointData);
            setShowPanel(true);
            featureFound = true;
            return true;
          }
        });
        if (!featureFound) {
          setShowPanel(false);
          setSelectedPoint(null);
        }
      });
    };

    const fetchbasin = async () => {
      try {
        const response = await fetch('/basics/basin/');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const basin = await response.json();

        const basinSource = new VectorSource({
          features: new GeoJSON().readFeatures(basin, {
            featureProjection: 'EPSG:3857',
          }),
        });

        basinLayerRef.current = new VectorLayer({
          source: basinSource,
          style: new Style({
            stroke: new Stroke({
              color: 'rgb(81, 0, 255)',
              width: 2
            }),
          }),
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.addLayer(basinLayerRef.current);
          const extent = basinSource.getExtent();
          if (!extent.includes(Infinity) && !extent.includes(-Infinity)) {
            mapInstanceRef.current.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
          }
        }
      } catch (error) {
        console.error('Error fetching basin GeoJSON:', error);
      }
    };

    const fetchclipped_subdist = async () => {
      try {
        const response = await fetch(`${backendUrl}/rwm/clipped_subdist/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const clipped_subdist = await response.json();

        const clipped_subdistSource = new VectorSource({
          features: new GeoJSON().readFeatures(clipped_subdist, {
            featureProjection: 'EPSG:3857',
          }),
        });

        clipped_subdistLayerRef.current = new VectorLayer({
          source: clipped_subdistSource,
          style: new Style({
            stroke: new Stroke({
              color: 'rgba(0, 255, 204, 0.27)',
              width: 2
            }),
          }),
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.addLayer(clipped_subdistLayerRef.current);
          const extent = clipped_subdistSource.getExtent();
          if (!extent.includes(Infinity) && !extent.includes(-Infinity)) {
            mapInstanceRef.current.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
          }
        }
      } catch (error) {
        console.error('Error fetching clipped subdist GeoJSON:', error);
      }
    };

    const fetchSamplingPoints = async () => {
      try {
        const response = await fetch(`${backendUrl}/rwm/shapefile/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
              radius: 8,
              fill: new Fill({ color: 'rgba(255, 0, 0, 0.8)' }),
              stroke: new Stroke({ color: 'darkred', width: 2 }),
            }),
          }),
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.addLayer(vectorLayerRef.current);
        }
      } catch (error) {
        console.error('Error fetching sampling points GeoJSON:', error);
      }
    };

    const fetchRiverBuffer = async () => {
      try {
        const response = await fetch(`${backendUrl}/rwm/river_100m_buffer/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const riverBufferData = await response.json();

        const riverBufferSource = new VectorSource({
          features: new GeoJSON().readFeatures(riverBufferData, {
            featureProjection: 'EPSG:3857',
          }),
        });

        riverBufferLayerRef.current = new VectorLayer({
          source: riverBufferSource,
          style: new Style({
            stroke: new Stroke({
              color: 'rgb(255, 234, 0)',
              width: 4
            }),
          }),
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.addLayer(riverBufferLayerRef.current);
          const extent = riverBufferSource.getExtent();
          if (!extent.includes(Infinity) && !extent.includes(-Infinity)) {
            mapInstanceRef.current.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
          }
        }
      } catch (error) {
        console.error('Error fetching river buffer GeoJSON:', error);
      }
    };

    const fetchRiver = async () => {
      try {
        const response = await fetch(`${backendUrl}/rwm/river/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const riverData = await response.json();

        const riverSource = new VectorSource({
          features: new GeoJSON().readFeatures(riverData, {
            featureProjection: 'EPSG:3857',
          }),
        });

        riverLayerRef.current = new VectorLayer({
          source: riverSource,
          style: new Style({
            stroke: new Stroke({
              color: 'rgba(4, 46, 255, 0.9)',
              width: 2,
            }),
          }),
        });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.addLayer(riverLayerRef.current);
        }
      } catch (error) {
        console.error('Error fetching river GeoJSON:', error);
      }
    };

    initializeMap();
    fetchSamplingPoints();
    fetchRiverBuffer();
    fetchRiver();
    fetchbasin();
    fetchclipped_subdist();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [csvData, backendUrl]);

  // FIXED: WMS Layer handling with proper error handling and debugging
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLayer) return;

    console.log('=== WMS LAYER DEBUG ===');
    console.log('Selected layer:', selectedLayer);
    setError('');
    setIsLoading(true);

    // Remove existing WMS layer
    if (wmsLayerRef.current) {
      console.log('Removing existing WMS layer');
      mapInstanceRef.current.removeLayer(wmsLayerRef.current);
      wmsLayerRef.current = null;
    }

    // Trigger interpolation and add new WMS layer
    const fetchInterpolatedLayer = async () => {
      try {
        const url = `${backendUrl}/rwm/interpolate/${encodeURIComponent(selectedLayer)}/`;
        console.log('Fetching from URL:', url);

        const response = await fetch(url);
        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.status === 'success') {
          console.log('Creating WMS layer with:', {
            wms_url: data.wms_url,
            layer: data.layer
          });

          // FIXED: Wait a moment for GeoServer to be ready
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Test WMS GetCapabilities
          const capabilitiesUrl = `${data.wms_url}?service=WMS&version=1.1.0&request=GetCapabilities`;
          console.log('Testing WMS capabilities:', capabilitiesUrl);

          try {
            const testResponse = await fetch(capabilitiesUrl);
            console.log('WMS capabilities response:', testResponse.status);
            
            if (!testResponse.ok) {
              throw new Error(`WMS GetCapabilities failed: ${testResponse.status}`);
            }
          } catch (testError) {
            console.error('WMS capabilities test failed:', testError);
            throw new Error('GeoServer not ready or layer not available');
          }

          // Create WMS layer with better error handling
          const wmsSource = new TileWMS({
            url: data.wms_url,
            params: {
              LAYERS: data.layer,
              TILED: true,
              VERSION: '1.1.0',
              FORMAT: 'image/png',
              TRANSPARENT: true,
              // FIXED: Use the correct SRS from your data
              SRS: 'EPSG:3857', // For web mercator display
              EXCEPTIONS: 'application/vnd.ogc.se_inimage'
            },
            serverType: 'geoserver',
            // FIXED: Better error handling for tile loading
            tileLoadFunction: (image: any, src: string) => {
              const img = image.getImage() as HTMLImageElement;
              
              img.onload = () => {
                console.log('WMS tile loaded successfully:', src);
              };
              
              img.onerror = (error) => {
                console.error('WMS tile failed to load:', error);
                console.error('Failed URL:', src);
                setError(`Failed to load tiles from: ${data.layer}`);
              };
              
              // Add timeout for loading
              const timeout = setTimeout(() => {
                console.error('WMS tile load timeout:', src);
                setError(`Tile loading timeout for: ${data.layer}`);
              }, 30000); // 30 second timeout
              
              img.onload = () => {
                clearTimeout(timeout);
                console.log('WMS tile loaded successfully:', src);
              };
              
              img.src = src;
            }
          });

          const wmsLayer = new TileLayer({
            source: wmsSource,
            opacity: 0.7,
            visible: true
          });

          // Add event listeners to the layer source
          wmsSource.on('tileloaderror', (event) => {
            console.error('Tile load error:', event);
            setError(`Tile loading error for layer: ${data.layer}`);
          });

          wmsSource.on('tileloadstart', (event) => {
            console.log('Tile load start:', event);
          });

          wmsSource.on('tileloadend', (event) => {
            console.log('Tile load end:', event);
          });

          wmsLayerRef.current = wmsLayer;
          mapInstanceRef.current?.addLayer(wmsLayer);

          console.log('WMS layer added to map');
          console.log('Map layers count:', mapInstanceRef.current?.getLayers().getLength());

          // Force map refresh
          mapInstanceRef.current?.render();
          mapInstanceRef.current?.updateSize();

          // Update layers list
          setLayers((prev) => {
            const existingIndex = prev.findIndex(l => l.name === selectedLayer);
            const newLayer = { name: selectedLayer, wms_url: data.wms_url, layer: data.layer };
            
            if (existingIndex >= 0) {
              // Update existing layer
              const newLayers = [...prev];
              newLayers[existingIndex] = newLayer;
              return newLayers;
            } else {
              // Add new layer
              return [...prev, newLayer];
            }
          });

          setIsLoading(false);
          console.log('WMS layer setup completed successfully');

        } else {
          console.error('Interpolation failed:', data);
          setError(data.message || 'Interpolation failed');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching interpolated layer:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    };

    fetchInterpolatedLayer();
  }, [selectedLayer, backendUrl]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  const getParameterCategory = (key: string): string => {
    const physicalParams = ['Temperature (°C)', 'Turbidity (FNU)', 'TDS (ppm)', 'TSS(mg/l)', 'TS_mg_l_'];
    const chemicalParams = ['pH', 'DO (mg/L)', 'ORP', 'EC (μS/cm)', 'COD', 'BOD(mg/l)', 'Chloride(mg/l)', 'Nitrate', 'Hardness(mg/l)'];
    const biologicalParams = ['Faecal Coliform (CFU/100 mL)', 'Total Coliform (CFU/100 mL)'];
    if (physicalParams.includes(key)) return 'Physical Parameters';
    if (chemicalParams.includes(key)) return 'Chemical Parameters';
    if (biologicalParams.includes(key)) return 'Biological Parameters';
    return 'General Information';
  };

  const renderParametersByCategory = () => {
    if (!selectedPoint) return null;

    const categories: { [key: string]: Array<[string, any]> } = {
      'General Information': [],
      'Physical Parameters': [],
      'Chemical Parameters': [],
      'Biological Parameters': [],
    };

    Object.entries(selectedPoint).forEach(([key, value]) => {
      if (key === 'geometry') return;
      const category = getParameterCategory(key);
      categories[category].push([key, value]);
    });

    return Object.entries(categories).map(([category, params]) => {
      if (params.length === 0) return null;
      return (
        <div key={category} className="mb-4">
          <h4 className="font-semibold text-blue-700 mb-2 border-b border-blue-200 pb-1">
            {category}
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {params.map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-1 px-2 hover:bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">{key}:</span>
                <span className="text-sm text-gray-900 font-mono">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="h-full w-full relative">
      {/* FIXED: Better positioning and styling for the dropdown */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <select
          value={selectedLayer}
          onChange={(e) => setSelectedLayer(e.target.value)}
          className="p-2 border rounded bg-white shadow-md min-w-48"
          disabled={isLoading}
        >
          <option value="">Select Parameter for Interpolation</option>
          {attributes.map((attr) => (
            <option key={attr} value={attr}>
              {attr}
            </option>
          ))}
        </select>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="bg-blue-100 text-blue-800 p-2 rounded text-sm">
            Creating interpolation layer...
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="bg-red-100 text-red-800 p-2 rounded text-sm max-w-xs">
            Error: {error}
          </div>
        )}
        
        {/* Current layer info */}
        {selectedLayer && !isLoading && !error && (
          <div className="bg-green-100 text-green-800 p-2 rounded text-sm">
            Showing: {selectedLayer}
          </div>
        )}
      </div>

      <div ref={mapRef} className="h-full w-full" />
      
      {showPanel && selectedPoint && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border max-w-sm max-h-96 overflow-y-auto z-10">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-800">Sampling Point Details</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
              >
                ×
              </button>
            </div>
            {selectedPoint['Sampling Location'] && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800">{selectedPoint['Sampling Location']}</h4>
                {selectedPoint['STATUS'] && (
                  <span
                    className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${selectedPoint['STATUS']?.toString().toLowerCase() === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {selectedPoint['STATUS']}
                  </span>
                )}
              </div>
            )}
            <div className="space-y-2">{renderParametersByCategory()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;