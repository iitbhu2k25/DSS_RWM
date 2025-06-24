"use client";

import React, { useContext } from 'react';
import { GroundwaterContourContext } from "@/app/contexts/groundwater_assessment/admin/ContourContext";

interface GroundwaterContourProps {
  activeTab: string;
  step: number;
}

const GroundwaterContour: React.FC<GroundwaterContourProps> = ({ activeTab, step }) => {
  const {
    geoJsonData,
    rasterData,
    interpolationMethod,
    parameter,
    dataType,
    selectedYear,
    contourInterval,
    isLoading,
    error,
    setInterpolationMethod,
    setParameter,
    setDataType,
    setSelectedYear,
    setContourInterval,
    handleGenerate,
  } = useContext(GroundwaterContourContext);

  // Check if all required fields are filled
  const isFormValid = () => {
    if (!interpolationMethod || !parameter || !contourInterval) {
      return false;
    }
    
    if (parameter === 'gwl' && (!dataType || !selectedYear)) {
      return false;
    }
    
    const intervalValue = parseFloat(contourInterval);
    if (isNaN(intervalValue) || intervalValue <= 0) {
      return false;
    }
    
    return true;
  };

  return (
    <div className="h-full overflow-auto flex flex-col">
      <h3 className="font-medium text-blue-600 mb-4">Groundwater Contour (Step {step})</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Generation Failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4 mb-6">
        {/* Interpolation Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Method of Interpolation <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={interpolationMethod}
            onChange={(e) => setInterpolationMethod(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select Method...</option>
            <option value="idw">Inverse Distance Weighted (IDW)</option>
            <option value="kriging">Kriging</option>
            <option value="spline">Spline</option>
          </select>
        </div>

        {/* Parameter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Choose Parameter <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={parameter}
            onChange={(e) => setParameter(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select Parameter...</option>
            <option value="gwl">Groundwater Level</option>
            <option value="RL">Rainfall</option>
          </select>
        </div>

        {/* Data Type - Only show for Groundwater Level */}
        {parameter === 'gwl' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select Data Type...</option>
              <option value="PRE">PRE (Pre-monsoon)</option>
              <option value="POST">POST (Post-monsoon)</option>
            </select>
          </div>
        )}

        {/* Rainfall Info */}
        {parameter === 'RL' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium">Rainfall Parameter Settings</p>
                <p className="mt-1">Data type is automatically set to POST and year to 2011 for rainfall analysis.</p>
              </div>
            </div>
          </div>
        )}

        {/* Year Selection */}
        {parameter !== '' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Year <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={parameter === 'RL' || isLoading}
            >
              <option value="">Select Year...</option>
              <option value="2011">2011</option>
              <option value="2012">2012</option>
              <option value="2013">2013</option>
              <option value="2014">2014</option>
              <option value="2015">2015</option>
              <option value="2016">2016</option>
              <option value="2017">2017</option>
              <option value="2018">2018</option>
              <option value="2019">2019</option>
              <option value="2020">2020</option>
            </select>
          </div>
        )}

        {/* Contour Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contour Interval (meters) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter interval (e.g., 5)"
            value={contourInterval}
            onChange={(e) => setContourInterval(e.target.value)}
            min="0.1"
            step="0.1"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 Recommended: 1-5m for groundwater levels, 5-20m for elevation
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || !isFormValid()}
        className={`w-full ${
          isLoading || !isFormValid()
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300'
        } text-white font-medium py-3 px-4 rounded-md flex items-center justify-center transition-colors duration-200`}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Generating Interpolation & Contours...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Generate Interpolation & Contours</span>
          </>
        )}
      </button>

      {/* Loading Progress */}
      {isLoading && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Processing your request...</p>
            <div className="text-xs space-y-1">
              <p>• Reading well data from selected areas</p>
              <p>• Performing {interpolationMethod?.toUpperCase()} interpolation</p>
              <p>• Generating colored raster surface</p>
              <p>• Creating contour lines with {contourInterval}m intervals</p>
              <p>• Publishing layers to map</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Messages */}
      {rasterData && geoJsonData && !error && !isLoading && (
        <div className="mt-4 space-y-4">
          {/* Combined Success Message */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-base font-semibold text-gray-800">
                Generation Complete!
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Both raster surface and contour lines have been successfully generated and added to the map.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center p-2 bg-white rounded border">
                <p className="font-medium text-gray-700">Method</p>
                <p className="text-blue-600">{interpolationMethod?.toUpperCase()}</p>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <p className="font-medium text-gray-700">Contours</p>
                <p className="text-blue-600">{geoJsonData?.features?.length || 0} lines</p>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <p className="font-medium text-gray-700">Interval</p>
                <p className="text-blue-600">{contourInterval}m</p>
              </div>
            </div>
          </div>

          {/* Detailed Statistics */}
          {geoJsonData?.properties?.statistics && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-medium text-blue-800 mb-2">Contour Details</h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <p><span className="font-medium">Total Lines:</span> {geoJsonData.properties.statistics.total_contours}</p>
                  <p><span className="font-medium">Interval:</span> {geoJsonData.properties.statistics.contour_interval}m</p>
                </div>
                <div>
                  <p><span className="font-medium">Min Elevation:</span> {geoJsonData.properties.statistics.elevation_range?.min?.toFixed(1)}m</p>
                  <p><span className="font-medium">Max Elevation:</span> {geoJsonData.properties.statistics.elevation_range?.max?.toFixed(1)}m</p>
                </div>
              </div>
              
              {/* Contour Levels */}
              {geoJsonData.properties.statistics.contour_levels && geoJsonData.properties.statistics.contour_levels.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-gray-700 mb-2">Contour Levels (m):</p>
                  <div className="flex flex-wrap gap-1">
                    {geoJsonData.properties.statistics.contour_levels.slice(0, 6).map((level: number, index: number) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {level.toFixed(1)}
                      </span>
                    ))}
                    {geoJsonData.properties.statistics.contour_levels.length > 6 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{geoJsonData.properties.statistics.contour_levels.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raster Statistics */}
          {rasterData && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-medium text-green-800 mb-2">Raster Details</h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <p><span className="font-medium">Wells Used:</span> {rasterData.wells_used || 'N/A'}</p>
                  <p><span className="font-medium">Resolution:</span> {rasterData.resolution || '30m'}</p>
                </div>
                <div>
                  <p><span className="font-medium">CRS:</span> {rasterData.crs || 'EPSG:32644'}</p>
                  <p><span className="font-medium">Villages:</span> {rasterData.villages_selected || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-2">How it works:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>1. <strong>Select Method:</strong> Choose interpolation algorithm (IDW, Kriging, or Spline)</p>
          <p>2. <strong>Choose Parameter:</strong> Select groundwater level or rainfall data</p>
          <p>3. <strong>Set Parameters:</strong> Configure data type, year, and contour interval</p>
          <p>4. <strong>Generate:</strong> Create both raster surface and contour lines in one step</p>
        </div>
        
        <div className="mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs text-gray-500">
            💡 <strong>Tip:</strong> All parameters marked with <span className="text-red-500">*</span> are required. The system will generate both interpolated raster and contour lines simultaneously.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroundwaterContour;