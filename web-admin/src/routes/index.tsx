import { Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import UserManage from '../pages/UserManage';
import ArtworkManage from '../pages/ArtworkManage';
import ArtworkPreview from '../pages/ArtworkPreview';
import CategoryManage from '../pages/CategoryManage';
import CategoryTagTree from '../pages/CategoryTagTree';
import TagManage from '../pages/TagManage';
import OrderManage from '../pages/OrderManage';
import MemberOrderManage from '../pages/MemberOrderManage';
import PointManage from '../pages/PointManage';
import MemberPriceConfigManage from '../pages/MemberPriceConfigManage';
import OperationLog from '../pages/OperationLog';
import PromptAssetManage from '../pages/PromptAssetManage';
import PromptAssetAiTaggingManage from '../pages/PromptAssetAiTaggingManage';
import ImageGenerationMessageManage from '../pages/ImageGenerationMessageManage';
import ImageGenerationConfigManage from '../pages/ImageGenerationConfigManage';

export const routes = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AdminLayout />,
    meta: { requiresAdmin: true },
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'user',
        element: <UserManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'artwork',
        element: <ArtworkManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'prompt-asset',
        element: <PromptAssetManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'prompt-asset-ai-tagging',
        element: <PromptAssetAiTaggingManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'image-generation-message',
        element: <ImageGenerationMessageManage generationMode="api" />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'image-generation-manual',
        element: <ImageGenerationMessageManage generationMode="manual" />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'image-generation-config',
        element: <ImageGenerationConfigManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'category',
        element: <CategoryManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'category-tag-tree',
        element: <CategoryTagTree />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'tag',
        element: <TagManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'order',
        element: <OrderManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'member-order',
        element: <MemberOrderManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'point',
        element: <PointManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'member-price-config',
        element: <MemberPriceConfigManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'operation-log',
        element: <OperationLog />,
        meta: { requiresAdmin: true },
      },
    ],
  },
  {
    path: '/artwork/view/:id',
    element: <ArtworkPreview />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
];

export const menuRoutes = [
  {
    path: '/dashboard',
    name: '工作台',
    icon: 'DashboardOutlined',
    routes: [
      {
        path: '/dashboard',
        name: '概况',
        icon: 'DashboardOutlined',
      },
    ],
  },
  {
    path: '/content',
    name: '内容资产',
    icon: 'DatabaseOutlined',
    routes: [
      {
        path: '/artwork',
        name: '作品管理',
        icon: 'PictureOutlined',
      },
      {
        path: '/prompt-asset',
        name: 'Prompt 资产',
        icon: 'DatabaseOutlined',
      },
      {
        path: '/prompt-asset-ai-tagging',
        name: 'AI 标签重标注',
        icon: 'TagOutlined',
      },
      {
        path: '/category',
        name: '分类管理',
        icon: 'AppstoreOutlined',
      },
      {
        path: '/category-tag-tree',
        name: '分类标签树',
        icon: 'ClusterOutlined',
      },
      {
        path: '/tag',
        name: '标签管理',
        icon: 'TagOutlined',
      },
    ],
  },
  {
    path: '/image-generation',
    name: '图片生成',
    icon: 'PictureOutlined',
    routes: [
      {
        path: '/image-generation-message',
        name: 'API 生成监控',
        icon: 'PictureOutlined',
      },
      {
        path: '/image-generation-manual',
        name: '人工生成监控',
        icon: 'PictureOutlined',
      },
      {
        path: '/image-generation-config',
        name: '生成配置',
        icon: 'SettingOutlined',
      },
    ],
  },
  {
    path: '/commerce',
    name: '交易会员',
    icon: 'CrownOutlined',
    routes: [
      {
        path: '/order',
        name: '作品订单',
        icon: 'ShoppingCartOutlined',
      },
      {
        path: '/member-order',
        name: '会员订单',
        icon: 'CrownOutlined',
      },
      {
        path: '/point',
        name: '积分管理',
        icon: 'DollarOutlined',
      },
      {
        path: '/member-price-config',
        name: '会员价格配置',
        icon: 'SettingOutlined',
      },
    ],
  },
  {
    path: '/system',
    name: '系统管理',
    icon: 'SettingOutlined',
    routes: [
      {
        path: '/user',
        name: '用户管理',
        icon: 'UserOutlined',
      },
      {
        path: '/operation-log',
        name: '操作日志',
        icon: 'FileTextOutlined',
      },
    ],
  },
];
