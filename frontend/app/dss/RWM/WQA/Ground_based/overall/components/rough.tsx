'use client';
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import MapComponent from './omap';
import annotationPlugin from 'chartjs-plugin-annotation'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin);

interface WaterQualityData {
  location?: string;
  sampling?: string;
  latitude?: number;
  longitude?: number;
  ph?: string | number;
  tds?: string | number;
  ec?: string | number;
  temperature?: string | number;
  turbidity?: string | number;
  do?: string | number;
  orp?: string | number;
  tss?: string | number;
  cod?: string | number;
  bod?: string | number;
  ts?: string | number;
  chloride?: string | number;
  nitrate?: string | number;
  hardness?: string | number;
  faecal_coliform?: string | number;
  total_coliform?: string | number;
}


interface LocationItem {
  id: number;
  name: string;
}

interface District extends LocationItem {
  stateId: number;
}

interface SubDistrict extends LocationItem {
  districtId: number;
  districtName: string;// Added for sorting/grouping
}







const Dashboard = () => {
  const [csvData, setCsvData] = useState<WaterQualityData[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<string>('ph');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subDistricts, setSubDistricts] = useState<SubDistrict[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedSubDistricts, setSelectedSubDistricts] = useState<string[]>([]);

  const attributes = [
    'ph', 'tds', 'ec', 'temperature', 'turbidity', 'do', 'orp', 'tss', 'cod',
    'bod', 'ts', 'chloride', 'nitrate', 'hardness', 'faecal_coliform', 'total_coliform'
  ];

  const attributeLabels: Record<string, string> = {
    ph: 'pH',
    tds: 'TDS (ppm)',
    ec: 'EC (μS/cm)',
    temperature: 'Temperature (°C)',
    turbidity: 'Turbidity (FNU)',
    do: 'DO (mg/L)',
    orp: 'ORP',
    tss: 'TSS (mg/l)',
    cod: 'COD',
    bod: 'BOD (mg/l)',
    ts: 'TS (mg/l)',
    chloride: 'Chloride (mg/l)',
    nitrate: 'Nitrate',
    hardness: 'Hardness (mg/l)',
    faecal_coliform: 'Faecal Coliform (CFU/100 mL)',
    total_coliform: 'Total Coliform (CFU/100 mL)',
  };

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://172.29.192.1:9000';




  useEffect(() => {
    const fetchStates = async (): Promise<void> => {
      try {
        const response = await fetch('/basics/state/');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response data:', data);
        const stateData: LocationItem[] = data.map((state: any) => ({
          id: state.state_code,
          name: state.state_name
        }));

        setStates(stateData);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      const fetchDistricts = async (): Promise<void> => {
        console.log('Fetching districts for state:', selectedState);
        try {
          const response = await fetch('/basics/district/',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ state_code: selectedState }),
            }
          );
          const data = await response.json();
          console.log('API response data:', data);
          const districtData: LocationItem[] = data.map((district: any) => ({
            id: district.district_code,
            name: district.district_name
          }));
          const mappedDistricts: District[] = districtData.map(district => ({
            ...district,
            stateId: parseInt(selectedState)
          }));

          // Sort districts alphabetically
          const sortedDistricts = [...mappedDistricts].sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          setDistricts(sortedDistricts);
          setSelectedDistricts([]);
        } catch (error) {
          console.error('Error fetching districts:', error);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
      setSelectedDistricts([]);
    }
    // Reset dependent dropdowns
    setSubDistricts([]);
    setSelectedSubDistricts([]);

  }, [selectedState]);

  // Fetch sub-districts when districts change
  // Fetch sub-districts when districts change
  useEffect(() => {
    if (selectedDistricts.length > 0) {
      const fetchSubDistricts = async (): Promise<void> => {
        try {
          const response = await fetch('/basics/subdistrict/',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ district_code: selectedDistricts }),
            }
          );
          const data = await response.json();
          console.log('API response data:', data);

          // Create a map of district IDs to names for reference
          const districtMap = new Map(
            districts.map(district => [district.id.toString(), district.name])
          );

          const subDistrictData: SubDistrict[] = data.map((subDistrict: any) => {
            const districtId = subDistrict.district_code.toString();
            return {
              id: subDistrict.subdistrict_code,
              name: subDistrict.subdistrict_name,
              districtId: parseInt(districtId),
              districtName: districtMap.get(districtId) || 'Unknown District'
            };
          });

          // Sort sub-districts first by district name, then by sub-district name
          const sortedSubDistricts = [...subDistrictData].sort((a, b) => {
            const districtComparison = a.districtName.localeCompare(b.districtName);
            if (districtComparison !== 0) {
              return districtComparison;
            }
            return a.name.localeCompare(b.name);
          });

          setSubDistricts(sortedSubDistricts);
          setSelectedSubDistricts([]);
        } catch (error) {
          console.error('Error fetching sub-districts:', error);
        }
      };
      fetchSubDistricts();
    } else {
      setSubDistricts([]);
      setSelectedSubDistricts([]);
    }
    // Reset dependent dropdowns

  }, [selectedDistricts, districts]);

 const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    if (!selectionsLocked) {
      const stateCode = e.target.value;
      setSelectedState(stateCode);

      // Notify parent component about the state change
      if (onStateChange) {
        onStateChange(stateCode);
      }
    }
  };







  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BACKEND_URL}/rwm/water_quality/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCsvData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch water quality data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const parseValue = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      const cleaned = value.replace(',', '');
      return parseFloat(cleaned) || 0;
    }
    return parseFloat(value.toString()) || 0;
  };

  // Group data by base sampling location and type (Drain, Upstream, Downstream)
  const groupDataByLocation = () => {
    const grouped: { [key: string]: WaterQualityData[] } = {};
    csvData.forEach((row) => {
      if (!row.sampling || !row.location) return;
      const locationKey = row.sampling || 'Unknown';
      if (!grouped[locationKey]) {
        grouped[locationKey] = [];
      }
      grouped[locationKey].push(row);
    });
    return grouped;
  };

  const groupedData = groupDataByLocation();

  // Define colors for each type
  const typeColors: Record<string, string> = {
    Drain: 'rgba(255, 99, 132, 0.6)', // Red
    Upstream: 'rgba(54, 162, 235, 0.6)', // Blue
    Downstream: 'rgba(75, 192, 192, 0.6)', // Teal
    'Below Bridge': 'rgba(255, 206, 86, 0.6)', // Yellow
    // 'Below Bridge': 'rgba(255, 206, 86, 0.6)', // Yellow
    // 'Geetanagar Hukalganj Opposite of dehlwariya': 'rgba(153, 102, 255, 0.6)', // Purple
  };

  const borderColors: Record<string, string> = {
    Drain: 'rgba(255, 99, 132, 1)',
    Upstream: 'rgba(54, 162, 235, 1)',
    Downstream: 'rgba(75, 192, 192, 1)',
    'Below Bridge': 'rgba(255, 206, 86, 0.6)', // Yellow
    // 'Below Bridge': 'rgba(255, 206, 86, 1)',
    // 'Geetanagar Hukalganj Opposite of dehlwariya': 'rgba(153, 102, 255, 1)',
  };

  // Prepare chart data with grouped labels and datasets
  // const chartData = {
  //   labels: csvData.map((row) => row.sampling || 'Unknown'),
  //   datasets: Object.keys(typeColors).map((type) => ({
  //     label: type,
  //     data: Object.keys(groupedData).flatMap((location) => {
  //       const values = groupedData[location].map((row) => {
  //         if (!typeColors[row.location!]) {
  //           console.warn(`No color defined for location type: ${row.location}`);
  //         }
  //         return row.location === type ? parseValue(row[selectedAttribute as keyof WaterQualityData]) : null;
  //       });
  //       return [...values, 0];
  //     }),
  //     backgroundColor: typeColors[type],
  //     borderColor: borderColors[type],
  //     borderWidth: 2,
  //     barPercentage: 0.6,
  //     categoryPercentage: 0.9,
  //     skipNull: true, // Skip null values to avoid rendering empty bars
  //   })),
  // };



