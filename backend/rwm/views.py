from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import WaterQuality_overall, WaterQuality_upstream, WaterQuality_downstream    
import geopandas as gpd
import os
import json
import logging

logger = logging.getLogger(__name__)

@api_view(['GET','OPTIONS'])
@permission_classes([AllowAny])
def water_quality_data(request, data_type='overall'):
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

        if data_type == 'overall':
            model = WaterQuality_overall  # You'll need to create this model
        elif data_type == 'upstream':
            model = WaterQuality_upstream
        elif data_type == 'downstream':
            model = WaterQuality_downstream
        else:
            return JsonResponse({'error': 'Invalid data type. Use "overall" or "upstream" or "downstream"'}, status=400)



        data = model.objects.all().values(
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
def shapefile_data(request,data_type='overall'):
    """
    API endpoint to return shapefile data as GeoJSON
    """
    try:
        # Use proper path construction - avoid raw strings with backslashes
        if data_type == 'overall':
         shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'UPDATED_WQA_DATA_points', 
            'UPDATED_WQA_DATA_points.shp'
        )
        elif data_type == 'upstream':
         shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'upstream_data_point', 
            'upstream_data_points.shp')
        elif data_type == 'downstream':
         shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'downstream_data_point', 
            'downstream_data_points.shp')
         

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
def shapefile_data_filtered(request,data_type='overall'):
    """
    API endpoint to return filtered shapefile data as GeoJSON
    """
    try:
        if data_type == 'overall':
         shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'UPDATED_WQA_DATA_points', 
            'UPDATED_WQA_DATA_points.shp'
        )
        elif data_type == 'upstream':
         shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'upstream_data_points', 
            'upstream_data_points.shp')
        elif data_type == 'downstream':
         shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'downstream_data_points', 
            'downstream_data_points.shp')
        
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
    

@api_view(['GET'])
@permission_classes([AllowAny])
def River(request):
    """
    API endpoint to return river shapefile data as GeoJSON
    """
    try:
        shapefile_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'RIVER_SHP')
        shapefile_full_path = os.path.join(shapefile_path, 'Rivers.shp')

        if not os.path.exists(shapefile_full_path):
            logger.error(f"River shapefile not found at: {shapefile_full_path}")
            return Response({'error': f'River shapefile not found at: {shapefile_full_path}'}, status=404)

        # Read shapefile using GeoPandas
        gdf = gpd.read_file(shapefile_full_path)
        gdf = gdf.to_crs("EPSG:4326")
        
        # Convert to GeoJSON
        geojson_data = json.loads(gdf.to_json())
        
        return Response(geojson_data, status=status.HTTP_200_OK)

    except Exception as e: 
        logger.error(f"Error processing river shapefile: {str(e)}")
        return Response({'error': f'Error processing river shapefile: {str(e)}'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def River_100m_buffer(request):
    """
    API endpoint to return river buffer shapefile data as GeoJSON
    """
    try:
        shapefile_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'RIVER_BUFFER100M_SHP')
        shapefile_full_path = os.path.join(shapefile_path, 'River_buffer_100m.shp')

        if not os.path.exists(shapefile_full_path):
            logger.error(f"River buffer shapefile not found at: {shapefile_full_path}")
            return Response({'error': f'River buffer shapefile not found at: {shapefile_full_path}'}, status=404)

        # Read shapefile using GeoPandas
        gdf = gpd.read_file(shapefile_full_path)
        gdf = gdf.to_crs("EPSG:4326")
        
        # Convert to GeoJSON
        geojson_data = json.loads(gdf.to_json())
        
        return Response(geojson_data, status=status.HTTP_200_OK)

    except Exception as e: 
        logger.error(f"Error processing river buffer shapefile: {str(e)}")
        return Response({'error': f'Error processing river buffer shapefile: {str(e)}'}, status=500)

# def shapefile_data_upstream(request):
#     """
#     API endpoint to return shapefile data as GeoJSON
#     """
#     try:
#         # Use proper path construction - avoid raw strings with backslashes
#         shp_path = os.path.join(
#             settings.MEDIA_ROOT, 
#             'rwm_data', 
#             'upstream_data_points', 
#             'upstream_data_points.shp'
#         )
        
#         # Check if file exists
#         if not os.path.exists(shp_path):
#             logger.error(f"Shapefile not found at: {shp_path}")
#             return JsonResponse({'error': 'Shapefile not found'}, status=404)
        
#         # Read shapefile and convert to GeoJSON
#         gdf = gpd.read_file(shp_path)
        
#         # Convert to GeoJSON string, then parse back to dict for JsonResponse
#         geojson_str = gdf.to_json()
#         geojson_dict = json.loads(geojson_str)
        
#         return JsonResponse(geojson_dict, safe=False)
    
#     except Exception as e:
#         logger.error(f"Error processing shapefile: {str(e)}")
#         return JsonResponse({'error': 'Failed to process shapefile data'}, status=500)
    


# def shapefile_data_downstream(request):
#     """
#     API endpoint to return shapefile data as GeoJSON
#     """
#     try:
#         # Use proper path construction - avoid raw strings with backslashes
#         shp_path = os.path.join(
#             settings.MEDIA_ROOT, 
#             'rwm_data', 
#             'downstream_data_points', 
#             'downstream_data_points.shp'
#         )
        
#         # Check if file exists
#         if not os.path.exists(shp_path):
#             logger.error(f"Shapefile not found at: {shp_path}")
#             return JsonResponse({'error': 'Shapefile not found'}, status=404)
        
#         # Read shapefile and convert to GeoJSON
#         gdf = gpd.read_file(shp_path)
        
#         # Convert to GeoJSON string, then parse back to dict for JsonResponse
#         geojson_str = gdf.to_json()
#         geojson_dict = json.loads(geojson_str)
        
#         return JsonResponse(geojson_dict, safe=False)
    
#     except Exception as e:
#         logger.error(f"Error processing shapefile: {str(e)}")
#         return JsonResponse({'error': 'Failed to process shapefile data'}, status=500)