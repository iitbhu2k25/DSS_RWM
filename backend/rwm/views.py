
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

import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
import numpy as np
from io import BytesIO
import requests
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
    
# def idw_interpolation(points, values, gridx, gridy):
#     """Perform IDW interpolation."""
#     coords = np.array(list(zip(points.x, points.y)))
#     interpolator = NearestNDInterpolator(coords, values)
#     grid_z = interpolator((gridx, gridy))
#     return grid_z

# def create_raster(gdf, parameter, bounds, output_path, resolution=100):
#     """Create a GeoTIFF raster for the given parameter."""
#     xmin, ymin, xmax, ymax = bounds
#     x = np.linspace(xmin, xmax, resolution)
#     y = np.linspace(ymin, ymax, resolution)
#     gridx, gridy = np.meshgrid(x, y)
    
#     values = gdf[parameter].values
#     grid_z = idw_interpolation(gdf.geometry, values, gridx, gridy)
    
#     transform = from_bounds(xmin, ymin, xmax, ymax, resolution, resolution)
#     with rasterio.open(
#         output_path,
#         'w',
#         driver='GTiff',
#         height=resolution,
#         width=resolution,
#         count=1,
#         dtype=grid_z.dtype,
#         crs=gdf.crs,
#         transform=transform
#     ) as dst:
#         dst.write(grid_z, 1)

# def publish_to_geoserver(raster_path, layer_name):
#     """Publish raster to GeoServer using REST API."""
#     url = f"{settings.GEOSERVER_URL}/rest/workspaces/{settings.GEOSERVER_WORKSPACE}/coveragestores/{settings.GEOSERVER_DATASTORE}/file.geotiff"
#     headers = {'Content-Type': 'image/tiff'}
#     auth = (settings.GEOSERVER_USERNAME, settings.GEOSERVER_PASSWORD)
    
#     with open(raster_path, 'rb') as f:
#         response = requests.put(url, data=f, headers=headers, auth=auth)
#     if response.status_code != 201:
#         raise Exception(f"Failed to publish {layer_name} to GeoServer: {response.text}")

# def interpolate_parameters(request):
#     """Django view to perform interpolation and publish to GeoServer."""
#     try:
#         # Read shapefiles
#         shapefile_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'RIVER_BUFFER100M_SHP')
#         shapefile_river_full_path = os.path.join(shapefile_path, 'River_buffer_100m.shp')
        
#         shp_path = os.path.join(
#             settings.MEDIA_ROOT, 
#             'rwm_data', 
#             'UPDATED_WQA_DATA_points', 
#             'UPDATED_WQA_DATA_points.shp'
#         )


#         points_gdf = gpd.read_file(settings.shp_path)
#         buffer_gdf = gpd.read_file(settings.shapefile_river_full_path)
        
#         # Ensure output directory exists
#         os.makedirs(settings.RASTER_OUTPUT_PATH, exist_ok=True)
        
#         # Get bounds from river buffer
#         bounds = buffer_gdf.total_bounds  # [xmin, ymin, xmax, ymax]
        
#         # Parameters to interpolate
#         parameters = [
#             'pH', 'TDS_ppm', 'EC_μS_cm', 'Temperature_°C', 'Turbidity_FNU',
#             'DO_mg_L', 'ORP', 'TSS_mg_l', 'COD', 'BOD_mg_l', 'Chloride_mg_l',
#             'Hardness_mg_l', 'Faecal_Coliform_CFU_100mL', 'Total_Coliform_CFU_100mL'
#         ]
        
#         # Store layer information
#         layers = []
        
#         # Perform interpolation for each parameter
#         for param in parameters:
#             if param in points_gdf.columns:
#                 output_path = os.path.join(settings.RASTER_OUTPUT_PATH, f"{param}.tif")
#                 create_raster(points_gdf, param, bounds, output_path)
#                 layer_name = f"{param}_interpolated"
#                 publish_to_geoserver(output_path, layer_name)
#                 layers.append({
#                     'name': layer_name,
#                     'wms_url': f"{settings.GEOSERVER_URL}/wms",
#                     'layer': f"{settings.GEOSERVER_WORKSPACE}:{layer_name}"
#                 })
        
#         # Publish river buffer shapefile to GeoServer
#         buffer_layer_name = 'river_buffer'
#         # Note: Assumes river_buffer is already published manually to GeoServer
#         layers.append({
#             'name': buffer_layer_name,
#             'wms_url': f"{settings.GEOSERVER_URL}/wms",
#             'layer': f"{settings.GEOSERVER_WORKSPACE}:{buffer_layer_name}"
#         })
        
