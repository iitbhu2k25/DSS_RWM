from django.urls import path,re_path
from . import views

urlpatterns = [
    path('water_quality/', views.water_quality_data, name='water_quality'),
    path('shapefile/', views.shapefile_data, name='shapefile_data'),
    path('shapefile_filtered/', views.shapefile_data_filtered, name='shapefile_data_filtered'),
    path('water_quality/<str:data_type>/', views.water_quality_data, name='water_quality_data_typed'),
    path('shapefile/<str:data_type>/', views.shapefile_data, name='shapefile_data_typed'),
    path('shapefile_filtered/<str:data_type>/', views.shapefile_data_filtered, name='shapefile_data_filtered_typed'),
    path('river_100m_buffer/', views.River_100m_buffer, name='river_100m_buffer'),
    path('river/', views.River, name='river'),
    re_path(r'^interpolate/(?P<attribute>[^/]+)/$', views.idw_interpolation, name='idw_interpolation'),
    path('clipped_subdist/', views.clipped_subdistrict, name='clipped_subdistrict'),
    path('subdistricts/', views.get_subdistricts, name='subdistricts')
   
]



