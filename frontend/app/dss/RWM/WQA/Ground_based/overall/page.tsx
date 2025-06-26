'use client'

import React, { useState, useEffect } from 'react';
import Dashboard from './components/ochart';
import MapComponent from './components/omap';

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
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="grid grid-cols-2 w-full bg-gradient-to-r from-blue-500 to-blue-200 text-white py-6 shadow-lg">
                <div className="container mx-auto px-4">
                    <h1 className="text-5xl font-bold">Water Quality Assessment Dashboard</h1>
                </div>

            </header>

            <Dashboard />
            <div className="w-1/2">
                <MapComponent csvData={csvData} />
            </div>
        </div>
    );
};

export default Page;