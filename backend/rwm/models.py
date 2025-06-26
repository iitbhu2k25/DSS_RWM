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