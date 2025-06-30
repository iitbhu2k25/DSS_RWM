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

const Dashboard = () => {
  const [csvData, setCsvData] = useState<WaterQualityData[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<string>('ph');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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