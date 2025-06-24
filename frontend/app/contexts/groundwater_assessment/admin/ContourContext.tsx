//ContourContext.tsx
'use client';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from '@/app/contexts/groundwater_assessment/admin/LocationContext';
import { useMap } from '@/app/contexts/groundwater_assessment/admin/MapContext';

interface GroundwaterContourContextType {
  geoJsonData: any;
  rasterData: any;
  interpolationMethod: string;
  parameter: string;
  dataType: string;
  selectedYear: string;
  contourInterval: string;
  isLoading: boolean;
  error: string | null;
  setInterpolationMethod: (value: string) => void;
  setParameter: (value: string) => void;
  setDataType: (value: string) => void;
  setSelectedYear: (value: string) => void;
  setContourInterval: (value: string) => void;
  handleGenerate: () => Promise<void>;
}

interface GroundwaterContourProviderProps {
  children: ReactNode;
  activeTab: string;
  onGeoJsonData?: (data: { type: 'contour' | 'raster'; payload: any }) => void;
}

export const GroundwaterContourContext = createContext<GroundwaterContourContextType>({
  geoJsonData: null,
  rasterData: null,
  interpolationMethod: '',
  parameter: '',
  dataType: '',
  selectedYear: '',
  contourInterval: '',
  isLoading: false,
  error: null,
  setInterpolationMethod: () => {},
  setParameter: () => {},
  setDataType: () => {},
  setSelectedYear: () => {},
  setContourInterval: () => {},
  handleGenerate: async () => {},
});

export const GroundwaterContourProvider = ({
  children,
  activeTab,
  onGeoJsonData = () => {},
}: GroundwaterContourProviderProps) => {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [rasterData, setRasterData] = useState<any>(null);
  const [interpolationMethod, setInterpolationMethod] = useState<string>('');
  const [parameter, setParameter] = useState<string>('');
  const [dataType, setDataType] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [contourInterval, setContourInterval] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get map context to add contour layers
  const { addContourLayer, addRasterLayer } = useMap();
  
  // Move useLocation to the top level
  const { selectedSubDistricts } = useLocation();

  useEffect(() => {
    if (parameter === 'RL') {
      setDataType('POST');
      setSelectedYear('2011');
    } else if (parameter === 'gwl') {
      setDataType('');
      setSelectedYear('');
    }
  }, [parameter]);

  useEffect(() => {
    if (activeTab !== 'groundwater-contour') {
      setGeoJsonData(null);
      setRasterData(null);
      setError(null);
    }
  }, [activeTab]);

  const handleGenerate = async () => {
    // Validate all required fields
    if (!interpolationMethod || !parameter || !contourInterval) {
      alert('Please fill all required fields: Interpolation Method, Parameter, and Contour Interval.');
      return;
    }

    if (parameter === 'gwl' && (!dataType || !selectedYear)) {
      alert('For Groundwater Level, please select both Data Type (PRE/POST) and Year.');
      return;
    }

    if (selectedSubDistricts.length === 0) {
      alert('Please select villages/subdistricts first.');
      return;
    }

    // Validate contour interval
    const intervalValue = parseFloat(contourInterval);
    if (isNaN(intervalValue) || intervalValue <= 0) {
      alert('Please enter a valid contour interval (greater than 0).');
      return;
    }

    // Prepare payload for single API call
    const payload: any = {
      method: interpolationMethod,
      parameter: parameter,
      village_ids: selectedSubDistricts,
      place: 'subdistrict',
      create_colored: true,
      generate_contours: true,
      contour_interval: intervalValue
    };

    if (parameter === 'gwl') {
      payload['data_type'] = dataType;
      payload['year'] = parseInt(selectedYear);
    } else if (parameter === 'RL') {
      payload['data_type'] = 'POST';
      payload['year'] = 2011;
    }

    try {
      setIsLoading(true);
      setError(null);
      setGeoJsonData(null);
      setRasterData(null);

      console.log('Sending single API request for both interpolation and contour:', payload);

      const response = await fetch('http://localhost:9000/gwa/interpolation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Failed to generate interpolation and contours: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('API error response:', errorData);
          if (errorData && errorData.error) {
            errorMessage = `Server error: ${errorData.error}`;
          }
        } catch (parseError) {
          console.error('Could not parse error response as JSON:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Interpolation and Contour data received successfully:', data);

      // Set both raster and contour data
      setRasterData(data);

      // Add raster layer to map first
      if (data.layer_name && data.geoserver_url) {
        console.log('Adding raster layer to map');
        addRasterLayer(data.layer_name, data.geoserver_url);
        onGeoJsonData({ type: 'raster', payload: data });
      }

      // Add contour layer to map if contours were generated
      if (data.contours && data.contour_generation?.success) {
        console.log('Adding contour layer to map');
        setGeoJsonData(data.contours);
        
        addContourLayer(data.contours, {
          name: `${data.layer_name}_contours`,
          parameter: parameter,
          interval: contourInterval,
          statistics: data.contour_generation.statistics
        });
        
        onGeoJsonData({ type: 'contour', payload: data.contours });
      } else {
        console.warn('Contours were not generated successfully');
        if (data.contour_generation && !data.contour_generation.success) {
          console.warn('Contour generation failed:', data.contour_generation);
        }
      }

    } catch (error) {
      console.error('Error generating interpolation and contours:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred during generation');
      setGeoJsonData(null);
      setRasterData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GroundwaterContourContext.Provider
      value={{
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
      }}
    >
      {children}
    </GroundwaterContourContext.Provider>
  );
};