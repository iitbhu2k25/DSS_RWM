// Fixed page.tsx - Move useMap inside MapProvider
"use client";

import React, { useState } from "react";
import { StatusBar } from "./components/StatusBar";
import DataSelection from "./components/DataSelection";
import GroundwaterContour from "./components/contour";
import { GroundwaterContourProvider } from "@/app/contexts/groundwater_assessment/admin/ContourContext";
import Map from "./components/Map";
import { LocationProvider, useLocation } from "@/app/contexts/groundwater_assessment/admin/LocationContext";
import { MapProvider, useMap } from "@/app/contexts/groundwater_assessment/admin/MapContext";

interface Step {
  id: number;
  name: string;
}

// Create a separate component that uses the map context
function GroundwaterAssessmentContent() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [contourData, setContourData] = useState<any>(null);
  const { addRasterLayer } = useMap(); // Now this is inside MapProvider
  const { selectionsLocked } = useLocation();

  const steps: Step[] = [
    { id: 1, name: "Data Collection" },
    { id: 2, name: "Groundwater Contour" },
    { id: 3, name: "Groundwater Trend" },
    { id: 4, name: "Timeseries Analysis and Forecasting" },
    { id: 5, name: "Groundwater Recharge" },
  ];

 const handleNext = () => {
    if (activeStep === 1 && !selectionsLocked) {
      console.log("Cannot proceed: Location selections not confirmed");
      return;
    }
    if (activeStep < steps.length) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevious = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleGeoJsonData = (data: { type: 'contour' | 'raster'; payload: any }) => {
    setContourData(data);
    if (data.type === 'raster') {
      const { layer_name, geoserver_url } = data.payload;
      console.log('Received raster data:', { layer_name, geoserver_url });
      if (layer_name && geoserver_url) {
        addRasterLayer(layer_name, geoserver_url);
        console.log(`Raster layer added to map: ${layer_name}`);
      } else {
        console.error('Invalid raster data:', data.payload);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Step Bar */}
      <StatusBar
        activeStep={activeStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />

      {/* Main Content */}
      <main className="flex-grow">
        <div className="flex gap-4 mt-4 ">
          {/* Left Panel */}
          <div className="w-[55%] bg-white p-6 rounded-lg shadow-md ml-3">
            {activeStep === 1 ? (
              <DataSelection step={activeStep} />
            ) : activeStep === 2 ? (
              <GroundwaterContourProvider
                activeTab="groundwater-contour"
                onGeoJsonData={handleGeoJsonData}
              >
                <GroundwaterContour
                  activeTab="groundwater-contour"
                  step={activeStep}
                />
              </GroundwaterContourProvider>
            ) : (
              <div className="text-gray-500">
                <h2 className="text-xl font-semibold mb-4">{steps[activeStep - 1].name}</h2>
                <p>Content for this step is not yet implemented.</p>
              </div>
            )}
          </div>
          {/* Right Panel: Map */}
          <div className="w-[45%] bg-white p-6 rounded-lg shadow-md mr-5">
            <div className="w-full h-full">
            <Map />
            </div>
          </div>
        </div>
      </main>

      {/* Step Navigation */}
      <div className="bg-gray-100 p-6 border-t border-gray-300">
        <div className="flex justify-center space-x-4 max-w-4xl mx-auto">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 1}
            className={`px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
              activeStep === 1
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
            }`}
          >
            Previous Step
          </button>
          <button
            onClick={handleNext}
            disabled={activeStep === steps.length}
            className={`px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
              activeStep === steps.length
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
            }`}
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component with providers
export default function GroundwaterAssessmentAdmin() {
  return (
    <LocationProvider>
      <MapProvider>
        <GroundwaterAssessmentContent />
      </MapProvider>
    </LocationProvider>
  );
}