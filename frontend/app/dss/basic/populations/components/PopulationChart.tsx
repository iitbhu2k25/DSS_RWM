'use client'

import { Line, Bar } from "react-chartjs-2";
import { 
  Chart as ChartJS, 
  LineElement, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  Tooltip, 
  Legend,
  BarElement
} from "chart.js";
import { useMemo } from "react";

// Register Chart.js components
ChartJS.register(
  LineElement, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  Tooltip, 
  Legend,
  BarElement
);

interface PopulationChartProps {
  results: any;
  intermediateYear?: number | null; // Add intermediateYear prop
}

const processData = (results: any, intermediateYear?: number | null) => {
  if (!results) return { labels: [], datasets: [] };

  const allYears = new Set<number>();
  const models = Object.keys(results);

  // Collect all years from all models
  models.forEach((model) => {
    Object.keys(results[model]).forEach((year) => {
      const yearNum = Number(year);
      if (!isNaN(yearNum)) {
        allYears.add(yearNum);
      }
    });
  });

 // Sort years chronologically
 const allYearsArray = Array.from(allYears).sort((a, b) => a - b);
  
 let yearsArray: number[];
 
 // If we have only one year, keep it as is
 if (allYearsArray.length === 1) {
   yearsArray = allYearsArray;
 } 
 // If we have more than one year, apply 5-year gap filtering
 else if (allYearsArray.length > 1) {
   const firstYear = allYearsArray[0];
   yearsArray = allYearsArray.filter(year => (year - firstYear) % 5 === 0);
   
   // Ensure we always include the last year if it's not already included
   const lastYear = allYearsArray[allYearsArray.length - 1];
   if (!yearsArray.includes(lastYear)) {
     yearsArray.push(lastYear);
   }
   // Ensure intermediate year is included if provided
   if (intermediateYear && !yearsArray.includes(intermediateYear)) {
     yearsArray.push(intermediateYear);
     yearsArray.sort((a, b) => a - b); // Re-sort after adding
   }
 } else {
   yearsArray = allYearsArray;
 }
 return {
  labels: yearsArray.map(String), // X-axis labels (years)
  datasets: models.map((model, index) => {
    const isIntermediateYear = (year: string) => intermediateYear && parseInt(year) === intermediateYear;

    return {
      label: model,
      data: yearsArray.map(year => results[model][year] || null),
      borderColor: ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#800080", "#FFA500"][index % 6], // Red, Blue, Green, Yellow, Violet, Orange
      backgroundColor: yearsArray.length <= 2 
        ? ["rgba(255, 0, 0, 0.7)", "rgba(0, 0, 255, 0.7)", "rgba(0, 255, 0, 0.7)", "rgba(255, 255, 0, 0.7)", "rgba(128, 0, 128, 0.7)", "rgba(255, 165, 0, 0.7)"][index % 6]
        : isIntermediateYear(yearsArray[0].toString()) 
          ? ["rgba(255, 0, 0, 0.7)", "rgba(0, 0, 255, 0.7)", "rgba(0, 255, 0, 0.7)", "rgba(255, 255, 0, 0.7)", "rgba(128, 0, 128, 0.7)", "rgba(255, 165, 0, 0.7)"][index % 6]
          : "rgba(0, 0, 0, 0)", // Transparent fill for line chart
      tension: 0.4, // Smooth curve
      fill: false, // Don't fill area under line
      borderWidth: yearsArray.length === 1 ? 3 : isIntermediateYear(yearsArray[0].toString()) ? 6 : 4, // Line weight: 3 for single year, 6 for intermediate, 4 for others
      pointRadius: yearsArray.map(year => isIntermediateYear(year.toString()) ? 8 : 4), // Larger point for intermediate year
      pointBackgroundColor: yearsArray.map(year => 
        isIntermediateYear(yearsArray[0].toString()) 
          ? ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#800080", "#FFA500"][index % 6]
          : ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#800080", "#FFA500"][index % 6]
      ),
      pointBorderColor: yearsArray.map(year => 
        isIntermediateYear(yearsArray[0].toString()) 
          ? ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#800080", "#FFA500"][index % 6]
          : ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#800080", "#FFA500"][index % 6]
      ),
    };
  })
};
};
const PopulationChart = ({ results, intermediateYear }: PopulationChartProps) => {
  const chartData = useMemo(() => processData(results, intermediateYear), [results, intermediateYear]);
  
  // Check if we have only two years or few data points
  const hasOnlyTwoYears = chartData.labels.length <= 2;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 10,
        left: 10,
        top: 10,
        bottom: 10
      }
    },
    scales: {
      x: { 
        title: { 
          display: true, 
          text: "Year" 
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: { 
        title: { 
          display: true, 
          text: "Population" 
        },
        beginAtZero: false
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return (
    <div className="mt-6 w-full">
      <h2 className="text-lg font-semibold mb-4">
        Population {hasOnlyTwoYears ? "Comparison" : "Projection"}
      </h2>
      <div style={{ height: "400px", width: "80%" }}>
        {hasOnlyTwoYears ? (
          <Bar data={chartData} options={options} />
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
      {intermediateYear && chartData.labels.includes(intermediateYear.toString()) && (
        <div className="mt-4 text-center">
          <span className="text-sm font-medium text-blue bg-red-400 px-3 py-1 rounded">
            Intermediate Year: {intermediateYear}
          </span>
        </div>
      )}
    </div>
  );
};

export default PopulationChart;