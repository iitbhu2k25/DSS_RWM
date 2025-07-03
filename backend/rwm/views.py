
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import pandas as pd
from shapely.geometry import Point 
from .models import WaterQuality_sampling_point_data, WaterQuality_upstream, WaterQuality_downstream    
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
import base64
from scipy.spatial.distance import cdist
from scipy.interpolate import griddata
import numpy as np
import geopandas as gpd









@csrf_exempt


def water_quality_data(request, data_type='overall'):
    """
    API endpoint to return water quality data as JSON, filtered by Sub_District_Code if provided
    """
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    try:
        # Determine the model based on data_type
        if data_type == 'overall':
            model = WaterQuality_sampling_point_data
        elif data_type == 'upstream':
            model = WaterQuality_upstream
        elif data_type == 'downstream':
            model = WaterQuality_downstream
        else:
            return JsonResponse({'error': 'Invalid data type. Use "overall", "upstream", or "downstream"'}, status=400)

        if request.method == 'POST':
            # Handle POST request with Sub_District_Code filter
            print(f"Received POST request to {request.path}")
            print(f"Request body: {request.body}")
            
            try:
                body = json.loads(request.body)
                sub_district_codes = body.get('Sub_District_Code', [])
                print(f"Sub-district codes: {sub_district_codes}")
            except json.JSONDecodeError:
                return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)

            # Filter by Sub_District_Code if provided, else fetch all
            if sub_district_codes:
                data = model.objects.filter(Sub_District_Code__in=sub_district_codes).values(
                    'Sub_District', 'Sub_District_Code', 'District_Code', 's_no', 'sampling', 
                    'location', 'status', 'latitude', 'longitude', 'ph', 'tds', 'ec', 
                    'temperature', 'turbidity', 'do', 'orp', 'tss', 'cod', 'bod', 'ts', 
                    'chloride', 'nitrate', 'hardness', 'faecal_coliform', 'total_coliform'
                )
            else:
                data = model.objects.all().values(
                    'Sub_District', 'Sub_District_Code', 'District_Code', 's_no', 'sampling', 
                    'location', 'status', 'latitude', 'longitude', 'ph', 'tds', 'ec', 
                    'temperature', 'turbidity', 'do', 'orp', 'tss', 'cod', 'bod', 'ts', 
                    'chloride', 'nitrate', 'hardness', 'faecal_coliform', 'total_coliform'
                )
            
            print(f"Queryset count: {data.count()}")
            response = JsonResponse(list(data), safe=False)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        elif request.method == 'GET':
            # Handle GET request (fetch all data)
            print(f"Received GET request to {request.path}")
            data = model.objects.all().values(
                'Sub_District', 'Sub_District_Code', 'District_Code', 's_no', 'sampling', 
                'location', 'status', 'latitude', 'longitude', 'ph', 'tds', 'ec', 
                'temperature', 'turbidity', 'do', 'orp', 'tss', 'cod', 'bod', 'ts', 
                'chloride', 'nitrate', 'hardness', 'faecal_coliform', 'total_coliform'
            )
            response = JsonResponse(list(data), safe=False)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        else:
            return JsonResponse({'error': f'Method {request.method} not allowed'}, status=405)

    except Exception as e:
        logger.error(f"Error fetching water quality data: {str(e)}")
        import traceback
        traceback.print_exc()
        response = JsonResponse({'error': 'Failed to fetch water quality data'}, status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return response












@csrf_exempt
@csrf_exempt
def get_subdistricts(request, data_type='overall'):
    """
    API endpoint to return sub-districts data as JSON, filtered by District_Code if provided
    """
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    
    try:
        # Determine the model based on data_type
        if data_type == 'overall':
            model = WaterQuality_sampling_point_data
        elif data_type == 'upstream':
            model = WaterQuality_upstream
        elif data_type == 'downstream':
            model = WaterQuality_downstream
        else:
            return JsonResponse({'error': 'Invalid data type.'}, status=400)

        district_codes = []

        if request.method == 'POST':
            print(f"Received POST request to {request.path}")
            print(f"Request body: {request.body}")
            
            # Parse JSON body
            try:
                body = json.loads(request.body)
                district_codes = body.get('District_Code', [])
                print(f"District codes from POST: {district_codes}")
            except json.JSONDecodeError:
                return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)

        elif request.method == 'GET':
            # Handle GET request with query parameters
            print(f"Received GET request to {request.path}")
            print(f"Query parameters: {request.GET}")
            
            # Get district_code from query parameters
            district_code = request.GET.get('district_code')
            if district_code:
                district_codes = [district_code]
                print(f"District codes from GET: {district_codes}")
        
        # Filter by District_Code if provided
        if district_codes:
            print(f"Filtering by district codes: {district_codes}")
            queryset = model.objects.filter(District_Code__in=district_codes).values(
                'Sub_District', 'Sub_District_Code', 'District_Code'
            ).distinct()
        else:
            print("No district codes provided, returning all sub-districts")
            queryset = model.objects.all().values(
                'Sub_District', 'Sub_District_Code', 'District_Code'
            ).distinct()
        
        print(f"Queryset count: {queryset.count()}")
        
        # Transform data for frontend
        results = []
        for item in queryset:
            results.append({
                "subdistrict_name": item["Sub_District"],
                "subdistrict_code": item["Sub_District_Code"],
                "district_code": item["District_Code"]
            })
        
        print(f"Results count: {len(results)}")
        print(f"Sample results: {results[:3]}")  # Show first 3 results
        
        response = JsonResponse(results, safe=False)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except Exception as e:
        print(f"Error in get_subdistricts: {str(e)}")
        import traceback
        traceback.print_exc()
        response = JsonResponse({'error': 'Failed to fetch sub-districts data'}, status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return response
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
            'DRAINS_Final_point', 
            'DRAINS_Final_point.shp'
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
    


@csrf_exempt
def clipped_subdistrict(request):
    """
    API endpoint to return filtered shapefile data as GeoJSON
    """
    try:
        
        shp_path = os.path.join(
            settings.MEDIA_ROOT, 
            'rwm_data', 
            'clipped_subdist', 
            'clipped_subdist.shp'
       
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
    
    

from urllib.parse import unquote
auth = base64.b64encode(b'admin:geoserver3').decode("utf-8")

def idw_interpolation(request, attribute):
    try:
        # URL decode the attribute parameter
        decoded_attribute = unquote(attribute)
        print(f"=== DEBUGGING {decoded_attribute} ===")
        
        # Load shapefiles - OPTIMIZATION: Only load required columns
        riverebuffer_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'RIVER_BUFFER100M_SHP')
        riverebuffer_full_path = os.path.join(riverebuffer_path, 'River_buffer_100m.shp')
        
        point_path = os.path.join(settings.MEDIA_ROOT, 'rwm_data', 'DRAINS_Final_point')
        pointbuffer_full_path = os.path.join(point_path, 'DRAINS_Final_point.shp')

        # Check if files exist
        if not os.path.exists(riverebuffer_full_path):
            return JsonResponse({'status': 'error', 'message': f'River buffer shapefile not found'})
        if not os.path.exists(pointbuffer_full_path):
            return JsonResponse({'status': 'error', 'message': f'Points shapefile not found'})

        print(f"Loading shapefiles...")
        # Only read required columns for points
        point_gdf = gpd.read_file(pointbuffer_full_path, columns=['geometry', decoded_attribute])
        river_gdf = gpd.read_file(riverebuffer_full_path)

        # Ensure same CRS
        print(f"Points CRS: {point_gdf.crs}, River CRS: {river_gdf.crs}")
        if point_gdf.crs != river_gdf.crs:
            print(f"Converting CRS from {point_gdf.crs} to {river_gdf.crs}")
            point_gdf = point_gdf.to_crs(river_gdf.crs)

        print(f"Total points: {len(point_gdf)}")
        
        # Check if attribute exists
        if decoded_attribute not in point_gdf.columns:
            return JsonResponse({
                'status': 'error', 
                'message': f'Attribute "{decoded_attribute}" not found. Available: {list(point_gdf.columns)}'
            })

        # Use spatial index for faster intersection
        print(f"Finding points within river buffer...")
        try:
            # Create spatial index for faster queries
            spatial_index = river_gdf.sindex
            
            # Get buffer geometry more efficiently
            river_buffer = river_gdf.geometry.unary_union
            
            # Use spatial index to pre-filter points
            possible_matches_index = list(spatial_index.intersection(point_gdf.total_bounds))
            possible_matches = river_gdf.iloc[possible_matches_index] if possible_matches_index else river_gdf
            
            # Now do the actual intersection on pre-filtered data
            buffer_geom = possible_matches.geometry.unary_union.buffer(100)
            points_in_buffer = point_gdf[point_gdf.intersects(buffer_geom)]
            
            print(f"Points within 100m buffer: {len(points_in_buffer)}")
            
            if len(points_in_buffer) < 5:
                print("Too few points in buffer, using all points...")
                points_in_buffer = point_gdf.copy()
                buffer_geom = None
                
        except Exception as e:
            print(f"Buffer error: {e}, using all points")
            points_in_buffer = point_gdf.copy()
            buffer_geom = None

        # Vectorized data cleaning
        print(f"Cleaning data...")
        try:
            # Remove rows with null geometries or attribute values first
            points_clean = points_in_buffer.dropna(subset=['geometry', decoded_attribute])
            
            # Convert to numeric in one operation
            numeric_values = pd.to_numeric(points_clean[decoded_attribute], errors='coerce')
            points_clean = points_clean[~numeric_values.isna()]
            numeric_values = numeric_values.dropna()
            
            # Extract coordinates efficiently
            coords = np.array([[geom.x, geom.y] for geom in points_clean.geometry])
            values = numeric_values.values
            
            print(f"Valid points: {len(coords)}")
            print(f"Value range: {np.min(values):.2f} to {np.max(values):.2f}")
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Error processing values: {e}'})

        if len(coords) < 3:
            return JsonResponse({'status': 'error', 'message': f'Need at least 3 valid points, found {len(coords)}'})

        # Calculate bounds
        if buffer_geom is not None:
            bounds = buffer_geom.bounds
        else:
            points_bounds = points_clean.total_bounds
            padding = max(points_bounds[2] - points_bounds[0], points_bounds[3] - points_bounds[1]) * 0.05
            bounds = (
                points_bounds[0] - padding,
                points_bounds[1] - padding, 
                points_bounds[2] + padding,
                points_bounds[3] + padding
            )

        print(f"Bounds: {bounds}")

        # Adaptive raster size based on data density
        width_meters = bounds[2] - bounds[0]
        height_meters = bounds[3] - bounds[1]
        area_sqkm = (width_meters * height_meters) / 1_000_000
        
        # Adaptive pixel size based on area and point density
        point_density = len(coords) / area_sqkm if area_sqkm > 0 else 1
        
        if point_density > 10:  # High density
            target_pixels = 150
        elif point_density > 5:  # Medium density
            target_pixels = 100
        else:  # Low density
            target_pixels = 3438
            
        pixel_size = max(width_meters, height_meters) / target_pixels
        width = max(20, min(200, int(width_meters / pixel_size)))
        height = max(20, min(200, int(height_meters / pixel_size)))
        
        print(f"ADAPTIVE raster dimensions: {width}x{height} (density: {point_density:.1f} pts/km²)")
        print(f"Total pixels to process: {width * height}")

        # Use KDTree for faster nearest neighbor if many points
        if len(coords) > 100:
            print(f"Using KDTree for large dataset...")
            from scipy.spatial import cKDTree
            
            # Create coordinate arrays
            x_coords = np.linspace(bounds[0], bounds[2], width)
            y_coords = np.linspace(bounds[3], bounds[1], height)
            X, Y = np.meshgrid(x_coords, y_coords)
            grid_points = np.column_stack([X.ravel(), Y.ravel()])
            
            # Use KDTree for faster distance calculations
            tree = cKDTree(coords)
            
            # IDW with limited number of nearest neighbors (much faster)
            k_neighbors = min(10, len(coords))  # Use max 10 nearest points
            distances, indices = tree.query(grid_points, k=k_neighbors)
            
            # Avoid division by zero
            distances = np.where(distances == 0, 1e-10, distances)
            
            # IDW weights (power=2)
            weights = 1.0 / (distances ** 2)
            weights_sum = np.sum(weights, axis=1)
            
            # Calculate weighted values
            weighted_values = np.sum(weights * values[indices], axis=1)
            interpolated_values = weighted_values / weights_sum
            
        else:
            print(f"Using scipy griddata for small dataset...")
            # Create coordinate arrays
            x_coords = np.linspace(bounds[0], bounds[2], width)
            y_coords = np.linspace(bounds[3], bounds[1], height)
            X, Y = np.meshgrid(x_coords, y_coords)
            grid_points = np.column_stack([X.ravel(), Y.ravel()])
            
            # Use scipy's griddata (faster for small datasets)
            try:
                interpolated_values = griddata(
                    coords, values, grid_points, 
                    method='linear', fill_value=np.nan
                )
            except:
                interpolated_values = griddata(
                    coords, values, grid_points, 
                    method='nearest', fill_value=np.nan
                )
        
        # Reshape back to grid
        raster = interpolated_values.reshape((height, width))
        
        # Faster masking using rasterio features
        if buffer_geom is not None:
            print("Applying optimized buffer mask...")
            from rasterio.features import geometry_mask
            from rasterio.transform import from_bounds
            
            transform = from_bounds(bounds[0], bounds[1], bounds[2], bounds[3], width, height)
            
            # Create mask more efficiently
            mask = geometry_mask(
                [buffer_geom], 
                transform=transform, 
                invert=True, 
                out_shape=(height, width)
            )
            raster[~mask] = np.nan

        interpolated_pixels = np.sum(~np.isnan(raster))
        print(f"Interpolation complete!")
        print(f"Valid pixels: {interpolated_pixels}")
        print(f"Raster stats: min={np.nanmin(raster):.2f}, max={np.nanmax(raster):.2f}")

        if np.all(np.isnan(raster)):
            return JsonResponse({'status': 'error', 'message': 'All raster values are NaN'})

        # Create transform
        transform = from_bounds(bounds[0], bounds[1], bounds[2], bounds[3], width, height)

        # More efficient raster creation
        print(f"Creating optimized GeoTIFF...")
        memfile = BytesIO()
        
        # Use float32 instead of float64 to reduce file size
        raster_optimized = raster.astype(np.float32)
        
        with rasterio.open(
            memfile, 'w', 
            driver='GTiff', 
            height=height, 
            width=width, 
            count=1,
            dtype=np.float32,  # Smaller file size
            crs=point_gdf.crs, 
            transform=transform,
            nodata=-9999,  # Use a proper nodata value instead of NaN
            compress='lzw',
            tiled=True,  # Better for web serving
            blockxsize=256,
            blockysize=256
        ) as dataset:
            # Replace NaN with nodata value
            raster_optimized = np.where(np.isnan(raster_optimized), -9999, raster_optimized)
            dataset.write(raster_optimized, 1)

        raster_size = len(memfile.getvalue())
        print(f"Optimized raster size: {raster_size/1024:.1f} KB")

        # SOLUTION A: Proper GeoServer cleanup sequence (Layer → Coverage → Store)
        print(f"Publishing to GeoServer with proper cleanup...")
        geoserver_url = "http://geoserver3:8080/geoserver/rest"
        workspace = "myworkspace"

        safe_attribute = decoded_attribute.replace('(', '').replace(')', '').replace('/', '_').replace(' ', '_').replace('μ', 'u').replace('°', 'deg')
        store_name = f'{safe_attribute}_raster'
        layer_name = f'{safe_attribute}_idw'

        headers_auth = {'Authorization': f'Basic {auth}'}

        # Step 1: Delete existing LAYER first (this is what was missing!)
        layer_check_url = f'{geoserver_url}/workspaces/{workspace}/layers/{layer_name}'
        layer_check_response = requests.get(layer_check_url, headers=headers_auth)

        if layer_check_response.status_code == 200:
            print(f"Layer {layer_name} exists, deleting layer...")
            layer_delete_response = requests.delete(layer_check_url, headers=headers_auth)
            print(f"Delete layer response: {layer_delete_response.status_code}")
            
            if layer_delete_response.status_code not in [200, 204]:
                print(f"Layer delete warning: {layer_delete_response.text}")

        # Step 2: Delete existing COVERAGE
        coverage_check_url = f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}'
        coverage_check_response = requests.get(coverage_check_url, headers=headers_auth)

        if coverage_check_response.status_code == 200:
            print(f"Coverage {layer_name} exists, deleting coverage...")
            coverage_delete_response = requests.delete(coverage_check_url, headers=headers_auth)
            print(f"Delete coverage response: {coverage_delete_response.status_code}")
            
            if coverage_delete_response.status_code not in [200, 204]:
                print(f"Coverage delete warning: {coverage_delete_response.text}")

        # Step 3: Delete existing COVERAGE STORE
        store_check_url = f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}'
        store_check_response = requests.get(store_check_url, headers=headers_auth)

        if store_check_response.status_code == 200:
            print(f"Coverage store {store_name} exists, deleting store...")
            store_delete_response = requests.delete(store_check_url, headers=headers_auth)
            print(f"Delete store response: {store_delete_response.status_code}")
            
            if store_delete_response.status_code not in [200, 204]:
                print(f"Store delete warning: {store_delete_response.text}")

        # Step 4: Create new coverage store
        headers_tiff = {'Content-Type': 'image/tiff', 'Authorization': f'Basic {auth}'}
        store_create_url = f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}/file.geotiff'

        store_response = requests.put(store_create_url, data=memfile.getvalue(), headers=headers_tiff)
        print(f"Store creation response: {store_response.status_code}")

        if store_response.status_code not in [200, 201]:
            print(f"Store creation error: {store_response.text}")
            return JsonResponse({'status': 'error', 'message': f'GeoServer store error: {store_response.status_code}'})

        # Step 5: Create new coverage with FIXED name tag
        coverage_xml = f"""<coverage>
            <name>{layer_name}</name>
            <title>{decoded_attribute} IDW Interpolation</title>
            <srs>{point_gdf.crs}</srs>
        </coverage>"""

        coverage_create_response = requests.post(
            f'{geoserver_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages',
            data=coverage_xml, 
            headers={'Content-Type': 'text/xml', 'Authorization': f'Basic {auth}'}
        )
        print(f"Coverage creation response: {coverage_create_response.status_code}")

        if coverage_create_response.status_code not in [200, 201]:
            print(f"Coverage creation error: {coverage_create_response.text}")
            return JsonResponse({'status': 'error', 'message': f'Coverage creation failed: {coverage_create_response.status_code}'})

        # Step 6: Verify layer was auto-created (GeoServer usually auto-creates the layer)
        layer_verify_response = requests.get(layer_check_url, headers=headers_auth)
        if layer_verify_response.status_code != 200:
            print(f"Layer not auto-created, creating manually...")
            # Create layer manually if needed
            layer_xml = f"""<layer>
                <name>{layer_name}</name>
                <type>RASTER</type>
                <defaultStyle>
                    <name>raster</name>
                </defaultStyle>
                <resource class="coverage">
                    <name>{workspace}:{layer_name}</name>
                </resource>
            </layer>"""
            
            layer_create_response = requests.post(
                f'{geoserver_url}/workspaces/{workspace}/layers',
                data=layer_xml,
                headers={'Content-Type': 'text/xml', 'Authorization': f'Basic {auth}'}
            )
            print(f"Layer creation response: {layer_create_response.status_code}")

        wms_url =  f'http://172.29.192.1:9092/geoserver/wms'
        layer_full_name = f'{workspace}:{layer_name}'

        preview_url = f"{wms_url}?service=WMS&version=1.1.0&request=GetMap&layers={layer_full_name}&styles=&bbox={bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}&width=512&height=512&srs=EPSG:4326&format=image/png"

        print(f"SUCCESS! Layer created/updated: {layer_full_name}")
        print(f"Preview: {preview_url}")

        return JsonResponse({
            'status': 'success', 
            'layer_name': layer_name, 
            'wms_url': wms_url,
            'layer': layer_full_name,
            'debug_info': {
                'valid_points': len(coords),
                'raster_size': f"{width}x{height}",
                'total_pixels': width * height,
                'interpolated_pixels': int(interpolated_pixels),
                'value_range': f"{np.nanmin(raster):.2f} to {np.nanmax(raster):.2f}",
                'file_size_kb': f"{raster_size/1024:.1f}",
                'preview_url': preview_url,
                'point_density': f"{point_density:.1f} pts/km²"
            }
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)})
    