#         return JsonResponse({'status': 'success', 'layers': layers})
    
#     except Exception as e:
#         return JsonResponse({'status': 'error', 'message': str(e)}, status=500)





# def idw_interpolation(request,data_type):
#     try:
#         # Load point and river shapefiles
#         attribute=data_type

#         riverebuffer_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'RIVER_BUFFER100M_SHP')
#         riverebuffer_full_path = os.path.join(riverebuffer_path, 'River_buffer_100m.shp')
        

#         point_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'UPDATED_WQA_DATA_points')
#         pointbuffer_full_path = os.path.join(point_path, 'UPDATED_WQA_DATA_points.shp')




#         point_gdf = gpd.read_file(pointbuffer_full_path)  # Path to point shapefile
#         river_gdf = gpd.read_file(riverebuffer_full_path)  # Path to river shapefile

#         # Create 100m buffer around river
#         river_buffer = river_gdf.buffer(100).unary_union

#         # Clip points to buffer
#         point_gdf = point_gdf[point_gdf.geometry.within(river_buffer)]

#         # Extract coordinates and attribute values
#         coords = [(geom.x, geom.y) for geom in point_gdf.geometry]
#         values = point_gdf[attribute].values

#         # Define raster parameters
#         bounds = river_buffer.bounds
#         pixel_size = 10  # Adjust resolution as needed
#         width = int((bounds[2] - bounds[0]) / pixel_size)
#         height = int((bounds[3] - bounds[1]) / pixel_size)
#         transform = from_bounds(bounds[0], bounds[1], bounds[2], bounds[3], width, height)

#         # Create an empty raster
#         raster = np.zeros((height, width), dtype=np.float32)

#         # Perform IDW interpolation
#         for i in range(height):
#             for j in range(width):
#                 x = transform[2] + j * pixel_size
#                 y = transform[5] - i * pixel_size
#                 if river_buffer.contains(Point(x, y)):
#                     weights = [1 / ((x - px) ** 2 + (y - py) ** 2 + 1e-6) for px, py in coords]
#                     total_weight = sum(weights)
#                     raster[i, j] = sum(w * v for w, v in zip(weights, values)) / total_weight
#                 else:
#                     raster[i, j] = np.nan  # Mask areas outside buffer

#         # Create in-memory raster
#         memfile = BytesIO()
#         with rasterio.open(
#             memfile, 'w', driver='GTiff', height=height, width=width, count=1,
#             dtype=raster.dtype, crs=point_gdf.crs, transform=transform
#         ) as dataset:
#             dataset.write(raster, 1)

#         # Publish to GeoServer via REST API
#         geoserver_url = "http://geoserver3:8080/geoserver/rest"
#         workspace = "myworkspace"
#         store_name = f'{attribute}_raster'
#         layer_name = f'{attribute}_idw'

#         # Create or update coverage store
#         headers = {'Content-Type': 'image/tiff', 'Authorization': 'Basic admin:geoserver3'}
#         requests.put(
#             f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}/file.geotiff',
#             data=memfile.getvalue(), headers=headers
#         )

#         # Publish layer
#         coverage_xml = f"""
#         <coverage>
#             <name>{layer_name}</name>
#             <title>{attribute} IDW Interpolation</title>
#             <srs>EPSG:4326</srs>
#             <nativeCoverageName>{store_name}</nativeCoverageName>
#         </coverage>
#         """
#         requests.post(
#             f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages',
#             data=coverage_xml, headers={'Content-Type': 'text/xml', 'Authorization': 'Basic admin:geoserver3'}
#         )

#         return JsonResponse({'status': 'success', 'layer_name': layer_name, 'wms_url': f'{geoserver_url}/wms'})
#     except Exception as e:
#         return JsonResponse({'status': 'error', 'message': str(e)})




from urllib.parse import unquote


