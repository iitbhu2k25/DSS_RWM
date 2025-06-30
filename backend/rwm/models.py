from django.db import models

# Create your models here.


class WaterQuality_overall(models.Model):
    s_no = models.FloatField(null=True, blank=True, db_column='S.No.')  # Matches 'S.No.'
    sampling = models.CharField(max_length=100, db_column='Sampling')
    location = models.CharField(max_length=100, null=True, blank=True, db_column='Location')
    status = models.CharField(max_length=50, null=True, blank=True, db_column='STATUS')
    latitude = models.FloatField(db_column='LATITUDE')
    longitude = models.FloatField(db_column='LONGITUDE')
    ph = models.FloatField(db_column='pH')
    tds = models.FloatField(db_column='TDS (ppm)')
    ec = models.FloatField(db_column='EC (μS/cm)')
    temperature = models.FloatField(db_column='Temperature (°C)')
    turbidity = models.FloatField(db_column='Turbidity (FNU)')
    do = models.FloatField(db_column='DO (mg/L)')
    orp = models.FloatField(db_column='ORP')
    tss = models.FloatField(db_column='TSS(mg/l)')
    cod = models.FloatField(db_column='COD')
    bod = models.FloatField(db_column='BOD(mg/l)')
    ts = models.FloatField(null=True, blank=True, db_column='TS_mg_l_')
    chloride = models.FloatField(db_column='Chloride(mg/l)')
    nitrate = models.FloatField(null=True, blank=True, db_column='Nitrate')
    hardness = models.FloatField(db_column='Hardness(mg/l)')
    faecal_coliform = models.CharField(max_length=50, null=True, blank=True, db_column='Faecal Coliform (CFU/100 mL)')  # Store as string due to range values
    total_coliform = models.CharField(max_length=50, null=True, blank=True, db_column='Total Coliform (CFU/100 mL)')  # Store as string due to range values


    def __str__(self):
        return self.sampling

    class Meta:
        db_table = 'water_quality'

class WaterQuality_upstream(models.Model):
    s_no = models.FloatField(null=True, blank=True, db_column='S.No.')  # Matches 'S.No.'
    sampling = models.CharField(max_length=100, db_column='Sampling')
    location = models.CharField(max_length=100, null=True, blank=True, db_column='Location')
    status = models.CharField(max_length=50, null=True, blank=True, db_column='STATUS')
    latitude = models.FloatField(db_column='LATITUDE')
    longitude = models.FloatField(db_column='LONGITUDE')
    ph = models.FloatField(db_column='pH')
    tds = models.FloatField(db_column='TDS (ppm)')
    ec = models.FloatField(db_column='EC (μS/cm)')
    temperature = models.FloatField(db_column='Temperature (°C)')
    turbidity = models.FloatField(db_column='Turbidity (FNU)')
    do = models.FloatField(db_column='DO (mg/L)')
    orp = models.FloatField(db_column='ORP')
    tss = models.FloatField(db_column='TSS(mg/l)')
    cod = models.FloatField(db_column='COD')
    bod = models.FloatField(db_column='BOD(mg/l)')
    ts = models.FloatField(null=True, blank=True, db_column='TS_mg_l_')
    chloride = models.FloatField(db_column='Chloride(mg/l)')
    nitrate = models.FloatField(null=True, blank=True, db_column='Nitrate')
    hardness = models.FloatField(db_column='Hardness(mg/l)')
    faecal_coliform = models.CharField(max_length=50, null=True, blank=True, db_column='Faecal Coliform (CFU/100 mL)')  # Store as string due to range values
    total_coliform = models.CharField(max_length=50, null=True, blank=True, db_column='Total Coliform (CFU/100 mL)')  # Store as string due to range values


    def __str__(self):
        return self.sampling

    class Meta:
        db_table = 'upstream'

class WaterQuality_downstream(models.Model):
    s_no = models.FloatField(null=True, blank=True, db_column='S.No.')  # Matches 'S.No.'
    sampling = models.CharField(max_length=100, db_column='Sampling')
    location = models.CharField(max_length=100, null=True, blank=True, db_column='Location')
    status = models.CharField(max_length=50, null=True, blank=True, db_column='STATUS')
    latitude = models.FloatField(db_column='LATITUDE')
    longitude = models.FloatField(db_column='LONGITUDE')
    ph = models.FloatField(db_column='pH')
    tds = models.FloatField(db_column='TDS (ppm)')
    ec = models.FloatField(db_column='EC (μS/cm)')
    temperature = models.FloatField(db_column='Temperature (°C)')
    turbidity = models.FloatField(db_column='Turbidity (FNU)')
    do = models.FloatField(db_column='DO (mg/L)')
    orp = models.FloatField(db_column='ORP')
    tss = models.FloatField(db_column='TSS(mg/l)')
    cod = models.FloatField(db_column='COD')
    bod = models.FloatField(db_column='BOD(mg/l)')
    ts = models.FloatField(null=True, blank=True, db_column='TS_mg_l_')
    chloride = models.FloatField(db_column='Chloride(mg/l)')
    nitrate = models.FloatField(null=True, blank=True, db_column='Nitrate')
    hardness = models.FloatField(db_column='Hardness(mg/l)')
    faecal_coliform = models.CharField(max_length=50, null=True, blank=True, db_column='Faecal Coliform (CFU/100 mL)')  # Store as string due to range values
    total_coliform = models.CharField(max_length=50, null=True, blank=True, db_column='Total Coliform (CFU/100 mL)')  # Store as string due to range values


    def __str__(self):
        return self.sampling

    class Meta:
        db_table = 'downstream'

