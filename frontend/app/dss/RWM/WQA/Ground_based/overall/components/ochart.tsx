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
  subdistrict_code?: string | number; // Added subdistrict code field
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

  const qualityThresholds: Record<string, number> = {
    ph: 8.5,
    tds: 500,
    temperature: 25, 
    turbidity: 1,
    do: 5, 
    chloride: 250, 
    nitrate: 50, 
    hardness: 300, 
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

          // Use the new sub-districts endpoint instead of water_quality
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

          // Check if the response indicates an error
          if (data.error) {
            console.error('API returned error:', data.error);
            setError(`Failed to fetch sub-districts: ${data.error}`);
            return;
          }

          // Ensure data is an array
          if (!Array.isArray(data)) {
            console.error('Expected array but got:', typeof data, data);
            setError('Invalid response format for sub-districts');
            return;
          }

          // Create a map of district IDs to names for reference
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
          setError(null); // Clear any previous errors

        } catch (error) {
          console.error('Error fetching sub-districts:', error);
          // setError(`Failed to fetch sub-districts: ${error.message}`);
          // Reset sub-districts on error
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BACKEND_URL}/rwm/water_quality/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ Sub_District_Code: selectedSubDistricts }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCsvData(data);
        setFilteredData(data); // Set filtered data to the fetched data
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch water quality data');
        setCsvData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSubDistricts]); // Add selectedSubDistricts to dependencies

  // Event handlers
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const stateCode = e.target.value;
    setSelectedState(stateCode);
    // Reset dependent selections
    setSelectedDistricts([]);
    setSelectedSubDistricts([]);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const districtIds = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedDistricts(districtIds);
    // Reset dependent selections
    setSelectedSubDistricts([]);
  };

  const handleSubDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const subDistrictIds = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedSubDistricts(subDistrictIds);
  };

  const parseValue = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      const cleaned = value.replace(',', '');
      return parseFloat(cleaned) || 0;
    }
    return parseFloat(value.toString()) || 0;
  };

  // Define colors for each type
  const typeColors: Record<string, string> = {
    Drain: 'rgba(255, 99, 132, 0.6)', // Red
    Upstream: 'rgba(54, 162, 235, 0.6)', // Blue
    Downstream: 'rgba(75, 192, 192, 0.6)', // Teal
  };

  const borderColors: Record<string, string> = {
    Drain: 'rgba(255, 99, 132, 1)',
    Upstream: 'rgba(54, 162, 235, 1)',
    Downstream: 'rgba(75, 192, 192, 1)',
  };

  const createChartDataWithCustomSpacing = (spacingWidth = 2) => {
    // Group data by sampling location using filtered data
    const groupedBySampling = filteredData.reduce((acc, row) => {
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

  // New function to create average values chart
  const createAverageChartData = () => {
    // Group data by location type
    const groupedByLocation = filteredData.reduce((acc, row) => {
      const location = row.location || 'Unknown';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(row);
      return acc;
    }, {} as Record<string, WaterQualityData[]>);

    // Calculate averages for each location type
    const locationTypes = ['Drain', 'Upstream', 'Downstream'];
    const averageData: number[] = [];

    locationTypes.forEach(locationType => {
      const locationData = groupedByLocation[locationType] || [];
      if (locationData.length > 0) {
        const values = locationData
          .map(row => parseValue(row[selectedAttribute as keyof WaterQualityData]))
          .filter(v => v > 0);
        
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          averageData.push(avg);
        } else {
          averageData.push(0);
        }
      } else {
        averageData.push(0);
      }
    });

    return {
      labels: locationTypes,
      datasets: [{
        label: `Average ${attributeLabels[selectedAttribute]}`,
        data: averageData,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)', // Red for Drain
          'rgba(54, 162, 235, 0.6)', // Blue for Upstream
          'rgba(75, 192, 192, 0.6)', // Teal for Downstream
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 2,
      }]
    };
  };

  // Usage:
  const chartData = createChartDataWithCustomSpacing(0);
  const averageChartData = createAverageChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: attributeLabels[selectedAttribute] },
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
  };

  const averageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: `Average ${attributeLabels[selectedAttribute]} by Location Type` },
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
      y: { beginAtZero: true, title: { display: true, text: 'Average Value' } },
      x: {
        title: { display: true, text: 'Location Type' },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
        },
      },
    },
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

  return (
    <div className="flex h-screen">
      <div className="w-full p-4 overflow-y-auto">
        {/* Location Selection Dropdowns */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-15">
          {/* State Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              className="w-55 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-55 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {/* Sub-District Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub-District
            </label>
            <select
              className="w-55 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>
        </div>

        {/* Attribute Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Water Quality Parameter
          </label>
          <select
            className="w-55 p-2 mb-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* Charts Container */}
        <div className="space-y-8">
          {/* Original Chart - Individual Sampling Locations */}
          <div className="bg-white p-4 rounded-lg shadow w-full">
            <h3 className="text-lg font-semibold mb-4">Individual Sampling Locations</h3>
            <div className="h-120 w-500 ">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* New Chart - Average Values by Location Type */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Average Values by Location Type</h3>
            <div className="h-96 w-full">
              <Bar data={averageChartData} options={averageChartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;