from django.urls import path
from . import views

urlpatterns = [
    path('water_quality_data/', views.water_quality_data, name='water_quality_data'),
    path('shapefile/', views.shapefile_data, name='shapefile_data'),
    path('shapefile-filtered/', views.shapefile_data_filtered, name='shapefile_data_filtered'),
]