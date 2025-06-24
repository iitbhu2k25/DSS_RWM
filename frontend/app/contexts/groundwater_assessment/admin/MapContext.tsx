"use client";
import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  ReactNode,
  useState,
} from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import ImageLayer from "ol/layer/Image";
import VectorSource from "ol/source/Vector";
import ImageWMS from "ol/source/ImageWMS";
import GeoJSON from "ol/format/GeoJSON";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { fromLonLat, transformExtent } from "ol/proj";
import { useLocation } from "@/app/contexts/groundwater_assessment/admin/LocationContext";

// Base maps configuration
interface BaseMapDefinition {
  name: string;
  source: () => OSM | XYZ;
  icon: string;
}

const baseMaps: Record<string, BaseMapDefinition> = {
  osm: {
    name: "OpenStreetMap",
    source: () => new OSM({ crossOrigin: "anonymous" }),
    icon: "M9 20l-5.447-2.724a1 1 0 010-1.947L9 12.618l-5.447-2.724a1 1 0 010-1.947L9 5.236l-5.447-2.724a1 1 0 010-1.947L9 -1.146",
  },
  terrain: {
    name: "Stamen Terrain",
    source: () =>
      new XYZ({
        url: "https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg",
        maxZoom: 19,
        attributions:
          'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
        crossOrigin: "anonymous",
      }),
    icon: "M14 11l4-8H6l4 8H6l6 10 6-10h-4z",
  },
  cartoLight: {
    name: "Carto Light",
    source: () =>
      new XYZ({
        url: "https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        maxZoom: 19,
        attributions:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
        crossOrigin: "anonymous",
      }),
    icon:
      "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  },
  satellite: {
    name: "Satellite",
    source: () =>
      new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
        attributions:
          'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">ArcGIS</a>',
        crossOrigin: "anonymous",
      }),
    icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  },
  topo: {
    name: "Topographic",
    source: () =>
      new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
        attributions:
          'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
        crossOrigin: "anonymous",
      }),
    icon: "M7 14l5-5 5 5",
  },
};

interface ContourLayerOptions {
  name: string;
  parameter: string;
  interval: string;
  statistics?: any;
}

interface MapContextType {
  mapInstance: Map | null;
  selectedBaseMap: string;
  isRasterDisplayed: boolean;
  isVillageOverlayVisible: boolean;
  isContourDisplayed: boolean;
  setMapContainer: (container: HTMLDivElement | null) => void;
  changeBaseMap: (baseMapKey: string) => void;
  addRasterLayer: (layerName: string, geoserverUrl: string) => void;
  removeRasterLayer: () => void;
  addContourLayer: (geoJsonData: any, options: ContourLayerOptions) => void;
  removeContourLayer: () => void;
  zoomToCurrentExtent: () => void;
  getAllLayers: () => any[];
  toggleVillageOverlay: () => void;
}

interface MapProviderProps {
  children: ReactNode;
}