def idw_interpolation(request, attribute):
    try:
        # URL decode the attribute parameter
        decoded_attribute = unquote(attribute)
        print(f"Original attribute: {attribute}")
        print(f"Decoded attribute: {decoded_attribute}")
        
        # Load point and river shapefiles
        riverebuffer_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'RIVER_BUFFER100M_SHP')
        riverebuffer_full_path = os.path.join(riverebuffer_path, 'River_buffer_100m.shp')
        
        point_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'UPDATED_WQA_DATA_points')
        pointbuffer_full_path = os.path.join(point_path, 'UPDATED_WQA_DATA_points.shp')

        point_gdf = gpd.read_file(pointbuffer_full_path)
        river_gdf = gpd.read_file(riverebuffer_full_path)

        # Debug: Print available columns
        print(f"Available columns in point shapefile: {list(point_gdf.columns)}")
        
        # Check if the decoded attribute exists in the shapefile
        if decoded_attribute not in point_gdf.columns:
            return JsonResponse({
                'status': 'error', 
                'message': f'Attribute "{decoded_attribute}" not found in shapefile. Available columns: {list(point_gdf.columns)}'
            })

        # Create 100m buffer around river
        river_buffer = river_gdf.buffer(100).unary_union

        # Clip points to buffer
        point_gdf = point_gdf[point_gdf.geometry.within(river_buffer)]

        # Extract coordinates and attribute values
        coords = [(geom.x, geom.y) for geom in point_gdf.geometry]
        values = point_gdf[decoded_attribute].values  # Use decoded_attribute here

        # Handle missing/null values
        valid_indices = ~np.isnan(values.astype(float))
        coords = [coords[i] for i in range(len(coords)) if valid_indices[i]]
        values = values[valid_indices]

        if len(coords) == 0:
            return JsonResponse({
                'status': 'error',
                'message': f'No valid data points found for attribute "{decoded_attribute}"'
            })

        # Define raster parameters
        bounds = river_buffer.bounds
        pixel_size = 10  # Adjust resolution as needed
        width = int((bounds[2] - bounds[0]) / pixel_size)
        height = int((bounds[3] - bounds[1]) / pixel_size)
        transform = from_bounds(bounds[0], bounds[1], bounds[2], bounds[3], width, height)

        # Create an empty raster
        raster = np.zeros((height, width), dtype=np.float32)

        # Perform IDW interpolation
        for i in range(height):
            for j in range(width):
                x = transform[2] + j * pixel_size
                y = transform[5] - i * pixel_size
                if river_buffer.contains(Point(x, y)):
                    weights = [1 / ((x - px) ** 2 + (y - py) ** 2 + 1e-6) for px, py in coords]
                    total_weight = sum(weights)
                    raster[i, j] = sum(w * v for w, v in zip(weights, values)) / total_weight
                else:
                    raster[i, j] = np.nan  # Mask areas outside buffer

        # Create in-memory raster
        memfile = BytesIO()
        with rasterio.open(
            memfile, 'w', driver='GTiff', height=height, width=width, count=1,
            dtype=raster.dtype, crs=point_gdf.crs, transform=transform
        ) as dataset:
            dataset.write(raster, 1)

        # Publish to GeoServer via REST API
        geoserver_url = "http://geoserver3:8080/geoserver/rest"
        workspace = "myworkspace"
        # Use a safe name for the store/layer (remove special characters)
        safe_attribute = decoded_attribute.replace('(', '').replace(')', '').replace('/', '_').replace(' ', '_')
        store_name = f'{safe_attribute}_raster'
        layer_name = f'{safe_attribute}_idw'

        # Create or update coverage store
        headers = {'Content-Type': 'image/tiff', 'Authorization': 'Basic admin:geoserver3'}
        store_response = requests.put(
            f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}/file.geotiff',
            data=memfile.getvalue(), headers=headers
        )
        
        print(f"Store creation response: {store_response.status_code}")

        # Publish layer
        coverage_xml = f"""
        <coverage>
            <name>{layer_name}</name>
            <title>{decoded_attribute} IDW Interpolation</title>
            <srs>EPSG:4326</srs>
            <nativeCoverageName>{store_name}</nativeCoverageName>
        </coverage>
        """
        coverage_response = requests.post(
            f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages',
            data=coverage_xml, headers={'Content-Type': 'text/xml', 'Authorization': 'Basic admin:geoserver3'}
        )
        
        print(f"Coverage creation response: {coverage_response.status_code}")

        return JsonResponse({
            'status': 'success', 
            'layer_name': layer_name, 
            'wms_url': f'http://geoserver3:8080/geoserver/wms',
            'layer': f'{workspace}:{layer_name}'
        })
        
    except Exception as e:
        print(f"Error in IDW interpolation: {str(e)}")
        return JsonResponse({'status': 'error', 'message': str(e)})