//   const createGroupedChartData = () => {
//   // Get unique sampling locations
//   const uniqueSamplingLocations = [...new Set(csvData.map(row => row.sampling))].filter(Boolean);
  
//   return {
//     labels: uniqueSamplingLocations,
//     datasets: Object.keys(typeColors).map((type) => ({
//       label: type,
//       data: uniqueSamplingLocations.map(samplingLocation => {
//         // Find the row that matches both sampling location and type
//         const matchingRow = csvData.find(row => 
//           row.sampling === samplingLocation && row.location === type
//         );
//         return matchingRow ? parseValue(matchingRow[selectedAttribute as keyof WaterQualityData]) : null;
//       }),
//       backgroundColor: typeColors[type],
//       borderColor: borderColors[type],
//       borderWidth: 2,
//       barPercentage: 0.6,
//       categoryPercentage: 1,
//       skipNull: true,
//     })),
//   };
// };

// // Then use it like:
// const chartData = createGroupedChartData();


const createChartDataWithCustomSpacing = (spacingWidth = 2) => {
  // Group data by sampling location
  const groupedBySampling = csvData.reduce((acc, row) => {
    const sampling = row.sampling || 'Unknown';
    if (!acc[sampling]) {
      acc[sampling] = [];
    }
    acc[sampling].push(row);
    return acc;
  }, {} as Record<string, WaterQualityData[]>);

  const samplingLocations = Object.keys(groupedBySampling);
  const labels: string[] = [];
  
  // Create labels with custom spacing
  samplingLocations.forEach((sampling, index) => {
    labels.push(sampling);
    // Add multiple empty labels for wider spacing (except after the last group)
    if (index < samplingLocations.length - 1) {
      for (let i = 0; i < spacingWidth; i++) {
        labels.push('');
      }
    }
  });

  // Create datasets
  const datasets = Object.keys(typeColors).map((type) => ({
    label: type,
    data: labels.map(label => {
      if (label === '') return null; // No data for spacing labels
      
      const matchingRow = groupedBySampling[label]?.find(row => row.location === type);
      return matchingRow ? parseValue(matchingRow[selectedAttribute as keyof WaterQualityData]) : null;
    }),
    backgroundColor: typeColors[type],
    borderColor: borderColors[type],
    borderWidth: 2,
    barPercentage: 0.8,
    categoryPercentage: 0.9,
    skipNull: true,
  }));

  return { labels, datasets };
};