from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
import uuid

class SamplingPoint(models.Model):
    """Model for water quality sampling points"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    s_no = models.IntegerField()
    sampling_location = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    location = models.PointField(srid=4326)  # Will store LATITUDE, LONGITUDE
    
    # Water quality parameters
    ph = models.FloatField(null=True, blank=True)
    tds_ppm = models.FloatField(null=True, blank=True, verbose_name="TDS (ppm)")
    ec_us_cm = models.FloatField(null=True, blank=True, verbose_name="EC (μS/cm)")
    temperature_c = models.FloatField(null=True, blank=True, verbose_name="Temperature (°C)")
    turbidity_fnu = models.FloatField(null=True, blank=True, verbose_name="Turbidity (FNU)")
    do_mg_l = models.FloatField(null=True, blank=True, verbose_name="DO (mg/L)")
    orp = models.FloatField(null=True, blank=True)
    tss_mg_l = models.FloatField(null=True, blank=True, verbose_name="TSS(mg/l)")
    cod = models.FloatField(null=True, blank=True)
    bod_mg_l = models.FloatField(null=True, blank=True, verbose_name="BOD(mg/l)")
    ts_mg_l = models.FloatField(null=True, blank=True, verbose_name="TS_mg_l_")
    chloride_mg_l = models.FloatField(null=True, blank=True, verbose_name="Chloride(mg/l)")
    nitrate = models.FloatField(null=True, blank=True)
    hardness_mg_l = models.FloatField(null=True, blank=True, verbose_name="Hardness(mg/l)")
    faecal_coliform_cfu = models.FloatField(null=True, blank=True, verbose_name="Faecal Coliform (CFU/100 mL)")
    total_coliform_cfu = models.FloatField(null=True, blank=True, verbose_name="Total Coliform (CFU/100 mL)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sampling_points'
        indexes = [
            models.Index(fields=['location']),
        ]
    
    def __str__(self):
        return f"{self.sampling_location} - {self.s_no}"

class RiverBuffer(models.Model):
    """Model for river buffer zones"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    geometry = models.MultiPolygonField(srid=4326)
    buffer_distance = models.FloatField(help_text="Buffer distance in meters")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'river_buffers'
    
    def __str__(self):
        return self.name

class InterpolationResult(models.Model):
    """Model to store interpolation metadata (not the actual raster data)"""
    INTERPOLATION_METHODS = [
        ('idw', 'Inverse Distance Weighting'),
        ('kriging', 'Kriging'),
        ('rbf', 'Radial Basis Function'),
        ('spline', 'Spline'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parameter_name = models.CharField(max_length=100)
    method = models.CharField(max_length=20, choices=INTERPOLATION_METHODS, default='idw')
    grid_resolution = models.FloatField(default=0.001)  # Grid resolution in degrees
    
    # File paths instead of storing data
    raster_file_path = models.CharField(max_length=500, null=True, blank=True)
    metadata_file_path = models.CharField(max_length=500, null=True, blank=True)
    
    # Metadata
    extent = models.JSONField()  # Store bounding box
    statistics = models.JSONField(null=True, blank=True)  # Min, max, mean, std values
    
    # GeoServer info
    geoserver_layer_name = models.CharField(max_length=255, null=True, blank=True)
    geoserver_store_name = models.CharField(max_length=255, null=True, blank=True)
    
    # Status tracking
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('published', 'Published to GeoServer')
    ], default='pending')
    
    error_message = models.TextField(null=True, blank=True)
    processing_time = models.FloatField(null=True, blank=True)  # Processing time in seconds
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'interpolation_results'
        unique_together = ['parameter_name', 'method']
        indexes = [
            models.Index(fields=['parameter_name', 'method']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.parameter_name} - {self.method} ({self.status})"
    
    @property
    def raster_exists(self):
        """Check if raster file exists"""
        import os
        return self.raster_file_path and os.path.exists(self.raster_file_path)
    
    @property
    def file_size_mb(self):
        """Get raster file size in MB"""
        import os
        if self.raster_exists:
            return round(os.path.getsize(self.raster_file_path) / (1024 * 1024), 2)
        return 0