const MapContext = createContext<MapContextType>({
  mapInstance: null,
  selectedBaseMap: "osm",
  isRasterDisplayed: false,
  isVillageOverlayVisible: false,
  isContourDisplayed: false,
  setMapContainer: () => {},
  changeBaseMap: () => {},
  addRasterLayer: () => {},
  removeRasterLayer: () => {},
  addContourLayer: () => {},
  removeContourLayer: () => {},
  zoomToCurrentExtent: () => {},
  getAllLayers: () => [],
  toggleVillageOverlay: () => {},
});

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const mapInstanceRef = useRef<Map | null>(null);
  const baseLayerRef = useRef<TileLayer<any> | null>(null);
  const indiaLayerRef = useRef<VectorLayer<any> | null>(null);
  const stateLayerRef = useRef<VectorLayer<any> | null>(null);
  const districtLayerRef = useRef<VectorLayer<any> | null>(null);
  const subdistrictLayerRef = useRef<VectorLayer<any> | null>(null);
  const villageOverlayLayerRef = useRef<VectorLayer<any> | null>(null);
  const basinWellLayerRef = useRef<VectorLayer<any> | null>(null);
  const rasterLayerRef = useRef<ImageLayer<any> | null>(null);
  const contourLayerRef = useRef<VectorLayer<any> | null>(null); // NEW: Contour layer reference
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [selectedBaseMap, setSelectedBaseMap] = useState<string>("satellite");
  const [isRasterDisplayed, setIsRasterDisplayed] = useState<boolean>(false);
  const [isVillageOverlayVisible, setIsVillageOverlayVisible] = useState<boolean>(false);
  const [isContourDisplayed, setIsContourDisplayed] = useState<boolean>(false); // NEW: Contour display state
  const { selectedState, selectedDistricts, selectedSubDistricts } = useLocation();

  // Style for boundary layers (blue outline, hollow fill)
  const boundaryLayerStyle = new Style({
    stroke: new Stroke({
      color: "blue",
      width: 2,
    }),
  });

  // Lightweight style for village overlay when raster is displayed
  const villageOverlayStyle = new Style({
    stroke: new Stroke({
      color: "rgba(255, 255, 255, 0.8)", // Semi-transparent white outline
      width: 1,
    }),
    fill: new Fill({
      color: "rgba(255, 255, 255, 0.05)", // Very light fill
    }),
  });

  // Style for basin well layer (red dots)
  const basinWellStyle = new Style({
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({
        color: "red",
      }),
    }),
  });

  // NEW: Dynamic contour line styles based on elevation
  const createContourStyle = (elevation: number, minElevation: number, maxElevation: number) => {
    // Color gradient from blue (low) to red (high)
    const normalizedElevation = (elevation - minElevation) / (maxElevation - minElevation);
    const red = Math.round(255 * normalizedElevation);
    const blue = Math.round(255 * (1 - normalizedElevation));
    const green = Math.round(128 * (1 - Math.abs(normalizedElevation - 0.5) * 2));
    
    return new Style({
      stroke: new Stroke({
        color: `rgb(${red}, ${green}, ${blue})`,
        width: 2,
      }),
    });
  };

  // NEW: Function to add contour layer
  const addContourLayer = (geoJsonData: any, options: ContourLayerOptions) => {
    if (!mapInstanceRef.current) {
      console.warn("Cannot add contour layer: map not initialized");
      return;
    }

    console.log('Adding contour layer to map:', options);

    try {
      // Remove existing contour layer if present
      if (contourLayerRef.current) {
        console.log("Removing existing contour layer");
        mapInstanceRef.current.removeLayer(contourLayerRef.current);
        contourLayerRef.current = null;
      }

      if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
        console.warn("No contour features to display");
        return;
      }

      // Get elevation range for styling
      const elevations = geoJsonData.features.map((feature: any) => feature.properties.elevation);
      const minElevation = Math.min(...elevations);
      const maxElevation = Math.max(...elevations);

      console.log(`Contour elevation range: ${minElevation} to ${maxElevation}`);

      // Create vector source from GeoJSON
      const contourSource = new VectorSource({
        features: new GeoJSON().readFeatures(geoJsonData, {
          featureProjection: 'EPSG:3857', // Map projection
          dataProjection: 'EPSG:32644' // Data projection (UTM Zone 44N)
        }),
      });

      // Create contour layer with dynamic styling
      const contourLayer = new VectorLayer({
        source: contourSource,
        style: (feature: any) => {
          const elevation = feature.get('elevation') || feature.get('level');
          return createContourStyle(elevation, minElevation, maxElevation);
        },
        zIndex: 25, // Above raster but below UI elements
        opacity: 0.8,
        visible: true,
      });

      // Set layer properties for identification
      contourLayer.set('name', 'contours');
      contourLayer.set('type', 'contour');
      contourLayer.set('parameter', options.parameter);
      contourLayer.set('interval', options.interval);
      contourLayer.set('statistics', options.statistics);

      // Store reference
      contourLayerRef.current = contourLayer;

      // Add to map
      mapInstanceRef.current.addLayer(contourLayer);
      setIsContourDisplayed(true);

      // Force refresh
      mapInstanceRef.current.render();
      mapInstanceRef.current.getView().changed();

      console.log(`Contour layer successfully added with ${geoJsonData.features.length} features`);

      // Auto-zoom to contour extent
      setTimeout(() => {
        const extent = contourSource.getExtent();
        if (extent && mapInstanceRef.current) {
          mapInstanceRef.current.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000,
          });
        }
      }, 500);

    } catch (error) {
      console.error("Error adding contour layer:", error);
    }
  };

  // NEW: Function to remove contour layer
  const removeContourLayer = () => {
    if (!mapInstanceRef.current) return;

    if (contourLayerRef.current) {
      console.log("Removing contour layer");
      mapInstanceRef.current.removeLayer(contourLayerRef.current);
      contourLayerRef.current = null;
      setIsContourDisplayed(false);
      console.log("Contour layer removed successfully");
    }
  };

  // Initialize map when container is set
  useEffect(() => {
    if (!mapContainer || mapInstanceRef.current) return;

    const initialBaseLayer = new TileLayer({
      source: baseMaps.satellite.source(),
      zIndex: 0,
    });

    // Create India WFS layer
    const indiaLayer = new VectorLayer({
      source: new VectorSource({
        format: new GeoJSON(),
        url: "http://localhost:9091/geoserver/myworkspace/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=myworkspace:India&outputFormat=application/json",
      }),
      style: boundaryLayerStyle,
      zIndex: 1,
    });

    // Set layer names for identification
    initialBaseLayer.set('name', 'basemap');
    indiaLayer.set('name', 'india');

    baseLayerRef.current = initialBaseLayer;
    indiaLayerRef.current = indiaLayer;

    const map = new Map({
      target: mapContainer,
      layers: [initialBaseLayer, indiaLayer],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]), // Center of India
        zoom: 4,
      }),
    });

    mapInstanceRef.current = map;
    console.log("Map initialized with India WFS layer");

    // Error handling for WFS layer
    indiaLayer.getSource()?.on("featuresloaderror", (event: any) => {
      console.error("Error loading India WFS layer:", event);
    });
    indiaLayer.getSource()?.on("featuresloadend", () => {
      console.log("India WFS layer loaded successfully");
    });

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [mapContainer]);

  // Create WFS layer helper with error handling
  const createWFSLayer = (
    layerName: string,
    cqlFilter: string,
    zIndex: number,
    isBasinWell: boolean = false,
    isVillageOverlay: boolean = false
    ): VectorLayer<any> => {
    console.log(`Creating WFS layer: ${layerName} with filter: ${cqlFilter}`);

    let style = boundaryLayerStyle;
    if (isBasinWell) {
      style = basinWellStyle;
    } else if (isVillageOverlay) {
      style = villageOverlayStyle;
    }

    const layer = new VectorLayer({
      source: new VectorSource({
        format: new GeoJSON(),
        url: `http://localhost:9091/geoserver/myworkspace/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=myworkspace:${layerName}&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(cqlFilter)}`,
      }),
      style: style,
      zIndex,
      visible: isVillageOverlay ? isVillageOverlayVisible : true,
    });

    // Set layer name for identification
    if (isBasinWell) {
      layer.set('name', 'wells');
    } else if (isVillageOverlay) {
      layer.set('name', 'village-overlay');
    } else if (layerName === 'Village') {
      layer.set('name', 'villages');
    } else if (layerName === 'B_district') {
      layer.set('name', 'state');
    } else if (layerName === 'B_subdistrict') {
      layer.set('name', 'district');
    }

    // Add error handling
    const source = layer.getSource();
    source?.on("featuresloaderror", (event: any) => {
      console.error(`Error loading layer ${layerName}:`, event);
    });
    source?.on("featuresloadstart", () => {
      console.log(`Started loading layer ${layerName}`);
    });
    source?.on("featuresloadend", () => {
      console.log(`Successfully loaded layer ${layerName}`);
    });

    return layer;
  };

  // Function to get all layers
  const getAllLayers = () => {
    if (!mapInstanceRef.current) return [];
    return mapInstanceRef.current.getAllLayers();
  };

  // Function to toggle village overlay visibility
  const toggleVillageOverlay = () => {
    if (!mapInstanceRef.current || !villageOverlayLayerRef.current) {
      console.log("No village overlay layer to toggle");
      return;
    }

    const newVisibility = !isVillageOverlayVisible;
    setIsVillageOverlayVisible(newVisibility);
    villageOverlayLayerRef.current.setVisible(newVisibility);
    console.log(`Village overlay visibility set to: ${newVisibility}`);
  };

  // Function to zoom to current extent
  const zoomToCurrentExtent = () => {
    if (!mapInstanceRef.current) return;

    let targetLayer = null;

    // Priority: Contour > Village overlay (if visible and raster displayed) > Villages > Districts > State
    if (contourLayerRef.current && isContourDisplayed) {
      targetLayer = contourLayerRef.current;
    } else if (villageOverlayLayerRef.current && isRasterDisplayed && isVillageOverlayVisible) {
      targetLayer = villageOverlayLayerRef.current;
    } else if (subdistrictLayerRef.current) {
      targetLayer = subdistrictLayerRef.current;
    } else if (districtLayerRef.current) {
      targetLayer = districtLayerRef.current;
    } else if (stateLayerRef.current) {
      targetLayer = stateLayerRef.current;
    }

    if (targetLayer) {
      const source = targetLayer.getSource();
      if (source) {
        const extent = source.getExtent();
        if (extent && extent.some((coord: number) => isFinite(coord))) {
          mapInstanceRef.current.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: 14,
            duration: 1000,
          });
          console.log("Zoomed to current extent");
        } else {
          // Fallback: zoom based on selected areas
          if (selectedSubDistricts.length > 0) {
            zoomToFeature("Village", `SUBDIS_COD IN (${selectedSubDistricts.map(code => `'${code}'`).join(',')})`);
          } else if (selectedDistricts.length > 0) {
            zoomToFeature("B_district", `DISTRICT_C IN (${selectedDistricts.map(code => `'${code}'`).join(',')})`);
          } else if (selectedState) {
            const formattedStateCode = selectedState.toString().padStart(2, "0");
            zoomToFeature("B_district", `STATE_CODE = '${formattedStateCode}'`);
          }
        }
      }
    }
  };

  // Function to manage village layer visibility based on raster state
  const manageVillageLayerVisibility = () => {
    if (!mapInstanceRef.current) return;

    if (isRasterDisplayed) {
      // Remove main village layer if it exists
      if (subdistrictLayerRef.current) {
        mapInstanceRef.current.removeLayer(subdistrictLayerRef.current);
        subdistrictLayerRef.current = null;
        console.log("Removed main village layer due to raster display");
      }

      // Create lightweight village overlay if needed and subdistricts are selected
      if (selectedSubDistricts.length > 0 && !villageOverlayLayerRef.current) {
        const subdistrictCodes = selectedSubDistricts.map((code) => `'${code}'`).join(",");
        const cqlFilter = `SUBDIS_COD IN (${subdistrictCodes})`;

        console.log("Creating lightweight village overlay for raster view");
        const villageOverlay = createWFSLayer("Village", cqlFilter, 20, false, true);

        villageOverlayLayerRef.current = villageOverlay;
        mapInstanceRef.current.addLayer(villageOverlay);
        console.log("Added lightweight village overlay on top of raster");
      }
    } else {
      // Remove lightweight village overlay
      if (villageOverlayLayerRef.current) {
        mapInstanceRef.current.removeLayer(villageOverlayLayerRef.current);
        villageOverlayLayerRef.current = null;
        setIsVillageOverlayVisible(true); // Reset to default visibility
        console.log("Removed lightweight village overlay");
      }

      // Recreate main village layer if subdistricts are selected
      if (selectedSubDistricts.length > 0 && !subdistrictLayerRef.current) {
        const subdistrictCodes = selectedSubDistricts.map((code) => `'${code}'`).join(",");
        const cqlFilter = `SUBDIS_COD IN (${subdistrictCodes})`;

        console.log("Recreating main village layer");
        const subdistrictLayer = createWFSLayer("Village", cqlFilter, 4);
        subdistrictLayerRef.current = subdistrictLayer;
        mapInstanceRef.current.addLayer(subdistrictLayer);

        subdistrictLayer.getSource()?.on("featuresloaderror", (event: any) => {
          console.error("Subdistrict layer loading error:", event);
        });
        subdistrictLayer.getSource()?.on("featuresloadend", () => {
          console.log("Subdistrict layer loaded successfully");
          setTimeout(() => {
            zoomToFeature("Village", cqlFilter);
          }, 500);
        });
      }
    }
  };

  // Enhanced addRasterLayer function
  const addRasterLayer = (layerName: string, geoserverUrl: string) => {
    if (!mapInstanceRef.current) {
      console.warn("Cannot add raster layer: map not initialized");
      return;
    }

    console.log(`Adding colored raster layer: ${layerName} from ${geoserverUrl}`);

    try {
      // Remove existing raster layer if present
      if (rasterLayerRef.current) {
        console.log("Removing existing raster layer");
        mapInstanceRef.current.removeLayer(rasterLayerRef.current);
        rasterLayerRef.current = null;
      }

      // Try to add colored version first
      const coloredLayerName = `${layerName}_colored`;
      console.log(`Attempting to load colored layer: ${coloredLayerName}`);

      // Create ImageWMS source for better raster display
      const imageWmsSource = new ImageWMS({
        url: geoserverUrl,
        params: {
          LAYERS: `myworkspace:${coloredLayerName}`,
          FORMAT: "image/png",
          TRANSPARENT: true,
          VERSION: "1.1.1",
          SRS: "EPSG:3857",
        },
        serverType: "geoserver",
        crossOrigin: "anonymous",
        ratio: 1,
      });

      // Create raster layer using ImageLayer for better performance with colored rasters
      const rasterLayer = new ImageLayer({
        source: imageWmsSource,
        zIndex: 15,
        opacity: 0.85,
        visible: true,
      });

      // Set layer name and type for identification
      rasterLayer.set('name', 'raster');
      rasterLayer.set('type', 'raster');

      // Add event listeners for colored layer
      imageWmsSource.on('imageloaderror', (event: any) => {
        console.error(`ImageWMS error for colored layer ${coloredLayerName}:`, event);
        console.log("Falling back to single-band layer...");

        // Fallback to single-band layer if colored version fails
        addSingleBandRasterLayer(layerName, geoserverUrl);
      });

      imageWmsSource.on('imageloadstart', () => {
        console.log(`Starting to load colored raster image for ${coloredLayerName}`);
      });

      imageWmsSource.on('imageloadend', () => {
        console.log(`Colored raster image loaded successfully for ${coloredLayerName}`);
        // Set raster displayed state and manage village layer
        setIsRasterDisplayed(true);

        // Auto-zoom to raster extent after loading
        setTimeout(() => {
          const extent = rasterLayer.getExtent();
          if (extent && mapInstanceRef.current) {
            mapInstanceRef.current.getView().fit(extent, {
              padding: [50, 50, 50, 50],
              duration: 1000,
            });
          }
        }, 500);
      });

      // Store reference
      rasterLayerRef.current = rasterLayer;

      // Add to map
      mapInstanceRef.current.addLayer(rasterLayer);

      // Force refresh
      mapInstanceRef.current.render();
      mapInstanceRef.current.getView().changed();

      console.log(`Colored raster layer successfully added: ${coloredLayerName}`);

    } catch (error) {
      console.error("Error in addRasterLayer:", error);
      // Fallback to single-band layer
      addSingleBandRasterLayer(layerName, geoserverUrl);
    }
  };

  // Function to remove raster layer
  const removeRasterLayer = () => {
    if (!mapInstanceRef.current) return;

    if (rasterLayerRef.current) {
      console.log("Removing raster layer");
      mapInstanceRef.current.removeLayer(rasterLayerRef.current);
      rasterLayerRef.current = null;
      setIsRasterDisplayed(false);
      console.log("Raster layer removed successfully");
    }
  };

  // Fallback function for single-band raster
  const addSingleBandRasterLayer = (layerName: string, geoserverUrl: string) => {
    if (!mapInstanceRef.current) return;

    console.log(`Adding single-band raster layer as fallback: ${layerName}`);

    try {
      // Remove existing raster layer if present
      if (rasterLayerRef.current) {
        mapInstanceRef.current.removeLayer(rasterLayerRef.current);
        rasterLayerRef.current = null;
      }

      // Create ImageWMS source for single-band raster
      const imageWmsSource = new ImageWMS({
        url: geoserverUrl,
        params: {
          LAYERS: `myworkspace:${layerName}`,
          FORMAT: "image/png",
          TRANSPARENT: true,
          VERSION: "1.1.1",
          SRS: "EPSG:3857",
          STYLES: "",
        },
        serverType: "geoserver",
        crossOrigin: "anonymous",
        ratio: 1,
      });

      // Create raster layer
      const rasterLayer = new ImageLayer({
        source: imageWmsSource,
        zIndex: 15,
        opacity: 0.8,
        visible: true,
      });

      // Set layer name and type for identification
      rasterLayer.set('name', 'raster');
      rasterLayer.set('type', 'raster');

      // Add event listeners
      imageWmsSource.on('imageloaderror', (event: any) => {
        console.error(`ImageWMS error for single-band layer ${layerName}:`, event);
        console.error('Failed image URL:', event.image?.src);
      });

      imageWmsSource.on('imageloadstart', () => {
        console.log(`Starting to load single-band raster image for ${layerName}`);
      });

      imageWmsSource.on('imageloadend', () => {
        console.log(`Single-band raster image loaded successfully for ${layerName}`);
        setIsRasterDisplayed(true);

        // Auto-zoom to raster extent after loading
        setTimeout(() => {
          const extent = rasterLayer.getExtent();
          if (extent && mapInstanceRef.current) {
            mapInstanceRef.current.getView().fit(extent, {
              padding: [50, 50, 50, 50],
              duration: 1000,
            });
          }
        }, 500);
      });

      // Store reference
      rasterLayerRef.current = rasterLayer;

      // Add to map
      mapInstanceRef.current.addLayer(rasterLayer);

      // Force refresh
      mapInstanceRef.current.render();
      mapInstanceRef.current.getView().changed();

      console.log(`Single-band raster layer successfully added: ${layerName}`);

    } catch (error) {
      console.error("Error in addSingleBandRasterLayer:", error);
    }
  };

  // Effect to manage village layer visibility when raster state or subdistricts change
  useEffect(() => {
    manageVillageLayerVisibility();
  }, [isRasterDisplayed, selectedSubDistricts]);

  // Effect to update village overlay visibility
  useEffect(() => {
    if (villageOverlayLayerRef.current) {
      villageOverlayLayerRef.current.setVisible(isVillageOverlayVisible);
      console.log(`Village overlay visibility updated to: ${isVillageOverlayVisible}`);
    }
  }, [isVillageOverlayVisible]);

  // Zoom to feature helper
  const zoomToFeature = async (layerName: string, cqlFilter: string) => {
    if (!mapInstanceRef.current) return;

    try {
      console.log(`Attempting to zoom to ${layerName} with filter: ${cqlFilter}`);

      const wfsUrl = `http://localhost:9091/geoserver/myworkspace/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=myworkspace:${layerName}&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(cqlFilter)}`;

      const response = await fetch(wfsUrl);
      if (!response.ok) {
        throw new Error(`WFS request failed for ${layerName}: ${response.status}`);
      }

      const data = await response.json();
      console.log(`WFS response for ${layerName}:`, data);

      if (data.features && data.features.length > 0) {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        let validCoords = false;

        data.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.coordinates) {
            const coords = feature.geometry.coordinates;
            const geometryType = feature.geometry.type.toLowerCase();

            const processCoords = (coordArray: any, depth: number = 0) => {
              if (Array.isArray(coordArray)) {
                coordArray.forEach((item: any) => {
                  if (Array.isArray(item)) {
                    if (
                      typeof item[0] === "number" &&
                      typeof item[1] === "number" &&
                      (geometryType.includes("point") || depth > 0)
                    ) {
                      const x = item[0];
                      const y = item[1];
                      if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        validCoords = true;
                      }
                    } else {
                      processCoords(item, depth + 1);
                    }
                  }
                });
              }
            };

            processCoords(coords);
          }
        });

        if (validCoords && minX !== Infinity) {
          console.log(`Calculated bounds for ${layerName}: [${minX}, ${minY}, ${maxX}, ${maxY}]`);

          // Transform extent to map projection (EPSG:3857)
          const extent = transformExtent(
            [minX, minY, maxX, maxY],
            "EPSG:4326",
            "EPSG:3857"
          );

          const view = mapInstanceRef.current.getView();
          view.fit(extent, {
            padding: [50, 50, 50, 50],
            maxZoom: layerName === "Village" ? 14 : layerName === "B_district" ? 10 : 8,
            duration: 1000,
          });

          console.log(`Successfully zoomed to ${layerName}`);
        } else {
          console.warn(`No valid coordinates found for ${layerName}`);
        }
      } else {
        console.warn(`No features found for ${layerName} with filter: ${cqlFilter}`);
      }
    } catch (error) {
      console.error(`Error zooming to ${layerName}:`, error);
    }
  };

  // Update state layer
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedState) {
      if (stateLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(stateLayerRef.current);
        stateLayerRef.current = null;
      }
      return;
    }

    if (stateLayerRef.current) {
      mapInstanceRef.current.removeLayer(stateLayerRef.current);
    }

    const formattedStateCode = selectedState.toString().padStart(2, "0");
    const cqlFilter = `STATE_CODE = '${formattedStateCode}'`;
    const stateLayer = createWFSLayer("B_district", cqlFilter, 2);

    stateLayerRef.current = stateLayer;
    mapInstanceRef.current.addLayer(stateLayer);

    zoomToFeature("B_district", cqlFilter);

    console.log("Added state layer with filter:", cqlFilter);
  }, [selectedState]);

  // Update district layer
  useEffect(() => {
    if (!mapInstanceRef.current || selectedDistricts.length === 0) {
      if (districtLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(districtLayerRef.current);
        districtLayerRef.current = null;
      }
      return;
    }

    if (stateLayerRef.current) {
      mapInstanceRef.current.removeLayer(stateLayerRef.current);
      stateLayerRef.current = null;
    }

    if (districtLayerRef.current) {
      mapInstanceRef.current.removeLayer(districtLayerRef.current);
    }

    try {
      const districtCodes = selectedDistricts.map((code) => `'${code}'`).join(",");
      const cqlFilter = `DISTRICT_C IN (${districtCodes})`;
      const districtLayer = createWFSLayer("B_subdistrict", cqlFilter, 3);

      districtLayerRef.current = districtLayer;
      mapInstanceRef.current.addLayer(districtLayer);

      zoomToFeature("B_district", cqlFilter);

      console.log("Added district layer with filter:", cqlFilter);
    } catch (error) {
      console.error("Error creating district layer:", error);
    }
  }, [selectedDistricts]);

  // Update subdistrict and basin well layers
  useEffect(() => {
    if (!mapInstanceRef.current || selectedSubDistricts.length === 0) {
      if (subdistrictLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(subdistrictLayerRef.current);
        subdistrictLayerRef.current = null;
      }
      if (basinWellLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(basinWellLayerRef.current);
        basinWellLayerRef.current = null;
      }
      if (villageOverlayLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(villageOverlayLayerRef.current);
        villageOverlayLayerRef.current = null;
        setIsVillageOverlayVisible(true); // Reset to default visibility
      }
      return;
    }

    if (districtLayerRef.current) {
      mapInstanceRef.current.removeLayer(districtLayerRef.current);
      districtLayerRef.current = null;
    }

    if (subdistrictLayerRef.current) {
      mapInstanceRef.current.removeLayer(subdistrictLayerRef.current);
    }

    if (basinWellLayerRef.current) {
      mapInstanceRef.current.removeLayer(basinWellLayerRef.current);
    }

    try {
      const subdistrictCodes = selectedSubDistricts.map((code) => `'${code}'`).join(",");
      const cqlFilter = `SUBDIS_COD IN (${subdistrictCodes})`;

      console.log("Creating subdistrict layer with filter:", cqlFilter);

      const subdistrictLayer = createWFSLayer("Village", cqlFilter, 4);

      subdistrictLayer.getSource()?.on("featuresloaderror", (event: any) => {
        console.error("Subdistrict layer loading error:", event);
      });
      subdistrictLayer.getSource()?.on("featuresloadend", () => {
        console.log("Subdistrict layer loaded successfully");
        // Auto-zoom to villages when loaded
        setTimeout(() => {
          zoomToFeature("Village", cqlFilter);
        }, 500);
      });

      subdistrictLayerRef.current = subdistrictLayer;
      mapInstanceRef.current.addLayer(subdistrictLayer);

      console.log("Creating basin well layer with filter:", cqlFilter);
      const basinWellLayer = createWFSLayer("basin_well", cqlFilter, 5, true);

      basinWellLayer.getSource()?.on("featuresloaderror", (event: any) => {
        console.error("Basin well layer loading error:", event);
      });
      basinWellLayer.getSource()?.on("featuresloadend", () => {
        console.log("Basin well layer loaded successfully");
      });

      basinWellLayerRef.current = basinWellLayer;
      mapInstanceRef.current.addLayer(basinWellLayer);

      // Manage village layer visibility if raster is displayed
      manageVillageLayerVisibility();
    } catch (error) {
      console.error("Error creating subdistrict or basin well layer:", error);
    }
  }, [selectedSubDistricts]);

  // Change base map
  const changeBaseMap = (baseMapKey: string) => {
    if (!mapInstanceRef.current || !baseLayerRef.current) {
      console.warn("Cannot change basemap: map or base layer not initialized");
      return;
    }

    try {
      mapInstanceRef.current.removeLayer(baseLayerRef.current);

      const newBaseLayer = new TileLayer({
        source: baseMaps[baseMapKey].source(),
        zIndex: 0,
      });

      newBaseLayer.set('name', 'basemap');
      baseLayerRef.current = newBaseLayer;
      mapInstanceRef.current.getLayers().insertAt(0, newBaseLayer);
      setSelectedBaseMap(baseMapKey);

      console.log(`Changed basemap to: ${baseMapKey}`);
    } catch (error) {
      console.error("Error changing basemap:", error);
    }
  };

  const contextValue: MapContextType = {
    mapInstance: mapInstanceRef.current,
    selectedBaseMap,
    isRasterDisplayed,
    isVillageOverlayVisible,
    isContourDisplayed,
    setMapContainer,
    changeBaseMap,
    addRasterLayer,
    removeRasterLayer,
    addContourLayer,
    removeContourLayer,
    zoomToCurrentExtent,
    getAllLayers,
    toggleVillageOverlay,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget("");
        mapInstanceRef.current = null;
      }
      baseLayerRef.current = null;
      indiaLayerRef.current = null;
      stateLayerRef.current = null;
      districtLayerRef.current = null;
      subdistrictLayerRef.current = null;
      villageOverlayLayerRef.current = null;
      basinWellLayerRef.current = null;
      rasterLayerRef.current = null;
      contourLayerRef.current = null;
    };
  }, []);

  return <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>;
  };

  export const useMap = (): MapContextType => {
    const context = useContext(MapContext);
    if (context === undefined) {
      throw new Error("useMap must be used within a MapProvider");
    }
    return context;
  };