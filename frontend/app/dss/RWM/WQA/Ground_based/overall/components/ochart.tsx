'use client';
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import MapComponent from './omap';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface WaterQualityData {
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
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://172.20.43.252:9000'
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BACKEND_URL}/rwm/water_quality_data/`);
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
    // Handle string values for coliform fields
    if (typeof value === 'string') {
      const cleaned = value.replace(',', '');
      return parseFloat(cleaned) || 0;
    }
    return parseFloat(value.toString()) || 0;
  };

  const chartData = {
    labels: csvData.map((row) => row.sampling || 'Unknown'),
    datasets: [
      {
        label: attributeLabels[selectedAttribute],
        data: csvData.map((row) => parseValue(row[selectedAttribute as keyof WaterQualityData])),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: attributeLabels[selectedAttribute] },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Value' } },
      x: { title: { display: true, text: 'Sampling Location' } },
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

  return (
    <div className="flex h-screen">
      <div className="w-1/2 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Water Quality Dashboard</h1>
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
        <div className="h-96">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
      <div className="w-1/2">
        <MapComponent csvData={csvData} />
      </div>
    </div>
  );
};

export default Dashboard;