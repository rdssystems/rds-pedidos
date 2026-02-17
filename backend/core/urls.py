from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StoreViewSet, PedidoViewSet, CategoriaViewSet, 
    ProdutoViewSet, GrupoDeAtributosViewSet, AtributoOpcaoViewSet,
    TeamMemberViewSet, RegisterView, api_status, UserViewSet,
    DashboardStatsView, CaixaViewSet
)

router = DefaultRouter()
router.register(r'lojas', StoreViewSet, basename='loja')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'produtos', ProdutoViewSet, basename='produto')
router.register(r'atributos', GrupoDeAtributosViewSet, basename='atributogrupo')
router.register(r'opcoes', AtributoOpcaoViewSet, basename='atributoopcao')
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'equipe', TeamMemberViewSet, basename='equipe')
router.register(r'users', UserViewSet, basename='user')
router.register(r'caixa', CaixaViewSet, basename='caixa')

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/status/', api_status),
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view({'post': 'create'}), name='register'),
]
