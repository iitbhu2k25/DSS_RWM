'use client';
import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import { toLonLat } from 'ol/proj';
import { METERS_PER_UNIT } from 'ol/proj/Units';
import { useMap } from '@/app/contexts/groundwater_assessment/admin/MapContext';
import { useLocation } from '@/app/contexts/groundwater_assessment/admin/LocationContext';

// Base maps configuration
const baseMapNames: Record<string, { name: string; icon: string }> = {
  osm: {
    name: 'OpenStreetMap',
    icon: 'M9 20l-5.447-2.724a1 1 0 010-1.947L9 12.618l-5.447-2.724a1 1 0 010-1.947L9 5.236l-5.447-2.724a1 1 0 010-1.947L9 -1.146',
  },
  terrain: {
    name: 'Stamen Terrain',
    icon: 'M14 11l4-8H6l4 8H6l6 10 6-10h-4z',
  },
  cartoLight: {
    name: 'Carto Light',
    icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  },
  satellite: {
    name: 'Satellite',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  },
  topo: {
    name: 'Topographic',
    icon: 'M7 14l5-5 5 5',
  }
};

interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  type: 'boundary' | 'raster' | 'wells' | 'village-overlay' | 'contour';
}

const MapComponent: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  
  const { 
    selectedBaseMap, 
    setMapContainer, 
    changeBaseMap, 
    isRasterDisplayed,
    isContourDisplayed,
    mapInstance,
    zoomToCurrentExtent,
    isVillageOverlayVisible,
    toggleVillageOverlay,
    removeContourLayer
  } = useMap();
  
  const { selectedState, selectedDistricts, selectedSubDistricts } = useLocation();
  
  // UI State
  const [isBasemapPanelOpen, setIsBasemapPanelOpen] = useState<boolean>(false);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [scale, setScale] = useState<string>('');
  
  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    india: true,
    state: true,
    district: true,
    villages: true,
    wells: true,
    raster: true,
    'village-overlay': true,
    contours: true
  });

  const basemapPanelRef = useRef<HTMLDivElement>(null);
  const layerPanelRef = useRef<HTMLDivElement>(null);

  // Set map container when ref is available
  useEffect(() => {
    if (mapRef.current) {
      setMapContainer(mapRef.current);
    }
    return () => setMapContainer(null);
  }, [setMapContainer]);

  // Sync layer visibility with MapContext
  useEffect(() => {
    setLayerVisibility(prev => ({ 
      ...prev, 
      'village-overlay': isVillageOverlayVisible,
      contours: isContourDisplayed
    }));
    
    if (mapInstance && isRasterDisplayed) {
      const layers = mapInstance.getAllLayers();
      const rasterLayer = layers.find(layer => layer.get('type') === 'raster');
      if (rasterLayer) {
        setLayerVisibility(prev => ({ ...prev, raster: rasterLayer.getVisible() }));
      }
    }
  }, [isVillageOverlayVisible, isRasterDisplayed, isContourDisplayed, mapInstance]);

  // Mouse move handler for coordinates
  useEffect(() => {
    if (!mapInstance) return;

    const handlePointerMove = (event: any) => {
      const coordinate = mapInstance.getEventCoordinate(event.originalEvent);
      if (coordinate) {
        // Transform from map projection to WGS84
        const lonLat = toLonLat(coordinate);
        setCoordinates({
          lon: parseFloat(lonLat[0].toFixed(6)),
          lat: parseFloat(lonLat[1].toFixed(6))
        });
      }
    };

    const handleMoveEnd = () => {
      const view = mapInstance.getView();
      const resolution = view.getResolution();
      if (resolution) {
        const units = view.getProjection().getUnits();
        const dpi = 25.4 / 0.28; // 90 dpi
        const mpu = METERS_PER_UNIT[units as keyof typeof METERS_PER_UNIT];
        const scaleValue = Math.round(resolution * mpu * 39.37 * dpi);
        setScale(`1:${scaleValue.toLocaleString()}`);
      }
    };

    mapInstance.on('pointermove', handlePointerMove);
    mapInstance.on('moveend', handleMoveEnd);
    
    // Initial scale calculation
    handleMoveEnd();

    return () => {
      mapInstance.un('pointermove', handlePointerMove);
      mapInstance.un('moveend', handleMoveEnd);
    };
  }, [mapInstance]);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (basemapPanelRef.current && !basemapPanelRef.current.contains(event.target as Node)) {
        setIsBasemapPanelOpen(false);
      }
      if (layerPanelRef.current && !layerPanelRef.current.contains(event.target as Node)) {
        setIsLayerPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleBaseMapChange = (baseMapKey: string) => {
    changeBaseMap(baseMapKey);
    setIsBasemapPanelOpen(false);
  };

  const toggleFullscreen = async () => {
    if (!mapRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await mapRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const handleLayerToggle = (layerId: string) => {
    if (!mapInstance) return;

    const newVisibility = !layerVisibility[layerId];
    setLayerVisibility(prev => ({ ...prev, [layerId]: newVisibility }));

    // Handle layer visibility in map
    const layers = mapInstance.getAllLayers();
    
    switch (layerId) {
      case 'raster':
        const rasterLayer = layers.find(layer => layer.get('type') === 'raster');
        if (rasterLayer) {
          rasterLayer.setVisible(newVisibility);
          console.log(`Raster layer visibility set to: ${newVisibility}`);
        }
        break;
      case 'contours':
        const contourLayer = layers.find(layer => layer.get('type') === 'contour');
        if (contourLayer) {
          contourLayer.setVisible(newVisibility);
          console.log(`Contour layer visibility set to: ${newVisibility}`);
        }
        break;
      case 'india':
        const indiaLayer = layers.find(layer => layer.get('name') === 'india');
        if (indiaLayer) {
          indiaLayer.setVisible(newVisibility);
          console.log(`India layer visibility set to: ${newVisibility}`);
        }
        break;
      case 'state':
        const stateLayer = layers.find(layer => layer.get('name') === 'state');
        if (stateLayer) {
          stateLayer.setVisible(newVisibility);
          console.log(`State layer visibility set to: ${newVisibility}`);
        }
        break;
      case 'district':
        const districtLayer = layers.find(layer => layer.get('name') === 'district');
        if (districtLayer) {
          districtLayer.setVisible(newVisibility);
          console.log(`District layer visibility set to: ${newVisibility}`);
        }
        break;
      case 'villages':
        const villageLayer = layers.find(layer => layer.get('name') === 'villages');
        if (villageLayer) {
          villageLayer.setVisible(newVisibility);
          console.log(`Villages layer visibility set to: ${newVisibility}`);
        }
        break;
      case 'wells':
        const wellLayer = layers.find(layer => layer.get('name') === 'wells');
        if (wellLayer) {
          wellLayer.setVisible(newVisibility);
          console.log(`Wells layer visibility set to: ${newVisibility}`);
        }
        break;
      case 'village-overlay':
        toggleVillageOverlay();
        console.log(`Village overlay toggled to: ${!isVillageOverlayVisible}`);
        break;
    }
  };

  const zoomToVillages = () => {
    if (zoomToCurrentExtent) {
      zoomToCurrentExtent();
    }
  };

  const zoomToRaster = () => {
    if (mapInstance && isRasterDisplayed) {
      const layers = mapInstance.getAllLayers();
      const rasterLayer = layers.find(layer => layer.get('type') === 'raster');
      if (rasterLayer) {
        const extent = rasterLayer.getExtent();
        if (extent) {
          mapInstance.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
          });
        }
      }
    }
  };

  const zoomToContours = () => {
    if (mapInstance && isContourDisplayed) {
      const layers = mapInstance.getAllLayers();
      const contourLayer = layers.find(layer => layer.get('type') === 'contour');
      if (contourLayer) {
        const source = contourLayer.getSource();
        if (source) {
          const extent = source.getExtent();
          if (extent) {
            mapInstance.getView().fit(extent, {
              padding: [50, 50, 50, 50],
              duration: 1000
            });
          }
        }
      }
    }
  };

  const removeContours = () => {
    if (removeContourLayer) {
      removeContourLayer();
      setLayerVisibility(prev => ({ ...prev, contours: false }));
    }
  };

  // Get current layer info
  const getCurrentLayers = (): LayerInfo[] => {
    const layers: LayerInfo[] = [
      { id: 'india', name: 'India Boundary', visible: layerVisibility.india, type: 'boundary' }
    ];

    if (selectedSubDistricts.length > 0) {
      layers.push({ id: 'villages', name: 'Villages', visible: layerVisibility.villages, type: 'boundary' });
      layers.push({ id: 'wells', name: 'Basin Wells', visible: layerVisibility.wells, type: 'wells' });
    }

    if (isRasterDisplayed) {
      layers.push({ id: 'raster', name: 'Raster Layer', visible: layerVisibility.raster, type: 'raster' });
      if (selectedSubDistricts.length > 0) {
        layers.push({ id: 'village-overlay', name: 'Village Overlay', visible: layerVisibility['village-overlay'], type: 'village-overlay' });
      }
    }

    if (isContourDisplayed) {
      layers.push({ id: 'contours', name: 'Contour Lines', visible: layerVisibility.contours, type: 'contour' });
    }

    return layers;
  };

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'boundary':
        return 'M4 4h16v16H4V4zm2 2v12h12V6H6z';
      case 'raster':
        return 'M3 3h18v18H3V3zm2 2v14h14V5H5z';
      case 'wells':
        return 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';
      case 'village-overlay':
        return 'M4 4h16v16H4V4zm2 2v12h12V6H6z';
      case 'contour':
        return 'M3 12h18m-9-9v18';
      default:
        return 'M4 4h16v16H4V4z';
    }
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-[600px]'}`}>
      <div className="relative w-full h-full" ref={mapRef} />
      
      {/* Basemap Selector */}
      <div className="absolute top-4 right-4 z-10" ref={basemapPanelRef}>
        <button
          onClick={() => setIsBasemapPanelOpen(!isBasemapPanelOpen)}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-3 shadow-lg transition-colors duration-200 flex items-center gap-2"
          title="Change Base Map"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={baseMapNames[selectedBaseMap]?.icon} />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {baseMapNames[selectedBaseMap]?.name}
          </span>
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isBasemapPanelOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isBasemapPanelOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-20">
            <div className="p-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 px-2">Select Base Map</h3>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(baseMapNames).map(([key, baseMap]) => (
                  <button
                    key={key}
                    onClick={() => handleBaseMapChange(key)}
                    className={`flex items-center gap-3 w-full p-3 rounded-md text-left transition-colors duration-200 ${
                      selectedBaseMap === key
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'hover:bg-gray-50 border border-transparent text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={baseMap.icon} />
                    </svg>
                    <span className="text-sm font-medium">{baseMap.name}</span>
                    {selectedBaseMap === key && (
                      <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Layer Control Panel */}
      <div className="absolute top-4 left-4 z-10" ref={layerPanelRef}>
        <button
          onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-3 shadow-lg transition-colors duration-200 flex items-center gap-2"
          title="Layer Controls"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Layers</span>
        </button>

        {isLayerPanelOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-300 rounded-lg shadow-xl z-20">
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Map Layers</h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getCurrentLayers().map((layer) => (
                  <div key={layer.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getLayerIcon(layer.type)} />
                      </svg>
                      <span className="text-sm text-gray-700">{layer.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Zoom to extent button */}
                      {(layer.type === 'boundary' || layer.type === 'village-overlay') && selectedSubDistricts.length > 0 && (
                        <button
                          onClick={zoomToVillages}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Zoom to extent"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      )}
                      {layer.type === 'raster' && (
                        <button
                          onClick={zoomToRaster}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Zoom to raster extent"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      )}
                      {layer.type === 'contour' && (
                        <>
                          <button
                            onClick={zoomToContours}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Zoom to contour extent"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={removeContours}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                            title="Remove contour layer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={layer.visible}
                          onChange={() => handleLayerToggle(layer.id)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-lg transition-colors duration-200"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isFullscreen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
            )}
          </svg>
        </button>
      </div>

      {/* Coordinates and Scale Display */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-3 shadow-lg">
        <div className="space-y-1 text-xs">
          {coordinates && (
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-700">
                {coordinates.lat.toFixed(6)}°, {coordinates.lon.toFixed(6)}°
              </span>
            </div>
          )}
          {scale && (
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-gray-700">Scale: {scale}</span>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-20 right-4 z-10 flex flex-col bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => {
            if (mapInstance) {
              const view = mapInstance.getView();
              const zoom = view.getZoom();
              if (zoom !== undefined) {
                view.animate({ zoom: zoom + 1, duration: 300 });
              }
            }
          }}
          className="p-2 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-200"
          title="Zoom In"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (mapInstance) {
              const view = mapInstance.getView();
              const zoom = view.getZoom();
              if (zoom !== undefined) {
                view.animate({ zoom: zoom - 1, duration: 300 });
              }
            }
          }}
          className="p-2 hover:bg-gray-50 transition-colors duration-200"
          title="Zoom Out"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MapComponent;