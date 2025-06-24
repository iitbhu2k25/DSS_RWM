from django.urls import path
from .views import WellsAPI
from .interpolation import InterpolateRasterView
# from interpolation import InterpolateRasterView

urlpatterns = [
    path('wells', WellsAPI.as_view(), name='wells-api'),
    path('interpolation', InterpolateRasterView.as_view(), name='interpolation'),

]