# def water_quality_data(request, data_type='overall'):
#     """
#     API endpoint to return water quality data as JSON
#     """
        
#     if request.method == 'OPTIONS':
#         # Handle CORS preflight request
#         response = JsonResponse({})
#         response["Access-Control-Allow-Origin"] = "*"
#         response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
#         response["Access-Control-Allow-Headers"] = "Content-Type"
#         return response
#     try:

#         if data_type == 'overall':
#             model =WaterQuality_sampling_point_data  # You'll need to create this model
#         elif data_type == 'upstream':
#             model = WaterQuality_upstream
#         elif data_type == 'downstream':
#             model = WaterQuality_downstream
#         else:
#             return JsonResponse({'error': 'Invalid data type. Use "overall" or "upstream" or "downstream"'}, status=400)



#         data = model.objects.all().values(
             
 
#                      'Sub_District','Sub_District_Code','District_Code','s_no', 'sampling', 'location', 'status', 'latitude', 'longitude', 
#             'ph', 'tds', 'ec', 'temperature', 'turbidity', 'do', 'orp', 'tss', 
#             'cod', 'bod', 'ts', 'chloride', 'nitrate', 'hardness', 
#             'faecal_coliform', 'total_coliform'
#         )
#         response = JsonResponse(list(data), safe=False)
#         response["Access-Control-Allow-Origin"] = "*" 
#         return JsonResponse(list(data), safe=False)

#     except Exception as e:
#         logger.error(f"Error fetching water quality data: {str(e)}")
#         response = JsonResponse({'error': 'Failed to fetch water quality data'}, status=500)
#         response["Access-Control-Allow-Origin"] = "*"
#         return JsonResponse({'error': 'Failed to fetch water quality data'}, status=500)

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