// Usage:
const chartData = createChartDataWithCustomSpacing(0); 







  // const chartData = {
  //   labels: csvData.map((row) => row.sampling || 'Unknown'),
  //   datasets: Object.keys(typeColors).map((type) => ({
  //     label: type,
  //     data: csvData.map((row) => {
  //       // Return the value if this row matches the current type, otherwise null
  //       return row.location === type ? parseValue(row[selectedAttribute as keyof WaterQualityData]) : null;
  //     }),
  //     backgroundColor: typeColors[type],
  //     borderColor: borderColors[type],
  //     borderWidth: 2,
  //     barPercentage: 0.6,
  //     categoryPercentage: 0.9,
  //     skipNull: true,
  //   })),
  // };





  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: attributeLabels[selectedAttribute] },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Value' } },
      x: {
        title: { display: true, text: 'Sampling Location' },
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
    // annotation: {
    //   annotations: Object.keys(groupedData).map((location, index) => ({
    //     type: 'box',
    //     xMin: index * (groupedData[location].length + 1) - 0.5,
    //     xMax: (index + 1) * (groupedData[location].length + 1) - 0.5,
    //     backgroundColor: 'rgba(0, 0, 0, 0.05)',
    //     borderWidth: 0,
    //   })),
    // },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading water quality data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-full p-4 overflow-y-auto">

        <select
          className="mb-4 p-2 border rounded"
          value={selectedAttribute}
          onChange={(e) => setSelectedAttribute(e.target.value)}
        >
          {attributes.map((attr) => (
            <option key={attr} value={attr}>
              {attributeLabels[attr]}
            </option>
          ))}
        </select>
        <div className="h-180 w-2000">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;



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
        console.error('Error fetching river buffer GeoJSON:', error);
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
        console.error('Error fetching river buffer GeoJSON:', error);
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










    // Add this debugging code to your useEffect where you handle selectedLayer

    useEffect(() => {
      if (!mapInstanceRef.current || !selectedLayer) return;

      console.log('=== WMS LAYER DEBUG ===');
      console.log('Selected layer:', selectedLayer);

      // Remove existing WMS layer
      if (wmsLayerRef.current) {
        console.log('Removing existing WMS layer');
        mapInstanceRef.current.removeLayer(wmsLayerRef.current);
        wmsLayerRef.current = null;
      }

      // Trigger interpolation and add new WMS layer
      const fetchInterpolatedLayer = async () => {
        try {
          const url = `http://172.29.192.1:9000/rwm/interpolate/${encodeURIComponent(selectedLayer)}/`;
          console.log('Fetching from URL:', url);

          const response = await fetch(url);
          console.log('Response status:', response.status);

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const data = await response.json();
          console.log('Response data:', data);

          if (data.status === 'success') {
            console.log('Creating WMS layer with:', {
              wms_url: data.wms_url,
              layer: data.layer
            });

            // Test the WMS URL first
            const testUrl = `${data.wms_url}?service=WMS&version=1.1.0&request=GetCapabilities`;
            console.log('Testing WMS capabilities:', testUrl);

            try {
              const testResponse = await fetch(testUrl);
              console.log('WMS capabilities response:', testResponse.status);
            } catch (testError) {
              console.error('WMS capabilities test failed:', testError);
            }

            const wmsLayer = new TileLayer({
              source: new TileWMS({
                url: data.wms_url,
                params: {
                  LAYERS: data.layer,
                  TILED: true,
                  VERSION: '1.1.0',
                  FORMAT: 'image/png',
                  TRANSPARENT: true
                },
                serverType: 'geoserver',
                // Add error handling
                imageLoadFunction: (image: any, src: string) => {
                  console.log('Loading WMS tile:', src);
                  (image.getImage() as HTMLImageElement).onload = () => {
                    console.log('WMS tile loaded successfully');
                  };
                  (image.getImage() as HTMLImageElement).onerror = (error) => {
                    console.error('WMS tile failed to load:', error, 'URL:', src);
                  };
                  (image.getImage() as HTMLImageElement).src = src;
                }
              }),
              opacity: 0.7,
              visible: true
            });

            // Add event listeners to the layer
            wmsLayer.getSource()?.on('tileloaderror', (event) => {
              console.error('Tile load error:', event);
            });

            wmsLayer.getSource()?.on('tileloadstart', (event) => {
              console.log('Tile load start:', event);
            });

            wmsLayer.getSource()?.on('tileloadend', (event) => {
              console.log('Tile load end:', event);
            });

            wmsLayerRef.current = wmsLayer;
            mapInstanceRef.current?.addLayer(wmsLayer);

            console.log('WMS layer added to map');
            console.log('Map layers count:', mapInstanceRef.current?.getLayers().getLength());

            // Force a refresh
            mapInstanceRef.current?.render();

            setLayers((prev) => {
              if (!prev.some((l) => l.name === selectedLayer)) {
                return [...prev, { name: selectedLayer, wms_url: data.wms_url, layer: data.layer }];
              }
              return prev;
            });
          } else {
            console.error('Interpolation failed:', data);
          }
        } catch (error) {
          console.error('Error fetching interpolated layer:', error);
        }
      };

      if (selectedLayer) {
        fetchInterpolatedLayer();
      }
    }, [selectedLayer, backendUrl]);











  // useEffect(() => {
  //   if (!mapInstanceRef.current || !selectedLayer) return;

  //   // Remove existing WMS layer
  //   if (wmsLayerRef.current) {
  //     mapInstanceRef.current.removeLayer(wmsLayerRef.current);
  //     wmsLayerRef.current = null;
  //   }


    // Trigger interpolation and add new WMS layer
    //   const fetchInterpolatedLayer = async () => {
    //     try {
    //       const response = await fetch(`http://172.29.192.1:9000/rwm/interpolate/`);
    //       if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    //       const data = await response.json();
    //       if (data.status === 'success') {
    //         const wmsLayer = new TileLayer({
    //           source: new TileWMS({
    //             url: data.wms_url,
    //             params: { LAYERS: data.layer, TILED: true },
    //             serverType: 'geoserver',
    //           }),
    //           opacity: 0.7,
    //         });
    //         wmsLayerRef.current = wmsLayer;
    //         mapInstanceRef.current?.addLayer(wmsLayer);
    //         setLayers((prev) => {
    //           if (!prev.some((l) => l.name === selectedLayer)) {
    //             return [...prev, { name: selectedLayer, wms_url: data.wms_url, layer: data.layer }];
    //           }
    //           return prev;
    //         });
    //       }
    //     } catch (error) {
    //       console.error('Error fetching interpolated layer:', error);
    //     }
    //   };

    //   if (selectedLayer) {
    //     fetchInterpolatedLayer();
    //   }
    // }, [selectedLayer, backendUrl]);

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
        <div className="absolute top-4 left-50 z-10">
          <select
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(e.target.value)}
            className="p-2 border rounded bg-white shadow-md"
          >
            <option value="">Select Parameter</option>
            {attributes.map((attr) => (
              <option key={attr} value={attr}>
                {attr}
              </option>
            ))}
          </select>
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





        backgroundColor: typeColors[type],
        borderColor: borderColors[type],
        borderWidth: 2,
        barPercentage: 0.8,













  'use client';
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import MapComponent from './omap';
import annotationPlugin from 'chartjs-plugin-annotation'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin);

