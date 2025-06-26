'use client'
import React from 'react';
import Dashboard from './components/ochart';

const Page = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="grid grid-cols-2 w-full bg-gradient-to-r from-blue-500 to-blue-200 text-white py-6 shadow-lg">
                <div className="container mx-auto px-4">
                    <h1 className="text-5xl font-bold">Water Quality Assessment Dashboard</h1>
                </div>

            </header>
            <Dashboard />
        </div>
    );
};

export default Page;