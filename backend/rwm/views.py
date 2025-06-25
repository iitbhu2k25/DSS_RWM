from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import WaterQuality
import geopandas as gpd
import os
import json
import logging

logger = logging.getLogger(__name__)

@api_view(['GET','OPTIONS'])
@permission_classes([AllowAny])
def water_quality_data(request):
    """
    API endpoint to return water quality data as JSON
    """
        
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    try:
        data = WaterQuality.objects.all().values(
            's_no', 'sampling', 'location', 'status', 'latitude', 'longitude', 
            'ph', 'tds', 'ec', 'temperature', 'turbidity', 'do', 'orp', 'tss', 
            'cod', 'bod', 'ts', 'chloride', 'nitrate', 'hardness', 
            'faecal_coliform', 'total_coliform'
        )
        response = JsonResponse(list(data), safe=False)
        response["Access-Control-Allow-Origin"] = "*" 
        return JsonResponse(list(data), safe=False)

    except Exception as e:
        logger.error(f"Error fetching water quality data: {str(e)}")
        response = JsonResponse({'error': 'Failed to fetch water quality data'}, status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return JsonResponse({'error': 'Failed to fetch water quality data'}, status=500)

@csrf_exempt
def shapefile_data(request):
    """
    API endpoint to return shapefile data as GeoJSON
    """
    try:
        # Use proper path construction - avoid raw strings with backslashes
        shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'UPDATED_WQA_DATA_points', 
            'UPDATED_WQA_DATA_points.shp'
        )
        
        # Check if file exists
        if not os.path.exists(shp_path):
            logger.error(f"Shapefile not found at: {shp_path}")
            return JsonResponse({'error': 'Shapefile not found'}, status=404)
        
        # Read shapefile and convert to GeoJSON
        gdf = gpd.read_file(shp_path)
        
        # Convert to GeoJSON string, then parse back to dict for JsonResponse
        geojson_str = gdf.to_json()
        geojson_dict = json.loads(geojson_str)
        
        return JsonResponse(geojson_dict, safe=False)
    
    except Exception as e:
        logger.error(f"Error processing shapefile: {str(e)}")
        return JsonResponse({'error': 'Failed to process shapefile data'}, status=500)

# Alternative method if you want to return only specific features
@csrf_exempt
def shapefile_data_filtered(request):
    """
    API endpoint to return filtered shapefile data as GeoJSON
    """
    try:
        shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'UPDATED_WQA_DATA_points', 
            'UPDATED_WQA_DATA_points.shp'
        )
        
        if not os.path.exists(shp_path):
            return JsonResponse({'error': 'Shapefile not found'}, status=404)
        
        # Read shapefile
        gdf = gpd.read_file(shp_path)
        
        # Optional: Filter or process the data
        # Example: Only include features with specific attributes
        # gdf = gdf[gdf['some_column'].notna()]
        
        # Ensure the CRS is WGS84 for web mapping
        if gdf.crs != 'EPSG:4326':
            gdf = gdf.to_crs('EPSG:4326')
        
        geojson_str = gdf.to_json()
        geojson_dict = json.loads(geojson_str)
        
        return JsonResponse(geojson_dict, safe=False)
    
    except Exception as e:
        logger.error(f"Error processing filtered shapefile: {str(e)}")
        return JsonResponse({'error': 'Failed to process shapefile data'}, status=500)