'use client'

import React, { useState, useEffect } from 'react';
import Dashboard from './components/ochart';
import MapComponent from './components/omap';
import 'ol/ol.css';

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

const Page = () => {
    const [csvData, setCsvData] = useState<WaterQualityData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

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

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
<div className="min-h-screen bg-gray-50">
  <header className="grid grid-cols-2 w-full bg-gradient-to-r from-blue-500 to-blue-200 text-white py-6 shadow-lg">
    <div className="container mx-auto px-2">
      <h1 className="text-5xl font-bold">Water Quality Assessment: Ground Based</h1>
    </div>
  </header>
<div className="flex flex-col md:flex-row gap-4 mt-4 mx-4">
  <div className="w-full md:w-1/2 bg-white p-6 rounded-lg shadow-md">
    <Dashboard />
  </div>
  <div className="w-full md:w-1/2 bg-white p-6 rounded-lg shadow-md">
    <MapComponent csvData={csvData} />
  </div>
</div>
</div>
                );
};

                export default Page;