interface WaterQualityData {
  location?: string;
  sampling?: string;
  latitude?: number;
  longitude?: number;
  ph?: string | number;
  tds?: string | number;
  ec?: string | number;
  temperature?: string | number;
  turbidity?: string | number;
  do?: string | number;
  orp?: string | number;
  tss?: string | number;
  cod?: string | number;
  bod?: string | number;
  ts?: string | number;
  chloride?: string | number;
  nitrate?: string | number;
  hardness?: string | number;
  faecal_coliform?: string | number;
  total_coliform?: string | number;
  subdistrict_code?: string | number;
  sub_district?: string; // Added sub-district name field
  status?: string;
}

interface LocationItem {
  id: number;
  name: string;
}

interface District extends LocationItem {
  stateId: number;
}

interface Sub_District extends LocationItem {
  districtId: number;
  districtName: string;
}

const Dashboard = () => {
  const [csvData, setCsvData] = useState<WaterQualityData[]>([]);
  const [filteredData, setFilteredData] = useState<WaterQualityData[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<string>('ph');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subDistricts, setSubDistricts] = useState<Sub_District[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedSubDistricts, setSelectedSubDistricts] = useState<string[]>([]);

  const attributes = [
    'ph', 'tds', 'ec', 'temperature', 'turbidity', 'do', 'orp', 'tss', 'cod',
    'bod', 'ts', 'chloride', 'nitrate', 'hardness', 'faecal_coliform', 'total_coliform'
  ];

  const attributeLabels: Record<string, string> = {
    ph: 'pH',
    tds: 'TDS (mg/L)',
    ec: 'EC (μS/cm)',
    temperature: 'Temperature (°C)',
    turbidity: 'Turbidity (FNU)',
    do: 'DO (mg/L)',
    orp: 'ORP',
    tss: 'TSS (mg/l)',
    cod: 'COD (mg/L)',
    bod: 'BOD (mg/l)',
    ts: 'TS (mg/L)',
    chloride: 'Chloride (mg/l)',
    nitrate: 'Nitrate (mg/L)',
    hardness: 'Hardness (mg/l)',
    faecal_coliform: 'Faecal Coliform (CFU/100 mL)',
    total_coliform: 'Total Coliform (CFU/100 mL)',
  };

  // Define standard WHO/BIS water quality thresholds for reference lines
  const qualityThresholds: Record<string, number> = {
    ph: 8.5, // WHO upper limit
    tds: 500, // WHO limit
    temperature: 25, // General guideline
    turbidity: 1, // WHO limit for treated water
    do: 5, // Minimum for aquatic life
    chloride: 250, // WHO limit
    nitrate: 50, // WHO limit
    hardness: 300, // WHO limit
  };

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://172.29.192.1:9000';

  // Fetch states
  useEffect(() => {
    const fetchStates = async (): Promise<void> => {
      try {
        const response = await fetch('/basics/state/');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response data:', data);
        const stateData: LocationItem[] = data.map((state: any) => ({
          id: state.state_code,
          name: state.state_name
        }));

        setStates(stateData);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      const fetchDistricts = async (): Promise<void> => {
        console.log('Fetching districts for state:', selectedState);
        try {
          const response = await fetch('/basics/district/',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ state_code: selectedState }),
            }
          );
          const data = await response.json();
          console.log('API response data:', data);
          const districtData: LocationItem[] = data.map((district: any) => ({
            id: district.district_code,
            name: district.district_name
          }));
          const mappedDistricts: District[] = districtData.map(district => ({
            ...district,
            stateId: parseInt(selectedState)
          }));

          // Sort districts alphabetically
          const sortedDistricts = [...mappedDistricts].sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          setDistricts(sortedDistricts);
          setSelectedDistricts([]);
        } catch (error) {
          console.error('Error fetching districts:', error);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
      setSelectedDistricts([]);
    }
    // Reset dependent dropdowns
    setSubDistricts([]);
    setSelectedSubDistricts([]);
  }, [selectedState]);

  // Fetch sub-districts when districts change
  useEffect(() => {
    if (selectedDistricts.length > 0) {
      const fetchSubDistricts = async (): Promise<void> => {
        try {
          console.log('Fetching sub-districts for districts:', selectedDistricts);
          
          const response = await fetch(`${BACKEND_URL}/rwm/subdistricts/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ District_Code: selectedDistricts }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Sub-districts API response:', data);

          if (data.error) {
            console.error('API returned error:', data.error);
            setError(`Failed to fetch sub-districts: ${data.error}`);
            return;
          }

          if (!Array.isArray(data)) {
            console.error('Expected array but got:', typeof data, data);
            setError('Invalid response format for sub-districts');
            return;
          }

          const districtMap = new Map(
            districts.map(district => [district.id.toString(), district.name])
          );

          const subDistrictData: Sub_District[] = data.map((subDistrict: any) => {
            const districtId = subDistrict.district_code.toString();
            return {
              id: subDistrict.subdistrict_code,
              name: subDistrict.subdistrict_name,
              districtId: parseInt(districtId),
              districtName: districtMap.get(districtId) || 'Unknown District'
            };
          });

          const sortedSubDistricts = [...subDistrictData].sort((a, b) => {
            const districtComparison = a.districtName.localeCompare(b.districtName);
            if (districtComparison !== 0) {
              return districtComparison;
            }
            return a.name.localeCompare(b.name);
          });

          setSubDistricts(sortedSubDistricts);
          setSelectedSubDistricts([]);
          setError(null);
          
        } catch (error) {
          console.error('Error fetching sub-districts:', error);
          setSubDistricts([]);
          setSelectedSubDistricts([]);
        }
      };
      fetchSubDistricts();
    } else {
      setSubDistricts([]);
      setSelectedSubDistricts([]);
    }
  }, [selectedDistricts, districts]);

  // Fetch all water quality data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BACKEND_URL}/rwm/water_quality/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCsvData(data);
        setFilteredData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch water quality data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter data based on selected subdistricts
  useEffect(() => {
    if (selectedSubDistricts.length > 0) {
      const filtered = csvData.filter(row => {
        const rowSubdistrictCode = row.subdistrict_code?.toString();
        return rowSubdistrictCode && selectedSubDistricts.includes(rowSubdistrictCode);
      });
      setFilteredData(filtered);
      console.log('Filtered data for selected sub-districts:', filtered);
    } else {
      setFilteredData(csvData);
    }
  }, [selectedSubDistricts, csvData]);

  // Event handlers
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const stateCode = e.target.value;
    setSelectedState(stateCode);
    setSelectedDistricts([]);
    setSelectedSubDistricts([]);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const districtIds = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedDistricts(districtIds);
    setSelectedSubDistricts([]);
  };

  const handleSubDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const subDistrictIds = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedSubDistricts(subDistrictIds);
  };

  const parseValue = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      // Handle scientific notation and comma separators
      const cleaned = value.replace(/,/g, '').trim();
      if (cleaned.includes('E+') || cleaned.includes('e+')) {
        return parseFloat(cleaned) || 0;
      }
      return parseFloat(cleaned) || 0;
    }
    return parseFloat(value.toString()) || 0;
  };

  // Define colors for each location type
  const typeColors: Record<string, string> = {
    Drain: 'rgba(255, 99, 132, 0.7)', // Red for drains (potentially polluted)
    Upstream: 'rgba(54, 162, 235, 0.7)', // Blue for upstream
    Downstream: 'rgba(255, 159, 64, 0.7)', // Orange for downstream
    'Below Bridge': 'rgba(255, 206, 86, 0.7)', // Yellow for below bridge
  };

  const borderColors: Record<string, string> = {
    Drain: 'rgba(255, 99, 132, 1)',
    Upstream: 'rgba(54, 162, 235, 1)',
    Downstream: 'rgba(255, 159, 64, 1)',
    'Below Bridge': 'rgba(255, 206, 86, 1)',
  };

  const createChartData = () => {
    if (filteredData.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Group data by sampling location
    const groupedBySampling = filteredData.reduce((acc, row) => {
      const sampling = row.sampling || 'Unknown Location';
      if (!acc[sampling]) {
        acc[sampling] = [];
      }
      acc[sampling].push(row);
      return acc;
    }, {} as Record<string, WaterQualityData[]>);

    const samplingLocations = Object.keys(groupedBySampling).sort();
    
    // Get unique location types from the filtered data
    const locationTypes = [...new Set(filteredData.map(row => row.location || 'Unknown'))].sort();

    const datasets = locationTypes.map((locationType) => ({
      label: locationType,
      data: samplingLocations.map(sampling => {
        const matchingRows = groupedBySampling[sampling].filter(row => row.location === locationType);
        if (matchingRows.length === 0) return null;
        
        // If multiple rows for same location type at same sampling point, take average
        const values = matchingRows.map(row => parseValue(row[selectedAttribute as keyof WaterQualityData]));
        const validValues = values.filter(v => v > 0);
        return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : null;
      }),
      backgroundColor: typeColors[locationType] || 'rgba(128, 128, 128, 0.7)',
      borderColor: borderColors[locationType] || 'rgba(128, 128, 128, 1)',
      borderWidth: 2,
      barPercentage: 0.8,
      categoryPercentage: 0.9,
    }));

    return {
      labels: samplingLocations,
      datasets: datasets.filter(dataset => dataset.data.some(value => value !== null))
    };
  };

  const chartData = createChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          filter: (legendItem: any, chartData: any) => {
            // Only show legend items that have data
            const datasetIndex = legendItem.datasetIndex;
            const dataset = chartData.datasets[datasetIndex];
            return dataset.data.some((value: any) => value !== null && value > 0);
          }
        }
      },
      title: { 
        display: true, 
        text: `${attributeLabels[selectedAttribute]} by Sampling Location${selectedSubDistricts.length > 0 ? ' (Filtered by Sub-District)' : ''}`
      },
      annotation: qualityThresholds[selectedAttribute] ? {
        annotations: {
          threshold: {
            type: 'line',
            yMin: qualityThresholds[selectedAttribute],
            yMax: qualityThresholds[selectedAttribute],
            borderColor: 'red',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: `WHO/BIS Limit: ${qualityThresholds[selectedAttribute]}`,
              enabled: true,
              position: 'end'
            }
          }
        }
      } : {}
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { 
          display: true, 
          text: attributeLabels[selectedAttribute] 
        }
      },
      x: {
        title: { display: true, text: 'Sampling Location' },
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 0,
          callback: function(value: any, index: any) {
            const label = this.getLabelForValue(value);
            return label.length > 20 ? label.substring(0, 20) + '...' : label;
          }
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      bar: {
        borderRadius: 4,
      }
    }
  };

  // Calculate basic statistics for the selected attribute
  const calculateStats = () => {
    if (filteredData.length === 0) return null;
    
    const values = filteredData
      .map(row => parseValue(row[selectedAttribute as keyof WaterQualityData]))
      .filter(v => v > 0);
    
    if (values.length === 0) return null;
    
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), count: values.length };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading water quality data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-full p-4 overflow-y-auto">
        {/* Location Selection Dropdowns */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* State Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedState}
              onChange={handleStateChange}
            >
              <option value="">Select State</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* District Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              multiple
              size={4}
              value={selectedDistricts}
              onChange={handleDistrictChange}
              disabled={!selectedState}
            >
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
            <small className="text-gray-500">Hold Ctrl/Cmd to select multiple</small>
          </div>

          {/* Sub-District Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub-District
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              multiple
              size={4}
              value={selectedSubDistricts}
              onChange={handleSubDistrictChange}
              disabled={selectedDistricts.length === 0}
            >
              {subDistricts.map((subDistrict) => (
                <option key={subDistrict.id} value={subDistrict.id}>
                  {subDistrict.name} ({subDistrict.districtName})
                </option>
              ))}
            </select>
            <small className="text-gray-500">Hold Ctrl/Cmd to select multiple</small>
          </div>

          {/* Attribute Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Water Quality Parameter
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedAttribute}
              onChange={(e) => setSelectedAttribute(e.target.value)}
            >
              {attributes.map((attr) => (
                <option key={attr} value={attr}>
                  {attributeLabels[attr]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Summary and Statistics */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Data Summary:</strong> {filteredData.length} records
              {selectedSubDistricts.length > 0 && (
                <span className="ml-2 text-blue-600">
                  (Filtered by {selectedSubDistricts.length} sub-district{selectedSubDistricts.length > 1 ? 's' : ''})
                </span>
              )}
            </p>
            {selectedSubDistricts.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Selected Sub-Districts: {subDistricts
                  .filter(sd => selectedSubDistricts.includes(sd.id.toString()))
                  .map(sd => sd.name)
                  .join(', ')}
              </p>
            )}
          </div>
          
          {stats && (
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>{attributeLabels[selectedAttribute]} Statistics:</strong>
              </p>
              <div className="grid grid-cols-4 gap-2 mt-1 text-xs">
                <span>Avg: <strong>{stats.avg}</strong></span>
                <span>Min: <strong>{stats.min}</strong></span>
                <span>Max: <strong>{stats.max}</strong></span>
                <span>Count: <strong>{stats.count}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-96 w-full mb-6">
          {chartData.labels.length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
              <p className="text-gray-500">No data available for the selected filters</p>
            </div>
          )}
        </div>

        {/* Data Table for Selected Sub-Districts */}
        {selectedSubDistricts.length > 0 && filteredData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Detailed Data for Selected Sub-Districts</h3>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sub-District</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sampling Location</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{attributeLabels[selectedAttribute]}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{row.sub_district || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.sampling || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.location || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.status || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                        {parseValue(row[selectedAttribute as keyof WaterQualityData]).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;